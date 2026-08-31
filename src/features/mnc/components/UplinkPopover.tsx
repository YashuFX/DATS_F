"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, HardDriveUpload } from "lucide-react";
import { SEED_EXPORT_JOBS } from "@/features/data-archival/data/exports";
import { SEED_REPORTS } from "@/features/data-archival/data/reports";

function formatSize(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

/** A live transfer, with its own progress rail. */
function JobRow({
  title,
  detail,
  progress,
  trailing,
}: {
  title: string;
  detail: string;
  progress: number;
  trailing: string;
}) {
  return (
    <li className="flex flex-col gap-[0.25rem] rounded-[0.25rem] px-[0.5rem] py-[0.4375rem] hover:bg-da-subtle/60">
      <span className="flex items-baseline justify-between gap-[0.5rem]">
        <span className="truncate text-2xs font-semibold text-da-text">{title}</span>
        <span className="da-nums shrink-0 text-3xs font-bold text-da-success">{trailing}</span>
      </span>
      <span className="flex items-center gap-[0.5rem]">
        <span className="h-[0.25rem] min-w-0 flex-1 overflow-hidden rounded-full bg-da-border">
          <span
            className="block h-full rounded-full bg-da-success transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </span>
        <span className="da-nums shrink-0 text-3xs font-semibold text-da-muted">{progress}%</span>
      </span>
      <span className="truncate text-3xs text-da-muted">{detail}</span>
    </li>
  );
}

/**
 * What the uplink is currently moving — exports on the wire and reports being
 * generated, read from the archival module's own data rather than a second
 * copy kept here.
 *
 * Anchored to its trigger rather than centred as a modal: this answers "is
 * anything transferring right now", which is a glance, not a task. A modal
 * would blank the board behind it to answer a question the operator asked
 * without meaning to leave the screen.
 *
 * Dismiss on outside-press and on Escape, both bound while open only. The
 * listener is `pointerdown`, not `click` — a click fires after the press has
 * already moved focus, which lets a press that lands on another control get
 * swallowed by the close instead of activating it. The trigger itself is
 * excluded, or its press would close us here and its click would immediately
 * re-open us, making the button look dead.
 */
export function UplinkPopover({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (ref.current?.contains(target as Node)) return;
      // A press on the trigger must fall through to the trigger's own toggle.
      // Without this the press closes us here and the click that follows
      // re-opens us, so the button appears dead while the popover is open.
      if (target?.closest?.("[data-uplink-anchor]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const transferring = SEED_EXPORT_JOBS.filter((j) => j.status === "transferring");
  const verifying = SEED_EXPORT_JOBS.filter((j) => j.status === "verifying");
  const generating = SEED_REPORTS.filter((r) => r.status === "generating");
  const activeCount = transferring.length + verifying.length + generating.length;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Uplink activity"
      // Translucent by design — the board stays legible behind it, so the
      // popover reads as an overlay on the console rather than a page of its
      // own. `backdrop-blur` is what keeps the text on top readable over it.
      className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[19rem] overflow-hidden rounded-[0.5rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface/80 shadow-da-card backdrop-blur-[0.75rem]"
    >
      <div className="flex items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border/70 px-[0.625rem] py-[0.5rem]">
        <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-text">
          <HardDriveUpload className="size-[0.8125rem] text-da-muted" strokeWidth={2.2} />
          Uplink Activity
        </span>
        <span className="da-nums text-3xs font-bold text-da-muted">{activeCount} active</span>
      </div>

      <div className="max-h-[19rem] overflow-y-auto">
        <section>
          <h3 className="px-[0.625rem] pt-[0.5rem] pb-[0.1875rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">
            Exports
          </h3>
          {transferring.length + verifying.length === 0 ? (
            <p className="px-[0.625rem] pb-[0.5rem] text-3xs text-da-muted">No transfers on the wire.</p>
          ) : (
            <ul className="px-[0.125rem] pb-[0.25rem]">
              {transferring.map((job) => (
                <JobRow
                  key={job.id}
                  title={job.dataset}
                  detail={`${job.id} · ${job.destination} · ${job.format} · ${formatSize(job.sizeBytes)}`}
                  progress={job.progress}
                  trailing={`${job.throughputMBs} MB/s`}
                />
              ))}
              {verifying.map((job) => (
                <JobRow
                  key={job.id}
                  title={job.dataset}
                  detail={`${job.id} · ${job.destination} · verifying checksum`}
                  progress={job.progress}
                  trailing="verifying"
                />
              ))}
            </ul>
          )}
        </section>

        <section className="border-t-[max(1px,0.0625rem)] border-da-border/70">
          <h3 className="px-[0.625rem] pt-[0.5rem] pb-[0.1875rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">
            Reports
          </h3>
          {generating.length === 0 ? (
            <p className="px-[0.625rem] pb-[0.5rem] text-3xs text-da-muted">Nothing generating.</p>
          ) : (
            <ul className="flex flex-col gap-[0.125rem] px-[0.125rem] pb-[0.25rem]">
              {generating.map((report) => (
                <li key={report.id} className="flex items-center gap-[0.5rem] rounded-[0.25rem] px-[0.5rem] py-[0.4375rem] hover:bg-da-subtle/60">
                  <FileText className="size-[0.8125rem] shrink-0 text-da-muted" strokeWidth={2.2} />
                  <span className="flex min-w-0 flex-col leading-none">
                    <span className="truncate text-2xs font-semibold text-da-text">{report.name}</span>
                    <span className="mt-[0.1875rem] truncate text-3xs text-da-muted">
                      {report.period} · {report.format}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-3xs font-bold text-da-warn-text">Generating</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex items-center gap-[0.5rem] border-t-[max(1px,0.0625rem)] border-da-border/70 px-[0.625rem] py-[0.4375rem]">
        <Link
          href="/data-archival/exports"
          onClick={onClose}
          className="flex items-center gap-[0.25rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-brand hover:underline"
        >
          Exports <ArrowUpRight className="size-[0.6875rem]" strokeWidth={2.4} />
        </Link>
        <span aria-hidden className="h-[0.75rem] w-[max(1px,0.0625rem)] bg-da-border" />
        <Link
          href="/data-archival/reports"
          onClick={onClose}
          className="flex items-center gap-[0.25rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-brand hover:underline"
        >
          Reports <ArrowUpRight className="size-[0.6875rem]" strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  );
}
