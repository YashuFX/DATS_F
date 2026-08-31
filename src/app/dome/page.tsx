import { Suspense } from "react";
import { DomeScreen, ScreenFallback } from "@/features/dome-monitor";

/**
 * The /dome route — interactive 3D model of the physical geodesic array.
 */
export default function Page() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <DomeScreen />
    </Suspense>
  );
}
