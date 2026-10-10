import "server-only";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { ConfigurationError, getAiEnv } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";

let cached: { client: OpenAI; key: string } | null = null;

function getClient() {
  let env;
  try {
    env = getAiEnv();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw new AppError(
        "AI_NOT_CONFIGURED",
        "AI analysis is not configured. An administrator needs to set OPENAI_API_KEY on the server.",
      );
    }
    throw error;
  }
  const key = `${env.OPENAI_API_KEY}|${env.OPENAI_BASE_URL ?? ""}|${env.AI_TIMEOUT_MS}`;
  if (!cached || cached.key !== key) {
    cached = {
      key,
      client: new OpenAI({
        apiKey: env.OPENAI_API_KEY,
        baseURL: env.OPENAI_BASE_URL,
        // No SDK-level retries: timing is controlled by the budget below.
        maxRetries: 0,
      }),
    };
  }
  return {
    client: cached.client,
    model: env.OPENAI_MODEL,
    reasoningEffort: env.AI_REASONING_EFFORT,
    timeoutMs: env.AI_TIMEOUT_MS,
  };
}

/** Total time one request may spend on AI calls; stays under the routes' 60s maxDuration. */
const TOTAL_BUDGET_MS = 55_000;
/** Don't start a retry with less time than this left. */
const MIN_ATTEMPT_MS = 10_000;

export interface StructuredResult<T> {
  data: T;
  model: string;
}

/**
 * Calls the model with a strict JSON schema derived from `schema`, then
 * re-validates the reply with Zod. Invalid output is retried once and then
 * rejected — it is never returned to callers (and so never saved).
 */
export async function generateStructured<S extends z.ZodType>(params: {
  schema: S;
  schemaName: string;
  system: string;
  user: string;
}): Promise<StructuredResult<z.infer<S>>> {
  const { client, model, reasoningEffort, timeoutMs } = getClient();
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const responseFormat = zodResponseFormat(params.schema, params.schemaName);
  // Gemini's OpenAI-compatible endpoint also accepts "none"/"minimal", which the
  // OpenAI SDK types don't list; the value is validated in lib/env.ts.
  const reasoning = reasoningEffort ? { reasoning_effort: reasoningEffort as "low" } : {};

  let lastIssue = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt > 1 && remaining < MIN_ATTEMPT_MS) break;
    let completion;
    try {
      completion = await client.chat.completions.create(
        {
          model,
          ...reasoning,
          response_format: responseFormat,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
        },
        { timeout: Math.min(timeoutMs, remaining) },
      );
    } catch (error) {
      throw mapOpenAiError(error);
    }

    const choice = completion.choices[0];
    if (choice?.message?.refusal) {
      throw new AppError("AI_REFUSED", "The AI model declined to analyse this content. Please review it manually.");
    }
    const raw = choice?.message?.content;
    if (!raw) {
      lastIssue = "empty response";
      continue;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      lastIssue = "response was not valid JSON";
      continue;
    }

    const parsed = params.schema.safeParse(json);
    if (parsed.success) {
      return { data: parsed.data, model: completion.model || model };
    }
    lastIssue = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }

  throw new AppError(
    "AI_MALFORMED_OUTPUT",
    "The AI returned an incomplete or invalid result, so nothing was saved. Please try again.",
    { cause: new Error(`Schema validation failed: ${lastIssue}`) },
  );
}

function mapOpenAiError(error: unknown): AppError {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AppError("AI_TIMEOUT", "The AI service took too long to respond. Please try again in a moment.", {
      cause: error,
    });
  }
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
    return new AppError(
      "AI_NOT_CONFIGURED",
      "The AI service rejected the server's credentials. An administrator needs to check OPENAI_API_KEY.",
      { cause: error },
    );
  }
  if (error instanceof OpenAI.RateLimitError) {
    return new AppError("AI_UNAVAILABLE", "The AI service is busy or over quota. Please try again shortly.", {
      cause: error,
    });
  }
  if (error instanceof OpenAI.NotFoundError || error instanceof OpenAI.BadRequestError) {
    return new AppError(
      "AI_UNAVAILABLE",
      "The AI service could not process this request. An administrator should check the configured model.",
      { cause: error },
    );
  }
  return new AppError("AI_UNAVAILABLE", "The AI service is currently unavailable. Please try again later.", {
    cause: error,
  });
}
