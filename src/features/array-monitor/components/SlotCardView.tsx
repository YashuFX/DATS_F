"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import {
  CARD_KIND,
  THERMAL_TOKEN,
  thermalFill,
  thermalState,
  type SlotCard,
} from "../data/chassis";
import { HEALTH } from "./TileCard";

/**
 * One card in the backplane.
 *
 * Drawn as the physical object an operator pulls: ejector rails top and bottom,
 * a face-plate identity, then the readings that decide whether it gets pulled.
 * Labels stay horizontal — the source console rotated card names 90°, which
 * saves width but cannot be read at a glance from across a control room, and
 * this screen exists to be read at a glance.
 */
export function SlotCardView({
  card,
  selected,
  onSelect,
  onOpen,
}: {
  card: SlotCard;
  selected: boolean;
  onSelect: () => void;
  /** Present only for cards that have a screen of their own to open. */
  onOpen?: () => void;
}) {
  const kind = CARD_KIND[card.kind];
  const empty = card.kind === "spare";
  const faulted = card.health !== "nominal";
  const thermal = thermalState(card);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        onSelect();
        if (onOpen) onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
          if (onOpen) onOpen();
        }
      }}
      aria-pressed={selected}
      className={cn(
        "relative flex h-full min-h-0 cursor-pointer flex-col items-stretch gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.25rem] py-[0.3125rem] transition-colors",
        empty
          ? "border-dashed border-da-border bg-transparent"
          : "border-da-border bg-da-field hover:bg-da-subtle",
        selected && "border-da-brand bg-da-brand-soft ring-[max(1px,0.0625rem)] ring-da-brand/40",
        faulted && !selected && "border-da-warn/60",
      )}
    >
      {/* Upper ejector rail */}
      <span className="flex h-[0.4375rem] shrink-0 items-center justify-center rounded-[0.125rem] bg-da-subtle">
        <span className="size-[0.1875rem] rounded-full bg-da-border-strong" />
      </span>

      {/* Class stripe — the fastest way to read the rack's composition */}
      <span
        className="h-[0.1875rem] shrink-0 rounded-full"
        style={{
          backgroundColor: empty ? "var(--color-da-border)" : `var(--color-${kind.token})`,
        }}
      />

      <span className="flex shrink-0 items-center justify-between gap-[0.125rem]">
        <span className="da-nums text-3xs font-bold text-da-label">S{card.slot}</span>
        {onOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            title={`Open ${card.name}`}
            aria-label={`Open ${card.name} board`}
            className="flex size-[0.875rem] cursor-pointer items-center justify-center rounded-[0.125rem] text-da-label transition-colors hover:bg-da-brand-soft hover:text-da-brand"
          >
            <ArrowUpRight className="size-[0.625rem]" strokeWidth={2.6} />
          </button>
        )}
      </span>

      {empty ? (
        <span className="flex flex-1 items-center justify-center text-3xs font-bold uppercase tracking-[0.08em] text-da-label">
          Spare
        </span>
      ) : (
        <>
          <span
            className="shrink-0 rounded-[0.125rem] py-[0.0625rem] text-center text-3xs font-bold uppercase tracking-[0.04em]"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-${kind.token}) 16%, transparent)`,
              color: `var(--color-${kind.token})`,
            }}
          >
            {kind.label}
          </span>

          <span className="da-nums shrink-0 text-center text-2xs font-bold text-da-text">
            {card.cardId}
          </span>

          {/* Thermal column — fills the card's height, read like a gauge */}
          <span className="flex min-h-0 flex-1 items-end justify-center py-[0.1875rem]">
            <span className="relative h-full w-[0.5rem] overflow-hidden rounded-full bg-da-border">
              <span
                className="absolute inset-x-0 bottom-0 rounded-full transition-[height]"
                style={{
                  height: `${thermalFill(card)}%`,
                  backgroundColor: `var(--color-${THERMAL_TOKEN[thermal]})`,
                }}
              />
            </span>
          </span>

          {/* Readings */}
          <span className="flex shrink-0 flex-col gap-[0.125rem]">
            {[
              [`${card.tempC.toFixed(1)}°`, thermal === "trip" ? "text-da-danger" : thermal === "warn" ? "text-da-warn-text" : "text-da-text"],
              [`${card.voltageV.toFixed(0)}V`, "text-da-muted"],
              [`${card.currentA.toFixed(2)}A`, "text-da-muted"],
            ].map(([value, tone]) => (
              <span key={value} className={cn("da-nums text-center text-3xs font-semibold", tone)}>
                {value}
              </span>
            ))}
          </span>

          {/* LOCK / BITE lamps */}
          <span className="flex shrink-0 items-center justify-center gap-[0.3125rem] border-t-[max(1px,0.0625rem)] border-da-border pt-[0.25rem]">
            <span
              className="size-[0.3125rem] rounded-full"
              title={card.locked ? "Lock held" : "Lock lost"}
              style={{
                backgroundColor: card.locked
                  ? "var(--color-da-success)"
                  : "var(--color-da-warn)",
              }}
            />
            <span
              className="size-[0.3125rem] rounded-full"
              title={`BITE ${HEALTH[card.health].label}`}
              style={{ backgroundColor: `var(--color-${HEALTH[card.health].token})` }}
            />
          </span>
        </>
      )}

      {/* Lower ejector rail */}
      <span className="flex h-[0.4375rem] shrink-0 items-center justify-center rounded-[0.125rem] bg-da-subtle">
        <span className="size-[0.1875rem] rounded-full bg-da-border-strong" />
      </span>
    </div>
  );
}
