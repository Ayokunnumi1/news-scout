import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAiModelName, getAiRateLimitPerMinute, isAiConfigured } from "@/lib/env";
import { CLASSIFICATION_LABELS, PLATFORM_ACTION_LABELS, RISK_LEVEL_LABELS } from "@/lib/labels";
import { recommendPlatformAction } from "@/lib/scoring/platform-action";
import { RISK_WEIGHTS, VIRALITY_SATURATION } from "@/lib/scoring/risk";
import { CLAIM_ANALYSIS_PROMPT_VERSION } from "@/prompts/claim-analysis";
import { RESPONSE_GENERATION_PROMPT_VERSION } from "@/prompts/response-generation";
import { CLASSIFICATIONS, RISK_LEVELS } from "@/types/domain";

export const metadata: Metadata = { title: "Settings" };

const FACTOR_LABELS: Record<keyof typeof RISK_WEIGHTS, string> = {
  severity: "Severity of claim (Low 0.2 · Moderate 0.5 · High 0.8 · Severe 1.0)",
  falsity: "Confidence claim is false/misleading (False = c · Misleading = 0.75c · Unverified = 0.5 · True = 0.5(1−c))",
  virality: `Engagement / virality (log scale, saturates at ${VIRALITY_SATURATION.toLocaleString("en-US")})`,
  financial_impact: "Financial impact (None 0 · Low 0.33 · Medium 0.66 · High 1.0)",
  customer_impact: "Customer impact (None 0 · Low 0.33 · Medium 0.66 · High 1.0)",
  urgency: "Urgency (Low 0.2 · Medium 0.6 · High 1.0)",
};

export default function SettingsPage() {
  const ai = isAiConfigured();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & methodology"
        description="Configuration status and the fixed rules NewsScout applies to every analysis."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI configuration</CardTitle>
            <CardDescription>Secrets are server-side environment variables and never shown here.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Status</dt>
              <dd>{ai ? "Configured" : "Not configured (set OPENAI_API_KEY)"}</dd>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-mono text-xs">{getAiModelName()}</dd>
              <dt className="text-muted-foreground">Rate limit</dt>
              <dd>{getAiRateLimitPerMinute()} AI requests / minute / client</dd>
              <dt className="text-muted-foreground">Claim prompt</dt>
              <dd className="font-mono text-xs">{CLAIM_ANALYSIS_PROMPT_VERSION}</dd>
              <dt className="text-muted-foreground">Response prompt</dt>
              <dd className="font-mono text-xs">{RESPONSE_GENERATION_PROMPT_VERSION}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safeguards</CardTitle>
            <CardDescription>Applied in application code after every AI response.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-4 text-sm">
              <li>AI output is validated against a strict schema; invalid output is rejected and never saved.</li>
              <li>Evidence citing a source that was not supplied is discarded.</li>
              <li>Every quoted statement is checked word-for-word against the stored source text.</li>
              <li>
                FALSE requires a verified contradicting quote; TRUE requires a verified supporting quote. Otherwise the
                claim is UNVERIFIED.
              </li>
              <li>Risk score and platform action are computed deterministically, not by the AI.</li>
              <li>Responses are drafted only from verified quotes and always require human approval.</li>
              <li>Nothing is posted or reported to external platforms automatically.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reputation risk model</CardTitle>
          <CardDescription>
            Score = Σ (factor value × weight), rounded to 0–100. Bands: 0–25 Low · 26–50 Medium · 51–75 High · 76–100
            Critical.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Factor</TableHead>
                <TableHead className="text-right">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(RISK_WEIGHTS) as (keyof typeof RISK_WEIGHTS)[]).map((k) => (
                <TableRow key={k}>
                  <TableCell className="whitespace-normal">{FACTOR_LABELS[k]}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{RISK_WEIGHTS[k]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended platform action matrix</CardTitle>
          <CardDescription>
            Platform review or policy reports are only ever suggested for claims contradicted by trusted evidence.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Classification</TableHead>
                {RISK_LEVELS.map((r) => (
                  <TableHead key={r}>{RISK_LEVEL_LABELS[r]} risk</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLASSIFICATIONS.map((c) => (
                <TableRow key={c}>
                  <TableCell className="font-medium">{CLASSIFICATION_LABELS[c]}</TableCell>
                  {RISK_LEVELS.map((r) => (
                    <TableCell key={r}>{PLATFORM_ACTION_LABELS[recommendPlatformAction(c, r)]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
