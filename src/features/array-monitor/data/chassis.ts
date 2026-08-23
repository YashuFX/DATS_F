import { TILE_MAP } from "./tiles";
import type { HealthId } from "../types";

/**
 * The VPX chassis behind one subarray tile.
 *
 * Each tile is driven by a 14-slot VITA 46 backplane: eight RFSoC transceiver
 * cards (one per element row), a partial-beamformer, a global link controller,
 * two power supplies in a redundant pair, a clock/trigger divider, and one
 * unpopulated spare position.
 *
 * Slot telemetry is derived from its parent tile rather than invented, so a hot
 * tile on the array screen is visibly a hot chassis here — the two screens are
 * describing the same hardware and must not disagree.
 */

export type CardKind = "rfsoc" | "pbf" | "glc" | "psu" | "divider" | "spare";

export interface SlotCard {
  slot: number;
  /** Short identity painted on the card's face plate. */
  cardId: string;
  name: string;
  kind: CardKind;
  description: string;
  health: HealthId;
  tempC: number;
  voltageV: number;
  currentA: number;
  locked: boolean;
}

export const CARD_KIND: Record<CardKind, { label: string; token: string; role: string }> = {
  rfsoc: { label: "RFSoC", token: "da-success", role: "Digital transceiver" },
  pbf: { label: "PBF", token: "da-brand", role: "Partial beamformer" },
  glc: { label: "GLC", token: "da-c3", role: "Global link controller" },
  psu: { label: "PSU", token: "da-warn", role: "Power supply" },
  divider: { label: "DIV", token: "da-c1", role: "Clock / trigger divider" },
  spare: { label: "—", token: "da-label", role: "Unpopulated" },
};

/** Fixed slot plan for the backplane — the same in every tile's chassis. */
const PLAN: Record<number, { kind: CardKind; name: string; cardId: string; description: string; voltageV: number; currentA: number }> = {
  9:  { kind: "pbf",     name: "VP2802",        cardId: "PBF", description: "Versal partial-beamforming logic processor", voltageV: 12, currentA: 4.25 },
  10: { kind: "glc",     name: "VP1802",        cardId: "GLC", description: "Versal global link controller interface",     voltageV: 12, currentA: 3.65 },
  11: { kind: "psu",     name: "PSU-A",         cardId: "P-A", description: "48V→12V DC-DC converter, primary",           voltageV: 48, currentA: 12.45 },
  12: { kind: "psu",     name: "PSU-B",         cardId: "P-B", description: "48V→12V DC-DC converter, redundant",         voltageV: 48, currentA: 11.82 },
  13: { kind: "divider", name: "Power Divider", cardId: "DIV", description: "1:10 clock and trigger splitter",             voltageV: 12, currentA: 0.54 },
  14: { kind: "spare",   name: "Spare",         cardId: "—",   description: "Auxiliary backplane position, unpopulated",   voltageV: 0,  currentA: 0 },
};

export function buildChassis(tileId: string): SlotCard[] {
  const tile = TILE_MAP[tileId];

  return Array.from({ length: 14 }, (_, i) => {
    const slot = i + 1;
    const planned = PLAN[slot];

    if (planned) {
      // Supplies and the divider sit outside the RF path, so their thermal
      // behaviour tracks the chassis loosely rather than the tile's RF load.
      const tempC =
        planned.kind === "spare"
          ? 0
          : planned.kind === "psu"
            ? tile.tempC + 7.2 + (slot === 11 ? 0.9 : 0)
            : tile.tempC + 2.4;

      return {
        slot,
        cardId: planned.cardId,
        name: planned.name,
        kind: planned.kind,
        description: planned.description,
        health: "nominal" as HealthId,
        tempC: Number(tempC.toFixed(1)),
        voltageV: planned.voltageV,
        currentA: planned.currentA,
        locked: planned.kind !== "spare",
      };
    }

    // Slots 1..8 — one RFSoC card per element row of the tile.
    // A stable per-slot offset keeps the rack from looking uniform without
    // needing randomness, which would break server/client hydration.
    const offset = ((slot * 7) % 5) - 2;
    const faulted = tile.id === "B2" && slot === 6;

    return {
      slot,
      cardId: `0${slot}`,
      name: `RFSoC_0${slot}`,
      kind: "rfsoc" as CardKind,
      description: "16-channel ADC/DAC digital transceiver",
      health: (faulted ? "degraded" : "nominal") as HealthId,
      tempC: Number((tile.tempC + offset * 1.5 + (faulted ? 4.5 : 0)).toFixed(1)),
      voltageV: 12,
      currentA: faulted ? 2.45 : Number((1.8 + offset * 0.06).toFixed(2)),
      locked: !faulted,
    };
  });
}

export interface ChassisTotals {
  populated: number;
  slots: number;
  drawW: number;
  maxTempC: number;
  locksHeld: number;
  locksTotal: number;
}

export function chassisTotals(cards: SlotCard[]): ChassisTotals {
  const live = cards.filter((c) => c.kind !== "spare");
  return {
    populated: live.length,
    slots: cards.length,
    drawW: live.reduce((sum, c) => sum + c.voltageV * c.currentA, 0),
    maxTempC: Math.max(...live.map((c) => c.tempC)),
    locksHeld: live.filter((c) => c.locked).length,
    locksTotal: live.length,
  };
}

/** The 48V and 12V rails the chassis runs on. */
export function powerRails(cards: SlotCard[]) {
  const psu = cards.filter((c) => c.kind === "psu");
  const logic = cards.filter((c) => c.kind !== "psu" && c.kind !== "spare");
  return [
    {
      id: "48V",
      label: "48V Input",
      nominal: 48,
      measured: 48.02,
      currentA: psu.reduce((s, c) => s + c.currentA, 0),
      note: "Dual-feed, redundant",
    },
    {
      id: "12V",
      label: "12V Logic",
      nominal: 12,
      measured: 12.01,
      currentA: logic.reduce((s, c) => s + c.currentA, 0),
      note: "Derived from PSU pair",
    },
  ];
}

/**
 * Thermal limits per card class.
 *
 * A single board-wide threshold is wrong here: a DC-DC converter is *expected*
 * to sit well above an RFSoC card, so judging both against 46°C paints two
 * false amber PSUs on every healthy chassis. These are the per-class limits the
 * card vendors quote.
 */
export const THERMAL_LIMITS: Record<CardKind, { warn: number; trip: number }> = {
  rfsoc: { warn: 46, trip: 50 },
  pbf: { warn: 48, trip: 53 },
  glc: { warn: 48, trip: 53 },
  psu: { warn: 58, trip: 65 },
  divider: { warn: 45, trip: 50 },
  spare: { warn: Number.POSITIVE_INFINITY, trip: Number.POSITIVE_INFINITY },
};

export type ThermalState = "ok" | "warn" | "trip";

export function thermalState(card: SlotCard): ThermalState {
  const limit = THERMAL_LIMITS[card.kind];
  if (card.tempC >= limit.trip) return "trip";
  if (card.tempC >= limit.warn) return "warn";
  return "ok";
}

export const THERMAL_TOKEN: Record<ThermalState, string> = {
  ok: "da-brand",
  warn: "da-warn",
  trip: "da-danger",
};

/** How full the card's thermal column reads, 0..100, against its own trip point. */
export function thermalFill(card: SlotCard): number {
  const limit = THERMAL_LIMITS[card.kind];
  const floor = 32;
  const span = limit.trip - floor;
  return Math.min(100, Math.max(4, ((card.tempC - floor) / span) * 100));
}
