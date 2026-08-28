"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDomeStore } from "../store/domeStore";
import { PRESENT_FACE_NUMS } from "../config";

/**
 * Keeps dome selection in `?face=N&element=M`, the same drill-params
 * discipline `useDrillParams` gives the array-monitor screens — an operator
 * who has drilled to a face can hand the link to the next shift, Back walks
 * up the chain, and a reload lands where they were.
 *
 * The R3F scene graph is much deeper than a flat screen (DomeCanvas is a
 * dynamic client boundary wrapping a Canvas wrapping 26 face groups), so
 * selection still lives in the zustand store for the scene to read without
 * prop-drilling through every mesh — this hook is the one place that keeps
 * that store and the URL in agreement, hydrating from the URL once on mount
 * and mirroring every subsequent change back into it.
 *
 * Must run inside the route's <Suspense> boundary (page.tsx already provides
 * one) because `useSearchParams` forces client rendering up to it.
 */
export function useSelectionUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selection = useDomeStore((s) => s.selection);
  const selectFace = useDomeStore((s) => s.selectFace);
  const selectElement = useDomeStore((s) => s.selectElement);

  const hydratedFromUrl = useRef(false);
  const skipNextSync = useRef(true);

  // Hydrate once from whatever the URL says on load — including a face that
  // no longer exists (e.g. a stale bookmark) failing safe to no selection.
  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;

    const faceRaw = searchParams.get("face");
    const face = faceRaw === null ? Number.NaN : Number(faceRaw);
    const validFaces: readonly number[] = PRESENT_FACE_NUMS;
    if (!Number.isFinite(face) || !validFaces.includes(face)) return;

    const elementRaw = searchParams.get("element");
    const element = elementRaw === null ? Number.NaN : Number(elementRaw);
    if (Number.isFinite(element) && element >= 0) {
      selectElement(face, element);
    } else {
      selectFace(face);
    }
    // Deliberately empty deps — this reads the URL exactly once, at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror every later selection change back into the URL. The first firing
  // of this effect happens on the same mount as the hydration read above, so
  // it is skipped once to avoid writing the pre-hydration (empty) selection
  // over whatever the URL just gave us.
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (selection.level !== "array" && selection.faceNum !== undefined) {
      params.set("face", String(selection.faceNum));
      if (selection.level === "element" && selection.elementIdx !== undefined) {
        params.set("element", String(selection.elementIdx));
      }
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [selection, router, pathname]);
}
