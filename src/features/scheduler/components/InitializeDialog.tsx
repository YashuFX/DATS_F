"use client";

import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Disc,
  LineChart,
  Loader2,
  Network,
  Radio,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Target,
  Waves,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { useHealthCheck, type Subsystem } from "../hooks/useHealthCheck";

/**
 * INITIALIZE — the power-on health check, as a modal over the console.
 *
 * Ported from the standalone Initialize page. The design is the source's: a
 * radar gauge on the left, the subsystem walk on the right, a status bar
 * underneath. Three things changed, all deliberate.
 *
 * It is measured the way the rest of this application is. The source sized
 * itself in viewport units with a `max-w-[1600px]` cap and switched layout at
 * Tailwind's sm/lg/xl breakpoints — which means it stops growing at 1600px and
 * looks postage-stamp-sized on a 4K panel. Everything here is rem off the same
 * root font-size clamp as every other screen, with no breakpoint anywhere, so
 * it occupies the same fraction of the viewport at 1440 as at 3840.
 *
 * It is a popup rather than a takeover. The source was `inset-0` at 92vw × 92vh
 * — full screen in all but name. This is a fixed 58rem × 32rem panel, so the
 * console stays visible behind it and the check reads as something happening
 * *to* the console rather than instead of it.
 *
 * It inherits the application theme. The source carried its own light/dark
 * toggle and slate/blue literals; this uses `da-*` tokens and follows the theme
 * switch in the header like everything else.
 */

const ICONS: Record<string, typeof Radio> = {
  "rf-frontend": Radio,
  "rf-gain": BarChart3,
  fiber: Network,
  antenna: Disc,
  calibration: Target,
  beamforming: Waves,
  signal: Cpu,
  data: Database,
  scheduler: Calendar,
  monitoring: LineChart,
  storage: Server,
};

/* ── Gauge ─────────────────────────────────────────────────────────────────
   The SVG is authored in its own user units and scaled by the viewBox, so the
   numbers below are unitless — writing rem inside a viewBox would scale twice.
   ────────────────────────────────────────────────────────────────────────── */

const RADIUS = 135;
const STROKE = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Gauge({
  percent,
  smoothPercent,
  active,
  isComplete,
  isCancelled,
}: {
  percent: number;
  smoothPercent: number;
  active: Subsystem | null;
  isComplete: boolean;
  isCancelled: boolean;
}) {
  // Fixed precision, so the server and the client emit identical path data.
  const spokes = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const rad = ((i * 360) / 24) * (Math.PI / 180);
        return {
          x: Number((180 + 172 * Math.cos(rad)).toFixed(4)),
          y: Number((180 + 172 * Math.sin(rad)).toFixed(4)),
        };
      }),
    [],
  );

  const clamped = Math.max(0, Math.min(100, smoothPercent));
  const Icon = isCancelled ? AlertCircle : isComplete ? CheckCircle2 : Settings;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-between gap-[0.75rem] border-r-[max(1px,0.0625rem)] border-da-border p-[0.875rem]">
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <svg viewBox="0 0 360 360" className="h-full -rotate-90">
          <circle
            cx="180"
            cy="180"
            r="165"
            fill="none"
            strokeWidth="1"
            strokeDasharray="3 3"
            className="stroke-da-brand/25"
          />
          <circle
            cx="180"
            cy="180"
            r="150"
            fill="none"
            strokeWidth="1"
            className="stroke-da-brand/15"
          />
          <circle
            cx="180"
            cy="180"
            r="105"
            fill="none"
            strokeWidth="1"
            className="stroke-da-brand/10"
          />

          {spokes.map((s, i) => (
            <line
              key={i}
              x1="180"
              y1="180"
              x2={s.x}
              y2={s.y}
              strokeWidth="1"
              strokeDasharray="2 6"
              className="stroke-da-brand/15"
            />
          ))}

          {[
            [180, 15],
            [345, 180],
            [180, 345],
            [15, 180],
          ].map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="2.5"
              className="fill-da-brand opacity-70"
            />
          ))}

          <circle
            cx="180"
            cy="180"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-da-subtle"
          />
          <circle
            cx="180"
            cy="180"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE}
            className={cn(
              isCancelled
                ? "stroke-da-danger"
                : isComplete
                  ? "stroke-da-success"
                  : "stroke-da-brand",
            )}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="flex items-baseline">
            <span className="da-nums text-4xl font-bold tracking-[-0.03em] text-da-text">
              {percent}
            </span>
            <span className="ml-[0.125rem] text-lg font-bold text-da-muted">
              %
            </span>
          </span>
          <span
            className={cn(
              "mt-[0.25rem] text-3xs font-bold uppercase tracking-[0.16em]",
              isCancelled
                ? "text-da-danger"
                : isComplete
                  ? "text-da-success"
                  : "text-da-brand",
            )}
          >
            {isCancelled
              ? "Cancelled"
              : isComplete
                ? "Check complete"
                : "Initializing…"}
          </span>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.625rem] py-[0.5rem]">
        <span
          className={cn(
            "flex size-[1.75rem] shrink-0 items-center justify-center rounded-[0.25rem]",
            isCancelled
              ? "bg-da-danger-soft text-da-danger"
              : isComplete
                ? "bg-da-success-soft text-da-success"
                : "bg-da-brand-soft text-da-brand",
          )}
        >
          <Icon
            className={cn(
              "size-[0.875rem]",
              !isComplete &&
                !isCancelled &&
                "animate-[spin_9s_linear_infinite]",
            )}
            strokeWidth={2.2}
          />
        </span>
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-2xs font-bold text-da-text">
            {isCancelled
              ? "Initialization cancelled"
              : isComplete
                ? "All subsystems verified"
                : active
                  ? `Testing: ${active.name}`
                  : "System health check"}
          </span>
          <span className="mt-[0.25rem] truncate text-3xs font-medium text-da-muted">
            {isCancelled
              ? "The check was stopped. The schedule was not loaded."
              : isComplete
                ? "Diagnostics passed. Schedule loaded and propagated."
                : (active?.detail ?? "Verifying subsystem integrity…")}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── Subsystem walk ─────────────────────────────────────────────────────── */

function SubsystemList({ subsystems }: { subsystems: Subsystem[] }) {
  const ok = subsystems.filter((s) => s.status === "ok").length;

  return (
    <div className="flex h-full min-h-0 flex-col p-[0.875rem]">
      <div className="flex shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border pb-[0.5rem]">
        <span className="text-3xs font-bold uppercase tracking-[0.14em] text-da-brand">
          Subsystem health check
        </span>
        <span className="da-nums text-3xs font-bold text-da-label">
          {ok} / {subsystems.length} OK
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[0.1875rem] pt-[0.5rem]">
        {subsystems.map((item) => {
          const testing = item.status === "testing";
          const done = item.status === "ok";
          const Icon = ICONS[item.id] ?? Cpu;

          return (
            <div
              key={item.id}
              className={cn(
                "flex min-h-0 flex-1 items-center justify-between gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] transition-colors",
                testing
                  ? "border-da-brand/45 bg-da-brand-soft"
                  : "border-da-border bg-da-field",
              )}
            >
              <span className="flex min-w-0 items-center gap-[0.5rem]">
                <span
                  className={cn(
                    "flex size-[1.25rem] shrink-0 items-center justify-center rounded-[0.1875rem]",
                    testing
                      ? "bg-da-brand text-da-on-brand"
                      : done
                        ? "bg-da-subtle text-da-brand"
                        : "bg-da-subtle text-da-label",
                  )}
                >
                  <Icon className="size-[0.6875rem]" strokeWidth={2.2} />
                </span>
                <span
                  className={cn(
                    "truncate text-2xs font-semibold",
                    testing
                      ? "text-da-brand"
                      : done
                        ? "text-da-text"
                        : "text-da-label",
                  )}
                >
                  {item.name}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-[0.25rem]">
                {done && (
                  <>
                    <CheckCircle2
                      className="size-[0.75rem] text-da-success"
                      strokeWidth={2.4}
                    />
                    <span className="text-3xs font-bold uppercase tracking-[0.08em] text-da-success">
                      OK
                    </span>
                  </>
                )}
                {testing && (
                  <>
                    <Loader2
                      className="size-[0.75rem] animate-spin text-da-brand"
                      strokeWidth={2.4}
                    />
                    <span className="text-3xs font-bold uppercase tracking-[0.08em] text-da-brand">
                      Testing
                    </span>
                  </>
                )}
                {item.status === "pending" && (
                  <>
                    <Clock
                      className="size-[0.75rem] text-da-label"
                      strokeWidth={2.2}
                    />
                    <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
                      Pending
                    </span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Dialog ─────────────────────────────────────────────────────────────── */

export function InitializeDialog({
  open,
  onProgress,
  onComplete,
  onCancel,
}: {
  open: boolean;
  /** Fraction 0–1 of the check that has passed, for streaming the schedule in. */
  onProgress: (fraction: number) => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const check = useHealthCheck({ running: open });
  const { smoothPercent, isComplete, isCancelled } = check;

  /* Stream the schedule in as the check proceeds. */
  useEffect(() => {
    if (!open || isCancelled) return;
    onProgress(Math.max(0, Math.min(1, smoothPercent / 100)));
  }, [open, isCancelled, smoothPercent, onProgress]);

  /**
   * Hand over once the gauge has actually reached 100.
   *
   * Gated on the *smoothed* value rather than on `isComplete`: the last
   * subsystem going OK and the arc arriving at the top are a beat apart, and
   * closing on the former makes the dialog vanish mid-sweep.
   */
  useEffect(() => {
    if (!open || !isComplete || isCancelled || smoothPercent < 99.5) return;
    const id = window.setTimeout(onComplete, 500);
    return () => window.clearTimeout(id);
  }, [open, isComplete, isCancelled, smoothPercent, onComplete]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-[1rem] backdrop-blur-[0.125rem]">
      <div className="flex h-[32rem] w-[58rem] max-h-full max-w-full flex-col overflow-hidden rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface shadow-da-lg">
        {/* Header */}
        <header className="flex h-[3rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
          <span className="flex items-center gap-[0.5rem]">
            <span className="flex size-[1.875rem] items-center justify-center rounded-[0.25rem] bg-da-brand-soft text-da-brand">
              <ShieldCheck className="size-[1rem]" strokeWidth={2.1} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-md font-bold tracking-[-0.01em] text-da-text">
                Performing system health check
              </span>
              <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
                The schedule loads as each subsystem is verified.
              </span>
            </span>
          </span>

          <span
            className={cn(
              "flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.25rem]",
              isCancelled
                ? "border-da-danger/40 bg-da-danger-soft text-da-danger"
                : isComplete
                  ? "border-da-success/35 bg-da-success-soft text-da-success"
                  : "border-da-brand/35 bg-da-brand-soft text-da-brand",
            )}
          >
            <span
              className={cn(
                "size-[0.375rem] rounded-full bg-current",
                !isComplete && !isCancelled && "animate-pulse",
              )}
            />
            <span className="text-3xs font-bold uppercase tracking-[0.08em]">
              {isCancelled
                ? "Check stopped"
                : isComplete
                  ? "System operational"
                  : "Check in progress"}
            </span>
          </span>
        </header>

        {/* Gauge + walk */}
        <div className="grid min-h-0 flex-1 grid-cols-[22rem_minmax(0,1fr)]">
          <Gauge
            percent={check.percent}
            smoothPercent={check.smoothPercent}
            active={check.active}
            isComplete={isComplete}
            isCancelled={isCancelled}
          />
          <SubsystemList subsystems={check.subsystems} />
        </div>

        {/* Actions */}
        <footer className="flex h-[3rem] shrink-0 items-center justify-between border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
          <span className="text-2xs font-medium text-da-muted">
            {isCancelled
              ? "Nothing was loaded. Restart the check to bring the schedule up."
              : isComplete
                ? "All subsystems ready for operational load."
                : "Please wait — subsystems are being verified in sequence."}
          </span>

          <span className="flex items-center gap-[0.5rem]">
            {isCancelled ? (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex h-[1.75rem] cursor-pointer items-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.75rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted transition-colors hover:text-da-text"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={check.restart}
                  className="inline-flex h-[1.75rem] cursor-pointer items-center gap-[0.375rem] rounded-[0.25rem] bg-da-brand px-[0.875rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-on-brand shadow-da-brand transition-colors hover:bg-da-brand-hover"
                >
                  <RefreshCw className="size-[0.6875rem]" strokeWidth={2.5} />
                  Restart initialization
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={check.cancel}
                disabled={isComplete}
                className="inline-flex h-[1.75rem] items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.875rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted transition-colors enabled:cursor-pointer enabled:hover:border-da-danger enabled:hover:text-da-danger disabled:opacity-40"
              >
                <XCircle className="size-[0.6875rem]" strokeWidth={2.5} />
                Cancel initialization
              </button>
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}
