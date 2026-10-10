import "server-only";
import type { NextRequest } from "next/server";
import { AppError, toSafeError } from "@/lib/utils/errors";

const MAX_BODY_BYTES = 1_000_000;

/**
 * Parses a JSON body from a same-origin request. Requiring application/json
 * plus a matching Origin header blocks cross-site form posts (CSRF).
 */
export async function readJson(request: NextRequest): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    throw new AppError("VALIDATION", "Cross-origin requests are not allowed.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new AppError("VALIDATION", "Expected a JSON request body.");
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new AppError("VALIDATION", "Request body is too large.");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new AppError("VALIDATION", "Request body is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION", "Request body is not valid JSON.");
  }
}

export function errorResponse(error: unknown, context: string): Response {
  const safe = toSafeError(error, context);
  return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
}
