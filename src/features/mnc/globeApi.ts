/**
 * The imperative surface the globe hands up to its panel.
 *
 * The tool rail sits over the globe but outside it in the DOM, so it cannot
 * reach the Cesium viewer directly — and the viewer must not be lifted into
 * React state, because it is a mutable WebGL resource whose identity never
 * changes and whose every method is a side effect. Passing a small named API
 * up on ready keeps Cesium's lifetime entirely inside the component that
 * created it, while letting the rail drive it.
 *
 * Every entry here is something the globe can actually do. Controls that would
 * need machinery we do not have (annotation, range measurement) are absent
 * rather than stubbed: a button that does nothing is worse on an operator
 * console than no button, because it costs a press to discover that.
 */
export interface GlobeApi {
  /** Return to the framing the panel opens with. */
  resetView: () => void;
  /** Fly in on the ground station. */
  focusSite: () => void;
  /** Fly out until every tracked object is in frame. */
  fitAll: () => void;
  /** Fly in on the active target, framed with a standoff. */
  zoomToTarget: () => void;
  /** Lock the camera onto the active target so it stays centred as it moves. */
  setFollowTarget: (follow: boolean) => void;
  /** Show or hide the ±30° / 800 km pointing envelope. */
  setFenceVisible: (visible: boolean) => void;
  /** Show or hide entity labels. */
  setLabelsVisible: (visible: boolean) => void;
  /** Swap between satellite imagery and a plain street basemap. */
  setBasemap: (basemap: Basemap) => void;
  /** Switch between the 3D globe and a flat 2D projection. */
  setProjection: (projection: Projection) => void;
}

export type Basemap = "satellite" | "street";
export type Projection = "3d" | "2d";
