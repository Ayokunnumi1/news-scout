import { Radar } from "lucide-react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { BankSwitcher } from "@/components/layout/bank-switcher";
import { MobileNav, SidebarNav } from "@/components/layout/sidebar-nav";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getCurrentBank } from "@/lib/bank-context";
import { listBanks } from "@/lib/db/banks";
import { isAiConfigured } from "@/lib/env";
import { AppError, toSafeError } from "@/lib/utils/errors";

export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  let banks;
  let current;
  try {
    [banks, current] = await Promise.all([listBanks(), getCurrentBank()]);
  } catch (error) {
    // Let Next.js control-flow signals (dynamic rendering, redirects) propagate.
    unstable_rethrow(error);
    const safe = toSafeError(error, "ConsoleLayout");
    return (
      <SetupNotice
        reason={error instanceof AppError && error.code === "DB_NOT_CONFIGURED" ? "db-config" : "db-down"}
        message={safe.message}
      />
    );
  }
  if (!current) return <SetupNotice reason="no-banks" />;

  const activeBanks = banks.filter((b) => b.status === "ACTIVE").map((b) => ({ id: b.id, name: b.name }));
  const aiReady = isAiConfigured();

  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar sticky top-0 hidden h-screen w-60 shrink-0 flex-col py-5 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-6">
          <span className="flex size-8 items-center justify-center rounded-md bg-white/10">
            <Radar className="size-4.5 text-white" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-white">NewsScout</span>
            <span className="text-sidebar-foreground block text-[11px]">Reputation risk intelligence</span>
          </span>
        </Link>
        <SidebarNav />
        <div className="text-sidebar-foreground/80 mt-auto space-y-1 px-6 text-[11px] leading-relaxed">
          <p>All AI output requires human review.</p>
          <p>Nothing is posted or reported automatically.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card/95 supports-[backdrop-filter]:bg-card/80 sticky top-0 z-30 border-b backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
                <Radar className="text-primary size-5" aria-hidden />
                <span className="text-sm font-semibold">NewsScout</span>
              </Link>
              <BankSwitcher banks={activeBanks} currentBankId={current.id} />
            </div>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${aiReady ? "bg-risk-low" : "bg-risk-medium"}`} aria-hidden />
                {aiReady ? "AI analysis online" : "AI not configured"}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Demo Administrator</span>
            </div>
          </div>
          <MobileNav />
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
