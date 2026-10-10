import type { Classification, PlatformAction, RiskLevel } from "@/types/domain";

// Deterministic "Recommended Platform Action" matrix.
// The app never executes these actions; a bank employee does so manually and
// records the outcome. Reporting/review is only ever suggested for claims that
// trusted evidence contradicts (FALSE/MISLEADING), never for TRUE or UNVERIFIED.

const MATRIX: Record<Classification, Record<RiskLevel, PlatformAction>> = {
  TRUE: { LOW: "NO_ACTION", MEDIUM: "MONITOR", HIGH: "ESCALATE_INTERNALLY", CRITICAL: "ESCALATE_INTERNALLY" },
  UNVERIFIED: { LOW: "MONITOR", MEDIUM: "MONITOR", HIGH: "ESCALATE_INTERNALLY", CRITICAL: "ESCALATE_INTERNALLY" },
  MISLEADING: { LOW: "MONITOR", MEDIUM: "RESPOND", HIGH: "RESPOND", CRITICAL: "REQUEST_PLATFORM_REVIEW" },
  FALSE: { LOW: "MONITOR", MEDIUM: "RESPOND", HIGH: "REQUEST_PLATFORM_REVIEW", CRITICAL: "REPORT_POLICY_VIOLATION" },
};

export function recommendPlatformAction(classification: Classification, riskLevel: RiskLevel): PlatformAction {
  return MATRIX[classification][riskLevel];
}

export function platformActionRationale(classification: Classification, riskLevel: RiskLevel): string {
  const action = recommendPlatformAction(classification, riskLevel);
  return `Rule: ${classification} claim at ${riskLevel} risk → ${action.replaceAll("_", " ").toLowerCase()}.`;
}
