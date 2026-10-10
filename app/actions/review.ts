"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentBank } from "@/lib/bank-context";
import { logAudit } from "@/lib/db/audit";
import { updatePlatformActionStatus } from "@/lib/db/investigations";
import { getResponse, setResponseStatus, updateResponseText } from "@/lib/db/responses";
import { toSafeError, type ActionResult } from "@/lib/utils/errors";
import {
  fieldErrors,
  platformActionUpdateSchema,
  responseEditSchema,
  reviewerSchema,
  uuidSchema,
} from "@/lib/validation/schemas";

// Human-in-the-loop actions. Nothing here publishes or reports anything
// externally: approval only records that a person signed off the text, and
// platform actions are executed manually by staff and recorded here.

function refresh(investigationId: string) {
  revalidatePath(`/investigations/${investigationId}`);
  revalidatePath("/responses");
  revalidatePath("/dashboard");
}

export async function editResponseAction(responseId: string, input: unknown): Promise<ActionResult> {
  if (!uuidSchema.safeParse(responseId).success) return { ok: false, error: "Invalid response." };
  const parsed = responseEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  try {
    const bank = await requireCurrentBank();
    const before = await getResponse(bank.id, responseId);
    if (!before) return { ok: false, error: "That response was not found." };
    const updated = await updateResponseText(bank.id, responseId, parsed.data);
    await logAudit({
      bankId: bank.id,
      investigationId: updated.investigation_id,
      type: "RESPONSE_EDITED",
      details: {
        response_id: responseId,
        previous_status: before.status,
        previous_public_response: before.public_response,
        public_response: updated.public_response,
      },
    });
    refresh(updated.investigation_id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "editResponseAction").message };
  }
}

export async function reviewResponseAction(
  responseId: string,
  decision: "APPROVE" | "REJECT" | "REOPEN",
  input: unknown,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(responseId).success) return { ok: false, error: "Invalid response." };
  let reviewer: string | null = null;
  if (decision !== "REOPEN") {
    const parsed = reviewerSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Enter the reviewer's name.", fieldErrors: fieldErrors(parsed.error) };
    }
    reviewer = parsed.data.reviewer_name;
  }
  try {
    const bank = await requireCurrentBank();
    const current = await getResponse(bank.id, responseId);
    if (!current) return { ok: false, error: "That response was not found." };
    if (decision !== "REOPEN" && current.status !== "DRAFT") {
      return { ok: false, error: "Only responses awaiting approval can be approved or rejected." };
    }
    if (decision === "REOPEN" && current.status === "DRAFT") {
      return { ok: false, error: "This response is already awaiting approval." };
    }
    const status = decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "DRAFT";
    const updated = await setResponseStatus(bank.id, responseId, status, reviewer);
    await logAudit({
      bankId: bank.id,
      investigationId: updated.investigation_id,
      type:
        decision === "APPROVE"
          ? "RESPONSE_APPROVED"
          : decision === "REJECT"
            ? "RESPONSE_REJECTED"
            : "RESPONSE_REOPENED",
      actor: reviewer ?? "Demo Administrator",
      details: { response_id: responseId, approved_text: decision === "APPROVE" ? updated.public_response : undefined },
    });
    refresh(updated.investigation_id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "reviewResponseAction").message };
  }
}

export async function updatePlatformActionAction(investigationId: string, input: unknown): Promise<ActionResult> {
  if (!uuidSchema.safeParse(investigationId).success) return { ok: false, error: "Invalid investigation." };
  const parsed = platformActionUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid action update." };
  try {
    const bank = await requireCurrentBank();
    await updatePlatformActionStatus(bank.id, investigationId, parsed.data.status, parsed.data.note);
    await logAudit({
      bankId: bank.id,
      investigationId,
      type: "PLATFORM_ACTION_UPDATED",
      details: { status: parsed.data.status, note: parsed.data.note || undefined },
    });
    refresh(investigationId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "updatePlatformActionAction").message };
  }
}
