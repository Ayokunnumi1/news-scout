import {
  AtSign,
  Camera,
  CircleCheck,
  CircleDashed,
  CircleQuestionMark,
  CircleX,
  FileText,
  Globe,
  Newspaper,
  OctagonAlert,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  ACTION_STATUS_LABELS,
  CLASSIFICATION_LABELS,
  INGESTION_STATUS_LABELS,
  PLATFORM_LABELS,
  RESPONSE_STATUS_LABELS,
  RISK_LEVEL_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type {
  ActionStatus,
  Classification,
  IngestionStatus,
  Platform,
  ResponseStatus,
  RiskLevel,
} from "@/types/domain";

// Every severity/classification indicator pairs colour with an icon AND a
// text label, so meaning never depends on colour alone.

const CLASSIFICATION_STYLE: Record<Classification, { icon: LucideIcon; className: string }> = {
  FALSE: { icon: CircleX, className: "border-cls-false/30 bg-cls-false/10 text-[#b3261e]" },
  MISLEADING: { icon: TriangleAlert, className: "border-cls-misleading/40 bg-cls-misleading/10 text-[#8a5a00]" },
  UNVERIFIED: {
    icon: CircleQuestionMark,
    className: "border-cls-unverified/30 bg-cls-unverified/10 text-cls-unverified",
  },
  TRUE: { icon: CircleCheck, className: "border-cls-true/30 bg-cls-true/10 text-cls-true" },
};

export function ClassificationBadge({ value, className }: { value: Classification; className?: string }) {
  const { icon: Icon, className: style } = CLASSIFICATION_STYLE[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
        style,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {CLASSIFICATION_LABELS[value]}
    </span>
  );
}

const RISK_STYLE: Record<RiskLevel, { icon: LucideIcon; dot: string; className: string }> = {
  LOW: { icon: ShieldCheck, dot: "bg-risk-low", className: "border-risk-low/30 bg-risk-low/10 text-[#0a6e0a]" },
  MEDIUM: {
    icon: ShieldAlert,
    dot: "bg-risk-medium",
    className: "border-risk-medium/50 bg-risk-medium/15 text-[#7a5200]",
  },
  HIGH: { icon: TriangleAlert, dot: "bg-risk-high", className: "border-risk-high/50 bg-risk-high/15 text-[#9a3a12]" },
  CRITICAL: {
    icon: OctagonAlert,
    dot: "bg-risk-critical",
    className: "border-risk-critical bg-risk-critical text-white",
  },
};

export function RiskBadge({ level, score, className }: { level: RiskLevel; score?: number; className?: string }) {
  const { icon: Icon, className: style } = RISK_STYLE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
        style,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {RISK_LEVEL_LABELS[level]}
      {score !== undefined && <span className="font-mono tabular-nums">· {score}</span>}
    </span>
  );
}

export function riskBarClass(level: RiskLevel) {
  return RISK_STYLE[level].dot;
}

const PLATFORM_ICON: Record<Platform, LucideIcon> = {
  X: AtSign,
  FACEBOOK: Users,
  INSTAGRAM: Camera,
  NEWS: Newspaper,
  BLOG: FileText,
  OTHER: Globe,
};

export function PlatformLabel({ platform, className }: { platform: Platform; className?: string }) {
  const Icon = PLATFORM_ICON[platform];
  return (
    <span className={cn("text-foreground inline-flex items-center gap-1.5 text-sm", className)}>
      <Icon className="text-muted-foreground size-3.5" aria-hidden />
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

const INGESTION_STYLE: Record<IngestionStatus, string> = {
  PENDING: "border-slate-300 bg-slate-50 text-slate-700",
  ANALYZING: "border-blue-300 bg-blue-50 text-blue-800",
  ANALYZED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-300 bg-red-50 text-red-800",
};

export function IngestionBadge({ status }: { status: IngestionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        INGESTION_STYLE[status],
      )}
    >
      {status === "ANALYZING" ? <CircleDashed className="size-3 animate-spin" aria-hidden /> : null}
      {INGESTION_STATUS_LABELS[status]}
    </span>
  );
}

const RESPONSE_STYLE: Record<ResponseStatus, string> = {
  DRAFT: "border-amber-300 bg-amber-50 text-amber-900",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  REJECTED: "border-slate-300 bg-slate-100 text-slate-700",
};

export function ResponseStatusBadge({ status }: { status: ResponseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        RESPONSE_STYLE[status],
      )}
    >
      {RESPONSE_STATUS_LABELS[status]}
    </span>
  );
}

const ACTION_STYLE: Record<ActionStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-900",
  COMPLETED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  DISMISSED: "border-slate-300 bg-slate-100 text-slate-700",
};

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", ACTION_STYLE[status])}
    >
      {ACTION_STATUS_LABELS[status]}
    </span>
  );
}

/** Horizontal confidence meter with the numeric value always visible. */
export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="bg-muted h-1.5 w-24 overflow-hidden rounded-full"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label="Confidence"
      >
        <div className="bg-primary h-full rounded-full" style={{ width: `${v}%` }} />
      </div>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">{v}%</span>
    </div>
  );
}
