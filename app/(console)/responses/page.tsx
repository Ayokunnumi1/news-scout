import { MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect } from "@/components/shared/filter-select";
import { ClassificationBadge, ResponseStatusBadge, RiskBadge } from "@/components/shared/indicators";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentBank } from "@/lib/bank-context";
import { listResponses } from "@/lib/db/responses";
import { RESPONSE_STATUS_LABELS } from "@/lib/labels";
import { formatDateTime, truncate } from "@/lib/utils/format";
import { RESPONSE_STATUSES, type ResponseStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Responses" };

export default async function ResponsesPage(props: PageProps<"/responses">) {
  const sp = await props.searchParams;
  const status =
    typeof sp.status === "string" && (RESPONSE_STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as ResponseStatus)
      : undefined;
  const bank = await requireCurrentBank();
  const rows = await listResponses(bank.id, status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={bank.name}
        title="Response approvals"
        description="AI-drafted responses awaiting or past human review. Approved text must be published manually through official channels."
      />
      <FilterSelect
        param="status"
        label="Statuses"
        options={RESPONSE_STATUSES.map((s) => ({ value: s, label: RESPONSE_STATUS_LABELS[s] }))}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText />}
          title={status ? "No responses with this status" : "No responses yet"}
          description="Open an investigation and generate an official response."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="gap-3 py-4">
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <ResponseStatusBadge status={r.status} />
                      {r.investigations ? (
                        <>
                          <ClassificationBadge value={r.investigations.classification} />
                          <RiskBadge level={r.investigations.risk_level} score={r.investigations.risk_score} />
                        </>
                      ) : null}
                    </div>
                    {r.investigations ? (
                      <p className="text-sm font-medium">{truncate(r.investigations.primary_claim, 160)}</p>
                    ) : null}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/investigations/${r.investigation_id}`}>
                      {r.status === "DRAFT" ? "Review" : "Open"}
                    </Link>
                  </Button>
                </div>
                <blockquote className="border-primary bg-muted/50 rounded-md border-l-4 px-4 py-2.5 text-sm">
                  {r.public_response}
                </blockquote>
                <p className="text-muted-foreground text-xs">
                  Drafted {formatDateTime(r.created_at)}
                  {r.edited ? " · edited" : ""}
                  {r.reviewer_name
                    ? ` · ${r.status === "APPROVED" ? "approved" : "reviewed"} by ${r.reviewer_name} on ${formatDateTime(r.reviewed_at)}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
