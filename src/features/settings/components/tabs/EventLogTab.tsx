"use client";

import { Download, FileText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { formatClock, formatDate } from "@/features/data-archival/lib/format";
import { notify } from "../../store/notifyStore";
import { useSettingsStore, type EventLevel } from "../../store/settingsStore";
import { Badge, Btn, Note, Panel, TabHeader } from "../ui";

/**
 * What this console has done, in order.
 *
 * Fed by two sources that deliberately share one stream: every configuration
 * change (when auditing is on) and every notification raised anywhere in the
 * application, including the ones the operator has chosen to suppress. A record
 * that only holds what someone happened to be watching is not a record.
 */

const TONE: Record<EventLevel, "info" | "ok" | "warn" | "error"> = {
  info: "info",
  ok: "ok",
  warn: "warn",
  error: "error",
};

const FILTERS: { id: EventLevel | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "info", label: "Info" },
  { id: "ok", label: "OK" },
  { id: "warn", label: "Warn" },
  { id: "error", label: "Error" },
];

export function EventLogTab() {
  const events = useSettingsStore((s) => s.events);
  const clearEvents = useSettingsStore((s) => s.clearEvents);
  const auditLogging = useSettingsStore((s) => s.settings.auditLogging);

  const [filter, setFilter] = useState<EventLevel | "all">("all");

  const rows = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.level === filter)),
    [events, filter],
  );

  function exportLog() {
    const body = events
      .slice()
      .reverse()
      .map(
        (e) =>
          `${new Date(e.ts).toISOString()}\t${e.level.toUpperCase()}\t${e.message}`,
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dats-event-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify("success", `Event log exported — ${events.length} entries`);
  }

  return (
    <>
      <TabHeader
        title="Event log"
        description="Configuration changes and every notification raised, suppressed or not. Held in this browser and capped by the depth set on the System tab."
      >
        <Btn icon={Download} onClick={exportLog} disabled={events.length === 0}>
          Export
        </Btn>
        <Btn
          variant="danger"
          icon={Trash2}
          onClick={() => {
            clearEvents();
            notify("warning", "Event log cleared by the operator");
          }}
          disabled={events.length === 0}
        >
          Clear
        </Btn>
      </TabHeader>

      <Panel
        title="Entries"
        icon={FileText}
        description={`${events.length} held · newest first`}
        action={
          <span className="flex flex-wrap gap-[0.25rem]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "cursor-pointer rounded-[0.1875rem] border-[max(1px,0.0625rem)] px-[0.375rem] py-[0.1875rem] text-3xs font-bold uppercase tracking-[0.08em] transition-colors",
                  filter === f.id
                    ? "border-da-brand bg-da-brand-soft text-da-brand"
                    : "border-da-border text-da-muted hover:border-da-brand hover:text-da-text",
                )}
              >
                {f.label}
              </button>
            ))}
          </span>
        }
      >
        {!auditLogging && (
          <Note>
            Configuration auditing is off — only notifications are being recorded.
          </Note>
        )}

        {rows.length === 0 ? (
          <Note>
            {events.length === 0
              ? "Nothing recorded yet. Change a setting or raise a test notification and it will appear here."
              : "No entries at this level."}
          </Note>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {rows.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b-[max(1px,0.0625rem)] border-da-border/60 last:border-b-0"
                  >
                    <td className="da-nums w-[6.5rem] py-[0.375rem] pr-[0.5rem] align-top font-mono text-3xs font-medium text-da-muted">
                      {formatClock(event.ts)}
                    </td>
                    <td className="w-[3.5rem] py-[0.375rem] pr-[0.5rem] align-top">
                      <Badge tone={TONE[event.level]}>{event.level}</Badge>
                    </td>
                    <td className="py-[0.375rem] align-top text-2xs font-medium leading-[1.45] text-da-text">
                      {event.message}
                    </td>
                    <td className="da-nums hidden w-[6rem] py-[0.375rem] pl-[0.5rem] text-right align-top font-mono text-3xs text-da-label sm:table-cell">
                      {formatDate(event.ts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
