/**
 * How the tracking display paints an object's state.
 *
 * Shared, and that sharing is the point: the capacity strip is a LEGEND for the
 * globe — the amber dot beside "Tracked" is a promise that tracked spacecraft
 * are the amber ones out on the sky. Two copies of these hex values would let
 * that promise quietly break the first time one of them was retuned.
 *
 * A module of its own rather than a block inside the globe, because the globe
 * is dynamically imported with `ssr: false` to keep Cesium out of the server
 * bundle; importing a colour from it would drag the whole engine into every
 * panel that wanted the legend.
 */
export const TRACK_COLOUR = {
  /** The ground station. */
  site: "#34d399",
  /** The tracking volume's shell. */
  fov: "#2dd4bf",
  /** Inside the volume — the sky is presenting it. */
  visible: "#60a5fa",
  /** Inside the volume AND holding a beam cluster. */
  tracked: "#facc15",
  /** The one the readouts are drawn for. */
  target: "#f87171",
  /** Catalogue context: below the mask, out of range, or behind the Earth. */
  dormant: "#93a7bd",
  /** In view but unserved — no face in cone, or no channels left. */
  unserved: "#f87171",
  orbit: "#f87171",
  beamTrack: "#facc15",
  beamData: "#34d399",
} as const;
