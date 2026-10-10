import type { ClaimAnalysisOutput } from "@/lib/ai/schemas";
import { recommendPlatformAction } from "@/lib/scoring/platform-action";
import { computeRiskScore } from "@/lib/scoring/risk";
import type {
  Classification,
  EvidenceRelationship,
  PlatformAction,
  RiskFactor,
  RiskLevel,
  SourceType,
} from "@/types/domain";

// Turns raw (already Zod-validated) model output into the record we persist.
// This is where application-level guardrails live, so the model cannot:
//   - cite a source it was not given (fabricated evidence is dropped),
//   - pass off paraphrase as quotation (statement_verified flags it),
//   - call something FALSE/TRUE without verified supporting evidence
//     (absence of evidence is downgraded to UNVERIFIED),
//   - decide the risk score or platform action (computed deterministically).

export interface PromptSource {
  /** Short reference shown to the model, e.g. "S1" */
  ref: string;
  id: string;
  name: string;
  source_type: SourceType;
  content: string;
}

export interface FinalEvidence {
  source_id: string;
  source_name: string;
  source_type: SourceType;
  relevant_statement: string;
  statement_verified: boolean;
  relationship: EvidenceRelationship;
  summary: string;
  confidence: number;
}

export interface FinalizedAnalysis {
  institution: string;
  primary_claim: string;
  secondary_claims: string[];
  entities: string[];
  financial_impact: string;
  emotional_language: string[];
  urgency: string;
  misinformation_indicators: string[];
  classification: Classification;
  confidence: number;
  reasoning_summary: string;
  observed_facts: string[];
  ai_inferences: string[];
  guardrail_notes: string[];
  risk_score: number;
  risk_level: RiskLevel;
  risk_factors: RiskFactor[];
  recommended_action: string;
  platform_action: PlatformAction;
  requires_human_review: boolean;
  evidence: FinalEvidence[];
}

/** Confidence ceiling applied when the guardrail downgrades a verdict. */
const DOWNGRADED_CONFIDENCE_CAP = 50;

export function finalizeAnalysis(
  output: ClaimAnalysisOutput,
  sources: PromptSource[],
  engagementCount: number,
): FinalizedAnalysis {
  const notes: string[] = [];
  const byRef = new Map(sources.map((s) => [s.ref.toUpperCase(), s]));

  const evidence: FinalEvidence[] = [];
  for (const item of output.evidence) {
    const source = byRef.get(item.source_ref.trim().toUpperCase());
    if (!source) {
      notes.push(
        `Discarded an evidence item citing unknown source "${item.source_ref}" — only supplied trusted sources may be cited.`,
      );
      continue;
    }
    const verified = statementAppearsInSource(item.relevant_statement, source.content);
    if (!verified) {
      notes.push(
        `Statement attributed to "${source.name}" was not found verbatim in the source text; treat it as a paraphrase.`,
      );
    }
    evidence.push({
      source_id: source.id,
      source_name: source.name,
      source_type: source.source_type,
      relevant_statement: item.relevant_statement,
      statement_verified: verified,
      relationship: item.relationship,
      summary: item.summary,
      confidence: item.confidence,
    });
  }

  let classification = output.classification;
  let confidence = output.confidence;

  const verifiedOf = (rel: EvidenceRelationship) =>
    evidence.filter((e) => e.statement_verified && e.relationship === rel).length;
  const contradicting = verifiedOf("CONTRADICTS");
  const supporting = verifiedOf("SUPPORTS");

  const downgrade = (reason: string) => {
    notes.push(`Classification downgraded from ${classification} to UNVERIFIED: ${reason}`);
    classification = "UNVERIFIED";
    confidence = Math.min(confidence, DOWNGRADED_CONFIDENCE_CAP);
  };

  if (classification === "FALSE" && contradicting === 0) {
    downgrade(
      "no verified trusted-source statement contradicts the claim. Absence of evidence is not proof of falsehood.",
    );
  } else if (classification === "MISLEADING" && contradicting + supporting === 0) {
    downgrade("no verified trusted-source statement addresses the claim.");
  } else if (classification === "TRUE" && supporting === 0) {
    downgrade("no verified trusted-source statement supports the claim.");
  }

  if (sources.length === 0) {
    notes.push("No active trusted sources were available for this institution, so the claim could not be verified.");
  }
  if (!output.institution_matches_monitored_bank) {
    notes.push("The model judged that this content may not be about the monitored institution. Confirm relevance.");
  }

  const risk = computeRiskScore({
    severity: output.claim_severity.level,
    classification,
    confidence,
    engagementCount,
    financialImpact: output.financial_impact.level,
    customerImpact: output.customer_impact.level,
    urgency: output.urgency.level,
  });

  const platform_action = recommendPlatformAction(classification, risk.level);

  // Human review is mandatory whenever the verdict is not a confident,
  // evidence-backed TRUE at low risk, regardless of what the model says.
  const requires_human_review =
    output.requires_human_review ||
    classification !== "TRUE" ||
    risk.level !== "LOW" ||
    confidence < 70 ||
    notes.length > 0;

  // Risk-factor rationales carry the model's own explanation for each rating.
  const factors = risk.factors.map((f) => {
    const extra =
      f.key === "severity"
        ? output.claim_severity.rationale
        : f.key === "financial_impact"
          ? output.financial_impact.description
          : f.key === "customer_impact"
            ? output.customer_impact.description
            : f.key === "urgency"
              ? output.urgency.rationale
              : "";
    return extra ? { ...f, rationale: `${f.rationale} — ${extra}` } : f;
  });

  return {
    institution: output.institution,
    primary_claim: output.primary_claim,
    secondary_claims: output.secondary_claims,
    entities: output.entities,
    financial_impact: `${output.financial_impact.level}: ${output.financial_impact.description}`.trim(),
    emotional_language: output.emotional_language,
    urgency: `${output.urgency.level}: ${output.urgency.rationale}`.trim(),
    misinformation_indicators: output.misinformation_indicators,
    classification,
    confidence,
    reasoning_summary: output.reasoning_summary,
    observed_facts: output.observed_facts,
    ai_inferences: output.ai_inferences,
    guardrail_notes: notes,
    risk_score: risk.score,
    risk_level: risk.level,
    risk_factors: factors,
    recommended_action: output.recommended_action,
    platform_action,
    requires_human_review,
    evidence,
  };
}

/**
 * True when the statement (or every substantive fragment of it, if the model
 * used an ellipsis) appears in the source text, ignoring case, whitespace and
 * quote-style differences.
 */
export function statementAppearsInSource(statement: string, sourceContent: string): boolean {
  const haystack = normalize(sourceContent);
  const fragments = statement
    .split(/\.\.\.|…/)
    .map((f) => normalize(f).replace(/^[\s"'.,;:]+|[\s"'.,;:]+$/g, ""))
    .filter((f) => f.length >= 8);
  if (fragments.length === 0) return false;
  return fragments.every((f) => haystack.includes(f));
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
