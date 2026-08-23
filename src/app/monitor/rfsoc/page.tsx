import { Suspense } from "react";
import { RfsocScreen, ScreenFallback } from "@/features/array-monitor";

/**
 * The drill chain (tile → slot → channel) lives in the URL, and reading search
 * params forces client rendering up to the nearest Suspense boundary — so the
 * screen provides one and the shell around it still prerenders.
 */
export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <RfsocScreen />
    </Suspense>
  );
}
