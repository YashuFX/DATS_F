"use client";

import { useMemo, useState } from "react";
import { Panel } from "./Panel";
import { TabRail } from "./TabRail";
import { ParameterTable } from "./ParameterTable";
import { useDomeStore } from "@/features/dome-monitor/store/domeStore";
import { FACE_MAP, PRESENT_FACES } from "@/features/dome-monitor/data/geometry";
import { MC_HEALTH_META } from "../types";
import {
  domeOverviewRows,
  faceElementRows,
  faceOverviewRows,
  toMcHealth,
} from "../lib/faceParameters";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "elements", label: "Elements" },
  { id: "trends", label: "Trends" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Sentinel for "no single face" — a select needs a string, and "" is a value
 *  an operator can land on with a keyboard, so it is named rather than blank. */
const ALL = "all";

/**
 * Health Preview — the numbers behind whatever is selected in Health Overview.
 *
 * The two panels share ONE selection, the dome store's, rather than each
 * keeping its own. Before this the preview read a hand-written "Tile Group"
 * fixture with no connection to the dome beside it: you could select a
 * critical face and watch the preview go on reporting Healthy. Two panels
 * captioned as one system must not be able to disagree about what they are
 * describing.
 *
 * The select is two-way: it follows the dome, and choosing from it selects on
 * the dome. It is the same store either way, so there is no syncing to get
 * wrong — just one value read and written from two places, which is also why
 * the /dome route stays in step with whatever is picked here.
 */
export function HealthPreviewPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState<TabId>("overview");
  const telemetry = useDomeStore((s) => s.telemetry);
  const selection = useDomeStore((s) => s.selection);
  const selectFace = useDomeStore((s) => s.selectFace);
  const clearSelection = useDomeStore((s) => s.clearSelection);

  const faceNum = selection.faceNum;
  const face = faceNum === undefined ? undefined : FACE_MAP[faceNum];
  const ft = faceNum === undefined ? undefined : telemetry.faces[faceNum];

  const overviewRows = useMemo(
    () => (ft ? faceOverviewRows(ft) : domeOverviewRows(telemetry)),
    [ft, telemetry],
  );
  const elementRows = useMemo(() => (ft ? faceElementRows(ft) : []), [ft]);

  const health = ft ? toMcHealth(ft.health) : "healthy";
  const meta = MC_HEALTH_META[health];

  return (
    <Panel
      className={className}
      title="Health Preview"
      expandHref={faceNum === undefined ? "/dome" : `/dome?face=${faceNum}`}
      expandLabel="Open 3D Dome"
      bodyClassName="flex flex-col"
    >
      <div className="flex shrink-0 items-end justify-between gap-[0.75rem] px-[0.75rem] py-[0.5rem]">
        <label className="flex min-w-0 flex-1 flex-col gap-[0.25rem]">
          <span className="text-3xs font-semibold uppercase tracking-[0.07em] text-da-label">
            Selected Face
          </span>
          <select
            value={faceNum === undefined ? ALL : String(faceNum)}
            onChange={(e) => {
              if (e.target.value === ALL) clearSelection();
              else selectFace(Number(e.target.value));
            }}
            className="w-full cursor-pointer truncate rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] py-[0.3125rem] text-2xs font-semibold text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
          >
            <option value={ALL}>Dome — all {PRESENT_FACES.length} faces</option>
            {PRESENT_FACES.map((f) => (
              <option key={f.fceNum} value={f.fceNum}>
                Face {f.fceNum} · {f.kind === "pentagon" ? "Pentagon" : "Hexagon"}
              </option>
            ))}
          </select>
        </label>
        <span className="flex shrink-0 items-center gap-[0.375rem] pb-[0.375rem]">
          <span className="size-[0.4375rem] rounded-full" style={{ backgroundColor: `var(--color-${meta.token})` }} />
          <span className="text-2xs font-semibold" style={{ color: `var(--color-${meta.token})` }}>
            {ft ? meta.label : "Rollup"}
          </span>
        </span>
      </div>

      <TabRail tabs={TABS} active={tab} onChange={setTab} label="Health preview view" />

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "overview" && <ParameterTable rows={overviewRows} variant="threshold" />}

        {tab === "elements" &&
          (ft ? (
            <ParameterTable rows={elementRows} variant="threshold" />
          ) : (
            // No dome-wide element breakdown: rolling 7 557 elements into four
            // counts would answer "how many are bad" while hiding the only
            // thing that matters at this level, which is WHERE they are.
            <div className="flex h-full items-center justify-center px-[1rem] py-[2rem] text-center">
              <span className="text-2xs font-medium leading-[1.5] text-da-muted">
                Select a face to break it down
                <br />
                element by element.
              </span>
            </div>
          ))}

        {tab === "trends" && (
          // Honest empty state rather than an invented sparkline: nothing in
          // this console retains per-face history yet, and a fabricated trend
          // is the one chart an operator would act on wrongly.
          <div className="flex h-full items-center justify-center px-[1rem] py-[2rem] text-center">
            <span className="text-2xs font-medium leading-[1.5] text-da-muted">
              No retained history{face ? ` for Face ${face.fceNum}` : ""}.
              <br />
              Trend data arrives with the archival feed.
            </span>
          </div>
        )}
      </div>
    </Panel>
  );
}
