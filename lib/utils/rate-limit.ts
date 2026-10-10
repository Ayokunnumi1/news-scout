import "server-only";
import { headers } from "next/headers";
import { getAiRateLimitPerMinute } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";

// Basic fixed-window rate limiter for the AI endpoints.
// In-memory, so limits apply per server instance; on multi-instance or
// serverless deployments use a shared store (e.g. Upstash/Vercel KV) instead.

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function enforceAiRateLimit(scope: string): Promise<void> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const limit = getAiRateLimitPerMinute();

  if (buckets.size > 5_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (bucket.count >= limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new AppError("RATE_LIMITED", `Too many AI requests. Please wait ${seconds}s and try again.`);
  }
  bucket.count++;
}
