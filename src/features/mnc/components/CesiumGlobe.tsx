"use client";

import { useEffect, useRef, useState } from "react";
import { ANTENNA_FENCE, SITE, TRACKED_SATELLITES } from "../data/mnc.mock";
import type { Basemap, GlobeApi, Projection } from "../globeApi";

/**
 * Cesium globe for the tracking panel.
 *
 * Loaded through a dynamic import INSIDE an effect, not a module-level import.
 * Cesium reads `window.CESIUM_BASE_URL` while its module body evaluates to
 * find its workers and assets, so that global has to be set first — a
 * top-level import would evaluate before any component code could set it and
 * Cesium would request its workers from the page URL and fail.
 *
 * IMAGERY. Satellite view, from Esri's World Imagery service, which needs no
 * account key. Cesium's own Ion imagery does need one; set
 * NEXT_PUBLIC_CESIUM_ION_TOKEN and Ion is used instead. Esri is the default
 * rather than the fallback so the panel looks the same on every machine
 * whether or not a token happens to be configured.
 */
export function CesiumGlobe({ onReady }: { onReady?: (api: GlobeApi) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // Held in a ref so the effect below never lists it as a dependency: the
  // callback identity changes on every parent render, and re-running this
  // effect means tearing down and rebuilding the whole WebGL viewer.
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let viewer: { destroy: () => void; isDestroyed: () => boolean } | null = null;
    let cancelled = false;

    (async () => {
      try {
        // Must precede the import — see the note above.
        (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium";
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");
        if (cancelled) return;

        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        if (token) Cesium.Ion.defaultAccessToken = token;

        const v = new Cesium.Viewer(host, {
          // Every default widget is off: this is a panel on a glance screen,
          // not the Cesium sandbox. The panel supplies its own controls.
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement("div"),
          baseLayer: token
            ? undefined
            : Cesium.ImageryLayer.fromProviderAsync(
                Promise.resolve(
                  new Cesium.UrlTemplateImageryProvider({
                    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                    maximumLevel: 18,
                    credit: "Esri World Imagery",
                  }),
                ),
                {},
              ),
        });
        if (cancelled) {
          v.destroy();
          return;
        }
        viewer = v;

        v.scene.globe.enableLighting = false;
        if (v.scene.skyAtmosphere) v.scene.skyAtmosphere.show = true;
        v.scene.backgroundColor = Cesium.Color.TRANSPARENT;
        v.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0b141d");

        const sitePos = Cesium.Cartesian3.fromDegrees(SITE.lonDeg, SITE.latDeg, SITE.heightM);

        /* ---- the station ---- */
        v.entities.add({
          position: sitePos,
          point: {
            pixelSize: 9,
            color: Cesium.Color.fromCssColorString("#34d399"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1.5,
          },
          label: {
            text: `${SITE.id}\n${SITE.name}`,
            font: "600 11px system-ui, sans-serif",
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("rgba(11,20,29,0.78)"),
            pixelOffset: new Cesium.Cartesian2(0, -28),
            scale: 0.9,
          },
        });

        /* ---- antenna fence ----
         *
         * A static rectangular pyramid rising from the station: apex at the
         * antenna, axis along the local vertical, ±ANTENNA_FENCE.halfWidthDeg
         * in azimuth and in elevation, reaching ANTENNA_FENCE.rangeKm.
         *
         * Built by hand from five points rather than with a Cesium primitive,
         * because Cesium has no rectangular-pyramid graphic: `cylinder` with a
         * zero radius at one end gives a CONE, which is the envelope of a
         * single ±30° limit taken in every direction at once. Two independent
         * axis limits make a square cross-section, and the corners are exactly
         * where the two shapes disagree — see the note on ANTENNA_FENCE.
         *
         * Working in the station's east-north-up frame is what keeps this
         * checkable: the four corners are literally (±range·tan30, ±range·tan30,
         * range) in local metres, so the geometry reads the way the limit is
         * written. `perPositionHeight` is what stops Cesium from clamping the
         * faces onto the ellipsoid and flattening the pyramid into a footprint.
         */
        const rangeM = ANTENNA_FENCE.rangeKm * 1000;
        const halfExtentM = rangeM * Math.tan(Cesium.Math.toRadians(ANTENNA_FENCE.halfWidthDeg));
        const enuFrame = Cesium.Transforms.eastNorthUpToFixedFrame(sitePos);
        const toWorld = (east: number, north: number, up: number) =>
          Cesium.Matrix4.multiplyByPoint(
            enuFrame,
            new Cesium.Cartesian3(east, north, up),
            new Cesium.Cartesian3(),
          );

        const apex = toWorld(0, 0, 0);
        const corners = [
          toWorld(-halfExtentM, -halfExtentM, rangeM),
          toWorld(halfExtentM, -halfExtentM, rangeM),
          toWorld(halfExtentM, halfExtentM, rangeM),
          toWorld(-halfExtentM, halfExtentM, rangeM),
        ];

        const FENCE = Cesium.Color.fromCssColorString("#2dd4bf");
        const fenceEntities = [
          // Four sloping faces.
          ...corners.map((corner, i) =>
            v.entities.add({
              polygon: {
                hierarchy: new Cesium.PolygonHierarchy([apex, corner, corners[(i + 1) % 4]]),
                perPositionHeight: true,
                material: FENCE.withAlpha(0.1),
                outline: true,
                outlineColor: FENCE.withAlpha(0.5),
              },
            }),
          ),
          // The square cross-section at maximum range.
          v.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(corners),
              perPositionHeight: true,
              material: FENCE.withAlpha(0.08),
              outline: true,
              outlineColor: FENCE.withAlpha(0.75),
            },
          }),
          // Corner ribs, so the pyramid still reads as a volume edge-on where
          // the translucent faces nearly vanish.
          ...corners.map((corner) =>
            v.entities.add({
              polyline: { positions: [apex, corner], width: 1.2, material: FENCE.withAlpha(0.75) },
            }),
          ),
        ];

        /* ---- tracked spacecraft ---- */
        for (const sat of TRACKED_SATELLITES) {
          const colour = sat.id === "SAT-01" ? "#3b82f6" : "#ef4444";
          const satPos = Cesium.Cartesian3.fromDegrees(sat.lonDeg, sat.latDeg, sat.altitudeM);
          v.entities.add({
            position: satPos,
            point: {
              pixelSize: 9,
              color: Cesium.Color.fromCssColorString(colour),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1.5,
            },
            label: {
              text: sat.id,
              font: "700 11px system-ui, sans-serif",
              fillColor: Cesium.Color.fromCssColorString(colour),
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString("rgba(11,20,29,0.8)"),
              pixelOffset: new Cesium.Cartesian2(0, -24),
              scale: 0.9,
            },
          });
          // Slant path station → spacecraft: the line the fence is judging.
          v.entities.add({
            polyline: {
              positions: [sitePos, satPos],
              width: 1.4,
              material: Cesium.Color.fromCssColorString(colour).withAlpha(0.7),
            },
          });
        }

        // Framed on the site, far enough out that the 800 km fence fits.
        const HOME = {
          destination: Cesium.Cartesian3.fromDegrees(SITE.lonDeg, SITE.latDeg - 12, 3_200_000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
        };
        v.camera.setView(HOME);

        const streetLayer = Cesium.ImageryLayer.fromProviderAsync(
          Promise.resolve(new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" })),
          {},
        );

        onReadyRef.current?.({
          resetView: () => v.camera.flyTo({ ...HOME, duration: 0.8 }),
          focusSite: () =>
            v.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(SITE.lonDeg, SITE.latDeg - 1.4, 260_000),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
              duration: 0.9,
            }),
          fitAll: () => {
            void v.flyTo(v.entities, { duration: 0.9 });
          },
          setFenceVisible: (visible: boolean) => {
            for (const entity of fenceEntities) entity.show = visible;
            v.scene.requestRender();
          },
          setLabelsVisible: (visible: boolean) => {
            for (const entity of v.entities.values) {
              if (entity.label) entity.label.show = new Cesium.ConstantProperty(visible);
            }
            v.scene.requestRender();
          },
          setBasemap: (basemap: Basemap) => {
            // Index 0 is the base layer the viewer was constructed with; the
            // street layer is added on top only while it is selected, so the
            // satellite imagery underneath is never re-fetched on a toggle.
            const layers = v.imageryLayers;
            const hasStreet = layers.contains(streetLayer);
            if (basemap === "street" && !hasStreet) layers.add(streetLayer);
            if (basemap === "satellite" && hasStreet) layers.remove(streetLayer, false);
            v.scene.requestRender();
          },
          setProjection: (projection: Projection) => {
            if (projection === "2d") v.scene.morphTo2D(0.8);
            else v.scene.morphTo3D(0.8);
          },
        });
      } catch (err) {
        if (!cancelled) setFailed(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center px-[1rem] text-center">
        <span className="text-2xs font-semibold text-da-muted">Globe unavailable — {failed}</span>
      </div>
    );
  }

  return <div ref={hostRef} className="size-full [&_.cesium-viewer-bottom]:hidden" />;
}
