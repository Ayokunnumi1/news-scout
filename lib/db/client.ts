import "server-only";
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { ConfigurationError, getDatabaseEnv } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";

// Server-side Supabase client using the service-role key. It bypasses RLS, so
// every query in lib/db/* MUST be scoped by bank_id. This module is
// server-only and its key never reaches the browser.

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  let env;
  try {
    env = getDatabaseEnv();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw new AppError(
        "DB_NOT_CONFIGURED",
        "The database is not configured. An administrator needs to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    throw error;
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "newsscout" } },
  });
  return client;
}

/** Throws a user-safe AppError for any Postgrest error; never leaks SQL details. */
export function dbError(error: PostgrestError, context: string): AppError {
  if (error.code === "23505") {
    return new AppError("DUPLICATE", "This item already exists.", { cause: error });
  }
  if (error.code === "23503") {
    return new AppError("NOT_FOUND", "A related record no longer exists.", { cause: error });
  }
  if (error.code === "22P02" || error.code === "23514") {
    return new AppError("VALIDATION", "Some of the submitted values are invalid.", { cause: error });
  }
  return new AppError("DB_ERROR", "We couldn't reach the database. Please try again shortly.", {
    cause: new Error(`${context}: ${error.code} ${error.message}`),
  });
}

export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }, context: string): T {
  if (result.error) throw dbError(result.error, context);
  if (result.data === null) throw new AppError("NOT_FOUND", "The requested record was not found.");
  return result.data;
}

/** Like unwrap, but returns null when the row does not exist (use with maybeSingle). */
export function unwrapMaybe<T>(result: { data: T | null; error: PostgrestError | null }, context: string): T | null {
  if (result.error) throw dbError(result.error, context);
  return result.data;
}
