"use client";

import {
  ArrowRight,
  Boxes,
  CircleCheck,
  Cpu,
  Gauge,
  Lock,
  Thermometer,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useDrillParams } from "../hooks/useDrillParams";
import { cn } from "@/features/data-archival/lib/cn";
import {
  buildChassis,
  CARD_KIND,
  chassisTotals,
  powerRails,
  THERMAL_TOKEN,
  thermalFill,
  thermalState,
  type CardKind,
} from "../data/chassis";
import { TILES, TILE_MAP } from "../data/tiles";
import { HEALTH } from "./TileCard";
import { SlotCardView } from "./SlotCardView";

function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("da-card flex min-h-0 flex-col", className)}>
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
        <span className="truncate text-2xs font-bold uppercase tracking-[0.08em] text-da-text">
          {title}
        </span>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-[0.75rem] py-[0.5rem]">{children}</div>
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-[0.5rem] py-[0.375rem]">
      <span className="truncate text-2xs font-medium uppercase tracking-[0.06em] text-da-muted">
        {label}
      </span>
      <span className={cn("da-nums shrink-0 text-2xs font-bold", tone ?? "text-da-text")}>
        {value}
      </span>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  sub,
  icon,
  tone,
  divider,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  icon: React.ReactNode;
  tone?: string;
  divider: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-[0.5rem] px-[0.875rem] py-[0.375rem]",
        divider && "border-r-[max(1px,0.0625rem)] border-da-border",
      )}
    >
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-3xs font-semibold uppercase tracking-[0.1em] text-da-label">
          {label}
        </span>
        <span className="mt-[0.3125rem] flex items-baseline gap-[0.1875rem]">
          <span className={cn("da-nums text-xl font-bold tracking-[-0.02em]", tone ?? "text-da-text")}>
            {value}
          </span>
          {unit && <span className="text-2xs font-semibold text-da-muted">{unit}</span>}
        </span>
        <span className="mt-[0.3125rem] truncate text-3xs font-medium text-da-muted">{sub}</span>
      </span>
      <span className="flex size-[2rem] shrink-0 items-center justify-center rounded-[0.375rem] bg-da-subtle text-da-muted">
        {icon}
      </span>
    </div>
  );
}

/**
 * LRU CHASSIS — the VPX backplane behind one subarray tile.
 *
 * The rack keeps its physical proportions on purpose: an operator reads it to
 * decide which card to pull, so slot order and card width have to match the
 * hardware. What changed from the source console is everything around it — the
 * rack no longer stretches to fill the viewport (which made fourteen absurdly
 * tall, thin cards), and the height that frees up carries the aggregates that
 * actually explain a fault: rail loading, thermal spread and the BITE log.
 */
export function ChassisScreen() {
  const { get, getNumber, set, drillTo } = useDrillParams();
  // Arriving from the array screen carries the tile; the slot defaults to the
  // one that is flagged, so a drill-down lands on the fault rather than on
  // slot 1 with the operator hunting for it.
  const tileId = get("tile", "B2");
  const slot = getNumber("slot", 6);

  const cards = useMemo(() => buildChassis(tileId), [tileId]);
  const totals = useMemo(() => chassisTotals(cards), [cards]);
  const rails = useMemo(() => powerRails(cards), [cards]);

  const tile = TILE_MAP[tileId];
  const selected = cards.find((c) => c.slot === slot) ?? cards[0];
  const kind = CARD_KIND[selected.kind];
  const flagged = cards.filter(
    (c) => c.kind !== "spare" && (c.health !== "nominal" || !c.locked),
  );
  const hottest = [...cards].filter((c) => c.kind !== "spare").sort((a, b) => b.tempC - a.tempC);

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[2.5rem_4.25rem_minmax(0,1fr)_11rem] gap-[0.75rem]">
        {/* Tile selector + class legend */}
        <div className="flex items-center justify-between gap-[0.75rem]">
          <div className="flex items-center gap-[0.625rem]">
            <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
              <Boxes className="size-[0.8125rem]" strokeWidth={2.2} />
              Chassis
            </span>
            <div className="flex items-center gap-[0.1875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
              {TILES.map((t) => {
                const active = t.id === tileId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set({ tile: t.id })}
                    className={cn(
                      "da-nums h-[1.5rem] w-[2rem] cursor-pointer rounded-[0.1875rem] text-2xs font-bold transition-colors",
                      active
                        ? "bg-da-brand text-da-on-brand"
                        : t.health !== "nominal"
                          ? "text-da-warn-text hover:bg-da-subtle"
                          : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                    )}
                  >
                    {t.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-[0.75rem]">
            {(Object.keys(CARD_KIND) as CardKind[])
              .filter((k) => k !== "spare")
              .map((k) => (
                <span key={k} className="flex items-center gap-[0.3125rem]">
                  <span
                    className="size-[0.4375rem] rounded-full"
                    style={{ backgroundColor: `var(--color-${CARD_KIND[k].token})` }}
                  />
                  <span className="text-3xs font-bold uppercase tracking-[0.06em] text-da-muted">
                    {CARD_KIND[k].label}
                  </span>
                </span>
              ))}
          </div>
        </div>

        {/* Chassis aggregates */}
        <div className="da-card flex min-h-0 items-center">
          <Kpi
            label="Slots Populated"
            value={`${totals.populated}`}
            unit={`/ ${totals.slots}`}
            sub="VITA 46 · 4HP pitch"
            icon={<Cpu className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Chassis Draw"
            value={totals.drawW.toFixed(0)}
            unit="W"
            sub="48V input, dual feed"
            icon={<Zap className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Hottest Card"
            value={totals.maxTempC.toFixed(1)}
            unit="°C"
            sub={`Slot ${hottest[0]?.slot} · ${hottest[0]?.name}`}
            tone={
              hottest[0] && thermalState(hottest[0]) === "trip"
                ? "text-da-danger"
                : hottest[0] && thermalState(hottest[0]) === "warn"
                  ? "text-da-warn-text"
                  : undefined
            }
            icon={<Thermometer className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Locks Held"
            value={`${totals.locksHeld}`}
            unit={`/ ${totals.locksTotal}`}
            sub={totals.locksHeld === totals.locksTotal ? "Backplane coherent" : "Lock lost — see BITE"}
            tone={totals.locksHeld === totals.locksTotal ? "text-da-success" : "text-da-warn-text"}
            icon={<Lock className="size-[1rem]" strokeWidth={2} />}
            divider={false}
          />
        </div>

        {/* The rack */}
        <Panel
          title={`VPX Backplane · LRU_${tileId}`}
          action={
            <span className="shrink-0 text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              14 slots · dual-redundant
            </span>
          }
        >
          <div className="flex h-full min-h-0 flex-col gap-[0.5rem]">
            <div style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
              className="grid min-h-0 flex-1 gap-[0.25rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border-strong bg-da-bg p-[0.5rem]">
              {cards.map((card) => (
                <SlotCardView
                  key={card.slot}
                  card={card}
                  selected={card.slot === slot}
                  onSelect={() => set({ slot: card.slot })}
                  onOpen={
                    card.kind === "rfsoc"
                      ? () => drillTo("/monitor/rfsoc", { tile: tileId, slot: card.slot })
                      : undefined
                  }
                />
              ))}
            </div>
            <div className="flex shrink-0 items-center justify-between text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              <span>Slot 1 — front of chassis</span>
              <span>Readings: temperature · rail voltage · card current</span>
              <span>Slot 14 — rear</span>
            </div>
          </div>
        </Panel>

        {/* Aggregates that explain a fault */}
        <div className="grid min-h-0 grid-cols-3 gap-[0.75rem]">
          <Panel title="Power Rails">
            <div className="flex flex-col gap-[0.625rem]">
              {rails.map((rail) => {
                const watts = rail.measured * rail.currentA;
                const drift = ((rail.measured - rail.nominal) / rail.nominal) * 100;
                return (
                  <div key={rail.id} className="flex flex-col gap-[0.3125rem]">
                    <div className="flex items-baseline justify-between gap-[0.5rem]">
                      <span className="text-2xs font-bold uppercase tracking-[0.06em] text-da-text">
                        {rail.label}
                      </span>
                      <span className="da-nums text-2xs font-bold text-da-text">
                        {rail.measured.toFixed(2)} V
                      </span>
                    </div>
                    <div className="h-[0.25rem] w-full overflow-hidden rounded-full bg-da-border">
                      <div
                        className="h-full rounded-full bg-da-brand"
                        style={{ width: `${Math.min(100, (rail.currentA / 30) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="da-nums text-3xs font-medium text-da-label">
                        {rail.currentA.toFixed(2)} A · {watts.toFixed(0)} W
                      </span>
                      <span
                        className={cn(
                          "da-nums text-3xs font-semibold",
                          Math.abs(drift) > 1 ? "text-da-warn-text" : "text-da-success",
                        )}
                      >
                        {drift >= 0 ? "+" : ""}
                        {drift.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Thermal Profile">
            <ul className="flex flex-col gap-[0.25rem]">
              {hottest.slice(0, 6).map((c) => {
                const pct = thermalFill(c);
                const tone = THERMAL_TOKEN[thermalState(c)];
                return (
                  <li key={c.slot} className="flex items-center gap-[0.5rem]">
                    <span className="da-nums w-[1.75rem] shrink-0 text-3xs font-bold text-da-label">
                      S{c.slot}
                    </span>
                    <span className="h-[0.25rem] min-w-0 flex-1 overflow-hidden rounded-full bg-da-border">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: `var(--color-${tone})` }}
                      />
                    </span>
                    <span
                      className={cn(
                        "da-nums w-[2.5rem] shrink-0 text-right text-3xs font-bold",
                        thermalState(c) === "trip"
                          ? "text-da-danger"
                          : thermalState(c) === "warn"
                            ? "text-da-warn-text"
                            : "text-da-text",
                      )}
                    >
                      {c.tempC.toFixed(1)}°
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="BITE Events">
            {flagged.length === 0 ? (
              <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
                <CircleCheck className="size-[0.875rem] shrink-0 text-da-success" strokeWidth={2.2} />
                <span className="text-2xs font-medium text-da-muted">
                  All {totals.populated} cards report pass.
                </span>
              </div>
            ) : (
              <ul className="flex flex-col gap-[0.375rem]">
                {flagged.map((c) => (
                  <li
                    key={c.slot}
                    className="flex items-start gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-warn/35 bg-da-warn-soft px-[0.5rem] py-[0.375rem]"
                  >
                    <TriangleAlert
                      className="mt-[0.0625rem] size-[0.75rem] shrink-0 text-da-warn"
                      strokeWidth={2.2}
                    />
                    <span className="flex min-w-0 flex-col leading-none">
                      <span className="da-nums text-2xs font-bold text-da-text">
                        Slot {c.slot} · {c.name}
                      </span>
                      <span className="mt-[0.1875rem] text-3xs font-medium leading-[1.35] text-da-muted">
                        {!c.locked ? "PLL lock lost" : "BITE degraded"} · {c.tempC.toFixed(1)}°C ·{" "}
                        {c.currentA.toFixed(2)} A
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Selected card */}
      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <Panel
          className="shrink-0"
          title={`Slot ${selected.slot} · ${selected.name}`}
          action={
            <span
              className="shrink-0 rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-${HEALTH[selected.health].token}) 14%, transparent)`,
                color: `var(--color-${HEALTH[selected.health].token})`,
              }}
            >
              {HEALTH[selected.health].label}
            </span>
          }
        >
          <p className="pb-[0.375rem] text-2xs font-medium leading-[1.45] text-da-muted">
            {selected.description}
          </p>
          {selected.kind === "rfsoc" && (
            <button
              type="button"
              onClick={() => drillTo("/monitor/rfsoc", { tile: tileId, slot: selected.slot })}
              className="mb-[0.5rem] flex w-full cursor-pointer items-center justify-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand/35 bg-da-brand-soft py-[0.4375rem] text-2xs font-bold uppercase tracking-[0.06em] text-da-brand transition-colors hover:bg-da-brand hover:text-da-on-brand"
            >
              Open {selected.name} board
              <ArrowRight className="size-[0.75rem]" strokeWidth={2.4} />
            </button>
          )}

          <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
            <Row label="Card class" value={kind.label} />
            <Row label="Role" value={kind.role} />
            <Row label="Parent tile" value={`${tile.id} · ${tile.beams} beams`} />
            <Row
              label="Temperature"
              value={selected.kind === "spare" ? "—" : `${selected.tempC.toFixed(1)} °C`}
              tone={
                thermalState(selected) === "trip"
                  ? "text-da-danger"
                  : thermalState(selected) === "warn"
                    ? "text-da-warn-text"
                    : undefined
              }
            />
            <Row
              label="Rail voltage"
              value={selected.kind === "spare" ? "—" : `${selected.voltageV.toFixed(2)} V`}
            />
            <Row
              label="Current draw"
              value={selected.kind === "spare" ? "—" : `${selected.currentA.toFixed(2)} A`}
            />
            <Row
              label="Dissipation"
              value={
                selected.kind === "spare"
                  ? "—"
                  : `${(selected.voltageV * selected.currentA).toFixed(1)} W`
              }
            />
            <Row
              label="PLL lock"
              value={selected.kind === "spare" ? "—" : selected.locked ? "Held" : "Lost"}
              tone={selected.kind !== "spare" && !selected.locked ? "text-da-warn-text" : undefined}
            />
          </div>
        </Panel>

        <Panel title="Backplane Notes" className="flex-1">
          <div className="flex flex-col gap-[0.625rem]">
            <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
              <Row label="Standard" value="VITA 46.0" />
              <Row label="Card width" value="4HP" />
              <Row label="Slot pitch" value="0.80 in" />
              <Row label="Supply topology" value="N+1 redundant" />
            </div>
            <p className="flex gap-[0.375rem] text-3xs font-medium leading-[1.45] text-da-label">
              <Gauge className="mt-[0.0625rem] size-[0.75rem] shrink-0 text-da-muted" strokeWidth={2.2} />
              Cards are hot-swappable at the ejector rails. Pulling an RFSoC card drops the
              eight elements on its row; the beamformer re-weights the remaining rows within
              one calibration cycle.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
