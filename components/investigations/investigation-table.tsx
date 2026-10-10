import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  ActionStatusBadge,
  ClassificationBadge,
  ConfidenceMeter,
  PlatformLabel,
  ResponseStatusBadge,
  RiskBadge,
} from "@/components/shared/indicators";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InvestigationListItem } from "@/lib/db/investigations";
import { PLATFORM_ACTION_LABELS } from "@/lib/labels";
import { formatCompact, formatDateTime, truncate } from "@/lib/utils/format";

export function InvestigationTable({ rows, compact = false }: { rows: InvestigationListItem[]; compact?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Claim</TableHead>
          <TableHead>Classification</TableHead>
          {!compact && <TableHead>Confidence</TableHead>}
          <TableHead>Risk</TableHead>
          <TableHead>Platform</TableHead>
          {!compact && <TableHead>Recommended action</TableHead>}
          {!compact && <TableHead>Response</TableHead>}
          <TableHead>Analysed</TableHead>
          <TableHead className="w-6">
            <span className="sr-only">Open</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const latestResponse = row.responses?.[0]?.status;
          return (
            <TableRow key={row.id} className="group">
              <TableCell className="max-w-[28rem]">
                <Link href={`/investigations/${row.id}`} className="text-foreground font-medium hover:underline">
                  {truncate(row.primary_claim, compact ? 90 : 120)}
                </Link>
                {row.monitored_content ? (
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {row.monitored_content.author_handle || row.monitored_content.author} ·{" "}
                    {formatCompact(row.monitored_content.engagement_count)} engagements
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                <ClassificationBadge value={row.classification} />
              </TableCell>
              {!compact && (
                <TableCell>
                  <ConfidenceMeter value={row.confidence} />
                </TableCell>
              )}
              <TableCell>
                <RiskBadge level={row.risk_level} score={row.risk_score} />
              </TableCell>
              <TableCell>
                {row.monitored_content ? <PlatformLabel platform={row.monitored_content.platform} /> : "—"}
              </TableCell>
              {!compact && (
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{PLATFORM_ACTION_LABELS[row.platform_action]}</span>
                    <ActionStatusBadge status={row.platform_action_status} />
                  </div>
                </TableCell>
              )}
              {!compact && (
                <TableCell>
                  {latestResponse ? (
                    <ResponseStatusBadge status={latestResponse} />
                  ) : (
                    <span className="text-muted-foreground text-xs">Not generated</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {formatDateTime(row.created_at)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/investigations/${row.id}`}
                  aria-label="Open investigation"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
