"use client";

import { useMemo, useState } from "react";
import { Panel } from "./Panel";
import { TabRail } from "./TabRail";
import { ParameterTable } from "./ParameterTable";
import { THRESHOLD_PARAMETERS } from "../data/mnc.mock";
import { useSimStore, activeTarget } from "../sim/simStore";
import { antennaRows, beamRows, systemRows } from "../sim/liveParameters";

const TABS = [
  { id: "antenna", label: "Antenna Parameters" },
  { id: "beam", label: "Beam Parameters" },
  { id: "system", label: "System Parameters" },
  { id: "thresholds", label: "Thresholds" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Parameter panel, driven by the live tracking state.
 *
 * Three of its four tabs now derive from the simulation rather than from a
 * fixed table. They used to be static beside a running propagator, so an
 * operator could watch a pass climb through zenith while "Beam Pointing
 * Elevation 36.21°" sat frozen next to it. Panels in one frame describe one
 * situation or none of them can be trusted.
 *
 * Thresholds stay static on purpose: they are the configured limits the live
 * values are judged against, and a limit that moved with the reading would
 * not be a limit.
 */
export function ParameterPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState<TabId>("antenna");

  const target = useSimStore(activeTarget);
  const plan = useSimStore((s) => s.plan);
  const states = useSimStore((s) => s.states);
  const running = useSimStore((s) => s.running);
  const simTime = useSimStore((s) => s.simTime);

  const rows = useMemo(() => {
    switch (tab) {
      case "antenna":
        return antennaRows(target, plan);
      case "beam":
        return beamRows(target, plan);
      case "system":
        return systemRows(target, plan, states.length, running, simTime);
      case "thresholds":
        return THRESHOLD_PARAMETERS;
    }
  }, [tab, target, plan, states.length, running, simTime]);

  return (
    <Panel className={className} title="Parameter Panel" expandHref="/settings" expandLabel="Open Settings" bodyClassName="flex flex-col">
      {/* The rail scrolls sideways rather than wrapping: four tab labels this
          long will not fit the right column at 1366 px, and a wrapped rail
          changes the panel's header height between tabs. */}
      <div className="shrink-0 overflow-x-auto">
        <TabRail tabs={TABS} active={tab} onChange={setTab} label="Parameter group" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ParameterTable rows={rows} variant="band" />
      </div>
    </Panel>
  );
}
