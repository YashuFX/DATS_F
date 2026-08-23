import type { HealthId } from "../types";

/**
 * Site infrastructure — the four services the aperture depends on.
 *
 * Each is modelled as an ordered chain rather than a diagram, for the same
 * reason the RFSoC board is: a fault has a direction. When the Row-B clock
 * splitter degrades, everything downstream of it decoheres and everything
 * upstream is fine, and that is the first thing an operator needs to see.
 *
 * The source console carried five separate topology diagrams. Fibre and
 * network are merged here into one data path, because getting beam data from
 * the GTY serdes to the ground link is a single concern, not two.
 */

export interface InfraMetric {
  label: string;
  value: string;
  state: "ok" | "warn" | "bad";
}

export interface InfraNode {
  id: string;
  name: string;
  subtitle: string;
  health: HealthId;
  detail: string;
  metrics: InfraMetric[];
}

export interface InfraSection {
  id: "clock" | "power" | "cooling" | "data";
  title: string;
  /** What this service does for the aperture, in one line. */
  purpose: string;
  headline: InfraMetric;
  nodes: InfraNode[];
}

/**
 * The Row-B clock splitter is the root cause of the fault the other screens
 * report as "tile B2, slot 6, PLL jitter". Tracing it here is the whole reason
 * this screen exists: three screens can see the symptom, only this one can see
 * why three tiles on the same row are drifting together.
 */
export const INFRASTRUCTURE: InfraSection[] = [
  {
    id: "clock",
    title: "Clock Distribution",
    purpose: "Holds all 576 elements on one phase reference — coherence depends on it",
    headline: { label: "Master jitter", value: "84 fs", state: "ok" },
    nodes: [
      {
        id: "ocxo",
        name: "Master Reference",
        subtitle: "OCXO 100 MHz",
        health: "nominal",
        detail: "Oven-controlled oscillator disciplined to GPS. Holdover rated at 1 µs/day.",
        metrics: [
          { label: "Frequency", value: "100.000000 MHz", state: "ok" },
          { label: "Jitter", value: "84 fs", state: "ok" },
          { label: "GPS lock", value: "12 sats", state: "ok" },
        ],
      },
      {
        id: "dist",
        name: "Main Distributor",
        subtitle: "1:3 fan-out",
        health: "nominal",
        detail: "Splits the master reference to the three tile rows with matched cable lengths.",
        metrics: [
          { label: "Output level", value: "+7.0 dBm", state: "ok" },
          { label: "Skew", value: "< 2 ps", state: "ok" },
        ],
      },
      {
        id: "row-a",
        name: "Row-A Splitter",
        subtitle: "Tiles A1–A3",
        health: "nominal",
        detail: "Distribution amplifier feeding the three tiles on row A.",
        metrics: [
          { label: "Jitter", value: "96 fs", state: "ok" },
          { label: "Tiles locked", value: "3 / 3", state: "ok" },
        ],
      },
      {
        id: "row-b",
        name: "Row-B Splitter",
        subtitle: "Tiles B1–B3",
        health: "degraded",
        detail:
          "Output jitter has risen to 3.1 ps against a 500 fs limit. This is the source of the PLL unlock reported on tile B2 slot 6 — B1 and B3 are drifting on the same reference and will follow. Replace the distribution amplifier at the next maintenance window.",
        metrics: [
          { label: "Jitter", value: "3.10 ps", state: "warn" },
          { label: "Tiles locked", value: "2 / 3", state: "warn" },
        ],
      },
      {
        id: "row-c",
        name: "Row-C Splitter",
        subtitle: "Tiles C1–C3",
        health: "nominal",
        detail: "Distribution amplifier feeding the three tiles on row C.",
        metrics: [
          { label: "Jitter", value: "91 fs", state: "ok" },
          { label: "Tiles locked", value: "3 / 3", state: "ok" },
        ],
      },
    ],
  },
  {
    id: "power",
    title: "Power Chain",
    purpose: "48V bus feeding nine chassis through redundant converter pairs",
    headline: { label: "Site draw", value: "13.0 kW", state: "ok" },
    nodes: [
      {
        id: "mains",
        name: "Mains + UPS",
        subtitle: "415V 3-phase",
        health: "nominal",
        detail: "Utility feed with online UPS. Generator holds 45 minutes of autonomy at full load.",
        metrics: [
          { label: "Input", value: "415 V", state: "ok" },
          { label: "UPS autonomy", value: "45 min", state: "ok" },
        ],
      },
      {
        id: "bus",
        name: "48V Primary Bus",
        subtitle: "Dual feed",
        health: "nominal",
        detail: "Rectified 48V distribution bus, dual-fed so either side can carry the array alone.",
        metrics: [
          { label: "Bus voltage", value: "48.02 V", state: "ok" },
          { label: "Current", value: "271 A", state: "ok" },
        ],
      },
      {
        id: "psu",
        name: "Converter Pairs",
        subtitle: "PSU-A / PSU-B ×9",
        health: "nominal",
        detail: "Each chassis carries an N+1 pair converting 48V to the 12V backplane rail.",
        metrics: [
          { label: "Efficiency", value: "94.2 %", state: "ok" },
          { label: "Redundancy", value: "N+1 held", state: "ok" },
        ],
      },
      {
        id: "rail",
        name: "Backplane Rails",
        subtitle: "12V logic",
        health: "nominal",
        detail: "Per-chassis 12V rail feeding RFSoC, beamformer and controller cards.",
        metrics: [
          { label: "Rail voltage", value: "12.01 V", state: "ok" },
          { label: "Total load", value: "13.0 kW", state: "ok" },
        ],
      },
    ],
  },
  {
    id: "cooling",
    title: "Cooling Loop",
    purpose: "Removes chassis heat — thermal drift moves element phase",
    headline: { label: "Supply temp", value: "18.4 °C", state: "ok" },
    nodes: [
      {
        id: "chiller",
        name: "Chiller Core",
        subtitle: "40 kW capacity",
        health: "nominal",
        detail: "Primary chiller with a standby unit on auto-changeover.",
        metrics: [
          { label: "Supply", value: "18.4 °C", state: "ok" },
          { label: "Load", value: "68 %", state: "ok" },
        ],
      },
      {
        id: "manifold",
        name: "Manifold Feed",
        subtitle: "9-way valve",
        health: "nominal",
        detail: "Balancing manifold distributing coolant to the nine tile chassis.",
        metrics: [
          { label: "Flow", value: "42 L/min", state: "ok" },
          { label: "Backpressure", value: "1.8 bar", state: "ok" },
        ],
      },
      {
        id: "coldplate",
        name: "Chassis Cold Plates",
        subtitle: "Nine loops",
        health: "degraded",
        detail:
          "Tile B2's loop is returning 6.3 °C warmer than its neighbours, which matches the elevated chassis temperature reported on that tile. Suspect a partially blocked cold plate rather than a chiller fault.",
        metrics: [
          { label: "Worst return", value: "31.2 °C", state: "warn" },
          { label: "Loops nominal", value: "8 / 9", state: "warn" },
        ],
      },
      {
        id: "return",
        name: "Warm Return",
        subtitle: "To chiller",
        health: "nominal",
        detail: "Combined return bus carrying heat back to the chiller core.",
        metrics: [
          { label: "Return temp", value: "26.8 °C", state: "ok" },
          { label: "ΔT", value: "8.4 °C", state: "ok" },
        ],
      },
    ],
  },
  {
    id: "data",
    title: "Data Path",
    purpose: "Carries beam data from the tiles to the mission operations centre",
    headline: { label: "Egress", value: "42.6 Gbps", state: "ok" },
    nodes: [
      {
        id: "gty",
        name: "GTY SerDes",
        subtitle: "Per-board fibre",
        health: "nominal",
        detail: "Each RFSoC drives its beam data out over 25 Gbps optical lanes.",
        metrics: [
          { label: "Lanes up", value: "72 / 72", state: "ok" },
          { label: "BER", value: "< 1e-12", state: "ok" },
        ],
      },
      {
        id: "patch",
        name: "Optical Patch",
        subtitle: "Panels 1–2",
        health: "nominal",
        detail: "Passive patch panels aggregating tile fibre into the beamformer racks.",
        metrics: [
          { label: "Insertion loss", value: "0.4 dB", state: "ok" },
          { label: "Ports used", value: "72 / 96", state: "ok" },
        ],
      },
      {
        id: "core",
        name: "100GbE Core",
        subtitle: "Optical switch",
        health: "nominal",
        detail: "Core switch fabric routing beam products to the tracking servers.",
        metrics: [
          { label: "Throughput", value: "42.6 Gbps", state: "ok" },
          { label: "Fabric load", value: "43 %", state: "ok" },
        ],
      },
      {
        id: "moc",
        name: "MOC Ground Link",
        subtitle: "To operations",
        health: "nominal",
        detail: "Wide-area link delivering products to the mission operations centre.",
        metrics: [
          { label: "Link", value: "Up", state: "ok" },
          { label: "Latency", value: "12 ms", state: "ok" },
        ],
      },
    ],
  },
];

/** Everything the site is currently flagging, newest concern first. */
export function siteAlarms() {
  return INFRASTRUCTURE.flatMap((section) =>
    section.nodes
      .filter((n) => n.health !== "nominal")
      .map((n) => ({ section: section.title, node: n })),
  );
}
