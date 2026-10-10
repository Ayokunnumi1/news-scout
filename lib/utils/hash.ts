import { createHash } from "node:crypto";

/** Stable fingerprint of post text used to detect duplicate submissions per bank. */
export function contentHash(content: string): string {
  const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}
