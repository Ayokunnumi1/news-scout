import { CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import { CreateBankDialog, SelectBankButton } from "@/components/banks/bank-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentBank } from "@/lib/bank-context";
import { listBanks } from "@/lib/db/banks";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Institutions" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default async function BanksPage() {
  const [current, banks] = await Promise.all([requireCurrentBank(), listBanks()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial institutions"
        description="Data is strictly separated per institution. Switching changes every screen to the selected institution only."
        actions={<CreateBankDialog />}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {banks.map((b) => {
          const isCurrent = b.id === current.id;
          return (
            <Card key={b.id} className={isCurrent ? "border-primary ring-primary ring-1" : undefined}>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  {b.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external logo hosts
                    <img src={b.logo_url} alt="" className="size-10 rounded-md border object-contain" />
                  ) : (
                    <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                      {initials(b.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-semibold">{b.name}</h2>
                    <p className="text-muted-foreground text-xs">
                      {b.slug} · since {formatDate(b.created_at)}
                    </p>
                  </div>
                  <Badge variant={b.status === "ACTIVE" ? "secondary" : "outline"} className="ml-auto">
                    {b.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {b.description ? <p className="text-muted-foreground text-sm">{b.description}</p> : null}
                <div className="border-t pt-3">
                  {isCurrent ? (
                    <span className="text-primary inline-flex items-center gap-1.5 text-sm font-medium">
                      <CircleCheck className="size-4" aria-hidden /> Currently selected
                    </span>
                  ) : b.status === "ACTIVE" ? (
                    <SelectBankButton bankId={b.id} name={b.name} />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
