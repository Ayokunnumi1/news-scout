import "server-only";
import { db } from "@/lib/db/client";

export type AuditEventType =
  | "CONTENT_SUBMITTED"
  | "CONTENT_IMPORTED"
  | "CONTENT_DELETED"
  | "ANALYSIS_FAILED"
  | "RESPONSE_GENERATED"
  | "RESPONSE_EDITED"
  | "RESPONSE_APPROVED"
  | "RESPONSE_REJECTED"
  | "RESPONSE_REOPENED"
  | "PLATFORM_ACTION_UPDATED"
  | "SOURCE_CREATED"
  | "SOURCE_UPDATED"
  | "SOURCE_ACTIVATED"
  | "SOURCE_DEACTIVATED"
  | "SOURCE_DELETED";

/**
 * Appends an audit event. Audit logging failures are logged but never block
 * the user's action (the primary write has already succeeded).
 */
export async function logAudit(event: {
  bankId: string;
  type: AuditEventType;
  investigationId?: string | null;
  actor?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const res = await db()
    .from("audit_events")
    .insert({
      bank_id: event.bankId,
      investigation_id: event.investigationId ?? null,
      event_type: event.type,
      actor: event.actor ?? "Demo Administrator",
      details: event.details ?? {},
    });
  if (res.error) console.error("[logAudit] failed to write audit event", event.type, res.error.message);
}
