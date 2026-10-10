import "server-only";
import { db, dbError, unwrap, unwrapMaybe } from "@/lib/db/client";
import { AppError } from "@/lib/utils/errors";
import type {
  ActionStatus,
  AuditEvent,
  Classification,
  EvidenceItem,
  GeneratedResponse,
  Investigation,
  MonitoredContent,
  RiskLevel,
} from "@/types/domain";

const COLUMNS =
  "id, bank_id, content_id, input_content, sources_snapshot, model, prompt_version, institution, primary_claim, secondary_claims, entities, financial_impact, emotional_language, urgency, misinformation_indicators, classification, confidence, reasoning_summary, observed_facts, ai_inferences, guardrail_notes, risk_score, risk_level, risk_factors, recommended_action, platform_action, platform_action_status, platform_action_note, platform_action_updated_at, requires_human_review, created_at";

const LIST_COLUMNS =
  "id, content_id, primary_claim, classification, confidence, risk_score, risk_level, platform_action, platform_action_status, created_at, monitored_content(platform, author, author_handle, engagement_count), responses(status)";

export interface InvestigationListItem {
  id: string;
  content_id: string;
  primary_claim: string;
  classification: Classification;
  confidence: number;
  risk_score: number;
  risk_level: RiskLevel;
  platform_action: Investigation["platform_action"];
  platform_action_status: ActionStatus;
  created_at: string;
  monitored_content: Pick<MonitoredContent, "platform" | "author" | "author_handle" | "engagement_count"> | null;
  responses: { status: GeneratedResponse["status"] }[];
}

export async function listInvestigations(
  bankId: string,
  filters: { classification?: Classification; riskLevel?: RiskLevel; limit?: number } = {},
): Promise<InvestigationListItem[]> {
  let query = db()
    .from("investigations")
    .select(LIST_COLUMNS)
    .eq("bank_id", bankId)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "responses", ascending: false })
    .limit(filters.limit ?? 200);
  if (filters.classification) query = query.eq("classification", filters.classification);
  if (filters.riskLevel) query = query.eq("risk_level", filters.riskLevel);
  return unwrap(await query, "listInvestigations") as unknown as InvestigationListItem[];
}

export interface InvestigationDetail {
  investigation: Investigation;
  content: MonitoredContent;
  evidence: EvidenceItem[];
  responses: GeneratedResponse[];
  audit: AuditEvent[];
  otherRuns: { id: string; created_at: string; classification: Classification; risk_score: number }[];
}

export async function getInvestigationDetail(bankId: string, id: string): Promise<InvestigationDetail | null> {
  const invRes = await db().from("investigations").select(COLUMNS).eq("bank_id", bankId).eq("id", id).maybeSingle();
  const investigation = unwrapMaybe(invRes, "getInvestigation") as Investigation | null;
  if (!investigation) return null;

  const [contentRes, evidenceRes, responsesRes, auditRes, runsRes] = await Promise.all([
    db().from("monitored_content").select("*").eq("bank_id", bankId).eq("id", investigation.content_id).single(),
    db()
      .from("evidence_items")
      .select("*")
      .eq("bank_id", bankId)
      .eq("investigation_id", id)
      .order("relationship")
      .order("confidence", { ascending: false }),
    db()
      .from("responses")
      .select("*")
      .eq("bank_id", bankId)
      .eq("investigation_id", id)
      .order("created_at", { ascending: false }),
    db()
      .from("audit_events")
      .select("*")
      .eq("bank_id", bankId)
      .eq("investigation_id", id)
      .order("created_at", { ascending: true }),
    db()
      .from("investigations")
      .select("id, created_at, classification, risk_score")
      .eq("bank_id", bankId)
      .eq("content_id", investigation.content_id)
      .neq("id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    investigation,
    content: unwrap(contentRes, "getInvestigation.content") as MonitoredContent,
    evidence: unwrap(evidenceRes, "getInvestigation.evidence") as EvidenceItem[],
    responses: unwrap(responsesRes, "getInvestigation.responses") as GeneratedResponse[],
    audit: unwrap(auditRes, "getInvestigation.audit") as AuditEvent[],
    otherRuns: unwrap(runsRes, "getInvestigation.runs") as InvestigationDetail["otherRuns"],
  };
}

export async function getInvestigationWithEvidence(
  bankId: string,
  id: string,
): Promise<{ investigation: Investigation; evidence: EvidenceItem[]; content: MonitoredContent } | null> {
  const detail = await getInvestigationDetail(bankId, id);
  if (!detail) return null;
  return { investigation: detail.investigation, evidence: detail.evidence, content: detail.content };
}

/** Persists an analysis atomically via the record_investigation SQL function. */
export async function recordInvestigation(
  investigation: Record<string, unknown>,
  evidence: Record<string, unknown>[],
  actor: string,
): Promise<string> {
  const res = await db().rpc("record_investigation", {
    p_investigation: investigation,
    p_evidence: evidence,
    p_actor: actor,
  });
  if (res.error) throw dbError(res.error, "recordInvestigation");
  if (typeof res.data !== "string") throw new AppError("DB_ERROR", "The analysis could not be saved.");
  return res.data;
}

export async function updatePlatformActionStatus(
  bankId: string,
  id: string,
  status: ActionStatus,
  note: string,
): Promise<void> {
  const res = await db()
    .from("investigations")
    .update({
      platform_action_status: status,
      platform_action_note: note || null,
      platform_action_updated_at: new Date().toISOString(),
    })
    .eq("bank_id", bankId)
    .eq("id", id)
    .select("id")
    .single();
  unwrap(res, "updatePlatformActionStatus");
}
