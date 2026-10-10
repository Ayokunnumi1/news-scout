"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { PLATFORM_LABELS } from "@/lib/labels";
import type { Platform } from "@/types/domain";

// Single-series magnitude: one hue, sorted descending, values labelled directly.

export function PlatformChart({ data }: { data: { platform: Platform; mentions: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: PLATFORM_LABELS[d.platform] }));
  const height = Math.max(120, rows.length * 34 + 8);
  return (
    <div
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={rows.map((r) => `${r.label}: ${r.mentions}`).join(", ")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fill: "var(--foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <PlatformTooltip {...p} />} />
          <Bar
            dataKey="mentions"
            fill="var(--seq-blue)"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            maxBarSize={22}
          >
            <LabelList dataKey="mentions" position="right" style={{ fill: "var(--foreground)", fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlatformTooltip({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { label: string; mentions: number };
  return (
    <div className="bg-popover rounded-md border px-3 py-2 text-xs shadow-md">
      <span className="text-muted-foreground">{row.label}: </span>
      <span className="text-foreground font-mono tabular-nums">{row.mentions} mentions</span>
    </div>
  );
}
