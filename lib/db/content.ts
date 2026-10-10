import "server-only";
import { db, unwrap, unwrapMaybe } from "@/lib/db/client";
import { AppError } from "@/lib/utils/errors";
import { contentHash } from "@/lib/utils/hash";
import type { ContentInput } from "@/lib/validation/schemas";
import type { IngestionStatus, MonitoredContent, Platform } from "@/types/domain";

const COLUMNS =
  "id, bank_id, platform, author, author_handle, content, content_hash, source_url, published_at, engagement_count, ingestion_status, ingestion_error, analysis_started_at, created_at";

/** An analysis run older than this is considered abandoned and may be retried. */
const STALE_ANALYSIS_MS = 3 * 60_000;

export interface ContentWithLatest extends MonitoredContent {
  latest_investigation: {
    id: string;
    classification: string;
    risk_level: string;
    risk_score: number;
    created_at: string;
  } | null;
}

export async function listContent(
  bankId: string,
  filters: { status?: IngestionStatus; platform?: Platform } = {},
): Promise<ContentWithLatest[]> {
  let query = db()
    .from("monitored_content")
    .select(`${COLUMNS}, investigations(id, classification, risk_level, risk_score, created_at)`)
    .eq("bank_id", bankId)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "investigations", ascending: false })
    .limit(1, { referencedTable: "investigations" })
    .limit(500);
  if (filters.status) query = query.eq("ingestion_status", filters.status);
  if (filters.platform) query = query.eq("platform", filters.platform);

  const rows = unwrap(await query, "listContent") as (MonitoredContent & {
    investigations: ContentWithLatest["latest_investigation"][];
  })[];
  return rows.map(({ investigations, ...rest }) => ({
    ...rest,
    latest_investigation: investigations?.[0] ?? null,
  }));
}

export async function getContent(bankId: string, id: string): Promise<MonitoredContent | null> {
  const res = await db().from("monitored_content").select(COLUMNS).eq("bank_id", bankId).eq("id", id).maybeSingle();
  return unwrapMaybe(res, "getContent") as MonitoredContent | null;
}

export async function createContent(bankId: string, input: ContentInput): Promise<MonitoredContent> {
  const hash = contentHash(input.content);
  const existing = await db()
    .from("monitored_content")
    .select("id")
    .eq("bank_id", bankId)
    .eq("content_hash", hash)
    .maybeSingle();
  if (unwrapMaybe(existing, "createContent.duplicateCheck")) {
    throw new AppError("DUPLICATE", "This post has already been submitted for this institution.");
  }
  const res = await db()
    .from("monitored_content")
    .insert({ ...input, bank_id: bankId, content_hash: hash, ingestion_status: "PENDING" })
    .select(COLUMNS)
    .single();
  return unwrap(res, "createContent") as MonitoredContent;
}

/**
 * Inserts many rows, skipping duplicates (existing in DB or repeated within
 * the batch). Returns counts so the UI can report what happened.
 */
export async function importContent(
  bankId: string,
  rows: ContentInput[],
): Promise<{ inserted: number; duplicates: number }> {
  const seen = new Set<string>();
  const unique = rows
    .map((r) => ({ ...r, bank_id: bankId, content_hash: contentHash(r.content), ingestion_status: "PENDING" as const }))
    .filter((r) => (seen.has(r.content_hash) ? false : (seen.add(r.content_hash), true)));

  if (unique.length === 0) return { inserted: 0, duplicates: rows.length };

  const res = await db()
    .from("monitored_content")
    .upsert(unique, { onConflict: "bank_id,content_hash", ignoreDuplicates: true })
    .select("id");
  const inserted = (unwrap(res, "importContent") as { id: string }[]).length;
  return { inserted, duplicates: rows.length - inserted };
}

/**
 * Atomically marks content as ANALYZING. Fails with CONFLICT if another run
 * is in progress, which prevents duplicate concurrent submissions.
 */
export async function claimForAnalysis(bankId: string, id: string): Promise<MonitoredContent> {
  const staleBefore = new Date(Date.now() - STALE_ANALYSIS_MS).toISOString();
  const res = await db()
    .from("monitored_content")
    .update({ ingestion_status: "ANALYZING", analysis_started_at: new Date().toISOString(), ingestion_error: null })
    .eq("bank_id", bankId)
    .eq("id", id)
    .or(`ingestion_status.neq.ANALYZING,analysis_started_at.lt.${staleBefore}`)
    .select(COLUMNS)
    .maybeSingle();
  const row = unwrapMaybe(res, "claimForAnalysis") as MonitoredContent | null;
  if (row) return row;

  const exists = await getContent(bankId, id);
  if (!exists) throw new AppError("NOT_FOUND", "That post was not found for the selected institution.");
  throw new AppError("CONFLICT", "This post is already being analysed. Please wait for the current run to finish.");
}

/** Releases the analysis lock after a failure, recording a user-safe reason. */
export async function markAnalysisFailed(
  bankId: string,
  id: string,
  safeMessage: string,
  previousStatus: IngestionStatus,
): Promise<void> {
  // If the content had a previous successful analysis, keep it ANALYZED so its
  // history remains visible; otherwise mark it FAILED so it can be retried.
  const status: IngestionStatus = previousStatus === "ANALYZED" ? "ANALYZED" : "FAILED";
  const res = await db()
    .from("monitored_content")
    .update({ ingestion_status: status, ingestion_error: safeMessage, analysis_started_at: null })
    .eq("bank_id", bankId)
    .eq("id", id);
  if (res.error) console.error("[markAnalysisFailed]", res.error);
}

export async function deleteContent(bankId: string, id: string): Promise<void> {
  const res = await db().from("monitored_content").delete().eq("bank_id", bankId).eq("id", id).select("id").single();
  unwrap(res, "deleteContent");
}
