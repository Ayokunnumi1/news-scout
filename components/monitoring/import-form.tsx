"use client";

import { FileUp, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client/api";

const MAX_ROWS = 200;
const MAX_FILE_BYTES = 1_000_000;

const EXAMPLE_JSON = `[
  {
    "platform": "X",
    "author": "Jane Doe",
    "author_handle": "@janedoe",
    "content": "Heard the bank is closing all branches next month!",
    "source_url": "https://x.com/janedoe/status/1",
    "published_at": "2026-10-01T09:30:00Z",
    "engagement_count": 1200
  }
]`;

type ImportResult = { inserted: number; duplicates: number; invalid: { row: number; errors: string[] }[] };

export function ImportForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("File is larger than 1 MB. Split it into smaller batches.");
      return;
    }
    setText(await file.text());
    setError(null);
  }

  function parse(raw: string): Record<string, unknown>[] {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error("Paste JSON or CSV content, or choose a file.");
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        throw new Error("The JSON could not be parsed. Check for missing commas or quotes.");
      }
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      if (!rows.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
        throw new Error("JSON must be an object or an array of objects.");
      }
      return rows as Record<string, unknown>[];
    }
    const csv = Papa.parse<Record<string, unknown>>(trimmed, { header: true, skipEmptyLines: true });
    if (csv.errors.length && csv.data.length === 0) throw new Error("The CSV could not be parsed.");
    return csv.data;
  }

  async function onImport() {
    setError(null);
    setResult(null);
    let rows: Record<string, unknown>[];
    try {
      rows = parse(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the input.");
      return;
    }
    if (rows.length === 0) return setError("No rows found.");
    if (rows.length > MAX_ROWS) return setError(`Import at most ${MAX_ROWS} rows at a time (found ${rows.length}).`);

    setBusy(true);
    const res = await postJson<ImportResult>("/api/content/import", { rows });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setResult(res.data);
    if (res.data.inserted > 0) {
      toast.success(`Imported ${res.data.inserted} post${res.data.inserted === 1 ? "" : "s"}.`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Upload or paste a JSON array or a CSV with a header row. Columns: <code className="text-xs">platform</code> (X,
        FACEBOOK, INSTAGRAM, NEWS, BLOG, OTHER), <code className="text-xs">content</code> (required),{" "}
        <code className="text-xs">author</code>, <code className="text-xs">author_handle</code>,{" "}
        <code className="text-xs">source_url</code>, <code className="text-xs">published_at</code>,{" "}
        <code className="text-xs">engagement_count</code>. Duplicates are skipped automatically.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor="import-file"
          className="border-input bg-card hover:bg-accent inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm shadow-xs"
        >
          <FileUp className="size-4" aria-hidden /> Choose .json or .csv file
        </Label>
        <input
          id="import-file"
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="sr-only"
          onChange={onFile}
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setText(EXAMPLE_JSON)}>
          Insert example
        </Button>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="font-mono text-xs"
        placeholder="Paste JSON or CSV here…"
        aria-label="Import data"
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}

      {result ? (
        <Alert variant={result.invalid.length ? "warning" : "info"}>
          <AlertTitle>
            {result.inserted} imported · {result.duplicates} duplicate{result.duplicates === 1 ? "" : "s"} skipped ·{" "}
            {result.invalid.length} invalid
          </AlertTitle>
          {result.invalid.length ? (
            <AlertDescription>
              <ul className="list-disc pl-4">
                {result.invalid.slice(0, 10).map((r) => (
                  <li key={r.row}>
                    Row {r.row}: {r.errors.join("; ")}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          ) : null}
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        {result?.inserted ? (
          <Button variant="outline" onClick={() => router.push("/monitoring?status=PENDING")}>
            View pending posts
          </Button>
        ) : null}
        <Button onClick={onImport} disabled={busy || !text.trim()}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
          Import
        </Button>
      </div>
    </div>
  );
}
