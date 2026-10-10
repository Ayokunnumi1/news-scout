import "server-only";
import { db, unwrap, unwrapMaybe } from "@/lib/db/client";
import type { BankInput } from "@/lib/validation/schemas";
import type { Bank } from "@/types/domain";

const COLUMNS = "id, name, slug, description, logo_url, status, created_at";

export async function listBanks(): Promise<Bank[]> {
  const res = await db().from("banks").select(COLUMNS).order("name");
  return unwrap(res, "listBanks") as Bank[];
}

export async function getActiveBank(id: string): Promise<Bank | null> {
  const res = await db().from("banks").select(COLUMNS).eq("id", id).eq("status", "ACTIVE").maybeSingle();
  return unwrapMaybe(res, "getActiveBank") as Bank | null;
}

export async function getFirstActiveBank(): Promise<Bank | null> {
  const res = await db().from("banks").select(COLUMNS).eq("status", "ACTIVE").order("name").limit(1).maybeSingle();
  return unwrapMaybe(res, "getFirstActiveBank") as Bank | null;
}

export async function createBank(input: BankInput): Promise<Bank> {
  const res = await db()
    .from("banks")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description,
      logo_url: input.logo_url,
      status: "ACTIVE",
    })
    .select(COLUMNS)
    .single();
  return unwrap(res, "createBank") as Bank;
}

export async function setBankStatus(id: string, status: Bank["status"]): Promise<void> {
  const res = await db().from("banks").update({ status }).eq("id", id).select("id").single();
  unwrap(res, "setBankStatus");
}
