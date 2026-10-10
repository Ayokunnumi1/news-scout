"use client";

import { Check, ClipboardCopy, Loader2, Pencil, RotateCcw, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { editResponseAction, reviewResponseAction } from "@/app/actions/review";
import { ResponseStatusBadge } from "@/components/shared/indicators";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client/api";
import { formatDateTime } from "@/lib/utils/format";
import type { GeneratedResponse } from "@/types/domain";

// Human-in-the-loop response workflow. The public response can be edited,
// approved, rejected and copied. NOTHING is published from here: "Approve"
// records sign-off; staff copy the approved text and post it themselves.

export function GenerateResponseButton({
  investigationId,
  hasExisting,
  aiConfigured,
}: {
  investigationId: string;
  hasExisting: boolean;
  aiConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const id = toast.loading("Drafting response from verified evidence…");
    const res = await postJson<{ responseId: string }>(`/api/investigations/${investigationId}/responses`, {});
    setPending(false);
    if (!res.ok) {
      toast.error(res.error, { id });
      return;
    }
    toast.success("Draft response generated. It requires human approval.", { id });
    router.refresh();
  }

  return (
    <Button
      onClick={run}
      disabled={pending || !aiConfigured}
      variant={hasExisting ? "outline" : "default"}
      size={hasExisting ? "sm" : "default"}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
      {pending ? "Generating…" : hasExisting ? "Regenerate" : "Generate official response"}
    </Button>
  );
}

export function ResponseEditor({ response }: { response: GeneratedResponse }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [publicText, setPublicText] = useState(response.public_response);
  const [internalText, setInternalText] = useState(response.internal_communication);
  const [reviewer, setReviewer] = useState("Demo Administrator");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const isDraft = response.status === "DRAFT";

  function save() {
    startTransition(async () => {
      const res = await editResponseAction(response.id, {
        public_response: publicText,
        internal_communication: internalText,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      setMode("view");
      toast.success("Changes saved. The edited response needs approval.");
      router.refresh();
    });
  }

  function review(decision: "APPROVE" | "REJECT" | "REOPEN") {
    startTransition(async () => {
      const res = await reviewResponseAction(response.id, decision, { reviewer_name: reviewer });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      toast.success(
        decision === "APPROVE"
          ? "Response approved. Copy it and publish through the official channel."
          : decision === "REJECT"
            ? "Response rejected."
            : "Response reopened for review.",
      );
      router.refresh();
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(response.public_response);
      toast.success("Public response copied to clipboard.");
    } catch {
      toast.error("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ResponseStatusBadge status={response.status} />
          {response.edited ? <span className="text-muted-foreground text-xs">Edited by reviewer</span> : null}
        </div>
        <span className="text-muted-foreground text-xs">
          Drafted {formatDateTime(response.created_at)} · {response.model}
        </span>
      </div>

      {response.status === "APPROVED" ? (
        <Alert variant="info">
          <Check aria-hidden />
          <AlertTitle>
            Approved by {response.reviewer_name} on {formatDateTime(response.reviewed_at)}
          </AlertTitle>
          <AlertDescription>
            NewsScout does not publish anything. Copy the approved text and post it through the institution&apos;s
            official account.
          </AlertDescription>
        </Alert>
      ) : null}
      {response.status === "REJECTED" ? (
        <Alert>
          <X aria-hidden />
          <AlertTitle>
            Rejected by {response.reviewer_name} on {formatDateTime(response.reviewed_at)}
          </AlertTitle>
          <AlertDescription>Regenerate a new draft or reopen this one to edit it.</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Public response</h4>
        {mode === "edit" ? (
          <>
            <Textarea
              value={publicText}
              onChange={(e) => setPublicText(e.target.value)}
              rows={5}
              maxLength={1200}
              aria-label="Public response"
              aria-invalid={Boolean(errors.public_response)}
            />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span className="text-destructive">{errors.public_response?.join(" ")}</span>
              <span className="tabular-nums">{publicText.length}/1200</span>
            </div>
          </>
        ) : (
          <blockquote className="border-primary bg-muted/50 rounded-md border-l-4 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {response.public_response}
          </blockquote>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Internal communication</h4>
        {mode === "edit" ? (
          <>
            <Textarea
              value={internalText}
              onChange={(e) => setInternalText(e.target.value)}
              rows={6}
              maxLength={3000}
              aria-label="Internal communication"
              aria-invalid={Boolean(errors.internal_communication)}
            />
            <p className="text-destructive text-xs">{errors.internal_communication?.join(" ")}</p>
          </>
        ) : (
          <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
            {response.internal_communication}
          </p>
        )}
      </section>

      <section className="space-y-1">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Recommended action</h4>
        <p className="text-sm">{response.recommended_action}</p>
      </section>

      {response.edited && mode === "view" ? (
        <details className="text-muted-foreground text-xs">
          <summary className="hover:text-foreground cursor-pointer">Original AI draft (kept for audit)</summary>
          <p className="bg-card text-foreground/80 mt-2 rounded-md border p-3 text-sm whitespace-pre-wrap">
            {response.original_public_response}
          </p>
        </details>
      ) : null}

      <div className="flex flex-col gap-3 border-t pt-4">
        {mode === "edit" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPublicText(response.public_response);
                setInternalText(response.internal_communication);
                setErrors({});
                setMode("view");
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />} Save changes
            </Button>
          </div>
        ) : (
          <>
            {isDraft ? (
              <div className="flex flex-col gap-1.5 sm:max-w-xs">
                <Label htmlFor={`reviewer-${response.id}`}>Reviewer name</Label>
                <Input
                  id={`reviewer-${response.id}`}
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  maxLength={120}
                  aria-invalid={Boolean(errors.reviewer_name)}
                />
                {errors.reviewer_name ? (
                  <p className="text-destructive text-xs">{errors.reviewer_name.join(" ")}</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => (isDraft ? setMode("edit") : review("REOPEN"))}
                disabled={pending}
              >
                {isDraft ? <Pencil aria-hidden /> : <RotateCcw aria-hidden />}
                {isDraft ? "Edit" : "Reopen to edit"}
              </Button>
              {isDraft ? (
                <>
                  <Button onClick={() => review("APPROVE")} disabled={pending}>
                    <Check aria-hidden /> Approve
                  </Button>
                  <Button variant="ghost" onClick={() => review("REJECT")} disabled={pending}>
                    <X aria-hidden /> Reject
                  </Button>
                </>
              ) : null}
              <Button variant="secondary" onClick={copy} disabled={pending} className="sm:ml-auto">
                <ClipboardCopy aria-hidden /> Copy
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
