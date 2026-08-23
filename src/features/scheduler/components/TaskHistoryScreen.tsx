"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Inbox,
  RotateCcw,
  Search,
  Signal,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import {
  PRIORITY_LABEL,
  PRIORITY_TOKEN,
  STATIONS,
  statsFor,
} from "../data/schedule";
import { useArchiveRehydration } from "../hooks/usePassArchive";
import { usePassHistoryStore } from "../store/passHistoryStore";
import type { PassRecord, Priority } from "../types";

/**
 * Rows per page.
 *
 * Fixed rather than measured, and that is sound here: every length on this
 * screen is in rem off one root font-size clamp, so the table occupies the same
 * fraction of the viewport at 1440 as at 4K and the same fourteen rows fit
 * either way.
 */
const PAGE_SIZE = 14;

type SortKey =
  "completedAt" | "satName" | "durationSec" | "efficiencyPct" | "priority";

function Panel({
  title,
  action,
  footer,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
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
      {footer && (
        <div className="flex h-[2.125rem] shrink-0 items-center justify-between gap-[0.5rem] border-t-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
          {footer}
        </div>
      )}
    </section>
  );
}

/** One step arrow in the pager. Hoisted so it is not re-created each render. */
function PagerStep({
  to,
  disabled,
  onChange,
  children,
}: {
  to: number;
  disabled: boolean;
  onChange: (page: number) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(to)}
      className="flex size-[1.375rem] items-center justify-center rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors enabled:cursor-pointer enabled:hover:border-da-brand enabled:hover:text-da-brand disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/**
 * Page switcher.
 *
 * Windowed to five numbers around the current page so a 500-record archive does
 * not grow a row of forty buttons, with the first and last always reachable.
 */
function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const pages: number[] = [];
  const start = Math.max(0, Math.min(page - 2, pageCount - 5));
  for (let i = start; i < Math.min(pageCount, start + 5); i += 1) pages.push(i);

  return (
    <span className="flex items-center gap-[0.25rem]">
      <PagerStep to={page - 1} disabled={page === 0} onChange={onChange}>
        <ChevronLeft className="size-[0.75rem]" strokeWidth={2.6} />
      </PagerStep>

      {pages[0]! > 0 && (
        <span className="da-nums px-[0.125rem] text-3xs font-bold text-da-label">
          …
        </span>
      )}

      {pages.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={cn(
            "da-nums h-[1.375rem] min-w-[1.375rem] cursor-pointer rounded-[0.1875rem] border-[max(1px,0.0625rem)] px-[0.3125rem] text-3xs font-bold transition-colors",
            i === page
              ? "border-da-brand bg-da-brand text-da-on-brand"
              : "border-da-border text-da-muted hover:border-da-brand hover:text-da-brand",
          )}
        >
          {i + 1}
        </button>
      ))}

      {pages[pages.length - 1]! < pageCount - 1 && (
        <span className="da-nums px-[0.125rem] text-3xs font-bold text-da-label">
          …
        </span>
      )}

      <PagerStep
        to={page + 1}
        disabled={page >= pageCount - 1}
        onChange={onChange}
      >
        <ChevronRight className="size-[0.75rem]" strokeWidth={2.6} />
      </PagerStep>
    </span>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-[0.5rem] py-[0.3125rem]">
      <span className="truncate text-2xs font-medium uppercase tracking-[0.06em] text-da-muted">
        {label}
      </span>
      <span
        className={cn(
          "da-nums shrink-0 text-2xs font-bold",
          tone ?? "text-da-text",
        )}
      >
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
          <span
            className={cn(
              "da-nums text-xl font-bold tracking-[-0.02em]",
              tone ?? "text-da-text",
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="text-2xs font-semibold text-da-muted">{unit}</span>
          )}
        </span>
        <span className="mt-[0.3125rem] truncate text-3xs font-medium text-da-muted">
          {sub}
        </span>
      </span>
      <span className="flex size-[2rem] shrink-0 items-center justify-center rounded-[0.375rem] bg-da-subtle text-da-muted">
        {icon}
      </span>
    </div>
  );
}

const utc = (ms: number) =>
  new Date(ms).toISOString().replace("T", " ").slice(0, 19);
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
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(0);

  /**
   * The archive itself, live.
   *
   * Everything on this screen is a view of this array: a pass that finishes on
   * the scheduler is pushed here by the store and appears in the table on the
   * next render, and Refresh empties it. There is no separate "seeded" data any
   * more — the shipped log is simply the store's initial value.
   */
  const records = usePassHistoryStore((s) => s.records);
  const clearHistory = usePassHistoryStore((s) => s.clearHistory);
  useArchiveRehydration();

  const stats = useMemo(() => statsFor(records), [records]);

  const days = useMemo(
    () =>
      Array.from(new Set(records.map((r) => utcDate(r.completedAt))))
        .sort()
        .reverse(),
    [records],
  );

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = records.filter((r) => {
      const matchesText =
        term === "" ||
        r.pass.satName.toLowerCase().includes(term) ||
        r.pass.id.toLowerCase().includes(term) ||
        String(r.pass.noradId).includes(term);
      const matchesPriority =
        priority === "ALL" || r.pass.priority === priority;
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
  }, [records, query, priority, outcome, day, sort]);

  /**
   * Narrowing the filters can strand you on a page that no longer exists, so
   * the view resets to the first page whenever they change. Done during render
   * rather than in an effect — React's documented way to reset state on a
   * changing input, and it avoids painting one frame of the wrong page.
   */
  const filterKey = `${query}|${priority}|${outcome}|${day}|${sort.key}|${sort.dir}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Clamp rather than trust: clearing the archive drops the page count to one
  // while `page` may still be sitting at six.
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const selected: PassRecord | undefined =
    rows.find((r) => r.pass.id === selectedId) ?? pageRows[0];
  const station = STATIONS.find((s) => s.id === selected?.pass.stationId);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );

  const COLUMNS: {
    key: string;
    label: string;
    sort?: SortKey;
    width: string;
    align?: "right";
  }[] = [
    { key: "id", label: "Acq ID", width: "5.5rem" },
    { key: "sat", label: "Satellite", sort: "satName", width: "10.5rem" },
    // AOS carries time only — the date is already on the Completed column.
    { key: "aos", label: "AOS", width: "4.75rem" },
    {
      key: "completed",
      label: "Completed (UTC)",
      sort: "completedAt",
      width: "9.25rem",
    },
    { key: "duration", label: "Duration", sort: "durationSec", width: "5rem" },
    { key: "el", label: "Max El", width: "4.25rem", align: "right" },
    { key: "lock", label: "Link Lock", width: "5.25rem" },
    { key: "downlink", label: "Downlinked", width: "5.5rem", align: "right" },
    {
      key: "eff",
      label: "Efficiency",
      sort: "efficiencyPct",
      width: "5rem",
      align: "right",
    },
    { key: "priority", label: "Priority", sort: "priority", width: "5rem" },
    { key: "issues", label: "Issues", width: "14rem" },
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
              placeholder="Satellite, acquisition ID, NORAD…"
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
                options: [
                  ["ALL", "All dates"],
                  ...days.map((d) => [d, d] as [string, string]),
                ],
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
            value={`${stats.completed}`}
            sub={`${stats.missed} missed`}
            icon={<CheckCircle2 className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Link Lock Success"
            value={`${stats.lockSuccessPct}`}
            unit="%"
            sub="Locked at first acquisition"
            tone={
              stats.lockSuccessPct >= 80
                ? "text-da-success"
                : "text-da-warn-text"
            }
            icon={<Signal className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Mean Signal"
            value={`${stats.meanSignalPct}`}
            unit="%"
            sub="Across archived passes"
            icon={<Signal className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Data Archived"
            value={`${stats.volumeGb}`}
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
              {/*
                The archive fills while you watch it — the runtime keeps the
                clock going on this route too — so say so, or a count that
                changes on its own looks like a glitch.
              */}
              <span className="flex items-center gap-[0.3125rem]">
                <span className="relative flex size-[0.3125rem]">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-da-success opacity-70" />
                  <span className="relative inline-flex size-full rounded-full bg-da-success" />
                </span>
                <span className="text-3xs font-bold uppercase tracking-[0.08em] text-da-success">
                  Live
                </span>
              </span>
              <span className="da-nums text-3xs font-medium text-da-label">
                {rows.length} of {records.length} records
              </span>
              <button
                type="button"
                onClick={() => {
                  clearHistory();
                  setPage(0);
                  setSelectedId("");
                }}
                title="Clear the archive. It refills as scheduled tasks complete."
                className="inline-flex h-[1.5rem] cursor-pointer items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-muted transition-colors hover:border-da-danger hover:text-da-danger"
              >
                <RotateCcw className="size-[0.625rem]" strokeWidth={2.4} />
                Refresh
              </button>
              <button
                type="button"
                className="inline-flex h-[1.5rem] cursor-pointer items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand/35 bg-da-brand-soft px-[0.5rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-brand transition-colors hover:bg-da-brand hover:text-da-on-brand"
              >
                <Download className="size-[0.625rem]" strokeWidth={2.4} />
                Export
              </button>
            </span>
          }
          footer={
            <>
              <Pager page={safePage} pageCount={pageCount} onChange={setPage} />
              <span className="da-nums text-3xs font-medium text-da-label">
                {rows.length === 0
                  ? "No records"
                  : `Showing ${safePage * PAGE_SIZE + 1}–${safePage * PAGE_SIZE + pageRows.length}`}
              </span>
            </>
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
                            <ArrowUp
                              className="size-[0.625rem]"
                              strokeWidth={2.6}
                            />
                          ) : (
                            <ArrowDown
                              className="size-[0.625rem]"
                              strokeWidth={2.6}
                            />
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
              {pageRows.map((r) => {
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
                        style={{
                          color: `var(--color-${PRIORITY_TOKEN[r.pass.priority]})`,
                        }}
                      >
                        {PRIORITY_LABEL[r.pass.priority]}
                      </span>
                    </td>
                    <td className="max-w-0 px-[0.625rem]">
                      {r.issues.length === 0 ? (
                        <span className="flex items-center gap-[0.25rem] text-2xs font-medium text-da-success">
                          <CheckCircle2
                            className="size-[0.75rem] shrink-0"
                            strokeWidth={2.2}
                          />
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
                          <TriangleAlert
                            className="size-[0.75rem] shrink-0"
                            strokeWidth={2.2}
                          />
                          <span className="truncate">{r.issues[0]}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/*
            The archive can legitimately be empty — Refresh clears it, and it
            refills as tasks finish. Say so, rather than leaving a blank panel
            that reads as a failure to load.
          */}
          {pageRows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-[0.4375rem] py-[3rem]">
              <Inbox
                className="size-[1.375rem] text-da-label"
                strokeWidth={1.8}
              />
              <span className="text-2xs font-bold uppercase tracking-[0.1em] text-da-muted">
                {records.length === 0
                  ? "Archive empty"
                  : "No records match these filters"}
              </span>
              <span className="max-w-[24rem] text-center text-2xs font-medium leading-[1.5] text-da-label">
                {records.length === 0
                  ? "Passes are logged here as scheduled tasks run past LOS. Leave the scheduler running and the archive refills on its own."
                  : "Widen the priority, outcome or date filter to bring records back into view."}
              </span>
            </div>
          )}
        </Panel>
      </div>

      {/* Record detail */}
      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        {!selected && (
          <div className="da-card flex flex-1 flex-col items-center justify-center gap-[0.4375rem] px-[1.25rem] text-center">
            <Inbox className="size-[1.25rem] text-da-label" strokeWidth={1.8} />
            <span className="text-2xs font-bold uppercase tracking-[0.1em] text-da-muted">
              No pass selected
            </span>
            <span className="text-2xs font-medium leading-[1.5] text-da-label">
              Pick a row to read its geometry, link budget and any issues logged
              during the pass.
            </span>
          </div>
        )}

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
                      selected.pass.status === "MISSED"
                        ? "da-danger"
                        : "da-success"
                    }) 14%, transparent)`,
                    color: `var(--color-${
                      selected.pass.status === "MISSED"
                        ? "da-danger"
                        : "da-success"
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
                    {station?.name}
                  </span>
                </span>

                <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
                  <Row label="AOS" value={utc(selected.aosAt)} />
                  <Row label="Completed" value={utc(selected.completedAt)} />
                  <Row
                    label="Duration"
                    value={fmtDuration(selected.pass.durationSec)}
                  />
                  <Row
                    label="Max elevation"
                    value={`${selected.pass.maxElevationDeg}°`}
                  />
                  <Row
                    label="Mean signal"
                    value={`${selected.meanSignalPct}%`}
                  />
                  <Row
                    label="Doppler drift"
                    value={`${selected.dopplerDriftHz} Hz`}
                  />
                  <Row
                    label="Downlinked"
                    value={`${selected.pass.downlinkedMb} / ${selected.pass.plannedVolumeMb} MB`}
                  />
                  <Row
                    label="Efficiency"
                    value={`${selected.efficiencyPct}%`}
                    tone={
                      selected.efficiencyPct >= 90
                        ? "text-da-success"
                        : "text-da-warn-text"
                    }
                  />
                  <Row label="Modulation" value={selected.pass.modulation} />
                  <Row
                    label="Downlink"
                    value={`${selected.pass.frequencyMHz} MHz`}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Issues Encountered" className="flex-1">
              <div className="px-[0.75rem] py-[0.5rem]">
                {selected.issues.length === 0 ? (
                  <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
                    <CheckCircle2
                      className="size-[0.875rem] shrink-0 text-da-success"
                      strokeWidth={2.2}
                    />
                    <span className="text-2xs font-medium leading-[1.4] text-da-muted">
                      Pass completed without anomaly. Nothing to report for
                      compliance.
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
