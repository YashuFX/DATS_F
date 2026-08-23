"use client";

import { Bell, BellRing, LayoutTemplate, MessageSquare } from "lucide-react";
import { notify, useNotifyStore } from "../../store/notifyStore";
import { useSettingsStore } from "../../store/settingsStore";
import {
  NOTIFY_POSITIONS,
  SEVERITIES,
  type NotifyPosition,
  type NotifyStyle,
} from "../../types";
import {
  Btn,
  Field,
  Note,
  Panel,
  PanelGrid,
  Segmented,
  SelectInput,
  Slider,
  Switch,
  TabHeader,
  Toggle,
} from "../ui";

const SAMPLES: Record<string, string> = {
  info: "Scheduled export ARC-1182 queued behind two jobs",
  success: "Archive record written — 2.45 GB to /archive/primary",
  warning: "Primary volume at 84% — remote vault mirror is 6 h behind",
  error: "RFSoC-06 dropped its link mid-pass; capture buffered locally",
};

const STYLE_BLURB: Record<NotifyStyle, string> = {
  toast: "A receipt in the corner. Auto-dismisses, never blocks the board.",
  banner: "A strip across the top. Reads as a condition, not an event.",
  dialog: "Centre screen, one at a time, dismissed by hand. Use for anything that must be acknowledged.",
};

export function NotificationsTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const clear = useNotifyStore((s) => s.clear);

  const off = !settings.notificationsEnabled;

  return (
    <>
      <TabHeader
        title="Notifications"
        description="How the application interrupts you. Suppressed notifications are still written to the event log — the record does not depend on whether you were watching."
      >
        <Btn icon={BellRing} onClick={() => notify("info", SAMPLES.info)}>
          Send a test
        </Btn>
        <Btn onClick={clear}>Clear on-screen</Btn>
      </TabHeader>

      <PanelGrid>
        <Panel
          title="Delivery"
          icon={Bell}
          description="The master switch, and what happens when one arrives."
        >
          <Toggle
            label="Show notifications"
            hint="Off silences every style. The event log keeps recording."
            checked={settings.notificationsEnabled}
            onChange={(v) => update({ notificationsEnabled: v })}
          />
          <Field label="Style">
            <Segmented<NotifyStyle>
              value={settings.notifyStyle}
              onValue={(v) => update({ notifyStyle: v })}
              options={[
                { value: "toast", label: "Toast", icon: MessageSquare },
                { value: "banner", label: "Banner", icon: LayoutTemplate },
                { value: "dialog", label: "Dialog", icon: Bell },
              ]}
            />
          </Field>
          <Note>{STYLE_BLURB[settings.notifyStyle]}</Note>

          <Field
            label="Corner"
            hint={
              settings.notifyStyle === "toast"
                ? "Where the stack sits. Bottom-right clears the section compass."
                : "Toast only — banners span the top, dialogs sit centre screen."
            }
          >
            <SelectInput
              value={settings.notifyPosition}
              onValue={(v) => update({ notifyPosition: v as NotifyPosition })}
              options={NOTIFY_POSITIONS.map((p) => ({
                label: p.label,
                value: p.id,
              }))}
            />
          </Field>

          <Field
            label="Auto-dismiss"
            hint="Dialogs ignore this: a question waits for an answer."
          >
            <Slider
              value={settings.notifyDurationSec}
              onValue={(v) => update({ notifyDurationSec: v })}
              min={1}
              max={15}
              step={1}
              format={(v) => `${v} s`}
            />
          </Field>

          <Field
            label="Stack depth"
            hint="How many toasts or banners are on screen before the oldest is dropped."
          >
            <Slider
              value={settings.notifyStack}
              onValue={(v) => update({ notifyStack: v })}
              min={1}
              max={6}
              step={1}
              format={(v) => `${v}`}
            />
          </Field>
        </Panel>

        <Panel
          title="Severities"
          icon={BellRing}
          description="Which classes reach the screen. Test each one against the current settings."
        >
          {SEVERITIES.map((severity) => (
            <div
              key={severity.id}
              className="flex items-center gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border/60 pb-[0.5rem] last:border-b-0 last:pb-0"
            >
              {/* Painted from the token directly: these five dots are the one
                  place the severity colours are shown as themselves. */}
              <span
                className="size-[0.5rem] shrink-0 rounded-full"
                style={{ background: `var(--color-${severity.token})` }}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-2xs font-bold text-da-text">
                  {severity.label}
                </span>
                <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
                  {SAMPLES[severity.id]}
                </span>
              </span>
              <Btn
                onClick={() => notify(severity.id, SAMPLES[severity.id])}
                disabled={off || !settings.notifySeverities[severity.id]}
                className="shrink-0"
              >
                Test
              </Btn>
              <Switch
                label={`Show ${severity.label} notifications`}
                checked={settings.notifySeverities[severity.id]}
                disabled={off}
                onChange={(next) =>
                  update(
                    {
                      notifySeverities: {
                        ...settings.notifySeverities,
                        [severity.id]: next,
                      },
                    },
                    `${severity.label} notifications ${next ? "on" : "off"}`,
                  )
                }
              />
            </div>
          ))}
          {off && (
            <Note>
              Every severity is suppressed while “Show notifications” is off.
            </Note>
          )}
        </Panel>
      </PanelGrid>
    </>
  );
}
