"use client";

import { BellRing, Calendar } from "lucide-react";
import { useState } from "react";
import {
  ALERT_SOURCES,
  SEED_ALERT_CATEGORY_FACETS,
  SEED_ALERT_STATS,
} from "../../data/alerts";
import type { SeverityId } from "../../types";
import { Button } from "../ui/Button";
import {
  CheckRow,
  FilterGroup,
  FilterRail,
  RangeField,
  SegmentedField,
  SelectField,
  ToggleRow,
} from "../filters/FilterControls";

const SEVERITY_FACETS: { id: SeverityId; label: string; count: number; color: string }[] = [
  { id: "critical", label: "Critical", count: 4, color: "da-danger" },
  { id: "warning", label: "Warning", count: 9, color: "da-warn" },
  { id: "info", label: "Info", count: 5, color: "da-info" },
];

/** The ALERTS rail: state segment, severity facets, source and category narrowing. */
export function AlertFilterPanel() {
  const [state, setState] = useState("Active");
  const [severities, setSeverities] = useState<SeverityId[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [muteAcked, setMuteAcked] = useState(false);

  const toggleSeverity = (id: SeverityId) =>
    setSeverities((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const toggleCategory = (label: string) =>
    setCategories((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label],
    );

  const reset = () => {
    setState("Active");
    setSeverities([]);
    setCategories([]);
  };

  return (
    <FilterRail
      onReset={reset}
      footer={
        <>
          <Button className="w-full">Apply Filters</Button>
          <Button
            variant="ghost"
            className="w-full"
            icon={<BellRing className="size-[0.75rem]" strokeWidth={2.2} />}
          >
            Acknowledge All
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

      <FilterGroup label="State">
        <SegmentedField
          options={["Active", "Ack", "Resolved"]}
          value={state}
          onChange={setState}
        />
      </FilterGroup>

      <FilterGroup label="Severity">
        <div className="flex flex-col gap-[0.25rem]">
          <CheckRow
            label="All Severities"
            count={SEED_ALERT_STATS.active}
            checked={severities.length === 0}
            onToggle={() => setSeverities([])}
          />
          {SEVERITY_FACETS.map((facet) => (
            <CheckRow
              key={facet.id}
              label={facet.label}
              count={facet.count}
              checked={severities.includes(facet.id)}
              onToggle={() => toggleSeverity(facet.id)}
              swatch={facet.color}
              tintLabel
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Source">
        <SelectField options={ALERT_SOURCES} />
      </FilterGroup>

      <FilterGroup label="Category">
        <div className="flex flex-col gap-[0.25rem]">
          {SEED_ALERT_CATEGORY_FACETS.map((facet) => (
            <CheckRow
              key={facet.label}
              label={facet.label}
              count={facet.count}
              checked={categories.includes(facet.label)}
              onToggle={() => toggleCategory(facet.label)}
              swatch={facet.color}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Display">
        <ToggleRow
          label="Hide Acknowledged"
          checked={muteAcked}
          onToggle={() => setMuteAcked((v) => !v)}
        />
      </FilterGroup>
    </FilterRail>
  );
}
