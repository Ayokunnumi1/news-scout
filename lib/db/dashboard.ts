import "server-only";
import { db, unwrap } from "@/lib/db/client";
import { PLATFORMS, type Classification, type Platform, type RiskLevel } from "@/types/domain";

export const TREND_DAYS = 30;

export interface DashboardStats {
  totalMentions: number;
  pendingMentions: number;
  analyzedCount: number;
  byClassification: Record<Classification, number>;
  byRisk: Record<RiskLevel, number>;
  openCritical: number;
  openHigh: number;
  pendingApprovals: number;
  trend: { date: string; FALSE: number; MISLEADING: number; UNVERIFIED: number; TRUE: number }[];
  platforms: { platform: Platform; mentions: number }[];
}

/**
 * Aggregates dashboard metrics for one bank. Volumes in the MVP are small, so
 * rows are aggregated in application code; a SQL view/materialised view is
 * the next step at scale.
 */
export async function getDashboardStats(bankId: string): Promise<DashboardStats> {
  const since = new Date(Date.now() - (TREND_DAYS - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);

  const [contentRes, investigationsRes, approvalsRes] = await Promise.all([
    db().from("monitored_content").select("id, platform, ingestion_status").eq("bank_id", bankId).limit(10_000),
    db()
      .from("investigations")
      .select("id, content_id, classification, risk_level, platform_action_status, created_at")
      .eq("bank_id", bankId)
      .order("created_at", { ascending: false })
      .limit(10_000),
    db().from("responses").select("id", { count: "exact", head: true }).eq("bank_id", bankId).eq("status", "DRAFT"),
  ]);

  const content = unwrap(contentRes, "dashboard.content") as {
    id: string;
    platform: Platform;
    ingestion_status: string;
  }[];
  const investigations = unwrap(investigationsRes, "dashboard.investigations") as {
    id: string;
    content_id: string;
    classification: Classification;
    risk_level: RiskLevel;
    platform_action_status: string;
    created_at: string;
  }[];
  if (approvalsRes.error) unwrap(approvalsRes, "dashboard.approvals");

  // Count each post once, using its most recent investigation (rows are newest-first).
  const latestByContent = new Map<string, (typeof investigations)[number]>();
  for (const inv of investigations) if (!latestByContent.has(inv.content_id)) latestByContent.set(inv.content_id, inv);
  const latest = [...latestByContent.values()];

  const byClassification: Record<Classification, number> = { TRUE: 0, FALSE: 0, MISLEADING: 0, UNVERIFIED: 0 };
  const byRisk: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  let openCritical = 0;
  let openHigh = 0;
  for (const inv of latest) {
    byClassification[inv.classification]++;
    byRisk[inv.risk_level]++;
    if (inv.platform_action_status === "PENDING") {
      if (inv.risk_level === "CRITICAL") openCritical++;
      if (inv.risk_level === "HIGH") openHigh++;
    }
  }

  const trendMap = new Map<string, DashboardStats["trend"][number]>();
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    trendMap.set(d, { date: d, FALSE: 0, MISLEADING: 0, UNVERIFIED: 0, TRUE: 0 });
  }
  for (const inv of latest) {
    const bucket = trendMap.get(inv.created_at.slice(0, 10));
    if (bucket) bucket[inv.classification]++;
  }

  const platformCounts = new Map<Platform, number>(PLATFORMS.map((p) => [p, 0]));
  for (const c of content) platformCounts.set(c.platform, (platformCounts.get(c.platform) ?? 0) + 1);

  return {
    totalMentions: content.length,
    pendingMentions: content.filter((c) => c.ingestion_status === "PENDING" || c.ingestion_status === "FAILED").length,
    analyzedCount: latest.length,
    byClassification,
    byRisk,
    openCritical,
    openHigh,
    pendingApprovals: approvalsRes.count ?? 0,
    trend: [...trendMap.values()],
    platforms: [...platformCounts.entries()]
      .map(([platform, mentions]) => ({ platform, mentions }))
      .filter((p) => p.mentions > 0)
      .sort((a, b) => b.mentions - a.mentions),
  };
}
