"use client";

import { Calendar, Download } from "lucide-react";
import { useState } from "react";
import {
  LOG_HOSTS,
  LOG_SUBSYSTEMS,
  SEED_LOG_LEVEL_FACETS,
  SEED_LOG_TOTAL,
} from "../../data/logs";
import type { LogLevelId } from "../../types";
import { Button } from "../ui/Button";
import {
  CheckRow,
  FilterGroup,
  FilterRail,
  RangeField,
  SelectField,
  TextField,
  ToggleRow,
} from "../filters/FilterControls";
import { LOG_LEVEL_COLOR } from "./logLevels";

/** The LOGS rail: level facets, subsystem/host narrowing and a live-tail switch. */
export function LogFilterPanel() {
  const [levels, setLevels] = useState<LogLevelId[]>([]);
  const [tail, setTail] = useState(true);

  const toggleLevel = (id: LogLevelId) =>
    setLevels((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  return (
    <FilterRail
      onReset={() => setLevels([])}
      footer={
        <>
          <Button className="w-full">Apply Filters</Button>
          <Button
            variant="ghost"
            className="w-full"
            icon={<Download className="size-[0.75rem]" strokeWidth={2.2} />}
          >
            Export Log Set
          </Button>
        </>
      }
    >
      <FilterGroup label="Time Window">
        <RangeField
          value="20/05/2025 06:00 - 18:42"
          icon={<Calendar className="size-[0.75rem] shrink-0 text-da-label" strokeWidth={2} />}
        />
      </FilterGroup>

      <FilterGroup label="Log Level">
        <div className="flex flex-col gap-[0.25rem]">
          <CheckRow
            label="All Levels"
            count={SEED_LOG_TOTAL}
            checked={levels.length === 0}
            onToggle={() => setLevels([])}
          />
          {SEED_LOG_LEVEL_FACETS.map((facet) => (
            <CheckRow
              key={facet.id}
              label={facet.label}
              count={facet.count}
              checked={levels.includes(facet.id)}
              onToggle={() => toggleLevel(facet.id)}
              swatch={LOG_LEVEL_COLOR[facet.id]}
              tintLabel
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Subsystem">
        <SelectField options={LOG_SUBSYSTEMS} />
      </FilterGroup>

      <FilterGroup label="Host / Node">
        <SelectField options={LOG_HOSTS} />
      </FilterGroup>

      <FilterGroup label="Trace ID">
        <TextField placeholder="tr-…" />
      </FilterGroup>

      <FilterGroup label="Stream">
        <ToggleRow label="Live Tail" checked={tail} onToggle={() => setTail((v) => !v)} />
      </FilterGroup>
    </FilterRail>
  );
}
