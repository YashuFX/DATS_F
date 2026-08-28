"use client";

import { useMemo } from "react";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import { useDomeStore } from "../store/domeStore";
import { deriveAlarms } from "../lib/alarms";
import { useNow } from "../hooks/useNow";
import { cn } from "@/features/data-archival/lib/cn";

const SHELVE_DURATION_MS = 15 * 60 * 1000;

/**
 * Alarms content — array-level, aggregate-only (see lib/alarms.ts). Content
 * only, no card chrome — embedded inside DetailPanel's "alarms" mode, which
 * supplies the header/close button shared with the face/element modes.
 *
 * Acknowledge means "I have seen it", not "it is fixed": the alarm stays
 * visible, just deprioritised. Shelve suppresses it from the active list for
 * a fixed, mandatory 15 minutes — there is no permanent dismiss — and the
 * shelved count stays visible the whole time, so suppression is never silent.
 */
export function AlarmsList() {
  const telemetry = useDomeStore((s) => s.telemetry);
  const alarmAcks = useDomeStore((s) => s.alarmAcks);
  const acknowledgeAlarm = useDomeStore((s) => s.acknowledgeAlarm);
  const shelveAlarm = useDomeStore((s) => s.shelveAlarm);
  const selectFace = useDomeStore((s) => s.selectFace);
  const now = useNow();

  const allAlarms = useMemo(() => deriveAlarms(telemetry), [telemetry]);

  const isShelved = (id: string) => {
    const until = alarmAcks[id]?.shelvedUntil;
    return until != null && until > now;
  };

  const shelvedCount = allAlarms.filter((a) => isShelved(a.id)).length;
  const active = allAlarms.filter((a) => !isShelved(a.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[0.875rem] py-[0.75rem]">
      {shelvedCount > 0 && (
        <span className="mb-[0.5rem] text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
          {shelvedCount} shelved — suppressed, not cleared
        </span>
      )}

      {active.length === 0 ? (
        <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
          <ShieldCheck className="size-[0.875rem] shrink-0 text-da-label" strokeWidth={2.2} />
          <span className="text-2xs font-medium leading-[1.4] text-da-muted">
            No active alarms{shelvedCount > 0 ? ` (${shelvedCount} shelved)` : ""}.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-[0.375rem] overflow-y-auto">
          {active.map((alarm) => {
            const ack = alarmAcks[alarm.id];
            return (
              <li
                key={alarm.id}
                className={cn(
                  "flex flex-col gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.375rem] transition-opacity",
                  alarm.severity === "critical"
                    ? "border-da-danger/40 bg-da-danger-soft"
                    : "border-da-warn/40 bg-da-warn-soft",
                  ack?.acknowledged && "opacity-60",
                )}
              >
                <button
                  type="button"
                  onClick={() => selectFace(alarm.faceNum)}
                  className="cursor-pointer text-left text-2xs font-semibold text-da-text hover:underline"
                >
                  {alarm.message}
                </button>
                <div className="flex items-center gap-[0.375rem]">
                  <button
                    type="button"
                    disabled={ack?.acknowledged}
                    onClick={() => acknowledgeAlarm(alarm.id)}
                    className="flex items-center gap-[0.1875rem] rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-border px-[0.375rem] py-[0.125rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-muted transition-colors hover:bg-da-subtle disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="size-[0.625rem]" strokeWidth={2.4} />
                    {ack?.acknowledged ? "Acked" : "Acknowledge"}
                  </button>
                  <button
                    type="button"
                    onClick={() => shelveAlarm(alarm.id, SHELVE_DURATION_MS)}
                    className="flex items-center gap-[0.1875rem] rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-border px-[0.375rem] py-[0.125rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-muted transition-colors hover:bg-da-subtle"
                  >
                    <Clock3 className="size-[0.625rem]" strokeWidth={2.4} />
                    Shelve 15m
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
