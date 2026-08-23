import { TILE_MAP } from "./tiles";
import type { HealthId } from "../types";

/**
 * One RFSoC transceiver board — the card in a given chassis slot.
 *
 * A board is a signal chain: a reference clock arrives from the backplane
 * divider, a PLL synthesises the sample clock, sixteen ADCs digitise at
 * 4 GSPS, the FPGA fabric does phase alignment and digital down-conversion,
 * and the result leaves over Aurora on the GTY serdes. Modelling it as an
 * ordered chain rather than a bag of blocks is the point: when the PLL drifts,
 * everything downstream of it is suspect and everything upstream is not.
 */

export interface RfsocBlock {
  id: string;
  name: string;
  subtitle: string;
  detail: string;
  health: HealthId;
  /** Blocks that hang off the main chain rather than sitting in it. */
  branch?: boolean;
}

export interface RfsocChannel {
  num: number;
  gainDb: number;
  noiseFloorDbm: number;
  locked: boolean;
  health: HealthId;
  ncoMHz: number;
  decimation: number;
  attenuationDb: number;
  phaseOffsetDeg: number;
  vswr: number;
}

export interface RfsocBoard {
  tileId: string;
  slot: number;
  name: string;
  health: HealthId;
  tempC: number;
  samplingGsps: number;
  uptimeHours: number;
  chain: RfsocBlock[];
  channels: RfsocChannel[];
}

/** The board carrying the seeded fault — tile B2, chassis slot 6. */
const FAULT = { tileId: "B2", slot: 6, channel: 6 };

export function buildBoard(tileId: string, slot: number): RfsocBoard {
  const tile = TILE_MAP[tileId];
  const faulted = tileId === FAULT.tileId && slot === FAULT.slot;

  const chain: RfsocBlock[] = [
    {
      id: "CLK",
      name: "Clock Input",
      subtitle: "100 MHz REF",
      detail: "Reference clock arriving from the backplane divider card.",
      health: "nominal",
    },
    {
      id: "PLL",
      name: "PLL Synth",
      subtitle: "LMX2594",
      detail: faulted
        ? "Output jitter elevated to 3.1 ps — above the 500 fs limit. Downstream sampling is no longer coherent with the array."
        : "Phase-locked and stable. Jitter 120 fs against a 500 fs limit.",
      health: faulted ? "degraded" : "nominal",
    },
    {
      id: "ADC",
      name: "ADC Bank",
      subtitle: "16 × 12-bit",
      detail: faulted
        ? `Channel ${FAULT.channel} phase offset past threshold; the remaining fifteen channels still digitise cleanly.`
        : "All sixteen channels digitising at 4.0 GSPS.",
      health: faulted ? "degraded" : "nominal",
    },
    {
      id: "PL",
      name: "FPGA Fabric",
      subtitle: "UltraScale+ PL",
      detail: "Programmable logic running phase alignment and digital down-conversion.",
      health: "nominal",
    },
    {
      id: "AURORA",
      name: "Aurora Link",
      subtitle: "Fibre interface",
      detail: "High-speed serial link carrying beam data to the Versal PBF card.",
      health: "nominal",
    },
    {
      id: "GTY",
      name: "GTY SerDes",
      subtitle: "25 Gbps lanes",
      detail: "Physical gigabit transceivers driving the optical fibre lanes.",
      health: "nominal",
    },
    // Off-chain services attached to the fabric.
    {
      id: "PS",
      name: "ARM Core",
      subtitle: "Quad A53 PS",
      detail: "Processing system running BITE self-tests, command handling and register configuration.",
      health: "nominal",
      branch: true,
    },
    {
      id: "DDR",
      name: "DDR4",
      subtitle: "4 GB @ 2400",
      detail: "Sample buffer storage for capture and replay. ECC enabled.",
      health: "nominal",
      branch: true,
    },
  ];

  const channels: RfsocChannel[] = Array.from({ length: 16 }, (_, i) => {
    const num = i + 1;
    const bad = faulted && num === FAULT.channel;
    // A small stable spread so the bank does not read as sixteen identical
    // channels, without randomness that would break hydration.
    const drift = ((num * 5) % 7) - 3;

    return {
      num,
      gainDb: bad ? 9.8 : Number((14.5 + drift * 0.12).toFixed(1)),
      noiseFloorDbm: bad ? -98 : -112 + (drift > 1 ? 1 : 0),
      locked: !bad,
      health: bad ? "degraded" : "nominal",
      ncoMHz: 1500 + num * 12.5,
      decimation: 8,
      attenuationDb: Number((6 + drift * 0.25).toFixed(2)),
      phaseOffsetDeg: bad ? 12.4 : Number((drift * 0.35).toFixed(2)),
      vswr: bad ? 1.68 : Number((1.1 + Math.abs(drift) * 0.02).toFixed(2)),
    };
  });

  return {
    tileId,
    slot,
    name: `RFSoC_0${slot}`,
    health: faulted ? "degraded" : "nominal",
    tempC: Number((faulted ? 53.2 : tile.tempC + 2.1).toFixed(1)),
    samplingGsps: 4,
    uptimeHours: 142,
    chain,
    channels,
  };
}

/** Which chassis slots actually hold an RFSoC card. */
export const RFSOC_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export interface TelemetryRow {
  label: string;
  value: string;
  state: "ok" | "warn" | "bad";
}

/** The three board-level groups the source console showed as separate panels. */
export function boardTelemetry(board: RfsocBoard): { group: string; rows: TelemetryRow[] }[] {
  const faulted = board.health !== "nominal";

  return [
    {
      group: "Clocking & PLL",
      rows: [
        { label: "Sampling reference", value: `${board.samplingGsps.toFixed(2)} GSPS`, state: "ok" },
        { label: "PLL jitter", value: faulted ? "3.10 ps" : "120 fs", state: faulted ? "warn" : "ok" },
        { label: "PLL lock", value: faulted ? "Retrying" : "Locked", state: faulted ? "warn" : "ok" },
        { label: "Reference divisor", value: "÷ 1", state: "ok" },
        { label: "DDC sample clock", value: "500.00 MHz", state: "ok" },
      ],
    },
    {
      group: "Voltage Rails & Power",
      rows: [
        { label: "VCCINT", value: "0.85 V", state: "ok" },
        { label: "VCCAUX", value: "1.80 V", state: "ok" },
        { label: "VCC ADC", value: "1.05 V", state: "ok" },
        { label: "Total card power", value: faulted ? "29.4 W" : "21.8 W", state: faulted ? "warn" : "ok" },
      ],
    },
    {
      group: "Interfaces & Memory",
      rows: [
        { label: "Aurora optical link", value: "Up · 25 Gbps", state: "ok" },
        { label: "Bit error rate", value: faulted ? "2.1e-9" : "< 1e-12", state: faulted ? "warn" : "ok" },
        { label: "Optical Tx power", value: "-2.4 dBm", state: "ok" },
        { label: "DDR4 integrity", value: "ECC passed", state: "ok" },
      ],
    },
  ];
}
