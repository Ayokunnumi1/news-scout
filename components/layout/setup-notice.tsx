import { DatabaseZap, Radar } from "lucide-react";

const COPY = {
  "db-config": {
    title: "Database not configured",
    body: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (see README), then restart the server.",
  },
  "db-down": {
    title: "Database unavailable",
    body: "NewsScout could not reach the database. Check that Supabase is running and the migrations have been applied.",
  },
  "no-banks": {
    title: "No institutions yet",
    body: "Run `npm run db:seed` to load the demo institutions, or create an institution via the database.",
  },
} as const;

export function SetupNotice({ reason, message }: { reason: keyof typeof COPY; message?: string }) {
  const copy = COPY[reason];
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="bg-card w-full max-w-lg rounded-lg border p-8 shadow-sm">
        <div className="text-primary mb-6 flex items-center gap-2">
          <Radar className="size-5" aria-hidden />
          <span className="text-sm font-semibold">NewsScout</span>
        </div>
        <div className="flex gap-3">
          <DatabaseZap className="text-risk-high mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="space-y-2">
            <h1 className="text-base font-semibold">{copy.title}</h1>
            <p className="text-muted-foreground text-sm">{copy.body}</p>
            {message && reason !== "no-banks" ? <p className="text-muted-foreground text-xs">{message}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
