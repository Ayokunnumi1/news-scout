"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentBank } from "@/lib/bank-context";
import { logAudit } from "@/lib/db/audit";
import { createSource, deleteSource, setSourceActive, updateSource } from "@/lib/db/sources";
import { toSafeError, type ActionResult } from "@/lib/utils/errors";
import { fieldErrors, sourceInputSchema, uuidSchema } from "@/lib/validation/schemas";

export async function saveSourceAction(id: string | null, input: unknown): Promise<ActionResult> {
  const parsed = sourceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  if (id !== null && !uuidSchema.safeParse(id).success) return { ok: false, error: "Invalid source." };
  try {
    const bank = await requireCurrentBank();
    const source = id ? await updateSource(bank.id, id, parsed.data) : await createSource(bank.id, parsed.data);
    await logAudit({
      bankId: bank.id,
      type: id ? "SOURCE_UPDATED" : "SOURCE_CREATED",
      details: { source_id: source.id, name: source.name, source_type: source.source_type },
    });
    revalidatePath("/sources");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "saveSourceAction").message };
  }
}

export async function toggleSourceAction(id: string, active: boolean): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Invalid source." };
  try {
    const bank = await requireCurrentBank();
    await setSourceActive(bank.id, id, active);
    await logAudit({
      bankId: bank.id,
      type: active ? "SOURCE_ACTIVATED" : "SOURCE_DEACTIVATED",
      details: { source_id: id },
    });
    revalidatePath("/sources");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "toggleSourceAction").message };
  }
}

export async function deleteSourceAction(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Invalid source." };
  try {
    const bank = await requireCurrentBank();
    await deleteSource(bank.id, id);
    await logAudit({ bankId: bank.id, type: "SOURCE_DELETED", details: { source_id: id } });
    revalidatePath("/sources");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "deleteSourceAction").message };
  }
}
