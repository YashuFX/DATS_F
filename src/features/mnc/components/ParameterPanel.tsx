"use client";

import { useState } from "react";
import { Panel } from "./Panel";
import { TabRail } from "./TabRail";
import { ParameterTable } from "./ParameterTable";
import {
  ANTENNA_PARAMETERS,
  BEAM_PARAMETERS,
  SYSTEM_PARAMETERS,
  THRESHOLD_PARAMETERS,
} from "../data/mnc.mock";

const TABS = [
  { id: "antenna", label: "Antenna Parameters" },
  { id: "beam", label: "Beam Parameters" },
  { id: "system", label: "System Parameters" },
  { id: "thresholds", label: "Thresholds" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const ROWS = {
  antenna: ANTENNA_PARAMETERS,
  beam: BEAM_PARAMETERS,
  system: SYSTEM_PARAMETERS,
  thresholds: THRESHOLD_PARAMETERS,
} as const;

export function ParameterPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState<TabId>("antenna");

  return (
    <Panel className={className} title="Parameter Panel" expandHref="/settings" expandLabel="Open Settings" bodyClassName="flex flex-col">
      {/* The rail scrolls sideways rather than wrapping: four tab labels this
          long will not fit the right column at 1366 px, and a wrapped rail
          changes the panel's header height between tabs. */}
      <div className="shrink-0 overflow-x-auto">
        <TabRail tabs={TABS} active={tab} onChange={setTab} label="Parameter group" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ParameterTable rows={ROWS[tab]} variant="band" />
      </div>
    </Panel>
  );
}
