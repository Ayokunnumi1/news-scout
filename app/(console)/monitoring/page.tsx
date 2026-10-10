import { ExternalLink, Plus, Radar, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AnalyzeButton } from "@/components/monitoring/analyze-button";
import { DeleteContentButton } from "@/components/monitoring/delete-content-button";
import { FilterSelect } from "@/components/shared/filter-select";
import { ClassificationBadge, IngestionBadge, PlatformLabel, RiskBadge } from "@/components/shared/indicators";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCurrentBank } from "@/lib/bank-context";
import { listContent } from "@/lib/db/content";
import { INGESTION_STATUS_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import {
  INGESTION_STATUSES,
  PLATFORMS,
  type Classification,
  type IngestionStatus,
  type Platform,
  type RiskLevel,
} from "@/types/domain";

export const metadata: Metadata = { title: "Monitoring" };

function pick<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function MonitoringPage(props: PageProps<"/monitoring">) {
  const sp = await props.searchParams;
  const status = pick<IngestionStatus>(sp.status, INGESTION_STATUSES);
  const platform = pick<Platform>(sp.platform, PLATFORMS);

  const bank = await requireCurrentBank();
  const rows = await listContent(bank.id, { status, platform });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={bank.name}
        title="Monitored content"
        description="Posts and articles mentioning the institution. Content is entered manually or imported; NewsScout never posts to or scrapes social platforms."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/monitoring/new?tab=import">
                <Upload aria-hidden /> Import JSON/CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/monitoring/new">
                <Plus aria-hidden /> Submit suspicious post
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <FilterSelect
          param="status"
          label="Statuses"
          options={INGESTION_STATUSES.map((s) => ({ value: s, label: INGESTION_STATUS_LABELS[s] }))}
        />
        <FilterSelect
          param="platform"
          label="Platforms"
          options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Radar />}
          title={status || platform ? "No posts match these filters" : "No monitored content yet"}
          description="Submit a suspicious post or import a batch to begin monitoring."
        />
      ) : (
        <Card className="py-2">
          <CardContent className="px-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Post</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latest verdict</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const inv = row.latest_investigation;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[32rem] whitespace-normal">
                        <p className="line-clamp-2 text-sm">{row.content}</p>
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                          <span>{row.author_handle || row.author || "Unknown author"}</span>
                          <span aria-hidden>·</span>
                          <span>{formatDateTime(row.published_at ?? row.created_at)}</span>
                          {row.source_url ? (
                            <a
                              href={row.source_url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="hover:text-foreground inline-flex items-center gap-0.5"
                            >
                              Source <ExternalLink className="size-3" aria-hidden />
                            </a>
                          ) : null}
                        </div>
                        {row.ingestion_status === "FAILED" && row.ingestion_error ? (
                          <p className="text-destructive mt-1 text-xs">{row.ingestion_error}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <PlatformLabel platform={row.platform} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.engagement_count)}</TableCell>
                      <TableCell>
                        <IngestionBadge status={row.ingestion_status} />
                      </TableCell>
                      <TableCell>
                        {inv ? (
                          <Link
                            href={`/investigations/${inv.id}`}
                            className="flex flex-col items-start gap-1 hover:opacity-80"
                          >
                            <ClassificationBadge value={inv.classification as Classification} />
                            <RiskBadge level={inv.risk_level as RiskLevel} score={inv.risk_score} />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {inv ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/investigations/${inv.id}`}>Open</Link>
                            </Button>
                          ) : (
                            <AnalyzeButton
                              contentId={row.id}
                              label={row.ingestion_status === "FAILED" ? "Retry analysis" : "Analyse"}
                            />
                          )}
                          <DeleteContentButton contentId={row.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
