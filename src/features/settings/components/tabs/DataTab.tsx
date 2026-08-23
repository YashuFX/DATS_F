"use client";

import { Archive, Database, HardDrive, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DATA_TYPES,
  PRIORITIES,
} from "@/features/data-archival/config";
import { useArchiveRehydration } from "@/features/scheduler/hooks/usePassArchive";
import { usePassHistoryStore } from "@/features/scheduler/store/passHistoryStore";
import { notify } from "../../store/notifyStore";
import { useSettingsStore } from "../../store/settingsStore";
import {
  COMPRESSION_MODES,
  EXPORT_FORMATS,
  RETENTION_POLICIES,
} from "../../types";
import {
  Btn,
  Field,
  Note,
  Panel,
  PanelGrid,
  Readout,
  SelectInput,
  Slider,
  TabHeader,
  TextInput,
  Toggle,
} from "../ui";

/**
 * Archival defaults and the data this browser is holding.
 *
 * The defaults here are what the manual-archive dialog and the export builder
 * open with — the operator's habit, saved once instead of re-picked on every
 * record.
 */
export function DataTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const records = usePassHistoryStore((s) => s.records);
  const clearHistory = usePassHistoryStore((s) => s.clearHistory);
  useArchiveRehydration();

  const [confirming, setConfirming] = useState(false);

  const clear = () => {
    if (settings.confirmDestructive && !confirming) {
      setConfirming(true);
      return;
    }
    clearHistory();
    setConfirming(false);
    notify("warning", "Pass archive cleared — Task History is now empty");
  };

  return (
    <>
      <TabHeader
        title="Data & storage"
        description="What a new archive record starts as, how exports are built, and what this browser is currently holding."
      />

      <PanelGrid>
        <Panel
          title="Archive defaults"
          icon={Archive}
          description="Pre-filled into the manual archive dialog. Every one is still editable there."
        >
          <Field label="Data type">
            <SelectInput
              value={settings.defaultDataType}
              onValue={(v) => update({ defaultDataType: v })}
              options={DATA_TYPES.map((t) => ({ label: t.label, value: t.id }))}
            />
          </Field>
          <Field label="Priority">
            <SelectInput
              value={settings.defaultPriority}
              onValue={(v) => update({ defaultPriority: v })}
              options={PRIORITIES.map((p) => ({ label: p.label, value: p.id }))}
            />
          </Field>
          <Field label="Retention policy">
            <SelectInput
              value={settings.defaultRetention}
              onValue={(v) => update({ defaultRetention: v })}
              options={RETENTION_POLICIES.map((r) => ({ label: r, value: r }))}
            />
          </Field>
          <Field
            label="Storage path"
            hint="Absolute path on the archive server. Records land under this root."
          >
            <TextInput
              mono
              value={settings.defaultStoragePath}
              onChange={(e) => update({ defaultStoragePath: e.target.value })}
              placeholder="/archive/primary"
            />
          </Field>
        </Panel>

        <Panel
          title="Exports"
          icon={HardDrive}
          description="What the export builder opens with."
        >
          <Field label="Format">
            <SelectInput
              value={settings.exportFormat}
              onValue={(v) => update({ exportFormat: v })}
              options={EXPORT_FORMATS.map((f) => ({ label: f, value: f }))}
            />
          </Field>
          <Field
            label="Compression"
            hint="zstd is faster to write; gzip is the safer bet for anything leaving the station."
          >
            <SelectInput
              value={settings.exportCompression}
              onValue={(v) => update({ exportCompression: v })}
              options={COMPRESSION_MODES.map((c) => ({ label: c, value: c }))}
            />
          </Field>
          <Toggle
            label="Emit a checksum manifest"
            hint="A SHA-256 sidecar per file, so a transfer can be verified at the far end."
            checked={settings.exportChecksum}
            onChange={(v) => update({ exportChecksum: v })}
          />
        </Panel>

        <Panel
          title="Stored in this browser"
          icon={Database}
          description="The pass archive is held locally and survives reloads. Nothing here leaves this device."
        >
          <div className="flex flex-col gap-[0.75rem]">
            <div className="flex flex-col gap-[0.5rem]">
              <Readout label="Archived passes" value={`${records.length}`} />
              <Readout
                label="Cap"
                value={`${settings.archiveCap} records`}
              />
              <Field
                label="Retain at most"
                hint="The oldest record is dropped past this, so local storage cannot grow without bound."
              >
                <Slider
                  value={settings.archiveCap}
                  onValue={(v) => update({ archiveCap: v })}
                  min={50}
                  max={2000}
                  step={50}
                  format={(v) => `${v}`}
                />
              </Field>
            </div>

            <div className="flex flex-col justify-center gap-[0.5rem] rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle p-[0.75rem]">
              <Btn
                variant="danger"
                icon={Trash2}
                onClick={clear}
                onBlur={() => setConfirming(false)}
                disabled={records.length === 0}
                className="self-start"
              >
                {confirming ? "Confirm — clear it" : "Clear pass archive"}
              </Btn>
              <Note>
                {confirming
                  ? "This empties Task History immediately. Click again to go through with it, or click away to cancel."
                  : "Clearing empties Task History. It refills as scheduled tasks complete."}
              </Note>
            </div>
          </div>
        </Panel>
      </PanelGrid>
    </>
  );
}
