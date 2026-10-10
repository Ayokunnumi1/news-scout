// User-safe errors. `message` is always safe to show in the UI; internal
// details go to server logs only, never to the client.

export type AppErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_MALFORMED_OUTPUT"
  | "AI_UNAVAILABLE"
  | "AI_REFUSED"
  | "DB_NOT_CONFIGURED"
  | "DB_ERROR"
  | "VALIDATION"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NO_BANK_SELECTED";

const STATUS: Record<AppErrorCode, number> = {
  AI_NOT_CONFIGURED: 503,
  AI_TIMEOUT: 504,
  AI_MALFORMED_OUTPUT: 502,
  AI_UNAVAILABLE: 502,
  AI_REFUSED: 422,
  DB_NOT_CONFIGURED: 503,
  DB_ERROR: 500,
  VALIDATION: 400,
  DUPLICATE: 409,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  NO_BANK_SELECTED: 400,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
  }
}

const GENERIC_MESSAGE = "Something went wrong. Please try again, and contact support if it keeps happening.";

/** Converts any thrown value into a safe {code, message, status} for clients, logging the original. */
export function toSafeError(error: unknown, context: string) {
  if (error instanceof AppError) {
    if (error.status >= 500) console.error(`[${context}] ${error.code}:`, error.cause ?? error.message);
    return { code: error.code, message: error.message, status: error.status };
  }
  console.error(`[${context}] unexpected error:`, error);
  return { code: "INTERNAL" as const, message: GENERIC_MESSAGE, status: 500 };
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
