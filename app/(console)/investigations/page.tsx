import { FileSearch } from "lucide-react";
import type { Metadata } from "next";
import { InvestigationTable } from "@/components/investigations/investigation-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentBank } from "@/lib/bank-context";
import { listInvestigations } from "@/lib/db/investigations";
import { CLASSIFICATION_LABELS, RISK_LEVEL_LABELS } from "@/lib/labels";
import { CLASSIFICATIONS, RISK_LEVELS, type Classification, type RiskLevel } from "@/types/domain";

export const metadata: Metadata = { title: "Investigations" };

function pick<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function InvestigationsPage(props: PageProps<"/investigations">) {
  const sp = await props.searchParams;
  const classification = pick<Classification>(sp.classification, CLASSIFICATIONS);
  const riskLevel = pick<RiskLevel>(sp.risk, RISK_LEVELS);

  const bank = await requireCurrentBank();
  const rows = await listInvestigations(bank.id, { classification, riskLevel });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={bank.name}
        title="Investigation history"
        description="Every AI analysis is recorded with its input, sources, evidence, verdict, risk factors and review status."
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <FilterSelect
          param="classification"
          label="Classifications"
          options={CLASSIFICATIONS.map((c) => ({ value: c, label: CLASSIFICATION_LABELS[c] }))}
        />
        <FilterSelect
          param="risk"
          label="Risk levels"
          options={RISK_LEVELS.map((r) => ({ value: r, label: RISK_LEVEL_LABELS[r] }))}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileSearch />}
          title={classification || riskLevel ? "No investigations match these filters" : "No investigations yet"}
          description="Analyse a monitored post to create an investigation."
        />
      ) : (
        <Card className="py-2">
          <CardContent className="px-2">
            <InvestigationTable rows={rows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
