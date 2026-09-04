"use client";

import { Clock, Compass, LayoutGrid, Maximize2, Table2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SECTIONS } from "@/features/shell/sections";
import { useSettingsStore } from "../../store/settingsStore";
import { PANEL_BACKDROPS, PANEL_EXPAND_MODES, TIME_ZONES } from "../../types";
import {
  Field,
  Note,
  Panel,
  PanelGrid,
  Readout,
  Segmented,
  SelectInput,
  Slider,
  TabHeader,
  TextInput,
  Toggle,
} from "../ui";

/**
 * How the consoles behave, as opposed to how they look.
 *
 * The time zone is the one setting here that reaches furthest: every timestamp
 * on the archival board, the logs, the alerts and the export queue is formatted
 * through the same module, so changing it repoints all of them on the next tick
 * of the demo clock — about a second.
 */
export function ConsoleTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  /* A live sample, so the zone and clock choices are checked against a moving
     value rather than a frozen one.

     Seeded during render rather than in an effect, which is safe here and only
     here: the settings route renders behind a Suspense boundary and an auth
     guard, so it has no server-rendered HTML for a wall-clock read to disagree
     with. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const preview = new Intl.DateTimeFormat("en-GB", {
    timeZone: settings.timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: !settings.clock24h,
  }).format(now);

  return (
    <>
      <TabHeader
        title="Console"
        description="Time, table density and navigation. These apply to the archival board, the scheduler and the tracking console alike."
      />

      <PanelGrid>
        <Panel
          title="Time"
          icon={Clock}
          description="Every timestamp in the application is formatted from these two."
        >
          <Field
            label="Time zone"
            hint="Changing this repoints every formatter; the board picks it up on the next tick."
          >
            <SelectInput
              value={settings.timeZone}
              onValue={(value) => {
                const zone = TIME_ZONES.find((z) => z.value === value);
                update({
                  timeZone: value,
                  timeZoneLabel: zone?.abbr ?? value,
                });
              }}
              options={TIME_ZONES.map((z) => ({ label: z.label, value: z.value }))}
            />
          </Field>

          <Field
            label="Column label"
            hint="What the tables print beside “Time”. Follows the zone unless you override it."
          >
            <TextInput
              value={settings.timeZoneLabel}
              maxLength={6}
              mono
              onChange={(e) => update({ timeZoneLabel: e.target.value })}
            />
          </Field>

          <Field label="Clock">
            <Segmented
              value={settings.clock24h ? "24" : "12"}
              onValue={(v) => update({ clock24h: v === "24" })}
              options={[
                { value: "24", label: "24 hour" },
                { value: "12", label: "12 hour" },
              ]}
            />
          </Field>

          <Readout label="Reads as" value={preview} />

          <Field
            label="Refresh interval"
            hint="How often the live clock and its dependent counters advance."
          >
            <Slider
              value={settings.clockTickMs}
              onValue={(v) => update({ clockTickMs: v })}
              min={250}
              max={5000}
              step={250}
              format={(v) => `${(v / 1000).toFixed(2)} s`}
            />
          </Field>
        </Panel>

        <Panel
          title="Tables"
          icon={Table2}
          description="Paged tables measure themselves by default so a page is exactly what the card can show."
        >
          <Field label="Rows per page">
            <Segmented
              value={settings.tableRows === "auto" ? "auto" : "fixed"}
              onValue={(v) =>
                update({ tableRows: v === "auto" ? "auto" : 10 })
              }
              options={[
                { value: "auto", label: "Fit the card" },
                { value: "fixed", label: "Fixed count" },
              ]}
            />
          </Field>

          {settings.tableRows === "auto" ? (
            <Note>
              Measured against the card at the current board scale — no scrollbar
              at any viewport, from a 1366 laptop to a 4K wall.
            </Note>
          ) : (
            <Field
              label="Rows"
              hint="A fixed count can overflow or leave a gap at scales other than yours."
            >
              <Slider
                value={settings.tableRows as number}
                onValue={(v) => update({ tableRows: v })}
                min={4}
                max={40}
                step={1}
                format={(v) => `${v}`}
              />
            </Field>
          )}
        </Panel>

        <Panel
          title="Panels"
          icon={Maximize2}
          description="What the expand control on a board panel does — on the M&C board, and anywhere else panels carry one."
        >
          <Field
            label="Expand control"
            hint="Expanding in place keeps the board, the running simulation and the globe exactly as they were; opening the full page navigates to the section's own screen."
          >
            <Segmented
              value={settings.panelExpand}
              onValue={(v) => update({ panelExpand: v })}
              options={PANEL_EXPAND_MODES.map((m) => ({
                value: m.id,
                label: m.label,
              }))}
            />
          </Field>

          {settings.panelExpand === "overlay" ? (
            <>
              <Field
                label="Screen coverage"
                hint="How much of the viewport an expanded panel takes. Phones ignore this and use the whole screen — a fraction of a phone is not a bigger panel."
              >
                <Slider
                  value={settings.panelOverlaySize}
                  onValue={(v) => update({ panelOverlaySize: v })}
                  min={60}
                  max={98}
                  step={1}
                  format={(v) => `${v}%`}
                />
              </Field>

              <Field label="Board behind it">
                <Segmented
                  value={settings.panelOverlayBackdrop}
                  onValue={(v) => update({ panelOverlayBackdrop: v })}
                  options={PANEL_BACKDROPS.map((b) => ({
                    value: b.id,
                    label: b.label,
                  }))}
                />
              </Field>

              <Toggle
                label="Click outside to close"
                hint="Escape and the panel's own Close always work, whichever way this sits."
                checked={settings.panelOverlayDismiss}
                onChange={(v) => update({ panelOverlayDismiss: v })}
              />
            </>
          ) : (
            <Note>
              Each panel&rsquo;s expand control navigates to its own screen —
              tracking, the 3D dome, the scheduler — and the browser&rsquo;s back
              button returns to the board.
            </Note>
          )}
        </Panel>

        <Panel
          title="Navigation"
          icon={Compass}
          description="The compass that floats at the bottom of every console."
        >
          <Toggle
            label="Show the section compass"
            hint="Hiding it leaves each console's own header as the way out."
            checked={settings.showSectionNav}
            onChange={(v) => update({ showSectionNav: v })}
          />
          <Field
            label="Landing section"
            hint="Where signing in takes you, and where Settings goes back to when it was opened directly."
          >
            <SelectInput
              value={settings.homeHref}
              onValue={(v) => update({ homeHref: v })}
              options={SECTIONS.map((s) => ({ label: s.label, value: s.href }))}
            />
          </Field>
        </Panel>

        <Panel
          title="Sections"
          icon={LayoutGrid}
          description="Everything the compass reaches."
        >
          <div className="grid grid-cols-1 gap-[0.5rem] sm:grid-cols-2">
            {SECTIONS.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                className="flex items-start gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border p-[0.5rem] transition-colors hover:border-da-brand"
              >
                <span className="flex size-[1.5rem] shrink-0 items-center justify-center rounded-[0.1875rem] bg-da-subtle text-da-brand">
                  <section.icon className="size-[0.75rem]" strokeWidth={2.2} />
                </span>
                <span className="flex min-w-0 flex-col leading-none">
                  <span className="text-2xs font-bold text-da-text">
                    {section.label}
                  </span>
                  <span className="mt-[0.25rem] text-3xs font-medium leading-[1.4] text-da-muted">
                    {section.blurb}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </PanelGrid>
    </>
  );
}
