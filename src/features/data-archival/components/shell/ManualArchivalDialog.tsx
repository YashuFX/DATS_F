"use client";

import { useState } from "react";
import { FolderArchive, HardDrive, Save, X } from "lucide-react";
import { DATA_TYPES } from "../../config";
import { useArchivalStore } from "../../store/useArchivalStore";
import type { DataTypeId, PriorityId } from "../../types";
import { Button } from "../ui/Button";

export function ManualArchivalDialog() {
  const open = useArchivalStore((s) => s.manualDialogOpen);
  const setOpen = useArchivalStore((s) => s.setManualDialogOpen);
  const addRecord = useArchivalStore((s) => s.addRecord);

  const [dataType, setDataType] = useState<DataTypeId>("telemetry");
  const [mission, setMission] = useState("INSAT-02 (S-Band)");
  const [source, setSource] = useState("Bengaluru (ISTRAC)");
  const [storagePath, setStoragePath] = useState("/mnt/sband_archive/telemetry/");
  const [fileName, setFileName] = useState("sband_telemetry_2026.h5");
  const [priority, setPriority] = useState<PriorityId>("high");
  const [retentionPolicy, setRetentionPolicy] = useState("90 Days");
  const [sizeMB, setSizeMB] = useState("512");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRecord({
      dataType,
      mission,
      source,
      storagePath,
      fileName: fileName || `${dataType}_${Date.now()}.bin`,
      priority,
      retentionPolicy,
      sizeBytes: (Number(sizeMB) || 512) * 1024 * 1024,
    });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-[1rem]">
      <div className="flex w-full max-w-[32rem] flex-col rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex h-[2.75rem] items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[1rem]">
          <div className="flex items-center gap-[0.5rem] text-da-brand">
            <FolderArchive className="size-[1rem]" strokeWidth={2.2} />
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-da-text">
              Manual Archival Configuration
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex size-[1.5rem] cursor-pointer items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
          >
            <X className="size-[0.875rem]" strokeWidth={2.2} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[0.875rem] p-[1rem] text-2xs">
          <div className="grid grid-cols-2 gap-[0.75rem]">
            {/* Data Type */}
            <div className="flex flex-col gap-[0.25rem]">
              <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
                Data Type
              </label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value as DataTypeId)}
                className="h-[1.875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
              >
                {DATA_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mission / Satellite */}
            <div className="flex flex-col gap-[0.25rem]">
              <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
                Mission / Satellite
              </label>
              <input
                type="text"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                className="h-[1.875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[0.75rem]">
            {/* Source / Node */}
            <div className="flex flex-col gap-[0.25rem]">
              <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
                Ground Node / Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-[1.875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
                required
              />
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-[0.25rem]">
              <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityId)}
                className="h-[1.875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Storage Target Path */}
          <div className="flex flex-col gap-[0.25rem]">
            <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
              Destination Archival Path
            </label>
            <div className="relative flex items-center">
              <HardDrive className="absolute left-[0.5rem] size-[0.8125rem] text-da-label" />
              <input
                type="text"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
                className="h-[1.875rem] w-full rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field pl-[1.75rem] pr-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[0.75rem]">
            {/* File Name */}
            <div className="flex flex-col gap-[0.25rem]">
              <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
                Record File Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="h-[1.875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
                required
              />
            </div>

            {/* Retention Policy */}
            <div className="flex flex-col gap-[0.25rem]">
              <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
                Retention Policy
              </label>
              <select
                value={retentionPolicy}
                onChange={(e) => setRetentionPolicy(e.target.value)}
                className="h-[1.875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
              >
                <option value="30 Days">30 Days</option>
                <option value="90 Days">90 Days</option>
                <option value="1 Year">1 Year</option>
                <option value="Permanent">Permanent</option>
              </select>
            </div>
          </div>

          {/* Size MB */}
          <div className="flex flex-col gap-[0.25rem]">
            <label className="text-3xs font-semibold uppercase tracking-[0.06em] text-da-label">
              Estimated Payload Size (MB)
            </label>
            <input
              type="number"
              value={sizeMB}
              onChange={(e) => setSizeMB(e.target.value)}
              className="h-[1.875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-da-text focus:border-da-brand focus:outline-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="mt-[0.5rem] flex items-center justify-end gap-[0.5rem] border-t-[max(1px,0.0625rem)] border-da-border pt-[0.75rem]">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Save className="size-[0.75rem]" />}>
              Save & Archive Now
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
