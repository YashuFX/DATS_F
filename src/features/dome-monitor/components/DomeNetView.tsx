"use client";

import { useDomeStore } from "../store/domeStore";
import { PRESENT_FACES, FACE_MAP } from "../data/geometry";
import { HEALTH_META } from "../types";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * DomeNetView — 2D unfolded net view of all 26 geodesic faces.
 *
 * Provides a deterministic, all-faces-visible overview layout.
 * Strictly better for scanning all faces at a glance, and acts as the
 * zero-GPU fallback when WebGL hardware acceleration is unavailable.
 */
export function DomeNetView() {
  const selection = useDomeStore((s) => s.selection);
  const selectFace = useDomeStore((s) => s.selectFace);
  const clearSelection = useDomeStore((s) => s.clearSelection);
  const telemetry = useDomeStore((s) => s.telemetry);

  // Group faces by ring / elevation tier
  // Tier 1: Apex (Pentagon 27, el = +90°)
  // Tier 2: Upper ring (el ≈ +52.6°)
  // Tier 3: Upper mid ring (el ≈ +26.6°)
  // Tier 4: Lower mid ring (el ≈ +10.8°)
  // Tier 5: Lower ring (el ≈ -10.8° to -26.6°)

  const apexFace = PRESENT_FACES.find((f) => f.fceNum === 27)!;
  const upperFaces = PRESENT_FACES.filter((f) => f.elevationDeg > 45 && f.fceNum !== 27);
  const upperMidFaces = PRESENT_FACES.filter((f) => f.elevationDeg > 20 && f.elevationDeg <= 45);
  const lowerMidFaces = PRESENT_FACES.filter((f) => f.elevationDeg > 0 && f.elevationDeg <= 20);
  const lowerFaces = PRESENT_FACES.filter((f) => f.elevationDeg <= 0);

  const renderFaceCard = (fceNum: number) => {
    const face = FACE_MAP[fceNum];
    if (!face) return null;

    const ft = telemetry.faces[fceNum];
    const health = ft?.health ?? "nominal";
    const meta = HEALTH_META[health];
    const isSelected = selection.level !== "array" && selection.faceNum === fceNum;

    return (
      <button
        key={fceNum}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isSelected) clearSelection();
          else selectFace(fceNum);
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col justify-between rounded-[0.375rem] border-[max(1px,0.0625rem)] p-[0.625rem] text-left transition-all",
          isSelected
            ? "border-da-brand bg-da-brand-soft shadow-da-brand ring-[max(1px,0.0625rem)] ring-da-brand"
            : "border-da-border bg-da-surface hover:border-da-border-strong hover:bg-da-subtle",
        )}
      >
        <div className="flex items-center justify-between gap-[0.375rem]">
          <span className="flex items-center gap-[0.25rem]">
            <span className="da-nums text-2xs font-bold text-da-text">
              F{face.fceNum}
            </span>
            <span className="text-3xs font-medium text-da-label">
              ({face.kind === "pentagon" ? "Pent" : "Hex"})
            </span>
          </span>
          <span
            className="size-[0.4375rem] rounded-full"
            style={{ backgroundColor: `var(--color-${meta.token})` }}
          />
        </div>

        <div className="mt-[0.5rem] flex items-end justify-between">
          <span className="flex flex-col leading-none">
            <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
              Availability
            </span>
            <span className="da-nums mt-[0.1875rem] text-xs font-bold text-da-text">
              {ft ? `${ft.availabilityPercent.toFixed(1)}%` : "100%"}
            </span>
          </span>
          <span className="da-nums text-3xs font-medium text-da-muted">
            {ft ? `${ft.online}/${ft.total}` : `${face.elementCount}`}
          </span>
        </div>

        {ft && ft.worstClusterSize > 0 && (
          <div className="mt-[0.375rem] flex items-center justify-between border-t-[max(1px,0.0625rem)] border-da-border/60 pt-[0.25rem]">
            <span className="text-3xs font-semibold text-da-warn-text">
              Cluster: {ft.worstClusterSize} el
            </span>
            <span className="text-3xs text-da-muted">
              {ft.phaseRmsDeg.toFixed(1)}° RMS
            </span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div
      className="size-full overflow-y-auto p-[1rem]"
      onClick={() => clearSelection()}
    >
      <div className="mx-auto flex max-w-[56rem] flex-col gap-[1.25rem]">
        {/* Tier 1: Apex */}
        <div className="flex flex-col items-center gap-[0.5rem]">
          <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
            Apex (Zenith +90°)
          </span>
          <div className="w-[12rem]">{renderFaceCard(apexFace.fceNum)}</div>
        </div>

        {/* Tier 2: Upper Ring */}
        <div className="flex flex-col gap-[0.5rem]">
          <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
            Upper Ring (+52.6° Elevation · 5 Hexagons)
          </span>
          <div className="grid grid-cols-5 gap-[0.625rem]">
            {upperFaces.map((f) => renderFaceCard(f.fceNum))}
          </div>
        </div>

        {/* Tier 3: Upper Mid Ring */}
        <div className="flex flex-col gap-[0.5rem]">
          <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
            Upper Mid Ring (+26.6° Elevation · 5 Pentagons)
          </span>
          <div className="grid grid-cols-5 gap-[0.625rem]">
            {upperMidFaces.map((f) => renderFaceCard(f.fceNum))}
          </div>
        </div>

        {/* Tier 4: Mid Ring */}
        <div className="flex flex-col gap-[0.5rem]">
          <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
            Equatorial Ring (+10.8° Elevation · 5 Hexagons)
          </span>
          <div className="grid grid-cols-5 gap-[0.625rem]">
            {lowerMidFaces.map((f) => renderFaceCard(f.fceNum))}
          </div>
        </div>

        {/* Tier 5: Lower Ring */}
        <div className="flex flex-col gap-[0.5rem]">
          <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
            Lower Ring (−10.8° to −26.6° Elevation · 10 Faces)
          </span>
          <div className="grid grid-cols-5 gap-[0.625rem]">
            {lowerFaces.map((f) => renderFaceCard(f.fceNum))}
          </div>
        </div>
      </div>
    </div>
  );
}
