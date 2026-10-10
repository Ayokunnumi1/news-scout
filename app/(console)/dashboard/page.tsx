import { ArrowRight, FileSearch, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlatformChart } from "@/components/dashboard/platform-chart";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { InvestigationTable } from "@/components/investigations/investigation-table";
import { riskBarClass } from "@/components/shared/indicators";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentBank } from "@/lib/bank-context";
import { getDashboardStats, TREND_DAYS } from "@/lib/db/dashboard";
import { listInvestigations } from "@/lib/db/investigations";
import { RISK_LEVEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/format";
import { RISK_LEVELS } from "@/types/domain";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const bank = await requireCurrentBank();
  const [stats, recent] = await Promise.all([getDashboardStats(bank.id), listInvestigations(bank.id, { limit: 6 })]);

  const kpis = [
    {
      label: "Monitored mentions",
      value: stats.totalMentions,
      hint: `${stats.pendingMentions} awaiting analysis`,
      href: "/monitoring",
    },
    {
      label: "False claims",
      value: stats.byClassification.FALSE,
      hint: "Contradicted by trusted sources",
      accent: "bg-cls-false",
      href: "/investigations?classification=FALSE",
    },
    {
      label: "Misleading claims",
      value: stats.byClassification.MISLEADING,
      hint: "Distorted or missing context",
      accent: "bg-cls-misleading",
      href: "/investigations?classification=MISLEADING",
    },
    {
      label: "Unverified claims",
      value: stats.byClassification.UNVERIFIED,
      hint: "Not confirmed or refuted",
      accent: "bg-cls-unverified",
      href: "/investigations?classification=UNVERIFIED",
    },
    {
      label: "Critical alerts",
      value: stats.openCritical,
      hint: "Critical risk, action pending",
      accent: "bg-risk-critical",
      href: "/investigations?risk=CRITICAL",
    },
    {
      label: "High-risk alerts",
      value: stats.openHigh,
      hint: "High risk, action pending",
      accent: "bg-risk-high",
      href: "/investigations?risk=HIGH",
    },
  ];

  const riskTotal = RISK_LEVELS.reduce((s, l) => s + stats.byRisk[l], 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={bank.name}
        title="Reputation risk overview"
        description="Claims about the institution detected across social and news channels, verified against trusted sources."
        actions={
          <>
            {stats.pendingApprovals > 0 && (
              <Button variant="outline" asChild>
                <Link href="/responses?status=DRAFT">
                  {stats.pendingApprovals} response{stats.pendingApprovals === 1 ? "" : "s"} awaiting approval
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/monitoring/new">
                <Plus aria-hidden /> Submit suspicious post
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Key indicators" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="group bg-card hover:border-ring/40 rounded-lg border p-4 shadow-xs transition-colors"
          >
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              {k.accent ? <span className={cn("size-2 rounded-full", k.accent)} aria-hidden /> : null}
              {k.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(k.value)}</div>
            <div className="text-muted-foreground mt-1 text-xs">{k.hint}</div>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Analysed claims over time</CardTitle>
            <CardDescription>
              Daily count by classification, last {TREND_DAYS} days (latest analysis per post).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.analyzedCount > 0 ? (
              <TrendChart data={stats.trend} />
            ) : (
              <p className="text-muted-foreground py-12 text-center text-sm">No analysed claims yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform distribution</CardTitle>
              <CardDescription>Monitored mentions by channel.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.platforms.length > 0 ? (
                <PlatformChart data={stats.platforms} />
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">No mentions yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk profile</CardTitle>
              <CardDescription>Latest analysis per post, by deterministic risk level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {RISK_LEVELS.slice()
                .reverse()
                .map((level) => {
                  const n = stats.byRisk[level];
                  const pct = riskTotal ? (n / riskTotal) * 100 : 0;
                  return (
                    <Link
                      key={level}
                      href={`/investigations?risk=${level}`}
                      className="hover:bg-muted/60 block rounded-sm"
                    >
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium">{RISK_LEVEL_LABELS[level]}</span>
                        <span className="text-muted-foreground tabular-nums">{n}</span>
                      </div>
                      <div className="bg-muted h-1.5 rounded-full">
                        <div className={cn("h-full rounded-full", riskBarClass(level))} style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="pb-2">
        <CardHeader>
          <CardTitle>Recent investigations</CardTitle>
          <CardDescription>Most recent AI analyses for {bank.name}.</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/investigations">
                View all <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2">
          {recent.length > 0 ? (
            <InvestigationTable rows={recent} compact />
          ) : (
            <EmptyState
              icon={<FileSearch />}
              title="No investigations yet"
              description="Submit a suspicious post or analyse a pending mention to start."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
