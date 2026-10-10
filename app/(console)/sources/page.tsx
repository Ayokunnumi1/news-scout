import { ExternalLink, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { SourceFormDialog } from "@/components/sources/source-form-dialog";
import { DeleteSourceButton, SourceActiveToggle } from "@/components/sources/source-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentBank } from "@/lib/bank-context";
import { listSources } from "@/lib/db/sources";
import { SOURCE_TYPE_LABELS, TRUST_LEVEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Trusted sources" };

export default async function SourcesPage() {
  const bank = await requireCurrentBank();
  const sources = await listSources(bank.id);
  const activeCount = sources.filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={bank.name}
        title="Trusted sources"
        description={`The only evidence the AI may use when verifying claims about ${bank.name}. ${activeCount} of ${sources.length} active.`}
        actions={<SourceFormDialog />}
      />

      {sources.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="No trusted sources yet"
          description="Add official press releases, website statements, regulatory notices or approved news coverage. Without sources, every claim is classified as UNVERIFIED."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sources.map((s) => (
            <Card key={s.id} className={cn("gap-3 py-4", !s.active && "bg-muted/40")}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-semibold">{s.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{SOURCE_TYPE_LABELS[s.source_type]}</Badge>
                      <Badge variant="outline">{TRUST_LEVEL_LABELS[s.trust_level]} trust</Badge>
                      {!s.active ? <Badge variant="outline">Inactive</Badge> : null}
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    {s.active ? "Active" : "Inactive"}
                    <SourceActiveToggle id={s.id} active={s.active} name={s.name} />
                  </div>
                </div>
                <p className={cn("line-clamp-4 text-sm leading-relaxed", !s.active && "text-muted-foreground")}>
                  {s.content}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                  <div className="text-muted-foreground flex min-w-0 items-center gap-3 text-xs">
                    <span>Updated {formatDate(s.updated_at)}</span>
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="hover:text-foreground inline-flex min-w-0 items-center gap-1 truncate"
                      >
                        <ExternalLink className="size-3 shrink-0" aria-hidden />
                        <span className="truncate">{s.url.replace(/^https?:\/\//, "")}</span>
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center">
                    <SourceFormDialog source={s} />
                    <DeleteSourceButton id={s.id} name={s.name} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
