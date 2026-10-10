import { describe, expect, it } from "vitest";
import { recommendPlatformAction } from "@/lib/scoring/platform-action";
import {
  computeRiskScore,
  falsityLikelihood,
  riskLevelForScore,
  RISK_WEIGHTS,
  viralityValue,
} from "@/lib/scoring/risk";

describe("riskLevelForScore", () => {
  it("maps the documented bands", () => {
    expect(riskLevelForScore(0)).toBe("LOW");
    expect(riskLevelForScore(25)).toBe("LOW");
    expect(riskLevelForScore(26)).toBe("MEDIUM");
    expect(riskLevelForScore(50)).toBe("MEDIUM");
    expect(riskLevelForScore(51)).toBe("HIGH");
    expect(riskLevelForScore(75)).toBe("HIGH");
    expect(riskLevelForScore(76)).toBe("CRITICAL");
    expect(riskLevelForScore(100)).toBe("CRITICAL");
  });
});

describe("computeRiskScore", () => {
  it("weights sum to 100", () => {
    expect(Object.values(RISK_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("scores a viral, severe, false insolvency rumour as CRITICAL", () => {
    const r = computeRiskScore({
      severity: "SEVERE",
      classification: "FALSE",
      confidence: 92,
      engagementCount: 48_000,
      financialImpact: "HIGH",
      customerImpact: "HIGH",
      urgency: "HIGH",
    });
    expect(r.level).toBe("CRITICAL");
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.factors).toHaveLength(6);
  });

  it("scores a low-reach, minor, true claim as LOW", () => {
    const r = computeRiskScore({
      severity: "LOW",
      classification: "TRUE",
      confidence: 90,
      engagementCount: 40,
      financialImpact: "NONE",
      customerImpact: "LOW",
      urgency: "LOW",
    });
    expect(r.level).toBe("LOW");
  });

  it("is deterministic", () => {
    const input = {
      severity: "HIGH",
      classification: "MISLEADING",
      confidence: 70,
      engagementCount: 5_000,
      financialImpact: "MEDIUM",
      customerImpact: "MEDIUM",
      urgency: "MEDIUM",
    } as const;
    expect(computeRiskScore(input)).toEqual(computeRiskScore(input));
  });

  it("factor contributions sum to the score (within rounding)", () => {
    const r = computeRiskScore({
      severity: "MODERATE",
      classification: "UNVERIFIED",
      confidence: 40,
      engagementCount: 1_200,
      financialImpact: "LOW",
      customerImpact: "MEDIUM",
      urgency: "MEDIUM",
    });
    const sum = r.factors.reduce((s, f) => s + f.contribution, 0);
    expect(Math.abs(sum - r.score)).toBeLessThanOrEqual(0.5);
  });
});

describe("falsityLikelihood", () => {
  it("treats UNVERIFIED as neutral regardless of confidence", () => {
    expect(falsityLikelihood("UNVERIFIED", 10)).toBe(0.5);
    expect(falsityLikelihood("UNVERIFIED", 95)).toBe(0.5);
  });
  it("is low for confident TRUE and high for confident FALSE", () => {
    expect(falsityLikelihood("TRUE", 100)).toBe(0);
    expect(falsityLikelihood("FALSE", 100)).toBe(1);
  });
});

describe("viralityValue", () => {
  it("is 0 for no engagement and saturates at 1", () => {
    expect(viralityValue(0)).toBe(0);
    expect(viralityValue(10_000_000)).toBe(1);
    expect(viralityValue(-5)).toBe(0);
  });
});

describe("recommendPlatformAction", () => {
  it("never recommends reporting TRUE or UNVERIFIED claims", () => {
    for (const level of ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const) {
      for (const cls of ["TRUE", "UNVERIFIED"] as const) {
        const action = recommendPlatformAction(cls, level);
        expect(["REPORT_POLICY_VIOLATION", "REQUEST_PLATFORM_REVIEW"]).not.toContain(action);
      }
    }
  });
  it("escalates critical false claims to a policy report", () => {
    expect(recommendPlatformAction("FALSE", "CRITICAL")).toBe("REPORT_POLICY_VIOLATION");
  });
});
