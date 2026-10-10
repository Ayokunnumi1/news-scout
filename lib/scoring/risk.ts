import type { Classification, ImpactLevel, RiskFactor, RiskLevel, SeverityLevel, UrgencyLevel } from "@/types/domain";

// Deterministic reputation-risk engine.
//
// The AI only supplies ordinal ratings (severity, impact, urgency) plus its
// classification/confidence. Engagement comes from the stored post. The score
// itself is computed here with fixed, documented weights so it is explainable
// and reproducible: the same inputs always produce the same score.

export const RISK_WEIGHTS = {
  severity: 25,
  falsity: 20,
  virality: 20,
  financial_impact: 15,
  customer_impact: 10,
  urgency: 10,
} as const satisfies Record<RiskFactor["key"], number>;

const SEVERITY_VALUE: Record<SeverityLevel, number> = { LOW: 0.2, MODERATE: 0.5, HIGH: 0.8, SEVERE: 1 };
const IMPACT_VALUE: Record<ImpactLevel, number> = { NONE: 0, LOW: 0.33, MEDIUM: 0.66, HIGH: 1 };
const URGENCY_VALUE: Record<UrgencyLevel, number> = { LOW: 0.2, MEDIUM: 0.6, HIGH: 1 };

/** Engagement at which virality saturates at 1.0 (log scale). */
export const VIRALITY_SATURATION = 100_000;

export interface RiskInput {
  severity: SeverityLevel;
  classification: Classification;
  /** 0..100 */
  confidence: number;
  engagementCount: number;
  financialImpact: ImpactLevel;
  customerImpact: ImpactLevel;
  urgency: UrgencyLevel;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

export function riskLevelForScore(score: number): RiskLevel {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MEDIUM";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

/**
 * Likelihood (0..1) that the claim is false or misleading.
 * UNVERIFIED sits at 0.5: we neither discount nor assume falsehood.
 */
export function falsityLikelihood(classification: Classification, confidence: number): number {
  const c = clamp01(confidence / 100);
  switch (classification) {
    case "FALSE":
      return c;
    case "MISLEADING":
      return 0.75 * c;
    case "UNVERIFIED":
      return 0.5;
    case "TRUE":
      return 0.5 * (1 - c);
  }
}

export function viralityValue(engagementCount: number): number {
  const n = Math.max(0, engagementCount);
  return clamp01(Math.log10(n + 1) / Math.log10(VIRALITY_SATURATION));
}

export function computeRiskScore(input: RiskInput): RiskResult {
  const falsity = falsityLikelihood(input.classification, input.confidence);
  const virality = viralityValue(input.engagementCount);

  const factors: RiskFactor[] = [
    factor("severity", "Severity of claim", SEVERITY_VALUE[input.severity], `Rated ${input.severity.toLowerCase()}`),
    factor(
      "falsity",
      "Confidence claim is false/misleading",
      falsity,
      `${input.classification} at ${Math.round(input.confidence)}% confidence`,
    ),
    factor(
      "virality",
      "Engagement / virality",
      virality,
      `${input.engagementCount.toLocaleString("en-US")} engagements (saturates at ${VIRALITY_SATURATION.toLocaleString("en-US")})`,
    ),
    factor(
      "financial_impact",
      "Financial impact",
      IMPACT_VALUE[input.financialImpact],
      `Rated ${input.financialImpact.toLowerCase()}`,
    ),
    factor(
      "customer_impact",
      "Customer impact",
      IMPACT_VALUE[input.customerImpact],
      `Rated ${input.customerImpact.toLowerCase()}`,
    ),
    factor("urgency", "Urgency", URGENCY_VALUE[input.urgency], `Rated ${input.urgency.toLowerCase()}`),
  ];

  const raw = factors.reduce((sum, f) => sum + f.contribution, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, level: riskLevelForScore(score), factors };
}

function factor(key: RiskFactor["key"], label: string, value: number, rationale: string): RiskFactor {
  const weight = RISK_WEIGHTS[key];
  const v = round2(clamp01(value));
  return { key, label, value: v, weight, contribution: round2(v * weight), rationale };
}

function clamp01(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
