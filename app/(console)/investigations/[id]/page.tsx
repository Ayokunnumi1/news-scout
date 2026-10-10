import {
  ArrowLeft,
  BadgeCheck,
  Brain,
  CircleMinus,
  CircleX,
  CircleCheck,
  ExternalLink,
  Eye,
  History,
  Info,
  Quote,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformActionPanel } from "@/components/investigations/platform-action-panel";
import { GenerateResponseButton, ResponseEditor } from "@/components/investigations/response-panel";
import { AnalyzeButton } from "@/components/monitoring/analyze-button";
import {
  ActionStatusBadge,
  ClassificationBadge,
  ConfidenceMeter,
  PlatformLabel,
  ResponseStatusBadge,
  RiskBadge,
  riskBarClass,
} from "@/components/shared/indicators";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentBank } from "@/lib/bank-context";
import { getInvestigationDetail } from "@/lib/db/investigations";
import { isAiConfigured } from "@/lib/env";
import {
  CLASSIFICATION_DESCRIPTIONS,
  PLATFORM_ACTION_GUIDANCE,
  PLATFORM_ACTION_LABELS,
  SOURCE_TYPE_LABELS,
  TRUST_LEVEL_LABELS,
} from "@/lib/labels";
import { platformActionRationale } from "@/lib/scoring/platform-action";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { uuidSchema } from "@/lib/validation/schemas";
import type { EvidenceItem, EvidenceRelationship } from "@/types/domain";

export const metadata: Metadata = { title: "Investigation" };

const RELATIONSHIP_STYLE: Record<EvidenceRelationship, { label: string; icon: typeof CircleX; className: string }> = {
  CONTRADICTS: {
    label: "Contradicts claim",
    icon: CircleX,
    className: "text-[#b3261e] bg-cls-false/10 border-cls-false/30",
  },
  SUPPORTS: {
    label: "Supports claim",
    icon: CircleCheck,
    className: "text-cls-true bg-cls-true/10 border-cls-true/30",
  },
  NEUTRAL: { label: "Neutral / context", icon: CircleMinus, className: "text-muted-foreground bg-muted border-border" },
};

export default async function InvestigationPage(props: PageProps<"/investigations/[id]">) {
  const { id } = await props.params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const bank = await requireCurrentBank();
  const detail = await getInvestigationDetail(bank.id, id);
  if (!detail) notFound();

  const { investigation: inv, content, evidence, responses, audit, otherRuns } = detail;
  const latestResponse = responses[0];
  const aiConfigured = isAiConfigured();
  const consulted = inv.sources_snapshot ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-5">
        <Link
          href="/investigations"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> All investigations
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Claim under investigation
            </div>
            <h1 className="max-w-4xl text-xl leading-snug font-semibold tracking-tight">{inv.primary_claim}</h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ClassificationBadge value={inv.classification} />
              <RiskBadge level={inv.risk_level} score={inv.risk_score} />
              <span className="bg-card inline-flex items-center gap-2 rounded-md border px-2 py-0.5 text-xs">
                Confidence <ConfidenceMeter value={inv.confidence} />
              </span>
              {latestResponse ? (
                <ResponseStatusBadge status={latestResponse.status} />
              ) : (
                <Badge variant="outline">No response drafted</Badge>
              )}
              {inv.requires_human_review ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8a5a00]">
                  <Eye className="size-3.5" aria-hidden /> Human review required
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 lg:items-end">
            <AnalyzeButton contentId={content.id} label="Re-run analysis" variant="outline" />
            <span className="text-muted-foreground text-xs">
              Analysed {formatDateTime(inv.created_at)} · {inv.model} · {inv.prompt_version}
            </span>
          </div>
        </div>
      </div>

      {inv.guardrail_notes.length > 0 ? (
        <Alert variant="warning">
          <ShieldAlert aria-hidden />
          <AlertTitle>Application guardrails adjusted this result</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {inv.guardrail_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ------------------------------------------------------------ Main */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Original content</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <PlatformLabel platform={content.platform} />
                <span aria-hidden>·</span>
                <span>
                  {content.author || "Unknown author"} {content.author_handle ? `(${content.author_handle})` : ""}
                </span>
                <span aria-hidden>·</span>
                <span>{formatNumber(content.engagement_count)} engagements</span>
                <span aria-hidden>·</span>
                <span>{formatDateTime(content.published_at ?? content.created_at)}</span>
              </CardDescription>
              {content.source_url ? (
                <CardAction>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={content.source_url} target="_blank" rel="noopener noreferrer nofollow">
                      View source <ExternalLink aria-hidden />
                    </a>
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              <p className="bg-muted/40 rounded-md border p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {inv.input_content}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claim extraction</CardTitle>
              <CardDescription>What the post asserts, extracted by the AI before verification.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <Field label="Institution mentioned">{inv.institution}</Field>
              <Field label="Primary claim">{inv.primary_claim}</Field>
              <ListField label="Secondary claims" items={inv.secondary_claims} />
              <ListField label="People & entities" items={inv.entities} chips />
              <Field label="Financial impact">{inv.financial_impact || "—"}</Field>
              <Field label="Urgency">{inv.urgency || "—"}</Field>
              <ListField label="Emotional language" items={inv.emotional_language} chips quote />
              <ListField label="Misinformation indicators" items={inv.misinformation_indicators} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
              <CardDescription>
                Statements from {bank.name}&apos;s trusted sources used to reach the verdict. Quotes are checked
                word-for-word against the stored source text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidence.length === 0 ? (
                <Alert variant="info">
                  <Info aria-hidden />
                  <AlertTitle>No trusted source addresses this claim</AlertTitle>
                  <AlertDescription>
                    Absence of evidence is not proof that a claim is false, so it cannot be classified as FALSE on this
                    basis.
                  </AlertDescription>
                </Alert>
              ) : (
                evidence.map((e) => <EvidenceCard key={e.id} item={e} />)
              )}

              {consulted.length > 0 ? (
                <details className="pt-2 text-sm">
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium">
                    Sources consulted ({consulted.filter((s) => s.status === "INCLUDED").length} of {consulted.length})
                  </summary>
                  <ul className="mt-2 divide-y rounded-md border">
                    {consulted.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                        <span className="font-medium">
                          {s.ref ? <span className="text-muted-foreground mr-1.5 font-mono">{s.ref}</span> : null}
                          {s.name}
                        </span>
                        <span className="text-muted-foreground">
                          {SOURCE_TYPE_LABELS[s.source_type]} · {TRUST_LEVEL_LABELS[s.trust_level]} trust ·{" "}
                          {s.status === "INCLUDED"
                            ? s.truncated
                              ? "included (truncated)"
                              : "included"
                            : s.status === "UNAVAILABLE"
                              ? "unavailable (no stored text)"
                              : "skipped (size limit)"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI analysis</CardTitle>
              <CardDescription>
                How the verdict was reached. Observed facts are kept separate from AI inference.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-relaxed">{inv.reasoning_summary}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    <BadgeCheck className="text-cls-true size-4" aria-hidden /> Observed facts
                  </h3>
                  <p className="text-muted-foreground mb-2 text-xs">Stated in the post or in a trusted source.</p>
                  <BulletList items={inv.observed_facts} />
                </div>
                <div className="rounded-md border border-dashed p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    <Brain className="text-cls-unverified size-4" aria-hidden /> AI inference
                  </h3>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Interpretation by the model — not established fact.
                  </p>
                  <BulletList items={inv.ai_inferences} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated response</CardTitle>
              <CardDescription>
                Drafted only from verified evidence. Requires human approval; nothing is posted automatically.
              </CardDescription>
              {latestResponse ? (
                <CardAction>
                  <GenerateResponseButton investigationId={inv.id} hasExisting aiConfigured={aiConfigured} />
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              {latestResponse ? (
                <ResponseEditor key={`${latestResponse.id}-${latestResponse.updated_at}`} response={latestResponse} />
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-5">
                  <p className="text-muted-foreground text-sm">
                    Generate a public response, an internal communication and a recommended action for review.
                  </p>
                  <GenerateResponseButton investigationId={inv.id} hasExisting={false} aiConfigured={aiConfigured} />
                  {!aiConfigured ? (
                    <p className="text-muted-foreground text-xs">AI is not configured on this server.</p>
                  ) : null}
                </div>
              )}
              {responses.length > 1 ? (
                <details className="mt-4 text-sm">
                  <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium">
                    Earlier drafts ({responses.length - 1})
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {responses.slice(1).map((r) => (
                      <li key={r.id} className="rounded-md border p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <ResponseStatusBadge status={r.status} />
                          <span className="text-muted-foreground text-xs">{formatDateTime(r.created_at)}</span>
                        </div>
                        <p className="text-foreground/80 text-sm whitespace-pre-wrap">{r.public_response}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* --------------------------------------------------------- Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verdict</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ClassificationBadge value={inv.classification} className="text-sm" />
              <p className="text-muted-foreground text-sm">{CLASSIFICATION_DESCRIPTIONS[inv.classification]}</p>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <ConfidenceMeter value={inv.confidence} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reputation risk</CardTitle>
              <CardDescription>Computed by the application from fixed weights — not decided by the AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-semibold tracking-tight tabular-nums">{inv.risk_score}</div>
                  <div className="text-muted-foreground text-xs">out of 100</div>
                </div>
                <RiskBadge level={inv.risk_level} />
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full", riskBarClass(inv.risk_level))}
                  style={{ width: `${inv.risk_score}%` }}
                />
              </div>
              <ul className="space-y-3 border-t pt-4" aria-label="Risk factors">
                {inv.risk_factors.map((f) => (
                  <li key={f.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                        {f.contribution.toFixed(1)} / {f.weight}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 rounded-full">
                      <div className="bg-primary/70 h-full rounded-full" style={{ width: `${f.value * 100}%` }} />
                    </div>
                    <p className="text-muted-foreground text-xs">{f.rationale}</p>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground border-t pt-3 text-xs">
                Bands: 0–25 Low · 26–50 Medium · 51–75 High · 76–100 Critical.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended platform action</CardTitle>
              <CardDescription>
                Executed manually by staff. NewsScout never reports accounts automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold">{PLATFORM_ACTION_LABELS[inv.platform_action]}</span>
                <ActionStatusBadge status={inv.platform_action_status} />
              </div>
              <p className="text-sm">{PLATFORM_ACTION_GUIDANCE[inv.platform_action]}</p>
              <p className="text-muted-foreground text-xs">
                {platformActionRationale(inv.classification, inv.risk_level)}
              </p>
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                  AI suggestion
                </div>
                {inv.recommended_action}
              </div>
              {inv.platform_action_note ? (
                <p className="text-muted-foreground text-xs">
                  Note: {inv.platform_action_note} ({formatDateTime(inv.platform_action_updated_at)})
                </p>
              ) : null}
              <PlatformActionPanel investigationId={inv.id} status={inv.platform_action_status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <History className="size-4" aria-hidden /> Audit trail
              </CardTitle>
              <CardDescription>Append-only record of this investigation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l pl-4">
                {audit.map((a) => (
                  <li key={a.id} className="relative text-xs">
                    <span
                      className="bg-muted-foreground/40 absolute top-1 -left-[20.5px] size-2 rounded-full"
                      aria-hidden
                    />
                    <div className="text-foreground font-medium">{a.event_type.replaceAll("_", " ").toLowerCase()}</div>
                    <div className="text-muted-foreground">
                      {formatDateTime(a.created_at)} · {a.actor}
                    </div>
                  </li>
                ))}
                {audit.length === 0 ? <li className="text-muted-foreground text-xs">No events.</li> : null}
              </ol>
              {otherRuns.length > 0 ? (
                <div className="mt-4 border-t pt-3">
                  <div className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                    Other analyses of this post
                  </div>
                  <ul className="space-y-1">
                    {otherRuns.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/investigations/${r.id}`}
                          className="flex items-center justify-between gap-2 text-xs hover:underline"
                        >
                          <span>{formatDateTime(r.created_at)}</span>
                          <span className="text-muted-foreground">
                            {r.classification} · {r.risk_score}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const rel = RELATIONSHIP_STYLE[item.relationship];
  const Icon = rel.icon;
  return (
    <article className="rounded-md border p-4">
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{item.source_name}</div>
          <div className="text-muted-foreground text-xs">
            {SOURCE_TYPE_LABELS[item.source_type]}
            {item.source_id ? null : " · source since removed"}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
            rel.className,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {rel.label}
        </span>
      </header>
      <blockquote className="bg-muted/50 flex gap-2 rounded-md p-3 text-sm">
        <Quote className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span className="leading-relaxed">{item.relevant_statement}</span>
      </blockquote>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{item.summary}</p>
        <div className="flex items-center gap-3">
          {item.statement_verified ? (
            <span className="text-cls-true inline-flex items-center gap-1 text-xs font-medium">
              <BadgeCheck className="size-3.5" aria-hidden /> Verified quote
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8a5a00]">
              <TriangleAlert className="size-3.5" aria-hidden /> Not found verbatim
            </span>
          )}
          <span className="text-muted-foreground text-xs">Confidence {item.confidence}%</span>
        </div>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function ListField({
  label,
  items,
  chips,
  quote,
}: {
  label: string;
  items: string[];
  chips?: boolean;
  quote?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</div>
      {items.length === 0 ? (
        <div className="text-muted-foreground text-sm">None identified</div>
      ) : chips ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <Badge key={i} variant="secondary" className="font-normal whitespace-normal">
              {quote ? `“${i}”` : i}
            </Badge>
          ))}
        </div>
      ) : (
        <BulletList items={items} />
      )}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-muted-foreground text-sm">None recorded.</p>;
  return (
    <ul className="list-disc space-y-1 pl-4 text-sm">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}
