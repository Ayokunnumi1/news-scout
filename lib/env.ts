import "server-only";
import { z } from "zod";

// Server-only environment access. Nothing here is ever exposed to the client
// bundle: there are deliberately no NEXT_PUBLIC_ variables in this app.

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

const aiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(10),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  OPENAI_BASE_URL: z.url().optional(),
  // Per-call timeout. Clamped (not rejected) so a bad value can't disable AI.
  // lib/ai/client.ts additionally enforces a 55s total budget per request.
  AI_TIMEOUT_MS: z.coerce
    .number()
    .catch(45_000)
    .default(45_000)
    .transform((n) => Math.min(Math.max(Math.round(n), 5_000), 55_000)),
  // Only for reasoning models (e.g. Gemini 3.x, OpenAI o-series/gpt-5). Unset = not sent,
  // because non-reasoning models such as gpt-4.1-mini reject the parameter.
  AI_REASONING_EFFORT: z.enum(["none", "minimal", "low", "medium", "high"]).optional().catch(undefined),
});

export class ConfigurationError extends Error {}

function blankToUndefined(value: string | undefined) {
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export function getDatabaseEnv() {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: blankToUndefined(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: blankToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
  if (!parsed.success) {
    throw new ConfigurationError("Database is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return parsed.data;
}

export function getAiEnv() {
  const parsed = aiEnvSchema.safeParse({
    OPENAI_API_KEY: blankToUndefined(process.env.OPENAI_API_KEY),
    OPENAI_MODEL: blankToUndefined(process.env.OPENAI_MODEL),
    OPENAI_BASE_URL: blankToUndefined(process.env.OPENAI_BASE_URL),
    AI_TIMEOUT_MS: blankToUndefined(process.env.AI_TIMEOUT_MS),
    AI_REASONING_EFFORT: blankToUndefined(process.env.AI_REASONING_EFFORT)?.toLowerCase(),
  });
  if (!parsed.success) {
    throw new ConfigurationError("AI is not configured (OPENAI_API_KEY).");
  }
  return parsed.data;
}

export function isAiConfigured() {
  return Boolean(blankToUndefined(process.env.OPENAI_API_KEY));
}

export function getAiModelName() {
  return blankToUndefined(process.env.OPENAI_MODEL) ?? "gpt-4.1-mini";
}

export function getAiRateLimitPerMinute() {
  const n = Number(process.env.AI_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}
