import { Suspense } from "react";
import { SettingsScreen } from "@/features/shell/SettingsScreen";

/**
 * `SettingsScreen` reads `?from=` to build its back link, and `useSearchParams`
 * forces client rendering up to the nearest Suspense boundary — so it gets one
 * here rather than opting the whole route out of prerendering.
 */
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-da-bg" />}>
      <SettingsScreen />
    </Suspense>
  );
}
