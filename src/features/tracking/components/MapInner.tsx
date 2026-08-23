'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDashboard } from '../context/DashboardContext';
import { useTheme } from '../context/ThemeContext';

export default function MapInner() {
  const mapRef = useRef<L.Map | null>(null);

  // References to keep track of dynamically updated Leaflet layers
  const ringsRef = useRef<L.Circle[]>([]);
  const ringLabelsRef = useRef<L.Marker[]>([]);
  const axisLineRef = useRef<L.Polyline | null>(null);
  const fencePolygonRef = useRef<L.Polygon | null>(null);
  const fenceMarkersRef = useRef<L.Marker[]>([]);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const townMarkersRef = useRef<L.Marker[]>([]);

  const targetMarkersRef = useRef<Record<string, L.Marker | null>>({});
  const targetTrailsRef = useRef<Record<string, L.Polyline | null>>({});

  const {
    activeSat,
    livePosition,
    stationCoords,
    showOrbits,
    showTrails,
    showLabels,
  } = useDashboard();

  const { theme } = useTheme();

  // Bounding box bounds for Bangalore map images, expanded to match the mockup view
  const imageBounds: L.LatLngBoundsExpression = [
    [12.52, 76.86], // Southwest corner
    [13.48, 78.14], // Northeast corner
  ];

  const targetsConfig = [
    {
      id: 'TRK-0248',
      status: 'LOCKED',
      distance: '842.6 km',
      color: '#10b981', // green
      textColor: 'text-da-success',
      iconType: 'circle-ping',
      flexDirection: 'flex-row', // text to the right
      baseCoords: [13.25, 77.81] as L.LatLngTuple,
      baseTrail: [
        [13.35, 77.93],
        [13.29, 77.87],
        [13.24, 77.81]
      ] as L.LatLngTuple[],
      activeSatId: 't2', // ISS
    },
    {
      id: 'TRK-0249',
      status: 'LOCKED',
      distance: '1,240.3 km',
      color: '#10b981', // green
      textColor: 'text-da-success',
      iconType: 'circle-ping',
      flexDirection: 'flex-row',
      baseCoords: [13.08, 77.88] as L.LatLngTuple,
      baseTrail: [
        [13.12, 78.10],
        [13.08, 77.88]
      ] as L.LatLngTuple[],
      activeSatId: null,
    },
    {
      id: 'TRK-0250',
      status: 'DETECTED',
      distance: '635.2 km',
      color: '#3b82f6', // blue
      textColor: 'text-da-info',
      iconType: 'circle-ring',
      flexDirection: 'flex-row-reverse', // text to the left
      baseCoords: [13.04, 77.28] as L.LatLngTuple,
      baseTrail: [
        [13.07, 77.33],
        [13.04, 77.28]
      ] as L.LatLngTuple[],
      activeSatId: 't3', // RESOURCESAT-2A
    },
    {
      id: 'TRK-0251',
      status: 'TENTATIVE',
      distance: '921.7 km',
      color: '#f59e0b', // yellow
      textColor: 'text-da-c2',
      iconType: 'diamond',
      flexDirection: 'flex-row',
      baseCoords: [12.65, 77.68] as L.LatLngTuple,
      baseTrail: [
        [12.55, 77.80],
        [12.65, 77.68]
      ] as L.LatLngTuple[],
      activeSatId: 't1', // RISAT-2B
    },
    {
      id: 'TRK-0242',
      status: 'LOST',
      distance: '523.1 km',
      color: '#ef4444', // red
      textColor: 'text-da-danger',
      iconType: 'lost-ring',
      flexDirection: 'flex-row',
      baseCoords: [12.88, 77.92] as L.LatLngTuple,
      baseTrail: [
        [12.92, 78.18],
        [12.88, 77.92]
      ] as L.LatLngTuple[],
      activeSatId: null,
    },
  ];

  // Helper to generate the target custom icon HTML
  const getTargetIcon = (target: typeof targetsConfig[0], isActive: boolean, showLabelsVal: boolean) => {
    const color = target.color;
    const name = target.id;
    const status = target.status;
    const distance = target.distance;
    const directionClass = target.flexDirection;

    let markerHtml = '';
    if (target.iconType === 'circle-ping') {
      markerHtml = `
        <div class="relative flex items-center justify-center h-5 w-5">
          ${isActive ? `<span class="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-[${color}] opacity-75"></span>` : ''}
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[${color}] border-[max(1px,0.0625rem)] border-white shadow-da-card"></span>
        </div>
      `;
    } else if (target.iconType === 'circle-ring') {
      markerHtml = `
        <div class="relative flex items-center justify-center h-5 w-5">
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 border-[max(1px,0.0625rem)] border-[${color}] bg-transparent flex items-center justify-center">
            <span class="h-1.5 w-1.5 rounded-full bg-[${color}]"></span>
          </span>
        </div>
      `;
    } else if (target.iconType === 'diamond') {
      markerHtml = `
        <div class="relative flex items-center justify-center h-5 w-5">
          <span class="h-2.5 w-2.5 bg-[${color}] rotate-45 border-[max(1px,0.0625rem)] border-white shadow-da-card"></span>
        </div>
      `;
    } else if (target.iconType === 'lost-ring') {
      markerHtml = `
        <div class="relative flex items-center justify-center h-5 w-5">
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-[${color}] bg-transparent flex items-center justify-center">
            <span class="h-1.5 w-1.5 rounded-full bg-[${color}]"></span>
          </span>
        </div>
      `;
    }

    const labelHtml = showLabelsVal ? `
      <div class="flex flex-col text-left da-nums text-[0.5rem] leading-tight select-none" style="color: ${color}; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95);">
        <span class="font-bold text-white/90">${name}</span>
        <span class="font-black">${status}</span>
        <span class="text-da-muted font-medium">${distance}</span>
      </div>
    ` : '';

    return L.divIcon({
      className: 'custom-target-icon',
      html: `
        <div class="flex items-center gap-1.5 whitespace-nowrap ${directionClass}">
          ${markerHtml}
          ${labelHtml}
        </div>
      `,
      iconSize: [120, 45],
      iconAnchor: directionClass === 'flex-row' ? [10, 22] : [110, 22],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (mapRef.current) return;

    // Create Leaflet map centered at Bangalore
    const map = L.map('satellite-map', {
      center: [stationCoords.lat, stationCoords.lng],
      zoom: 10,
      minZoom: 2,
      maxZoom: 20,
      zoomControl: true, // Enable default zoom controls on the left side
      attributionControl: false,
    });

    mapRef.current = map;

    // Set container background style and class
    const container = map.getContainer();
    container.style.background = theme === 'dark' ? '#081017' : '#f1f5f9';
    if (theme === 'dark') {
      container.classList.add('dark-map-theme');
    } else {
      container.classList.remove('dark-map-theme');
    }

    // Add Google Hybrid Tile Layer (Satellite view with roads and labels)
    const tileLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
      }
    ).addTo(map);

    // Watch for size changes to keep the map and fence perfectly centered
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        map.invalidateSize();
      }
    });
    resizeObserver.observe(container);

    // Initial size correction and centering
    const initTimer = setTimeout(() => {
      if (mapRef.current) {
        map.invalidateSize();
        map.setView([stationCoords.lat + 0.2, stationCoords.lng], 10);
      }
    }, 150);

    // Cleanup observer on destruction
    map.on('unload', () => {
      resizeObserver.disconnect();
    });

    // 1. Draw concentric range rings (50km, 100km, 150km, 200km)
    const ringRadii = [50000, 100000, 150000, 200000];
    ringRadii.forEach(radius => {
      const ring = L.circle([stationCoords.lat, stationCoords.lng], {
        radius: radius,
        color: '#475569',
        weight: 1,
        dashArray: '3, 6',
        fill: false,
        opacity: 0.35,
      }).addTo(map);
      ringsRef.current.push(ring);

      // Label positioning on the horizontal axis line
      // 1 degree longitude at 13 deg latitude is ~108.46 km
      const lonOffset = radius / 108460;
      const labelIcon = L.divIcon({
        className: 'range-ring-label',
        html: `
          <div class="text-[0.5rem] da-nums font-bold text-da-muted select-none whitespace-nowrap bg-white/70 dark:bg-[#081017]/85 backdrop-blur-xs px-1 py-0.5 border-[max(1px,0.0625rem)] border-da-border/30 rounded" style="text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">
            ${radius / 1000} km
          </div>
        `,
        iconSize: [40, 16],
        iconAnchor: [20, 8],
      });

      const labelMarker = L.marker([stationCoords.lat, stationCoords.lng + lonOffset], { icon: labelIcon }).addTo(map);
      ringLabelsRef.current.push(labelMarker);
    });

    // 2. Draw Horizontal Axis Line
    const axisLine = L.polyline([
      [stationCoords.lat, stationCoords.lng],
      [stationCoords.lat, stationCoords.lng + (200000 / 108460)]
    ], {
      color: '#475569',
      weight: 1,
      dashArray: '3, 6',
      opacity: 0.35,
    }).addTo(map);
    axisLineRef.current = axisLine;

    // 3. Draw Radar Fence Sector Polygon
    const lat_c = stationCoords.lat;
    const lng_c = stationCoords.lng;
    const R_lat = 0.45; // radius in degrees latitude (~50 km)
    const R_lng = 0.45 / Math.cos((lat_c * Math.PI) / 180);

    const fenceCoords: L.LatLngTuple[] = [];
    // Start at center
    fenceCoords.push([lat_c, lng_c]);
    // Loop azimuth angles clockwise from -60 to +60 degrees.
    for (let angle = -60; angle <= 60; angle += 5) {
      const rad = (angle * Math.PI) / 180;
      fenceCoords.push([
        lat_c + R_lat * Math.cos(rad),
        lng_c + R_lng * Math.sin(rad)
      ]);
    }
    // Close polygon back to center
    fenceCoords.push([lat_c, lng_c]);

    const fencePolygon = L.polygon(fenceCoords, {
      color: '#10b981',
      weight: 1.5,
      fillColor: '#10b981',
      fillOpacity: 0.05,
    }).addTo(map);
    fencePolygonRef.current = fencePolygon;

    // Draw Fence vertex dot markers (Center, start, mid, end)
    const vertexCoords: L.LatLngTuple[] = [
      [lat_c, lng_c],
      [lat_c + R_lat * Math.cos((-60 * Math.PI) / 180), lng_c + R_lng * Math.sin((-60 * Math.PI) / 180)],
      [lat_c + R_lat, lng_c],
      [lat_c + R_lat * Math.cos((60 * Math.PI) / 180), lng_c + R_lng * Math.sin((60 * Math.PI) / 180)]
    ];

    vertexCoords.forEach(coords => {
      const vertexIcon = L.divIcon({
        className: 'fence-vertex-marker',
        html: `<span class="block h-2 w-2 rounded-full bg-da-success border-[max(1px,0.0625rem)] border-white shadow-da-card"></span>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
      const vertexMarker = L.marker(coords, { icon: vertexIcon }).addTo(map);
      fenceMarkersRef.current.push(vertexMarker);
    });

    // 5. Draw Central Bangalore Coordinate Marker
    const centerIcon = L.divIcon({
      className: 'custom-center-marker',
      html: `
        <div class="flex flex-col items-center">
          <div class="relative flex items-center justify-center h-6 w-6">
            <span class="absolute inline-flex rounded-full h-5 w-5 border-[max(1px,0.0625rem)] border-white/80 bg-black/40"></span>
            <span class="absolute h-4 w-px bg-white/80"></span>
            <span class="absolute w-4 h-px bg-white/80"></span>
            <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
          </div>
          <div class="mt-1 flex flex-col items-center text-center whitespace-nowrap">
            <span class="text-[0.625rem] font-black text-white tracking-wide text-shadow-sm uppercase">Bangalore</span>
            <span class="text-[0.5rem] da-nums text-white/70 font-bold leading-none mt-0.5">13.035572° N, 77.510634° E</span>
          </div>
        </div>
      `,
      iconSize: [120, 60],
      iconAnchor: [60, 12],
    });
    const centerMarker = L.marker([stationCoords.lat, stationCoords.lng], { icon: centerIcon }).addTo(map);
    centerMarkerRef.current = centerMarker;

    // 6. Draw Geographical Town Labels
    const towns = [
      { name: 'Tumakuru', coords: [13.3409, 77.1010] },
      { name: 'Doddaballapura', coords: [13.2923, 77.5431] },
      { name: 'Nelamangala', coords: [13.0957, 77.3790] },
      { name: 'Hoskote', coords: [13.0711, 77.7983] },
      { name: 'Kanakapura', coords: [12.5473, 77.4225] },
      { name: 'Hosur', coords: [12.7409, 77.8253] },
    ];

    towns.forEach(t => {
      const townIcon = L.divIcon({
        className: 'custom-town-icon',
        html: `
          <div class="text-[0.5rem] font-bold text-da-muted uppercase tracking-widest whitespace-nowrap select-none" style="text-shadow: 0 1px 2px rgba(0, 0, 0, 0.955);">
            ${t.name}
          </div>
        `,
        iconSize: [100, 20],
        iconAnchor: [50, 10],
      });
      const marker = L.marker(t.coords as L.LatLngTuple, { icon: townIcon }).addTo(map);
      townMarkersRef.current.push(marker);
    });

    // Devanahalli has a custom marker and star/cross
    const devIcon = L.divIcon({
      className: 'custom-town-devanahalli',
      html: `
        <div class="flex flex-col items-center whitespace-nowrap select-none">
          <span class="text-white text-xs font-black leading-none" style="text-shadow: 0 1px 2px rgba(0, 0, 0, 0.955);">*</span>
          <span class="text-[0.5rem] font-bold text-da-muted uppercase tracking-widest mt-0.5" style="text-shadow: 0 1px 2px rgba(0, 0, 0, 0.955);">Devanahalli</span>
        </div>
      `,
      iconSize: [100, 30],
      iconAnchor: [50, 5],
    });
    const devMarker = L.marker([13.2484, 77.7127], { icon: devIcon }).addTo(map);
    townMarkersRef.current.push(devMarker);

    // 7. Initialize target markers and trails
    targetsConfig.forEach(target => {
      // Trail
      const trail = L.polyline(target.baseTrail, {
        color: target.color,
        weight: 1.5,
        opacity: 0.7,
        dashArray: '3, 6',
      }).addTo(map);
      targetTrailsRef.current[target.id] = trail;

      // Marker
      const isTargetActive = target.activeSatId === activeSat;
      const currentPos = isTargetActive ? [livePosition.lat, livePosition.lng] as L.LatLngTuple : target.baseCoords;
      const targetMarker = L.marker(currentPos, {
        icon: getTargetIcon(target, isTargetActive, showLabels),
      }).addTo(map);
      targetMarkersRef.current[target.id] = targetMarker;
    });

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync theme changes with image overlay layer and background
  useEffect(() => {
    if (!mapRef.current) return;

    const container = mapRef.current.getContainer();
    container.style.background = theme === 'dark' ? '#081017' : '#f1f5f9';
    if (theme === 'dark') {
      container.classList.add('dark-map-theme');
    } else {
      container.classList.remove('dark-map-theme');
    }

    if (fencePolygonRef.current) {
      fencePolygonRef.current.setStyle({
        color: theme === 'dark' ? '#10b981' : '#059669',
        fillColor: theme === 'dark' ? '#10b981' : '#10b981',
      });
    }
  }, [theme]);

  // Sync controls (showOrbits, showTrails, showLabels, activeSat, livePosition)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Toggle range rings and axis line (Orbits)
    ringsRef.current.forEach(ring => {
      if (showOrbits) {
        ring.addTo(map);
      } else {
        ring.remove();
      }
    });

    ringLabelsRef.current.forEach(label => {
      if (showOrbits) {
        label.addTo(map);
      } else {
        label.remove();
      }
    });

    if (axisLineRef.current) {
      if (showOrbits) {
        axisLineRef.current.addTo(map);
      } else {
        axisLineRef.current.remove();
      }
    }

    // 2. Update target markers, trails and labels
    targetsConfig.forEach(target => {
      const isTargetActive = target.activeSatId === activeSat;
      const currentPos = isTargetActive ? [livePosition.lat, livePosition.lng] as L.LatLngTuple : target.baseCoords;
      const marker = targetMarkersRef.current[target.id];
      const trail = targetTrailsRef.current[target.id];

      // Update position
      if (marker) {
        marker.setLatLng(currentPos as L.LatLngExpression);
        marker.setIcon(getTargetIcon(target, isTargetActive, showLabels));
      }

      // Update trail
      if (trail) {
        if (showTrails) {
          trail.addTo(map);
          const trailCoords = isTargetActive
            ? [...target.baseTrail, [livePosition.lat, livePosition.lng] as L.LatLngTuple]
            : target.baseTrail;
          trail.setLatLngs(trailCoords);
          trail.setStyle({
            opacity: isTargetActive ? 0.85 : 0.5,
            weight: isTargetActive ? 2 : 1.5,
          });
        } else {
          trail.remove();
        }
      }
    });
  }, [showOrbits, showTrails, showLabels, activeSat, livePosition.lat, livePosition.lng]);

  return <div id="satellite-map" className="h-full w-full relative z-0" />;
}
