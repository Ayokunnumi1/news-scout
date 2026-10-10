"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { BANK_COOKIE } from "@/lib/bank-context";
import { createBank, getActiveBank } from "@/lib/db/banks";
import { toSafeError, type ActionResult } from "@/lib/utils/errors";
import { bankInputSchema, fieldErrors, uuidSchema } from "@/lib/validation/schemas";

async function setBankCookie(bankId: string) {
  (await cookies()).set(BANK_COOKIE, bankId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function selectBankAction(bankId: string): Promise<ActionResult> {
  try {
    if (!uuidSchema.safeParse(bankId).success) return { ok: false, error: "Invalid institution." };
    const bank = await getActiveBank(bankId);
    if (!bank) return { ok: false, error: "That institution is not available." };
    await setBankCookie(bank.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toSafeError(error, "selectBankAction").message };
  }
}

export async function createBankAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = bankInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  try {
    const bank = await createBank(parsed.data);
    await setBankCookie(bank.id);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: bank.id } };
  } catch (error) {
    const safe = toSafeError(error, "createBankAction");
    return {
      ok: false,
      error: safe.code === "DUPLICATE" ? "An institution with that slug already exists." : safe.message,
    };
  }
}
