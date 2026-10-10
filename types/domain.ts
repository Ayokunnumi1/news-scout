// Domain types mirroring the database schema (supabase/migrations).

export const BANK_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type BankStatus = (typeof BANK_STATUSES)[number];

export const SOURCE_TYPES = [
  "OFFICIAL_PRESS_RELEASE",
  "OFFICIAL_WEBSITE",
  "REGULATORY_STATEMENT",
  "APPROVED_NEWS_SOURCE",
  "OTHER",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const TRUST_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

export const PLATFORMS = ["X", "FACEBOOK", "INSTAGRAM", "NEWS", "BLOG", "OTHER"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const INGESTION_STATUSES = ["PENDING", "ANALYZING", "ANALYZED", "FAILED"] as const;
export type IngestionStatus = (typeof INGESTION_STATUSES)[number];

export const CLASSIFICATIONS = ["TRUE", "FALSE", "MISLEADING", "UNVERIFIED"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const EVIDENCE_RELATIONSHIPS = ["SUPPORTS", "CONTRADICTS", "NEUTRAL"] as const;
export type EvidenceRelationship = (typeof EVIDENCE_RELATIONSHIPS)[number];

export const PLATFORM_ACTIONS = [
  "MONITOR",
  "RESPOND",
  "ESCALATE_INTERNALLY",
  "REQUEST_PLATFORM_REVIEW",
  "REPORT_POLICY_VIOLATION",
  "NO_ACTION",
] as const;
export type PlatformAction = (typeof PLATFORM_ACTIONS)[number];

export const ACTION_STATUSES = ["PENDING", "COMPLETED", "DISMISSED"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const RESPONSE_STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

// Ordinal ratings the AI assigns; the risk engine converts them to scores.
export const SEVERITY_LEVELS = ["LOW", "MODERATE", "HIGH", "SEVERE"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const IMPACT_LEVELS = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export interface Bank {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  status: BankStatus;
  created_at: string;
}

export interface TrustedSource {
  id: string;
  bank_id: string;
  name: string;
  source_type: SourceType;
  url: string | null;
  content: string;
  trust_level: TrustLevel;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonitoredContent {
  id: string;
  bank_id: string;
  platform: Platform;
  author: string;
  author_handle: string;
  content: string;
  content_hash: string;
  source_url: string | null;
  published_at: string | null;
  engagement_count: number;
  ingestion_status: IngestionStatus;
  ingestion_error: string | null;
  analysis_started_at: string | null;
  created_at: string;
}

export interface RiskFactor {
  key: "severity" | "falsity" | "virality" | "financial_impact" | "customer_impact" | "urgency";
  label: string;
  /** Normalised 0..1 input value */
  value: number;
  /** Maximum points this factor can contribute */
  weight: number;
  /** Points contributed: value * weight */
  contribution: number;
  /** Human-readable explanation of the input */
  rationale: string;
}

export interface SourceSnapshot {
  id: string;
  ref: string;
  name: string;
  source_type: SourceType;
  trust_level: TrustLevel;
  url: string | null;
  included_chars: number;
  truncated: boolean;
  /** INCLUDED: sent to the model. UNAVAILABLE: no stored text. OVER_BUDGET: skipped for size. */
  status: "INCLUDED" | "UNAVAILABLE" | "OVER_BUDGET";
}

export interface ImpactAssessment {
  level: ImpactLevel;
  description: string;
}

export interface Investigation {
  id: string;
  bank_id: string;
  content_id: string;
  input_content: string;
  sources_snapshot: SourceSnapshot[];
  model: string;
  prompt_version: string;
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
  platform_action_status: ActionStatus;
  platform_action_note: string | null;
  platform_action_updated_at: string | null;
  requires_human_review: boolean;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  bank_id: string;
  investigation_id: string;
  source_id: string | null;
  source_name: string;
  source_type: SourceType;
  relevant_statement: string;
  statement_verified: boolean;
  relationship: EvidenceRelationship;
  summary: string;
  confidence: number;
  created_at: string;
}

export interface GeneratedResponse {
  id: string;
  bank_id: string;
  investigation_id: string;
  public_response: string;
  internal_communication: string;
  recommended_action: string;
  original_public_response: string;
  edited: boolean;
  status: ResponseStatus;
  reviewer_name: string | null;
  reviewed_at: string | null;
  model: string;
  prompt_version: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: number;
  bank_id: string;
  investigation_id: string | null;
  event_type: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}
