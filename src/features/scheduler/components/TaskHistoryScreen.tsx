"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Database,
  Download,
  Search,
  Signal,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import {
  HISTORY,
  HISTORY_STATS,
  PRIORITY_LABEL,
  PRIORITY_TOKEN,
  STATIONS,
} from "../data/schedule";
import type { PassRecord, Priority } from "../types";

type SortKey = "completedAt" | "satName" | "durationSec" | "efficiencyPct" | "priority";

function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("da-card flex min-h-0 min-w-0 flex-col", className)}>
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
        <span className="truncate text-2xs font-bold uppercase tracking-[0.08em] text-da-text">
          {title}
        </span>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-[0.5rem] py-[0.3125rem]">
      <span className="truncate text-2xs font-medium uppercase tracking-[0.06em] text-da-muted">
        {label}
      </span>
      <span className={cn("da-nums shrink-0 text-2xs font-bold", tone ?? "text-da-text")}>
        {value}
      </span>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  sub,
  icon,
  tone,
  divider,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  icon: React.ReactNode;
  tone?: string;
  divider: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-[0.5rem] px-[0.875rem] py-[0.375rem]",
        divider && "border-r-[max(1px,0.0625rem)] border-da-border",
      )}
    >
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-3xs font-semibold uppercase tracking-[0.1em] text-da-label">
          {label}
        </span>
        <span className="mt-[0.3125rem] flex items-baseline gap-[0.1875rem]">
          <span className={cn("da-nums text-xl font-bold tracking-[-0.02em]", tone ?? "text-da-text")}>
            {value}
          </span>
          {unit && <span className="text-2xs font-semibold text-da-muted">{unit}</span>}
        </span>
        <span className="mt-[0.3125rem] truncate text-3xs font-medium text-da-muted">{sub}</span>
      </span>
      <span className="flex size-[2rem] shrink-0 items-center justify-center rounded-[0.375rem] bg-da-subtle text-da-muted">
        {icon}
      </span>
    </div>
  );
}

const utc = (ms: number) => new Date(ms).toISOString().replace("T", " ").slice(0, 19);
const utcDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fmtDuration = (sec: number) =>
  `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;

/**
 * TASK HISTORY — tender J.1.4.
 *
 * "Logs detailed information about each satellite pass and any issues
 * encountered during the pass, historical data analysis, compliance
 * documentation." The issues column is the part that matters and the part the
 * reference design buried: a completed pass with a rain fade is not the same as
 * a clean one, and an operator scanning the log needs to see which is which
 * without opening every row.
 */
export function TaskHistoryScreen() {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"ALL" | Priority>("ALL");
  const [outcome, setOutcome] = useState<"ALL" | "CLEAN" | "ISSUES">("ALL");
  const [day, setDay] = useState("ALL");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "completedAt",
    dir: "desc",
  });
  const [selectedId, setSelectedId] = useState(HISTORY[0]?.pass.id ?? "");

  const days = useMemo(
    () => Array.from(new Set(HISTORY.map((r) => utcDate(r.completedAt)))).sort().reverse(),
    [],
  );

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = HISTORY.filter((r) => {
      const matchesText =
        term === "" ||
        r.pass.satName.toLowerCase().includes(term) ||
        r.pass.id.toLowerCase().includes(term) ||
        r.pass.antennaId.toLowerCase().includes(term) ||
        String(r.pass.noradId).includes(term);
      const matchesPriority = priority === "ALL" || r.pass.priority === priority;
      const matchesOutcome =
        outcome === "ALL" ||
        (outcome === "CLEAN" ? r.issues.length === 0 : r.issues.length > 0);
      const matchesDay = day === "ALL" || utcDate(r.completedAt) === day;
      return matchesText && matchesPriority && matchesOutcome && matchesDay;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "satName":
          return a.pass.satName.localeCompare(b.pass.satName) * dir;
        case "durationSec":
          return (a.pass.durationSec - b.pass.durationSec) * dir;
        case "efficiencyPct":
          return (a.efficiencyPct - b.efficiencyPct) * dir;
        case "priority":
          return (a.pass.priority - b.pass.priority) * dir;
        default:
          return (a.completedAt - b.completedAt) * dir;
      }
    });
  }, [query, priority, outcome, day, sort]);

  const selected: PassRecord | undefined =
    rows.find((r) => r.pass.id === selectedId) ?? rows[0];
  const station = STATIONS.find((s) => s.id === selected?.pass.stationId);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
    );

  const COLUMNS: { key: string; label: string; sort?: SortKey; width: string; align?: "right" }[] = [
    { key: "id", label: "Acq ID", width: "5.5rem" },
    { key: "sat", label: "Satellite", sort: "satName", width: "8.5rem" },
    { key: "antenna", label: "Antenna", width: "6rem" },
    // AOS carries time only — the date is already on the Completed column.
    { key: "aos", label: "AOS", width: "4.75rem" },
    { key: "completed", label: "Completed (UTC)", sort: "completedAt", width: "9.25rem" },
    { key: "duration", label: "Duration", sort: "durationSec", width: "5rem" },
    { key: "el", label: "Max El", width: "4.25rem", align: "right" },
    { key: "lock", label: "Link Lock", width: "5.25rem" },
    { key: "downlink", label: "Downlinked", width: "5.5rem", align: "right" },
    { key: "eff", label: "Efficiency", sort: "efficiencyPct", width: "5rem", align: "right" },
    { key: "priority", label: "Priority", sort: "priority", width: "5rem" },
    { key: "issues", label: "Issues", width: "10rem" },
  ];

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[2.5rem_4.25rem_minmax(0,1fr)] gap-[0.75rem]">
        {/* Filters */}
        <div className="flex items-center justify-between gap-[0.625rem]">
          <label className="relative flex h-[1.875rem] w-[17rem] items-center">
            <Search
              className="pointer-events-none absolute left-[0.5rem] size-[0.8125rem] text-da-label"
              strokeWidth={2.2}
            />
            <span className="sr-only">Search pass history</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Satellite, acquisition ID, antenna, NORAD…"
              className="h-full w-full rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field pl-[1.875rem] pr-[0.5rem] text-2xs text-da-text placeholder:text-da-label focus:border-da-brand focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-[0.625rem]">
            {[
              {
                value: priority,
                onChange: (v: string) =>
                  setPriority(v === "ALL" ? "ALL" : (Number(v) as Priority)),
                options: [
                  ["ALL", "All priorities"],
                  ["1", "Critical"],
                  ["2", "High"],
                  ["3", "Standard"],
                ],
              },
              {
                value: outcome,
                onChange: (v: string) => setOutcome(v as typeof outcome),
                options: [
                  ["ALL", "All outcomes"],
                  ["CLEAN", "Clean passes"],
                  ["ISSUES", "With issues"],
                ],
              },
              {
                value: day,
                onChange: setDay,
                options: [["ALL", "All dates"], ...days.map((d) => [d, d] as [string, string])],
              },
            ].map((f, i) => (
              <select
                key={i}
                value={String(f.value)}
                onChange={(e) => f.onChange(e.target.value)}
                className="h-[1.875rem] cursor-pointer rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-2xs font-semibold text-da-text focus:border-da-brand focus:outline-none"
              >
                {f.options.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        {/* Aggregates */}
        <div className="da-card flex min-h-0 items-center">
          <Kpi
            label="Completed Passes"
            value={`${HISTORY_STATS.completed}`}
            sub={`${HISTORY_STATS.missed} missed`}
            icon={<CheckCircle2 className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Link Lock Success"
            value={`${HISTORY_STATS.lockSuccessPct}`}
            unit="%"
            sub="Locked at first acquisition"
            tone={HISTORY_STATS.lockSuccessPct >= 80 ? "text-da-success" : "text-da-warn-text"}
            icon={<Signal className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Mean Signal"
            value={`${HISTORY_STATS.meanSignalPct}`}
            unit="%"
            sub="Across archived passes"
            icon={<Signal className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Data Archived"
            value={`${HISTORY_STATS.volumeGb}`}
            unit="GB"
            sub="Downlinked and stored"
            icon={<Database className="size-[1rem]" strokeWidth={2} />}
            divider={false}
          />
        </div>

        {/* The log */}
        <Panel
          title="Pass History"
          action={
            <span className="flex shrink-0 items-center gap-[0.625rem]">
              <span className="da-nums text-3xs font-medium text-da-label">
                {rows.length} of {HISTORY.length} records
              </span>
              <button
                type="button"
                className="inline-flex h-[1.5rem] cursor-pointer items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand/35 bg-da-brand-soft px-[0.5rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-brand transition-colors hover:bg-da-brand hover:text-da-on-brand"
              >
                <Download className="size-[0.625rem]" strokeWidth={2.4} />
                Export
              </button>
            </span>
          }
        >
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {COLUMNS.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr className="h-[1.875rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "px-[0.625rem] text-3xs font-semibold uppercase tracking-[0.07em] text-da-label",
                      c.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {c.sort ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.sort!)}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-[0.1875rem] transition-colors hover:text-da-text",
                          sort.key === c.sort && "text-da-brand",
                        )}
                      >
                        {c.label}
                        {sort.key === c.sort &&
                          (sort.dir === "asc" ? (
                            <ArrowUp className="size-[0.625rem]" strokeWidth={2.6} />
                          ) : (
                            <ArrowDown className="size-[0.625rem]" strokeWidth={2.6} />
                          ))}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSelected = r.pass.id === selected?.pass.id;
                const missed = r.pass.status === "MISSED";
                return (
                  <tr
                    key={r.pass.id}
                    onClick={() => setSelectedId(r.pass.id)}
                    className={cn(
                      "h-[2.125rem] cursor-pointer border-b-[max(1px,0.0625rem)] border-da-border/70 transition-colors last:border-b-0",
                      isSelected ? "bg-da-brand-soft" : "hover:bg-da-subtle",
                    )}
                  >
                    <td className="da-nums px-[0.625rem] text-2xs font-bold text-da-text">
                      {r.pass.id}
                    </td>
                    <td className="max-w-0 px-[0.625rem]">
                      <span className="block truncate text-2xs font-semibold text-da-text">
                        {r.pass.satName}
                      </span>
                    </td>
                    <td className="da-nums px-[0.625rem] text-2xs font-medium text-da-muted">
                      {r.pass.antennaId}
                    </td>
                    <td className="da-nums px-[0.625rem] text-2xs font-medium text-da-muted">
                      {new Date(r.aosAt).toISOString().slice(11, 19)}
                    </td>
                    <td className="da-nums px-[0.625rem] text-2xs font-medium text-da-muted">
                      {utc(r.completedAt)}
                    </td>
                    <td className="da-nums px-[0.625rem] text-2xs font-medium text-da-muted">
                      {fmtDuration(r.pass.durationSec)}
                    </td>
                    <td className="da-nums px-[0.625rem] text-right text-2xs font-semibold text-da-text">
                      {r.pass.maxElevationDeg}°
                    </td>
                    <td className="px-[0.625rem]">
                      <span
                        className="text-2xs font-bold uppercase"
                        style={{
                          color: `var(--color-${
                            r.pass.linkLock === "LOCKED"
                              ? "da-success"
                              : r.pass.linkLock === "DEGRADED"
                                ? "da-warn"
                                : "da-danger"
                          })`,
                        }}
                      >
                        {r.pass.linkLock}
                      </span>
                    </td>
                    <td className="da-nums px-[0.625rem] text-right text-2xs font-medium text-da-muted">
                      {r.pass.downlinkedMb} MB
                    </td>
                    <td
                      className={cn(
                        "da-nums px-[0.625rem] text-right text-2xs font-bold",
                        r.efficiencyPct >= 90
                          ? "text-da-success"
                          : r.efficiencyPct > 0
                            ? "text-da-warn-text"
                            : "text-da-danger",
                      )}
                    >
                      {r.efficiencyPct}%
                    </td>
                    <td className="px-[0.625rem]">
                      <span
                        className="text-2xs font-bold"
                        style={{ color: `var(--color-${PRIORITY_TOKEN[r.pass.priority]})` }}
                      >
                        {PRIORITY_LABEL[r.pass.priority]}
                      </span>
                    </td>
                    <td className="max-w-0 px-[0.625rem]">
                      {r.issues.length === 0 ? (
                        <span className="flex items-center gap-[0.25rem] text-2xs font-medium text-da-success">
                          <CheckCircle2 className="size-[0.75rem] shrink-0" strokeWidth={2.2} />
                          Clean
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex items-center gap-[0.25rem] text-2xs font-medium",
                            missed ? "text-da-danger" : "text-da-warn-text",
                          )}
                          title={r.issues.join(" · ")}
                        >
                          <TriangleAlert className="size-[0.75rem] shrink-0" strokeWidth={2.2} />
                          <span className="truncate">{r.issues[0]}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Record detail */}
      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        {selected && (
          <>
            <Panel
              className="shrink-0"
              title={selected.pass.satName}
              action={
                <span
                  className="shrink-0 rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-${
                      selected.pass.status === "MISSED" ? "da-danger" : "da-success"
                    }) 14%, transparent)`,
                    color: `var(--color-${
                      selected.pass.status === "MISSED" ? "da-danger" : "da-success"
                    })`,
                  }}
                >
                  {selected.pass.status}
                </span>
              }
            >
              <div className="px-[0.75rem] py-[0.5rem]">
                <span className="flex flex-col gap-[0.125rem] pb-[0.375rem]">
                  <span className="da-nums text-3xs font-bold uppercase tracking-[0.1em] text-da-brand">
                    {selected.pass.id} · NORAD {selected.pass.noradId}
                  </span>
                  <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                    {station?.name} · {selected.pass.antennaId}
                  </span>
                </span>

                <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
                  <Row label="AOS" value={utc(selected.aosAt)} />
                  <Row label="Completed" value={utc(selected.completedAt)} />
                  <Row label="Duration" value={fmtDuration(selected.pass.durationSec)} />
                  <Row label="Max elevation" value={`${selected.pass.maxElevationDeg}°`} />
                  <Row label="Mean signal" value={`${selected.meanSignalPct}%`} />
                  <Row label="Doppler drift" value={`${selected.dopplerDriftHz} Hz`} />
                  <Row
                    label="Downlinked"
                    value={`${selected.pass.downlinkedMb} / ${selected.pass.plannedVolumeMb} MB`}
                  />
                  <Row
                    label="Efficiency"
                    value={`${selected.efficiencyPct}%`}
                    tone={selected.efficiencyPct >= 90 ? "text-da-success" : "text-da-warn-text"}
                  />
                  <Row label="Modulation" value={selected.pass.modulation} />
                  <Row label="Downlink" value={`${selected.pass.frequencyMHz} MHz`} />
                </div>
              </div>
            </Panel>

            <Panel title="Issues Encountered" className="flex-1">
              <div className="px-[0.75rem] py-[0.5rem]">
                {selected.issues.length === 0 ? (
                  <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
                    <CheckCircle2 className="size-[0.875rem] shrink-0 text-da-success" strokeWidth={2.2} />
                    <span className="text-2xs font-medium leading-[1.4] text-da-muted">
                      Pass completed without anomaly. Nothing to report for compliance.
                    </span>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-[0.5rem]">
                    {selected.issues.map((issue) => (
                      <li
                        key={issue}
                        className="flex items-start gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-warn/35 bg-da-warn-soft px-[0.5rem] py-[0.4375rem]"
                      >
                        <TriangleAlert
                          className="mt-[0.0625rem] size-[0.75rem] shrink-0 text-da-warn"
                          strokeWidth={2.2}
                        />
                        <span className="text-2xs font-medium leading-[1.4] text-da-text">
                          {issue}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
