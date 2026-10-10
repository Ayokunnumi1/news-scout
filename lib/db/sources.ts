import "server-only";
import { db, unwrap } from "@/lib/db/client";
import type { SourceInput } from "@/lib/validation/schemas";
import type { TrustedSource } from "@/types/domain";

const COLUMNS = "id, bank_id, name, source_type, url, content, trust_level, active, created_at, updated_at";

export async function listSources(bankId: string): Promise<TrustedSource[]> {
  const res = await db()
    .from("trusted_sources")
    .select(COLUMNS)
    .eq("bank_id", bankId)
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });
  return unwrap(res, "listSources") as TrustedSource[];
}

export async function listActiveSources(bankId: string): Promise<TrustedSource[]> {
  const res = await db()
    .from("trusted_sources")
    .select(COLUMNS)
    .eq("bank_id", bankId)
    .eq("active", true)
    .order("trust_level")
    .order("created_at", { ascending: false });
  return unwrap(res, "listActiveSources") as TrustedSource[];
}

export async function createSource(bankId: string, input: SourceInput): Promise<TrustedSource> {
  const res = await db()
    .from("trusted_sources")
    .insert({ ...input, bank_id: bankId })
    .select(COLUMNS)
    .single();
  return unwrap(res, "createSource") as TrustedSource;
}

export async function updateSource(bankId: string, id: string, input: SourceInput): Promise<TrustedSource> {
  const res = await db()
    .from("trusted_sources")
    .update(input)
    .eq("bank_id", bankId)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  return unwrap(res, "updateSource") as TrustedSource;
}

export async function setSourceActive(bankId: string, id: string, active: boolean): Promise<void> {
  const res = await db()
    .from("trusted_sources")
    .update({ active })
    .eq("bank_id", bankId)
    .eq("id", id)
    .select("id")
    .single();
  unwrap(res, "setSourceActive");
}

export async function deleteSource(bankId: string, id: string): Promise<void> {
  const res = await db().from("trusted_sources").delete().eq("bank_id", bankId).eq("id", id).select("id").single();
  unwrap(res, "deleteSource");
}
