"use client";

import { cn } from "@/features/data-archival/lib/cn";
import { PRIORITY_TOKEN, STATUS_TOKEN } from "../data/schedule";
import type { SatellitePass } from "../types";

/**
 * TASK QUEUE — the console's receiver strip.
 *
 * This is the panel that makes the schedule feel live: every booked task holds
 * a row, the row's bar fills while the task is being received, and the moment
 * it finishes the row acknowledges it — fading and sliding out of the active
 * set before settling into the completed tail. Ported from `scheduler-d`, where
 * that finalising animation is what distinguishes a queue from a static list.
 */

/**
 * How long a row spends acknowledging completion, in real seconds.
 *
 * Measured against the simulated clock but scaled by `speed`, so the
 * acknowledgement always lasts about this long on the wall clock — at 20x a
 * fixed window of simulated time would flash past in 35 ms and never be seen.
 */
const FINALISE_SEC = 0.7;

export function TaskQueue({
  passes,
  selectedPassId,
  onSelectPass,
  speed,
}: {
  passes: SatellitePass[];
  selectedPassId: string;
  onSelectPass: (id: string) => void;
  /** Simulation rate, so the acknowledgement lasts a fixed wall-clock time. */
  speed: number;
}) {
  /**
   * Whether a task finished recently enough to still be acknowledging.
   *
   * Derived from how long ago it completed rather than tracked in state: the
   * offsets already move every frame, so the answer is a function of the clock.
   * That keeps this component free of an effect that mirrors state it can
   * simply compute, and a task already finished when the screen opens is never
   * mistaken for one that just landed.
   */
  const finaliseWindowSimSec = FINALISE_SEC * Math.max(1, speed);
  const isFinalising = (pass: SatellitePass) => {
    if (pass.status !== "COMPLETED") return false;
    const sinceCompletion = -pass.aosOffsetSec - pass.durationSec;
    return sinceCompletion >= 0 && sinceCompletion < finaliseWindowSimSec;
  };

  const active = passes.filter(
    (p) => p.status !== "COMPLETED" || isFinalising(p),
  );
  const completed = passes.filter(
    (p) => p.status === "COMPLETED" && !isFinalising(p),
  );

  const progressOf = (pass: SatellitePass) => {
    const sinceAos = -pass.aosOffsetSec;
    if (pass.status === "COMPLETED") return 100;
    if (sinceAos <= 0) return 0;
    return Math.min(100, (sinceAos / pass.durationSec) * 100);
  };

  const Row = ({ pass, dim }: { pass: SatellitePass; dim?: boolean }) => {
    const progress = progressOf(pass);
    const token = STATUS_TOKEN[pass.status];
    const finalising = isFinalising(pass);
    const selected = pass.id === selectedPassId;

    return (
      /**
       * The acknowledgement: the row slides aside, fades, and closes up.
       *
       * The collapse is the part that matters. Fading alone left the finished
       * row holding its full height, so the queue showed a hole where it used
       * to be until the window expired. Animating grid-template-rows from 1fr
       * to 0fr shrinks the track itself, so the rows below climb into the space
       * as it empties and the list stays continuous.
       */
      <div
        className="w-full shrink-0"
        style={{
          display: "grid",
          gridTemplateRows: finalising ? "0fr" : "1fr",
          opacity: finalising ? 0 : dim ? 0.6 : 1,
          transform: finalising ? "translateX(0.9375rem)" : "translateX(0)",
          transition: `grid-template-rows ${FINALISE_SEC}s ease-out, opacity ${FINALISE_SEC}s ease-out, transform ${FINALISE_SEC}s ease-out`,
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <button
            type="button"
            onClick={() => onSelectPass(pass.id)}
            className={cn(
              "flex w-full cursor-pointer flex-col gap-[0.25rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.4375rem] py-[0.375rem] text-left",
              selected
                ? "border-da-brand bg-da-brand-soft"
                : "border-da-border bg-da-field hover:bg-da-subtle",
            )}
          >
            <span className="flex items-center justify-between gap-[0.375rem]">
              <span className="truncate text-3xs font-bold uppercase tracking-[0.04em] text-da-text">
                {pass.satName}
              </span>
              <span
                className="shrink-0 text-[0.5rem] font-bold uppercase tracking-[0.06em]"
                style={{ color: `var(--color-${token})` }}
              >
                {pass.status}
              </span>
            </span>

            <span className="flex items-center gap-[0.375rem]">
              <span className="h-[0.25rem] min-w-0 flex-1 overflow-hidden rounded-full bg-da-border">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: `var(--color-${token})`,
                  }}
                />
              </span>
              <span className="da-nums w-[2rem] shrink-0 text-right text-[0.5rem] font-bold text-da-muted">
                {progress.toFixed(0)}%
              </span>
            </span>

            <span className="flex items-center justify-between gap-[0.375rem] text-[0.5rem]">
              <span className="da-nums truncate font-medium text-da-label">
                {pass.antennaId}
              </span>
              <span
                className="shrink-0 font-bold uppercase"
                style={{
                  color: `var(--color-${PRIORITY_TOKEN[pass.priority]})`,
                }}
              >
                P{pass.priority}
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside className="flex h-full w-[13.5rem] shrink-0 flex-col overflow-hidden border-r-[max(1px,0.0625rem)] border-da-border bg-da-bg">
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.625rem]">
        <span className="text-2xs font-bold uppercase tracking-[0.12em] text-da-text">
          Task Queue
        </span>
        <span className="da-nums text-3xs font-bold text-da-label">
          {active.length}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-[0.3125rem] overflow-y-auto p-[0.4375rem]">
        {active.map((pass) => (
          <Row key={pass.id} pass={pass} />
        ))}

        {completed.length > 0 && (
          <>
            <span className="mt-[0.25rem] shrink-0 px-[0.125rem] text-[0.5rem] font-bold uppercase tracking-[0.1em] text-da-label">
              Completed · {completed.length}
            </span>
            {completed.map((pass) => (
              <Row key={pass.id} pass={pass} dim />
            ))}
          </>
        )}

        {passes.length === 0 && (
          <span className="mt-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-dashed border-da-border p-[0.75rem] text-center text-3xs uppercase tracking-[0.08em] text-da-label">
            Queue empty
          </span>
        )}
      </div>
    </aside>
  );
}
