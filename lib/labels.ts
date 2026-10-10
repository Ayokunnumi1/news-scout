import type {
  ActionStatus,
  Classification,
  IngestionStatus,
  Platform,
  PlatformAction,
  ResponseStatus,
  RiskLevel,
  SourceType,
  TrustLevel,
} from "@/types/domain";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  OFFICIAL_PRESS_RELEASE: "Official press release",
  OFFICIAL_WEBSITE: "Official website",
  REGULATORY_STATEMENT: "Regulatory statement",
  APPROVED_NEWS_SOURCE: "Approved news source",
  OTHER: "Other",
};

export const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  X: "X (Twitter)",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  NEWS: "News",
  BLOG: "Blog",
  OTHER: "Other",
};

export const INGESTION_STATUS_LABELS: Record<IngestionStatus, string> = {
  PENDING: "Pending analysis",
  ANALYZING: "Analyzing",
  ANALYZED: "Analyzed",
  FAILED: "Analysis failed",
};

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  TRUE: "True",
  FALSE: "False",
  MISLEADING: "Misleading",
  UNVERIFIED: "Unverified",
};

export const CLASSIFICATION_DESCRIPTIONS: Record<Classification, string> = {
  TRUE: "Trusted sources support the claim.",
  FALSE: "Trusted sources directly contradict the claim.",
  MISLEADING: "Contains some accurate elements but distorts, exaggerates, or omits key context.",
  UNVERIFIED:
    "Trusted sources neither confirm nor contradict the claim. Absence of evidence is not proof of falsehood.",
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const PLATFORM_ACTION_LABELS: Record<PlatformAction, string> = {
  MONITOR: "Monitor",
  RESPOND: "Respond",
  ESCALATE_INTERNALLY: "Escalate internally",
  REQUEST_PLATFORM_REVIEW: "Request platform review",
  REPORT_POLICY_VIOLATION: "Report potential policy violation",
  NO_ACTION: "No action",
};

export const PLATFORM_ACTION_GUIDANCE: Record<PlatformAction, string> = {
  MONITOR: "Keep watching engagement and related posts. Re-run analysis if the claim spreads or new facts emerge.",
  RESPOND: "Publish the approved public response through the institution's official channel.",
  ESCALATE_INTERNALLY:
    "Notify communications, compliance and the relevant business owner using the internal communication.",
  REQUEST_PLATFORM_REVIEW:
    "Submit the post to the platform's review process via its official reporting form, attaching the evidence.",
  REPORT_POLICY_VIOLATION:
    "File a report under the platform's misinformation or impersonation policy. Legal/compliance sign-off recommended.",
  NO_ACTION: "No intervention needed. The record is kept for audit purposes.",
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  DISMISSED: "Dismissed",
};

export const RESPONSE_STATUS_LABELS: Record<ResponseStatus, string> = {
  DRAFT: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
