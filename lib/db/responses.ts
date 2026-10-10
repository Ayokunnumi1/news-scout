import "server-only";
import { db, unwrap, unwrapMaybe } from "@/lib/db/client";
import type { Classification, GeneratedResponse, ResponseStatus, RiskLevel } from "@/types/domain";

export interface ResponseListItem extends GeneratedResponse {
  investigations: {
    primary_claim: string;
    classification: Classification;
    risk_level: RiskLevel;
    risk_score: number;
  } | null;
}

export async function listResponses(bankId: string, status?: ResponseStatus): Promise<ResponseListItem[]> {
  let query = db()
    .from("responses")
    .select("*, investigations(primary_claim, classification, risk_level, risk_score)")
    .eq("bank_id", bankId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  return unwrap(await query, "listResponses") as ResponseListItem[];
}

export async function getResponse(bankId: string, id: string): Promise<GeneratedResponse | null> {
  const res = await db().from("responses").select("*").eq("bank_id", bankId).eq("id", id).maybeSingle();
  return unwrapMaybe(res, "getResponse") as GeneratedResponse | null;
}

export async function insertResponse(
  row: Pick<
    GeneratedResponse,
    | "bank_id"
    | "investigation_id"
    | "public_response"
    | "internal_communication"
    | "recommended_action"
    | "model"
    | "prompt_version"
  >,
): Promise<GeneratedResponse> {
  const res = await db()
    .from("responses")
    .insert({ ...row, original_public_response: row.public_response, status: "DRAFT" })
    .select("*")
    .single();
  return unwrap(res, "insertResponse") as GeneratedResponse;
}

export async function updateResponseText(
  bankId: string,
  id: string,
  text: { public_response: string; internal_communication: string },
): Promise<GeneratedResponse> {
  // Editing always returns the draft to DRAFT: an edited text must be re-approved.
  const res = await db()
    .from("responses")
    .update({ ...text, edited: true, status: "DRAFT", reviewer_name: null, reviewed_at: null })
    .eq("bank_id", bankId)
    .eq("id", id)
    .select("*")
    .single();
  return unwrap(res, "updateResponseText") as GeneratedResponse;
}

export async function setResponseStatus(
  bankId: string,
  id: string,
  status: ResponseStatus,
  reviewerName: string | null,
): Promise<GeneratedResponse> {
  const res = await db()
    .from("responses")
    .update({
      status,
      reviewer_name: status === "DRAFT" ? null : reviewerName,
      reviewed_at: status === "DRAFT" ? null : new Date().toISOString(),
    })
    .eq("bank_id", bankId)
    .eq("id", id)
    .select("*")
    .single();
  return unwrap(res, "setResponseStatus") as GeneratedResponse;
}
