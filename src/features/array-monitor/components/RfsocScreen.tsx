"use client";

import {
  ChevronRight,
  CircleCheck,
  Cpu,
  Gauge,
  Radio,
  Thermometer,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useDrillParams } from "../hooks/useDrillParams";
import { cn } from "@/features/data-archival/lib/cn";
import { boardTelemetry, buildBoard, RFSOC_SLOTS, type RfsocChannel } from "../data/rfsoc";
import { TILES } from "../data/tiles";
import { HEALTH } from "./TileCard";

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
    <div className="flex items-center justify-between gap-[0.5rem] py-[0.3125rem]">
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

/** One channel in the ADC bank. The gain bar is what makes sixteen scannable. */
function ChannelCard({
  channel,
  selected,
  onSelect,
}: {
  channel: RfsocChannel;
  selected: boolean;
  onSelect: () => void;
}) {
  const token = HEALTH[channel.health].token;
  // Channels run 8–16 dB; anchoring the bar there shows the spread instead of
  // sixteen near-identical full bars.
  const gainPct = Math.min(100, Math.max(4, ((channel.gainDb - 8) / 8) * 100));

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-0 cursor-pointer flex-col justify-between gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] p-[0.5rem] text-left transition-colors",
        selected
          ? "border-da-brand bg-da-brand-soft ring-[max(1px,0.0625rem)] ring-da-brand/40"
          : channel.health !== "nominal"
            ? "border-da-warn/60 bg-da-field hover:bg-da-subtle"
            : "border-da-border bg-da-field hover:bg-da-subtle",
      )}
    >
      <span className="flex items-center justify-between gap-[0.25rem]">
        <span className="da-nums text-2xs font-bold text-da-text">
          CH-{String(channel.num).padStart(2, "0")}
        </span>
        <span
          className="text-3xs font-bold uppercase tracking-[0.06em]"
          style={{ color: `var(--color-${token})` }}
        >
          {channel.locked ? "Lock" : "Drift"}
        </span>
      </span>

      <span className="flex flex-col gap-[0.1875rem]">
        <span className="flex items-baseline justify-between">
          <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
            Gain
          </span>
          <span className="da-nums text-2xs font-bold text-da-text">
            {channel.gainDb.toFixed(1)} dB
          </span>
        </span>
        <span className="h-[0.1875rem] w-full overflow-hidden rounded-full bg-da-border">
          <span
            className="block h-full rounded-full"
            style={{ width: `${gainPct}%`, backgroundColor: `var(--color-${token})` }}
          />
        </span>
      </span>

      <span className="flex flex-col gap-[0.1875rem]">
        {[
          ["Noise", `${channel.noiseFloorDbm} dBm`, "text-da-muted"],
          [
            "Phase",
            `${channel.phaseOffsetDeg.toFixed(2)}°`,
            Math.abs(channel.phaseOffsetDeg) > 12 ? "text-da-warn-text" : "text-da-muted",
          ],
          [
            "VSWR",
            channel.vswr.toFixed(2),
            channel.vswr > 1.5 ? "text-da-danger" : "text-da-muted",
          ],
        ].map(([label, value, tone]) => (
          <span key={label} className="flex items-baseline justify-between">
            <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
              {label}
            </span>
            <span className={cn("da-nums text-3xs font-bold", tone)}>{value}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

/**
 * RFSoC MONITOR — one transceiver board, its signal chain and its ADC bank.
 *
 * The source console drew the board's logic blocks as a loose grid with hover
 * highlighting, even though the underlying data describes an ordered chain.
 * Drawing the chain as a chain is the substantive change here: a fault at the
 * PLL implicates everything to its right and nothing to its left, and that is
 * the first question an operator asks. Off-chain services (the ARM core and
 * DDR) hang beneath the fabric they attach to rather than sitting inline.
 */
export function RfsocScreen() {
  const { get, getNumber, set } = useDrillParams();
  const tileId = get("tile", "B2");
  const slot = getNumber("slot", 6);
  const channelNum = getNumber("channel", 6);
  const [blockId, setBlockId] = useState("PLL");

  const board = useMemo(() => buildBoard(tileId, slot), [tileId, slot]);
  const telemetry = useMemo(() => boardTelemetry(board), [board]);

  const channel = board.channels.find((c) => c.num === channelNum) ?? board.channels[0];
  const block = board.chain.find((b) => b.id === blockId) ?? board.chain[0];
  const inline = board.chain.filter((b) => !b.branch);
  const branches = board.chain.filter((b) => b.branch);
  const locked = board.channels.filter((c) => c.locked).length;

  const stateTone = { ok: "text-da-success", warn: "text-da-warn-text", bad: "text-da-danger" };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[2.5rem_4.25rem_12rem_minmax(0,1fr)] gap-[0.75rem]">
        {/* Board selector */}
        <div className="flex items-center justify-between gap-[0.75rem]">
          <div className="flex items-center gap-[0.625rem]">
            <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
              <Cpu className="size-[0.8125rem]" strokeWidth={2.2} />
              Tile
            </span>
            <div className="flex items-center gap-[0.1875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
              {TILES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set({ tile: t.id })}
                  className={cn(
                    "da-nums h-[1.5rem] w-[2rem] cursor-pointer rounded-[0.1875rem] text-2xs font-bold transition-colors",
                    t.id === tileId
                      ? "bg-da-brand text-da-on-brand"
                      : t.health !== "nominal"
                        ? "text-da-warn-text hover:bg-da-subtle"
                        : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                  )}
                >
                  {t.id}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-[0.625rem]">
            <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
              Slot
            </span>
            <div className="flex items-center gap-[0.1875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
              {RFSOC_SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ slot: s })}
                  className={cn(
                    "da-nums h-[1.5rem] w-[1.75rem] cursor-pointer rounded-[0.1875rem] text-2xs font-bold transition-colors",
                    s === slot
                      ? "bg-da-brand text-da-on-brand"
                      : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Board aggregates */}
        <div className="da-card flex min-h-0 items-center">
          <Kpi
            label="Board"
            value={board.name}
            sub={`Tile ${board.tileId} · slot ${board.slot}`}
            icon={<Cpu className="size-[1rem]" strokeWidth={2} />}
            tone={board.health !== "nominal" ? "text-da-warn-text" : undefined}
            divider
          />
          <Kpi
            label="Sampling"
            value={board.samplingGsps.toFixed(2)}
            unit="GSPS"
            sub="16 channels · 12-bit"
            icon={<Waves className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Channels Locked"
            value={`${locked}`}
            unit="/ 16"
            sub={locked === 16 ? "Bank coherent" : "Drift on one channel"}
            tone={locked === 16 ? "text-da-success" : "text-da-warn-text"}
            icon={<Radio className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Board Temp"
            value={board.tempC.toFixed(1)}
            unit="°C"
            sub={`Uptime ${board.uptimeHours} h`}
            tone={board.tempC >= 50 ? "text-da-warn-text" : undefined}
            icon={<Thermometer className="size-[1rem]" strokeWidth={2} />}
            divider={false}
          />
        </div>

        {/* Signal chain */}
        <Panel
          title="Signal Chain"
          action={
            <span className="shrink-0 text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              Reference in → beam data out
            </span>
          }
        >
          <div className="flex h-full min-h-0 flex-col gap-[0.5rem]">
            <div className="flex min-h-0 flex-1 items-stretch gap-[0.25rem]">
              {inline.map((b, i) => {
                const token = HEALTH[b.health].token;
                const active = b.id === blockId;
                return (
                  <div key={b.id} className="flex min-w-0 flex-1 items-center gap-[0.25rem]">
                    <button
                      type="button"
                      onClick={() => setBlockId(b.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-center gap-[0.25rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.5rem] text-left transition-colors",
                        active
                          ? "border-da-brand bg-da-brand-soft"
                          : b.health !== "nominal"
                            ? "border-da-warn/60 bg-da-field hover:bg-da-subtle"
                            : "border-da-border bg-da-field hover:bg-da-subtle",
                      )}
                    >
                      <span className="flex items-center gap-[0.3125rem]">
                        <span
                          className="size-[0.375rem] shrink-0 rounded-full"
                          style={{ backgroundColor: `var(--color-${token})` }}
                        />
                        <span className="truncate text-2xs font-bold text-da-text">{b.name}</span>
                      </span>
                      <span className="truncate text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                        {b.subtitle}
                      </span>
                    </button>
                    {i < inline.length - 1 && (
                      <ChevronRight
                        className="size-[0.75rem] shrink-0 text-da-label"
                        strokeWidth={2.4}
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Off-chain services + the selected block's explanation */}
            <div className="flex shrink-0 items-stretch gap-[0.5rem]">
              <div className="flex shrink-0 gap-[0.25rem]">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBlockId(b.id)}
                    className={cn(
                      "flex cursor-pointer flex-col justify-center rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.3125rem] text-left transition-colors",
                      b.id === blockId
                        ? "border-da-brand bg-da-brand-soft"
                        : "border-da-border bg-da-field hover:bg-da-subtle",
                    )}
                  >
                    <span className="text-2xs font-bold text-da-text">{b.name}</span>
                    <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                      {b.subtitle}
                    </span>
                  </button>
                ))}
              </div>

              <p
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.625rem] py-[0.375rem] text-2xs font-medium leading-[1.4]",
                  block.health !== "nominal"
                    ? "border-da-warn/35 bg-da-warn-soft text-da-warn-text"
                    : "border-da-border bg-da-subtle text-da-muted",
                )}
              >
                {block.health !== "nominal" ? (
                  <TriangleAlert className="size-[0.875rem] shrink-0 text-da-warn" strokeWidth={2.2} />
                ) : (
                  <CircleCheck className="size-[0.875rem] shrink-0 text-da-success" strokeWidth={2.2} />
                )}
                <span className="min-w-0">
                  <span className="font-bold text-da-text">{block.name}</span> — {block.detail}
                </span>
              </p>
            </div>
          </div>
        </Panel>

        {/* ADC bank */}
        <Panel
          title="ADC Bank · 16 Channels"
          action={
            <span className="shrink-0 text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              Gain bars scaled 8–16 dB
            </span>
          }
        >
          <div
            className="grid h-full min-h-0 gap-[0.5rem]"
            style={{
              gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
              gridTemplateRows: "repeat(2, minmax(0, 1fr))",
            }}
          >
            {board.channels.map((c) => (
              <ChannelCard
                key={c.num}
                channel={c}
                selected={c.num === channelNum}
                onSelect={() => set({ channel: c.num })}
              />
            ))}
          </div>
        </Panel>
      </div>

      {/* Rail: selected channel, then board telemetry */}
      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <Panel
          className="shrink-0"
          title={`Channel ${String(channel.num).padStart(2, "0")}`}
          action={
            <span
              className="shrink-0 rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-${HEALTH[channel.health].token}) 14%, transparent)`,
                color: `var(--color-${HEALTH[channel.health].token})`,
              }}
            >
              {channel.locked ? "Lock" : "Drift"}
            </span>
          }
        >
          <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
            <Row label="NCO mixer" value={`${channel.ncoMHz.toFixed(1)} MHz`} />
            <Row label="Decimation" value={`÷ ${channel.decimation}`} />
            <Row label="Attenuation" value={`${channel.attenuationDb.toFixed(2)} dB`} />
            <Row label="Gain" value={`${channel.gainDb.toFixed(1)} dB`} />
            <Row label="Noise floor" value={`${channel.noiseFloorDbm} dBm`} />
            <Row
              label="Phase offset"
              value={`${channel.phaseOffsetDeg.toFixed(2)}°`}
              tone={Math.abs(channel.phaseOffsetDeg) > 12 ? "text-da-warn-text" : undefined}
            />
            <Row
              label="VSWR"
              value={channel.vswr.toFixed(2)}
              tone={channel.vswr > 1.5 ? "text-da-danger" : undefined}
            />
            <Row
              label="Digital BITE"
              value={HEALTH[channel.health].label}
              tone={channel.health !== "nominal" ? "text-da-warn-text" : "text-da-success"}
            />
          </div>
        </Panel>

        <Panel title="Board Telemetry" className="flex-1">
          <div className="flex flex-col gap-[0.75rem]">
            {telemetry.map((group) => (
              <div key={group.group} className="flex flex-col">
                <span className="flex items-center gap-[0.3125rem] pb-[0.25rem] text-3xs font-bold uppercase tracking-[0.1em] text-da-brand">
                  <Gauge className="size-[0.6875rem]" strokeWidth={2.4} />
                  {group.group}
                </span>
                <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
                  {group.rows.map((r) => (
                    <Row
                      key={r.label}
                      label={r.label}
                      value={r.value}
                      tone={stateTone[r.state]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
