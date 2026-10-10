import { describe, expect, it } from "vitest";
import { finalizeAnalysis, statementAppearsInSource, type PromptSource } from "@/lib/analysis/finalize";
import { claimAnalysisSchema, type ClaimAnalysisOutput } from "@/lib/ai/schemas";

const sources: PromptSource[] = [
  {
    ref: "S1",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Q3 Liquidity Statement",
    source_type: "OFFICIAL_PRESS_RELEASE",
    content:
      "Aurelia Trust Bank reported a liquidity coverage ratio of 148% for Q3, well above the regulatory minimum of 100%. Customer deposits are protected up to the statutory limit.",
  },
];

function baseOutput(overrides: Partial<ClaimAnalysisOutput> = {}): ClaimAnalysisOutput {
  return {
    institution: "Aurelia Trust Bank",
    institution_matches_monitored_bank: true,
    primary_claim: "Aurelia Trust Bank is insolvent and will freeze withdrawals.",
    secondary_claims: [],
    entities: ["Aurelia Trust Bank"],
    financial_impact: { level: "HIGH", description: "Could trigger deposit outflows." },
    customer_impact: { level: "HIGH", description: "Customers may rush to withdraw." },
    claim_severity: { level: "SEVERE", rationale: "Solvency rumour." },
    urgency: { level: "HIGH", rationale: "Spreading quickly." },
    emotional_language: ["GET YOUR MONEY OUT"],
    misinformation_indicators: ["No source cited"],
    observed_facts: ["The bank reported an LCR of 148%."],
    ai_inferences: ["The post appears designed to provoke panic."],
    evidence: [
      {
        source_ref: "S1",
        relevant_statement: "reported a liquidity coverage ratio of 148% for Q3",
        relationship: "CONTRADICTS",
        summary: "Strong liquidity contradicts insolvency.",
        confidence: 90,
      },
    ],
    classification: "FALSE",
    confidence: 90,
    reasoning_summary: "Official liquidity data contradicts the insolvency claim.",
    recommended_action: "Respond with official liquidity figures.",
    requires_human_review: true,
    ...overrides,
  };
}

describe("claimAnalysisSchema", () => {
  it("accepts a well-formed output", () => {
    expect(claimAnalysisSchema.safeParse(baseOutput()).success).toBe(true);
  });
  it("rejects out-of-range confidence and unknown classifications", () => {
    expect(claimAnalysisSchema.safeParse({ ...baseOutput(), confidence: 140 }).success).toBe(false);
    expect(claimAnalysisSchema.safeParse({ ...baseOutput(), classification: "PROBABLY_FALSE" }).success).toBe(false);
  });
  it("rejects missing fields", () => {
    const { primary_claim: _omit, ...rest } = baseOutput();
    void _omit;
    expect(claimAnalysisSchema.safeParse(rest).success).toBe(false);
  });
});

describe("statementAppearsInSource", () => {
  it("matches ignoring case, whitespace and smart quotes", () => {
    expect(statementAppearsInSource("LIQUIDITY   coverage ratio of 148%", sources[0].content)).toBe(true);
  });
  it("handles ellipsis-joined fragments", () => {
    expect(
      statementAppearsInSource(
        "liquidity coverage ratio of 148% ... protected up to the statutory limit",
        sources[0].content,
      ),
    ).toBe(true);
  });
  it("rejects paraphrases", () => {
    expect(statementAppearsInSource("the bank is extremely well capitalised", sources[0].content)).toBe(false);
  });
});

describe("finalizeAnalysis guardrails", () => {
  it("keeps a FALSE verdict backed by a verified contradicting quote", () => {
    const r = finalizeAnalysis(baseOutput(), sources, 48_000);
    expect(r.classification).toBe("FALSE");
    expect(r.evidence[0].statement_verified).toBe(true);
    expect(r.evidence[0].source_name).toBe("Q3 Liquidity Statement");
    expect(r.risk_level).toBe("CRITICAL");
    expect(r.platform_action).toBe("REPORT_POLICY_VIOLATION");
  });

  it("drops evidence citing a source that was not supplied", () => {
    const r = finalizeAnalysis(
      baseOutput({
        evidence: [
          {
            source_ref: "S9",
            relevant_statement: "invented",
            relationship: "CONTRADICTS",
            summary: "x",
            confidence: 99,
          },
        ],
      }),
      sources,
      100,
    );
    expect(r.evidence).toHaveLength(0);
    expect(r.classification).toBe("UNVERIFIED");
    expect(r.guardrail_notes.join(" ")).toMatch(/unknown source/);
  });

  it("downgrades FALSE to UNVERIFIED when the only evidence is a paraphrase", () => {
    const r = finalizeAnalysis(
      baseOutput({
        evidence: [
          {
            source_ref: "S1",
            relevant_statement: "The bank is completely solvent",
            relationship: "CONTRADICTS",
            summary: "x",
            confidence: 80,
          },
        ],
      }),
      sources,
      100,
    );
    expect(r.classification).toBe("UNVERIFIED");
    expect(r.confidence).toBeLessThanOrEqual(50);
    expect(r.requires_human_review).toBe(true);
  });

  it("downgrades TRUE without supporting evidence", () => {
    const r = finalizeAnalysis(baseOutput({ classification: "TRUE", evidence: [] }), sources, 10);
    expect(r.classification).toBe("UNVERIFIED");
  });
});
