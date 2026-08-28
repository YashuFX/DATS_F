"use client";

import { useEffect } from "react";
import { useDomeStore } from "../store/domeStore";
import { PRESENT_FACES, FACE_MAP, ADJACENCY, getTemplate } from "../data/geometry";
import type { DomeTelemetry, Face } from "../types";

/**
 * Next non-nominal FceNum after `after` (wraps). Null if the whole dome is
 * nominal.
 */
function nextNonNominalFace(after: number | undefined, telemetry: DomeTelemetry): number | null {
  const faces = PRESENT_FACES.map((f) => f.fceNum).sort((a, b) => a - b);
  const abnormal = faces.filter((n) => telemetry.faces[n]?.health !== "nominal");
  if (abnormal.length === 0) return null;
  if (after === undefined) return abnormal[0];
  const idx = abnormal.findIndex((n) => n > after);
  return idx === -1 ? abnormal[0] : abnormal[idx];
}

/** Next non-nominal element index on one face after `after` (wraps). */
function nextNonNominalElement(
  faceNum: number,
  after: number | undefined,
  telemetry: DomeTelemetry,
): number | null {
  const ft = telemetry.faces[faceNum];
  if (!ft) return null;
  const abnormal: number[] = [];
  for (let i = 0; i < ft.elements.length; i++) {
    if (ft.elements[i].health !== "nominal") abnormal.push(i);
  }
  if (abnormal.length === 0) return null;
  if (after === undefined) return abnormal[0];
  const idx = abnormal.findIndex((i) => i > after);
  return idx === -1 ? abnormal[0] : abnormal[idx];
}

/**
 * Adjacent face in a rotational direction, using each face's real measured
 * azimuth (boresight angle) rather than an arbitrary neighbour-list order —
 * ArrowRight is "the neighbour clockwise from here" on the real solid.
 */
function stepToNeighbourFace(current: Face, direction: 1 | -1): number | null {
  const neighbours = ADJACENCY.get(current.fceNum) ?? [];
  let best: number | null = null;
  let bestDelta = Infinity;
  for (const n of neighbours) {
    const nf = FACE_MAP[n];
    if (!nf) continue;
    let delta = nf.azimuthDeg - current.azimuthDeg;
    delta = (((delta + 180) % 360) + 360) % 360 - 180;
    if (direction === 1 && delta > 0 && delta < bestDelta) {
      bestDelta = delta;
      best = n;
    }
    if (direction === -1 && delta < 0 && -delta < bestDelta) {
      bestDelta = -delta;
      best = n;
    }
  }
  if (best !== null) return best;
  // Fallback for poles, where every neighbour sits at a similar azimuth —
  // just take whichever is angularly closest.
  for (const n of neighbours) {
    const nf = FACE_MAP[n];
    if (!nf) continue;
    const delta = Math.abs(nf.azimuthDeg - current.azimuthDeg);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = n;
    }
  }
  return best;
}

/**
 * Nearest element in a (u, v) template direction — real lattice adjacency
 * (the element's own measured position on its face), not a fabricated
 * row/col grid. `dir` is a unit-ish vector in the face's local frame.
 */
function stepToNeighbourElement(face: Face, currentIdx: number, dir: [number, number]): number | null {
  const template = getTemplate(face.kind);
  const [cx, cy] = template[currentIdx];
  let best: number | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < template.length; i++) {
    if (i === currentIdx) continue;
    const [x, y] = template[i];
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-9) continue;
    const dot = (dx / dist) * dir[0] + (dy / dist) * dir[1];
    if (dot <= 0.3) continue;
    const score = dist / dot;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/**
 * Global keyboard navigation for the dome screen.
 *
 * `N` is the single most valuable key — it jumps to the next non-nominal
 * object, cascading from element to face to across the dome so it always
 * finds something if anything abnormal exists at all. `Esc` steps up one
 * selection level; `Home` resets the camera. They are kept deliberately
 * separate — Esc never touches the camera, Home never touches selection —
 * and neither of them, nor arrow-key or `N` navigation, moves the camera
 * implicitly; only `Home` (an explicit action) does.
 */
export function useDomeKeyboard({ onResetCamera }: { onResetCamera: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      const { selection, telemetry, selectFace, selectElement, clearSelection } =
        useDomeStore.getState();

      switch (e.key) {
        case "Escape": {
          if (selection.level === "element" && selection.faceNum !== undefined) {
            e.preventDefault();
            selectFace(selection.faceNum);
          } else if (selection.level === "face" || useDomeStore.getState().alarmsOpen) {
            e.preventDefault();
            clearSelection();
          }
          break;
        }

        case "Home": {
          e.preventDefault();
          onResetCamera();
          break;
        }

        case "n":
        case "N": {
          e.preventDefault();
          if (selection.level === "element" && selection.faceNum !== undefined) {
            const nextEl = nextNonNominalElement(selection.faceNum, selection.elementIdx, telemetry);
            if (nextEl !== null) {
              selectElement(selection.faceNum, nextEl);
              break;
            }
          }
          const nextFace = nextNonNominalFace(selection.faceNum, telemetry);
          if (nextFace === null) break;
          if (selection.level === "element") {
            const el = nextNonNominalElement(nextFace, undefined, telemetry);
            if (el !== null) {
              selectElement(nextFace, el);
              break;
            }
          }
          selectFace(nextFace);
          break;
        }

        case "ArrowLeft":
        case "ArrowRight": {
          if (selection.level === "face" && selection.faceNum !== undefined) {
            e.preventDefault();
            const face = FACE_MAP[selection.faceNum];
            const next = stepToNeighbourFace(face, e.key === "ArrowRight" ? 1 : -1);
            if (next !== null) selectFace(next);
          } else if (
            selection.level === "element" &&
            selection.faceNum !== undefined &&
            selection.elementIdx !== undefined
          ) {
            e.preventDefault();
            const face = FACE_MAP[selection.faceNum];
            const dir: [number, number] = e.key === "ArrowRight" ? [1, 0] : [-1, 0];
            const next = stepToNeighbourElement(face, selection.elementIdx, dir);
            if (next !== null) selectElement(selection.faceNum, next);
          }
          break;
        }

        case "ArrowUp":
        case "ArrowDown": {
          if (
            selection.level === "element" &&
            selection.faceNum !== undefined &&
            selection.elementIdx !== undefined
          ) {
            e.preventDefault();
            const face = FACE_MAP[selection.faceNum];
            const dir: [number, number] = e.key === "ArrowUp" ? [0, 1] : [0, -1];
            const next = stepToNeighbourElement(face, selection.elementIdx, dir);
            if (next !== null) selectElement(selection.faceNum, next);
          }
          break;
        }

        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onResetCamera]);
}
