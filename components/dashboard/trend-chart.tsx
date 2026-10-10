"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { CLASSIFICATION_LABELS } from "@/lib/labels";
import { formatShortDay } from "@/lib/utils/format";
import type { Classification } from "@/types/domain";

// Stacked daily counts by classification. Series order and colours are fixed
// (validated for colour-vision deficiency); identity is never colour-only:
// there is a legend, a tooltip, and a data table view.

export const SERIES: { key: Classification; color: string }[] = [
  { key: "FALSE", color: "var(--cls-false)" },
  { key: "MISLEADING", color: "var(--cls-misleading)" },
  { key: "UNVERIFIED", color: "var(--cls-unverified)" },
  { key: "TRUE", color: "var(--cls-true)" },
];

type Row = { date: string } & Record<Classification, number>;

export function TrendChart({ data }: { data: Row[] }) {
  const total = data.reduce((s, r) => s + r.FALSE + r.MISLEADING + r.UNVERIFIED + r.TRUE, 0);
  return (
    <div className="space-y-3">
      <Legend />
      <div
        className="h-64 w-full"
        role="img"
        aria-label={`Daily analysed claims by classification, ${total} in total. A data table follows.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap={3}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDay}
              tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(props) => <TrendTooltip {...props} />} />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="cls"
                fill={s.color}
                stroke="var(--card)"
                strokeWidth={1}
                radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
                name={CLASSIFICATION_LABELS[s.key]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium">
          View as table
        </summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Date</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="px-2 py-1.5 text-right font-medium">
                    {CLASSIFICATION_LABELS[s.key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data
                .filter((r) => r.FALSE + r.MISLEADING + r.UNVERIFIED + r.TRUE > 0)
                .map((r) => (
                  <tr key={r.date} className="border-t">
                    <td className="px-2 py-1">{formatShortDay(r.date)}</td>
                    {SERIES.map((s) => (
                      <td key={s.key} className="px-2 py-1 text-right tabular-nums">
                        {r[s.key]}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Legend() {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
      {SERIES.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
          {CLASSIFICATION_LABELS[s.key]}
        </li>
      ))}
    </ul>
  );
}

function TrendTooltip({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
  return (
    <div className="bg-popover min-w-40 rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="text-foreground mb-1.5 font-medium">{formatShortDay(String(label))}</div>
      <ul className="space-y-1">
        {[...payload].reverse().map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: String(p.color) }} aria-hidden />
              {p.name}
            </span>
            <span className="text-foreground font-mono tabular-nums">{p.value}</span>
          </li>
        ))}
      </ul>
      <div className="text-muted-foreground mt-1.5 flex justify-between border-t pt-1.5">
        <span>Total</span>
        <span className="text-foreground font-mono tabular-nums">{total}</span>
      </div>
    </div>
  );
}
