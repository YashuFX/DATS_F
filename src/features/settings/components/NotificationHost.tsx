"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { useNotifyStore } from "../store/notifyStore";
import { useSettings } from "../store/settingsStore";
import type { NotifyPosition, Severity } from "../types";

/**
 * Where notifications land.
 *
 * Three presentations of the same queue, because they are three different
 * claims on the operator's attention: a toast is a receipt, a banner is a
 * condition, a dialog is a question. The Notifications tab picks one and this
 * renders it — no component that raises a notification knows or cares which.
 */

const ICONS: Record<Severity, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const TONE: Record<Severity, { border: string; fill: string; text: string }> = {
  info: { border: "border-da-info", fill: "bg-da-info-soft", text: "text-da-info" },
  success: {
    border: "border-da-success",
    fill: "bg-da-success-soft",
    text: "text-da-success",
  },
  warning: {
    border: "border-da-warn",
    fill: "bg-da-warn-soft",
    text: "text-da-warn-text",
  },
  error: {
    border: "border-da-danger",
    fill: "bg-da-danger-soft",
    text: "text-da-danger",
  },
};

/* Corners are authored in rem so the gutter scales with the board. */
const ANCHOR: Record<NotifyPosition, string> = {
  "bottom-right": "bottom-[4.5rem] right-[1rem] items-end",
  "bottom-left": "bottom-[4.5rem] left-[1rem] items-start",
  "top-right": "top-[1rem] right-[1rem] items-end",
  "top-left": "top-[1rem] left-[1rem] items-start",
  "top-center": "top-[1rem] left-1/2 -translate-x-1/2 items-center",
};

export function NotificationHost() {
  const items = useNotifyStore((s) => s.items);
  const dismiss = useNotifyStore((s) => s.dismiss);
  const settings = useSettings();

  if (items.length === 0) return null;

  /* ── dialog ── */
  if (settings.notifyStyle === "dialog") {
    const item = items[0];
    const tone = TONE[item.severity];
    const Icon = ICONS[item.severity];
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(8,15,22,0.55)] p-[1rem]"
        onClick={() => dismiss(item.id)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="da-card w-full max-w-[22rem] p-[1rem]"
        >
          <div className="flex items-start gap-[0.625rem]">
            <span
              className={cn(
                "flex size-[2rem] shrink-0 items-center justify-center rounded-[0.375rem]",
                tone.fill,
                tone.text,
              )}
            >
              <Icon className="size-[1rem]" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-bold uppercase tracking-[0.1em] text-da-text">
                {item.title}
              </p>
              <p className="mt-[0.375rem] text-2xs font-medium leading-[1.5] text-da-muted">
                {item.message}
              </p>
            </div>
          </div>
          <div className="mt-[0.875rem] flex justify-end">
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="h-[2rem] cursor-pointer rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand bg-da-brand px-[0.875rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-on-brand transition-colors hover:bg-da-brand-hover"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── banner ── */
  if (settings.notifyStyle === "banner") {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col">
        {items.map((item) => {
          const tone = TONE[item.severity];
          const Icon = ICONS[item.severity];
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-center gap-[0.5rem] border-b-[max(1px,0.0625rem)] px-[1rem] py-[0.5rem]",
                tone.border,
                tone.fill,
              )}
            >
              <Icon className={cn("size-[0.875rem] shrink-0", tone.text)} strokeWidth={2.2} />
              <span className={cn("text-2xs font-bold uppercase tracking-[0.08em]", tone.text)}>
                {item.title}
              </span>
              <span className="min-w-0 flex-1 truncate text-2xs font-medium text-da-text">
                {item.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss"
                className="shrink-0 cursor-pointer text-da-muted transition-colors hover:text-da-text"
              >
                <X className="size-[0.8125rem]" strokeWidth={2.4} />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── toast ── */
  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[120] flex max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-[0.5rem]",
        ANCHOR[settings.notifyPosition],
      )}
    >
      {items.map((item) => {
        const tone = TONE[item.severity];
        const Icon = ICONS[item.severity];
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "da-card pointer-events-auto flex w-full items-start gap-[0.5rem] border-l-[0.1875rem] px-[0.75rem] py-[0.625rem]",
              tone.border,
            )}
          >
            <Icon className={cn("mt-[0.0625rem] size-[0.875rem] shrink-0", tone.text)} strokeWidth={2.2} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-text">
                {item.title}
              </span>
              <span className="mt-[0.25rem] text-2xs font-medium leading-[1.45] text-da-muted">
                {item.message}
              </span>
            </span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss"
              className="shrink-0 cursor-pointer text-da-label transition-colors hover:text-da-text"
            >
              <X className="size-[0.75rem]" strokeWidth={2.4} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
