import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { PriorityId, SeverityId } from "../../types";

type Tone = "brand" | "success" | "warn" | "danger" | "info" | "neutral";

/**
 * A soft fill alone carries a badge on white. On the dark board those fills sit
 * only a few points off the card, so the comp draws each chip with a hairline
 * in its own hue — that outline is what makes the priority column scannable.
 */
const TONES: Record<Tone, string> = {
  brand: "bg-da-brand-soft text-da-brand dark:border-da-brand/40",
  success: "bg-da-success-soft text-da-success dark:border-da-success/40",
  warn: "bg-da-warn-soft text-da-warn-text dark:border-da-warn/40",
  danger: "bg-da-danger-soft text-da-danger dark:border-da-danger/40",
  info: "bg-da-info-soft text-da-info dark:border-da-info/40",
  neutral: "bg-da-subtle text-da-muted dark:border-da-border-strong",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-semibold leading-[1.15rem]",
        "dark:border-[max(1px,0.0625rem)] dark:border-transparent",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const PRIORITY_TONE: Record<PriorityId, Tone> = {
  critical: "danger",
  high: "danger",
  medium: "warn",
  low: "info",
};

const PRIORITY_LABEL: Record<PriorityId, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function PriorityBadge({ priority }: { priority: PriorityId }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} className="w-[2.75rem]">
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

export const SEVERITY_TONE: Record<SeverityId, Tone> = {
  critical: "danger",
  warning: "warn",
  info: "info",
};
