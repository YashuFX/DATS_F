"use client";

import {
  Download,
  FileJson,
  RotateCcw,
  Radio,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";
import { SignOutButton } from "@/features/auth";
import { useSession } from "@/features/auth/hooks/useSession";
import { SCHEDULE_STATS } from "@/features/scheduler/data/schedule";
import { notify } from "../../store/notifyStore";
import { useSettingsStore } from "../../store/settingsStore";
import { DEFAULT_SETTINGS, type AppSettings } from "../../types";
import {
  Btn,
  Field,
  Note,
  NumberInput,
  Panel,
  PanelGrid,
  Readout,
  TabHeader,
  TextInput,
  Toggle,
} from "../ui";

/**
 * The deployment, the operator, and the configuration file itself.
 *
 * Station identity is editable here because a component library is deployed at
 * more than one site; the schedule geometry beside it is not, because it is a
 * property of the planner rather than a preference — presenting it as a field
 * you can type into and have quietly ignored would be worse than showing it as
 * the readout it is.
 */
export function SystemTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  const replaceAll = useSettingsStore((s) => s.replaceAll);

  const session = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function exportConfig() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dats-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("success", "Configuration written to a JSON file");
  }

  async function importConfig(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<AppSettings>;
      if (typeof parsed !== "object" || parsed === null) throw new Error("shape");
      // Merged onto the defaults rather than trusted whole: a file from an older
      // build is missing keys this one needs, and a hand-edited one may carry
      // keys that no longer exist.
      replaceAll({ ...DEFAULT_SETTINGS, ...parsed });
      notify("success", `Configuration loaded from ${file.name}`);
    } catch {
      notify("error", `${file.name} is not a valid settings file`);
    }
  }

  return (
    <>
      <TabHeader
        title="System"
        description="Deployment identity, the signed-in session, and the configuration file behind this whole screen."
      >
        <Btn icon={Download} onClick={exportConfig}>
          Export config
        </Btn>
        <Btn icon={Upload} onClick={() => fileRef.current?.click()}>
          Import config
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importConfig(file);
            e.target.value = "";
          }}
        />
      </TabHeader>

      <PanelGrid>
        <Panel
          title="Ground segment"
          icon={Radio}
          description="Which aperture this console is driving."
        >
          <Field label="Station name">
            <TextInput
              value={settings.stationName}
              onChange={(e) => update({ stationName: e.target.value })}
            />
          </Field>
          <Field label="Call sign">
            <TextInput
              mono
              value={settings.stationCallSign}
              onChange={(e) => update({ stationCallSign: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-[0.5rem]">
            <Field label="Latitude °N">
              <NumberInput
                value={settings.stationLatDeg}
                onValue={(v) => update({ stationLatDeg: v })}
                min={-90}
                max={90}
                step={0.0001}
              />
            </Field>
            <Field label="Longitude °E">
              <NumberInput
                value={settings.stationLonDeg}
                onValue={(v) => update({ stationLonDeg: v })}
                min={-180}
                max={180}
                step={0.0001}
              />
            </Field>
          </div>
          <Field label="Altitude">
            <NumberInput
              value={settings.stationAltM}
              onValue={(v) => update({ stationAltM: v })}
              min={-500}
              max={9000}
              suffix="m"
            />
          </Field>

          <Note>Planner geometry — a property of the scheduler, not a preference:</Note>
          <Readout
            label="Catalogue capacity"
            value={`${SCHEDULE_STATS.satelliteCapacity} satellites`}
          />
          <Readout
            label="Schedule resolution"
            value={`${SCHEDULE_STATS.resolutionMs} ms`}
          />
          <Readout
            label="Planning window"
            value={`${SCHEDULE_STATS.windowHours.toFixed(1)} h`}
          />
        </Panel>

        <Panel
          title="Session"
          icon={UserRound}
          description="Who is signed in on this device, and how long an idle console stays that way."
          action={session.status === "authenticated" ? <SignOutButton /> : undefined}
        >
          {session.status === "authenticated" ? (
            <>
              <Readout label="Signed in as" value={session.session.email} />
              <Readout
                label="Session started"
                value={new Date(session.session.startedAt)
                  .toISOString()
                  .replace("T", " ")
                  .slice(0, 19)}
              />
            </>
          ) : (
            <Note>
              {session.status === "checking"
                ? "Reading session…"
                : "No active session."}
            </Note>
          )}

          <Field
            label="Idle timeout"
            hint="Signs out after this long with no pointer, key or scroll. Zero never signs out."
          >
            <NumberInput
              value={settings.sessionTimeoutMin}
              onValue={(v) => update({ sessionTimeoutMin: v })}
              min={0}
              max={480}
              suffix="min"
            />
          </Field>

          <Field label="Alert address" hint="Where this console addresses operator alerts.">
            <TextInput
              type="email"
              value={settings.operatorEmail}
              onChange={(e) => update({ operatorEmail: e.target.value })}
              placeholder="operator@istrac.gov.in"
            />
          </Field>
        </Panel>

        <Panel
          title="Safety & audit"
          icon={ShieldCheck}
          description="What the console asks before it does something irreversible, and what it writes down."
        >
          <Toggle
            label="Confirm destructive actions"
            hint="Clearing the archive and resetting settings ask twice."
            checked={settings.confirmDestructive}
            onChange={(v) => update({ confirmDestructive: v })}
          />
          <Toggle
            label="Audit configuration changes"
            hint="Every setting that moves is written to the event log, naming the setting and its new value."
            checked={settings.auditLogging}
            onChange={(v) =>
              update({ auditLogging: v }, `Configuration audit ${v ? "on" : "off"}`)
            }
          />
          <Field
            label="Event log depth"
            hint="Entries kept before the oldest is dropped."
          >
            <NumberInput
              value={settings.auditLogCap}
              onValue={(v) => update({ auditLogCap: v })}
              min={20}
              max={2000}
              step={20}
            />
          </Field>
        </Panel>

        <Panel
          title="Configuration"
          icon={FileJson}
          description="This whole screen is one JSON object. It can leave and come back."
        >
          <Note>
            Export writes the current settings to a file; import merges a file
            onto the defaults, so a config from an earlier build still loads.
            Neither touches the pass archive or the sign-in credentials.
          </Note>
          <span className="flex flex-wrap gap-[0.375rem]">
            <Btn icon={Download} onClick={exportConfig}>
              Export
            </Btn>
            <Btn icon={Upload} onClick={() => fileRef.current?.click()}>
              Import
            </Btn>
            <Btn
              variant="danger"
              icon={RotateCcw}
              onBlur={() => setConfirmReset(false)}
              onClick={() => {
                if (settings.confirmDestructive && !confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                reset();
                setConfirmReset(false);
                notify("warning", "Every setting returned to its default");
              }}
            >
              {confirmReset ? "Confirm — reset everything" : "Reset all settings"}
            </Btn>
          </span>
          <Note>
            The theme is stored separately from all of this, so it survives a
            reset.
          </Note>
        </Panel>
      </PanelGrid>
    </>
  );
}
