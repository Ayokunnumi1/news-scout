"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createContentAction } from "@/app/actions/content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client/api";
import { PLATFORM_LABELS } from "@/lib/labels";
import { PLATFORMS, type Platform } from "@/types/domain";

type Stage = "idle" | "saving" | "analysing";

export function SubmitPostForm({ aiConfigured }: { aiConfigured: boolean }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("X");
  const [analyseNow, setAnalyseNow] = useState(aiConfigured);
  const [stage, setStage] = useState<Stage>("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stage !== "idle") return;
    const fd = new FormData(event.currentTarget);
    setErrors({});
    setFormError(null);
    setStage("saving");

    const created = await createContentAction({
      platform,
      author: String(fd.get("author") ?? ""),
      author_handle: String(fd.get("author_handle") ?? ""),
      content: String(fd.get("content") ?? ""),
      source_url: String(fd.get("source_url") ?? ""),
      // datetime-local has no timezone; interpret it in the reviewer's local time.
      published_at: fd.get("published_at") ? new Date(String(fd.get("published_at"))).toISOString() : "",
      engagement_count: String(fd.get("engagement_count") ?? "0"),
    });
    if (!created.ok) {
      setErrors(created.fieldErrors ?? {});
      setFormError(created.error);
      setStage("idle");
      return;
    }

    if (!analyseNow) {
      toast.success("Post saved. You can analyse it from the monitoring list.");
      router.push("/monitoring");
      return;
    }

    setStage("analysing");
    const analysed = await postJson<{ investigationId: string }>("/api/investigations", { contentId: created.data.id });
    if (!analysed.ok) {
      toast.error(`Post saved, but analysis failed: ${analysed.error}`);
      router.push("/monitoring");
      return;
    }
    toast.success("Analysis complete.");
    router.push(`/investigations/${analysed.data.investigationId}`);
  }

  const busy = stage !== "idle";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>{formError}</AlertTitle>
          {errors._form ? <AlertDescription>{errors._form.join(" ")}</AlertDescription> : null}
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="content">Post or article text *</Label>
        <Textarea
          id="content"
          name="content"
          required
          rows={6}
          maxLength={10_000}
          placeholder="Paste the exact text of the suspicious post or article…"
          aria-invalid={Boolean(errors.content)}
          aria-describedby={errors.content ? "content-error" : undefined}
          disabled={busy}
        />
        <FieldError id="content-error" messages={errors.content} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="platform">Platform *</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)} disabled={busy}>
            <SelectTrigger id="platform" aria-invalid={Boolean(errors.platform)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={errors.platform} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="engagement_count">Engagement (likes + shares + comments)</Label>
          <Input
            id="engagement_count"
            name="engagement_count"
            type="number"
            min={0}
            step={1}
            defaultValue={0}
            inputMode="numeric"
            aria-invalid={Boolean(errors.engagement_count)}
            disabled={busy}
          />
          <FieldError messages={errors.engagement_count} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="author">Author name</Label>
          <Input id="author" name="author" maxLength={200} disabled={busy} aria-invalid={Boolean(errors.author)} />
          <FieldError messages={errors.author} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="author_handle">Author handle</Label>
          <Input
            id="author_handle"
            name="author_handle"
            maxLength={200}
            placeholder="@handle"
            disabled={busy}
            aria-invalid={Boolean(errors.author_handle)}
          />
          <FieldError messages={errors.author_handle} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source_url">Source URL</Label>
          <Input
            id="source_url"
            name="source_url"
            type="url"
            placeholder="https://"
            disabled={busy}
            aria-invalid={Boolean(errors.source_url)}
          />
          <FieldError messages={errors.source_url} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="published_at">Published at</Label>
          <Input
            id="published_at"
            name="published_at"
            type="datetime-local"
            disabled={busy}
            aria-invalid={Boolean(errors.published_at)}
          />
          <FieldError messages={errors.published_at} />
        </div>
      </div>

      <div className="bg-muted/40 flex items-start gap-3 rounded-md border p-3">
        <Switch
          id="analyse_now"
          checked={analyseNow}
          onCheckedChange={setAnalyseNow}
          disabled={busy || !aiConfigured}
        />
        <div className="space-y-0.5">
          <Label htmlFor="analyse_now">Analyse immediately</Label>
          <p className="text-muted-foreground text-xs">
            {aiConfigured
              ? "Extract the claim, compare it with this institution's trusted sources, and score the reputation risk."
              : "AI is not configured on this server, so the post will be saved for later analysis."}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {stage === "saving"
            ? "Saving…"
            : stage === "analysing"
              ? "Analysing…"
              : analyseNow
                ? "Submit & analyse"
                : "Save post"}
        </Button>
      </div>
      {stage === "analysing" ? (
        <p className="text-muted-foreground text-right text-xs" role="status">
          Extracting the claim, comparing it with trusted sources and scoring risk. This usually takes 10–30 seconds.
        </p>
      ) : null}
    </form>
  );
}

function FieldError({ messages, id }: { messages?: string[]; id?: string }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-destructive text-xs">
      {messages.join(" ")}
    </p>
  );
}
