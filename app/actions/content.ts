"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentBank } from "@/lib/bank-context";
import { logAudit } from "@/lib/db/audit";
import { createContent, deleteContent } from "@/lib/db/content";
import { toSafeError, type ActionResult } from "@/lib/utils/errors";
import { contentInputSchema, fieldErrors, uuidSchema } from "@/lib/validation/schemas";

export async function createContentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = contentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  try {
    const bank = await requireCurrentBank();
    const content = await createContent(bank.id, parsed.data);
    await logAudit({
      bankId: bank.id,
      type: "CONTENT_SUBMITTED",
      details: { content_id: content.id, platform: content.platform },
    });
    revalidatePath("/monitoring");
    return { ok: true, data: { id: content.id } };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "createContentAction").message };
  }
}

export async function deleteContentAction(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Invalid post." };
  try {
    const bank = await requireCurrentBank();
    await deleteContent(bank.id, id);
    await logAudit({ bankId: bank.id, type: "CONTENT_DELETED", details: { content_id: id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "deleteContentAction").message };
  }
}
