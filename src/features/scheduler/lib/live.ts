import type { LogEntry, SatellitePass } from "../types";

/** Mission epoch. Fixed, so server and client render the same clock. */
export const MISSION_EPOCH_MS = Date.parse("2026-08-23T09:00:00Z");

/** Mission-clock HH:MM:SS at a given number of elapsed simulated seconds. */
export const clockAt = (elapsedSec: number) =>
  new Date(MISSION_EPOCH_MS + elapsedSec * 1000).toISOString().slice(11, 19);

/**
 * A booked pass as it stands at `elapsedSec` into the run.
 *
 * The booking never changes — what changes is how far the pass sits from the
 * playhead, and therefore what state it is in. A conflict stays a conflict at
 * every value of the clock, because contention is a property of the booking
 * rather than of time.
 *
 * Shared between the screen that draws the timeline and the runtime that
 * archives completions, so the two can never disagree about whether a pass has
 * finished.
 */
export function liveStateOf(
  pass: SatellitePass,
  elapsedSec: number,
): SatellitePass {
  const aosOffsetSec = pass.aosOffsetSec - elapsedSec;
  const sinceAos = -aosOffsetSec;
  const status: SatellitePass["status"] =
    pass.status === "CONFLICT"
      ? "CONFLICT"
      : sinceAos >= pass.durationSec
        ? "COMPLETED"
        : sinceAos > 0
          ? "TRACKING"
          : "SCHEDULED";
  return { ...pass, aosOffsetSec, status };
}

/** The uplink line a pass writes when it runs past LOS. */
export function completionLog(
  pass: SatellitePass,
  elapsedSec: number,
): LogEntry {
  return {
    // Completion happened `durationSec` after this pass's AOS, which is itself
    // `elapsedSec + aosOffsetSec` into the mission.
    time: clockAt(elapsedSec + pass.aosOffsetSec + pass.durationSec),
    level: pass.linkLock === "UNLOCKED" ? "WARN" : "ACQ",
    message:
      pass.linkLock === "UNLOCKED"
        ? `LOS — ${pass.satName} ended unlocked on ${pass.antennaId}, no data recovered`
        : `LOS — ${pass.satName} complete on ${pass.antennaId}, ${pass.downlinkedMb} MB archived`,
  };
}
