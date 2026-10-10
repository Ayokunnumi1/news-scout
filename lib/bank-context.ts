import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getActiveBank, getFirstActiveBank } from "@/lib/db/banks";
import { AppError } from "@/lib/utils/errors";
import { uuidSchema } from "@/lib/validation/schemas";
import type { Bank } from "@/types/domain";

// The selected institution is held in an httpOnly cookie and resolved on the
// server for every request. All data access takes the resolved bank id, so a
// client can never read or write another institution's data by passing ids.

export const BANK_COOKIE = "ns_bank";

export const getCurrentBank = cache(async (): Promise<Bank | null> => {
  const raw = (await cookies()).get(BANK_COOKIE)?.value;
  if (raw && uuidSchema.safeParse(raw).success) {
    const bank = await getActiveBank(raw);
    if (bank) return bank;
  }
  return getFirstActiveBank();
});

export async function requireCurrentBank(): Promise<Bank> {
  const bank = await getCurrentBank();
  if (!bank) {
    throw new AppError("NO_BANK_SELECTED", "No active institution is available. Create or seed an institution first.");
  }
  return bank;
}
