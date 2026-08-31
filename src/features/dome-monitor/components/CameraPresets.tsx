"use client";

import { cn } from "@/features/data-archival/lib/cn";
import { CAMERA_PRESETS } from "../config";
import type { CameraPreset } from "../types";

/**
 * Camera preset buttons — ISO · TOP · N · E · S · W · FIT
 * Styled as the existing segmented control pattern.
 */
export function CameraPresets({
  activeId,
  onSelect,
  onFit,
  projection,
  onToggleProjection,
}: {
  activeId: string | null;
  onSelect: (preset: CameraPreset) => void;
  onFit: () => void;
  projection: "perspective" | "orthographic";
  onToggleProjection: () => void;
}) {
  return (
    <div className="flex items-center gap-[0.375rem]">
      <div className="flex h-[1.875rem] items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
        {CAMERA_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            className={cn(
              "h-full cursor-pointer rounded-[0.1875rem] px-[0.5rem] text-2xs font-bold uppercase tracking-[0.06em] transition-colors",
              activeId === preset.id
                ? "bg-da-brand text-da-on-brand"
                : "text-da-muted hover:bg-da-subtle hover:text-da-text",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onFit}
        className="flex h-[1.875rem] cursor-pointer items-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-2xs font-bold uppercase tracking-[0.06em] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
      >
        FIT
      </button>

      <button
        type="button"
        onClick={onToggleProjection}
        className="flex h-[1.875rem] cursor-pointer items-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-2xs font-bold uppercase tracking-[0.06em] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
      >
        {projection === "perspective" ? "ORTHO" : "PERSP"}
      </button>
    </div>
  );
}
