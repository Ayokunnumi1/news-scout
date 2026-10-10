import { db } from "@/lib/db/client";
import { isAiConfigured } from "@/lib/env";

/** Liveness/readiness probe. Reports configuration state without exposing secrets. */
export async function GET() {
  let database: "ok" | "unavailable" = "unavailable";
  try {
    const res = await db().from("banks").select("id", { head: true, count: "exact" }).limit(1);
    database = res.error ? "unavailable" : "ok";
  } catch {
    database = "unavailable";
  }
  const ai = isAiConfigured() ? "configured" : "not_configured";
  return Response.json(
    { status: database === "ok" ? "ok" : "degraded", database, ai },
    { status: database === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
