import { McScreen } from "@/features/mnc";

/**
 * The /dashboard route — the Monitoring & Controlling board.
 *
 * The 3D dome that used to live here now has its own route at /dome; this
 * screen previews it (and tracking, the schedule and array health) with an
 * expand control on each panel.
 */
export default function Page() {
  return <McScreen />;
}
