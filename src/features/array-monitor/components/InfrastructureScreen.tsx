"use client";

import {
  ChevronRight,
  CircleCheck,
  Clock3,
  Network,
  Snowflake,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { INFRASTRUCTURE, siteAlarms, type InfraSection } from "../data/infrastructure";
import { HEALTH } from "./TileCard";

const SECTION_ICON = {
  clock: Clock3,
  power: Zap,
  cooling: Snowflake,
  data: Network,
} as const;

const STATE_TONE = {
  ok: "text-da-success",
  warn: "text-da-warn-text",
  bad: "text-da-danger",
} as const;

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

/** One service, drawn as the chain it is. */
function SectionPanel({
  section,
  selectedId,
  onSelect,
}: {
  section: InfraSection;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const Icon = SECTION_ICON[section.id];
  const faults = section.nodes.filter((n) => n.health !== "nominal").length;

  return (
    <Panel
      title={section.title}
      action={
        <span className="flex shrink-0 items-center gap-[0.5rem]">
          <span className="da-nums text-2xs font-bold text-da-text">
            {section.headline.value}
          </span>
          <span
            className={cn(
              "text-3xs font-bold uppercase tracking-[0.06em]",
              faults ? "text-da-warn-text" : "text-da-success",
            )}
          >
            {faults ? `${faults} flagged` : "Nominal"}
          </span>
        </span>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-[0.5rem]">
        <span className="flex shrink-0 items-center gap-[0.375rem] text-3xs font-medium leading-[1.35] text-da-label">
          <Icon className="size-[0.75rem] shrink-0 text-da-muted" strokeWidth={2.2} />
          {section.purpose}
        </span>

        <div className="flex min-h-0 flex-1 items-stretch gap-[0.1875rem]">
          {section.nodes.map((node, i) => {
            const token = HEALTH[node.health].token;
            const active = node.id === selectedId;
            return (
              <div key={node.id} className="flex min-w-0 flex-1 items-center gap-[0.1875rem]">
                <button
                  type="button"
                  onClick={() => onSelect(node.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-full min-w-0 flex-1 cursor-pointer flex-col gap-[0.25rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.4375rem] py-[0.5rem] text-left transition-colors",
                    active
                      ? "border-da-brand bg-da-brand-soft"
                      : node.health !== "nominal"
                        ? "border-da-warn/60 bg-da-field hover:bg-da-subtle"
                        : "border-da-border bg-da-field hover:bg-da-subtle",
                  )}
                >
                  <span className="flex items-center gap-[0.25rem]">
                    <span
                      className="size-[0.375rem] shrink-0 rounded-full"
                      style={{ backgroundColor: `var(--color-${token})` }}
                    />
                    <span className="text-3xs font-bold leading-[1.15] text-da-text">{node.name}</span>
                  </span>
                  <span className="text-3xs font-medium uppercase tracking-[0.05em] leading-[1.2] text-da-label">
                    {node.subtitle}
                  </span>

                  <span className="flex flex-1 flex-col justify-end gap-[0.375rem]">
                    {node.metrics.map((m) => (
                      <span key={m.label} className="flex flex-col leading-none">
                        <span className="text-3xs font-medium uppercase tracking-[0.05em] text-da-label">
                          {m.label}
                        </span>
                        <span className={cn("da-nums mt-[0.125rem] text-2xs font-bold", STATE_TONE[m.state])}>
                          {m.value}
                        </span>
                      </span>
                    ))}
                  </span>
                </button>
                {i < section.nodes.length - 1 && (
                  <ChevronRight
                    className="size-[0.625rem] shrink-0 text-da-label"
                    strokeWidth={2.4}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/**
 * INFRASTRUCTURE — the four services the aperture runs on.
 *
 * This screen exists because the other three can report a fault but cannot
 * explain it. The PLL unlock they show on tile B2 slot 6 has its cause here,
 * in the Row-B clock splitter, and the elevated chassis temperature has its
 * cause in that tile's cooling loop. Both are visible in one place only here.
 */
export function InfrastructureScreen() {
  const [selectedId, setSelectedId] = useState<string>("row-b");

  const alarms = siteAlarms();
  const node =
    INFRASTRUCTURE.flatMap((s) => s.nodes).find((n) => n.id === selectedId) ??
    INFRASTRUCTURE[0].nodes[0];
  const owner = INFRASTRUCTURE.find((s) => s.nodes.some((n) => n.id === node.id));

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[4.25rem_minmax(0,1fr)] gap-[0.75rem]">
        {/* Site headline figures */}
        <div className="da-card flex min-h-0 items-center">
          {INFRASTRUCTURE.map((section, i) => {
            const Icon = SECTION_ICON[section.id];
            const faults = section.nodes.filter((n) => n.health !== "nominal").length;
            return (
              <div
                key={section.id}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-between gap-[0.5rem] px-[0.875rem] py-[0.375rem]",
                  i < INFRASTRUCTURE.length - 1 && "border-r-[max(1px,0.0625rem)] border-da-border",
                )}
              >
                <span className="flex min-w-0 flex-col leading-none">
                  <span className="text-3xs font-semibold uppercase tracking-[0.1em] text-da-label">
                    {section.title}
                  </span>
                  <span
                    className={cn(
                      "da-nums mt-[0.3125rem] text-xl font-bold tracking-[-0.02em]",
                      faults ? "text-da-warn-text" : "text-da-text",
                    )}
                  >
                    {section.headline.value}
                  </span>
                  <span className="mt-[0.3125rem] truncate text-3xs font-medium text-da-muted">
                    {section.headline.label}
                    {faults > 0 && ` · ${faults} flagged`}
                  </span>
                </span>
                <span className="flex size-[2rem] shrink-0 items-center justify-center rounded-[0.375rem] bg-da-subtle text-da-muted">
                  <Icon className="size-[1rem]" strokeWidth={2} />
                </span>
              </div>
            );
          })}
        </div>

        {/* The four service chains */}
        <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-[0.75rem]">
          {INFRASTRUCTURE.map((section) => (
            <SectionPanel
              key={section.id}
              section={section}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </div>

      {/* Rail: selected node, then everything the site is flagging */}
      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <Panel
          className="shrink-0"
          title={node.name}
          action={
            <span
              className="shrink-0 rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-${HEALTH[node.health].token}) 14%, transparent)`,
                color: `var(--color-${HEALTH[node.health].token})`,
              }}
            >
              {HEALTH[node.health].label}
            </span>
          }
        >
          <span className="flex flex-col gap-[0.125rem] pb-[0.375rem]">
            <span className="text-3xs font-bold uppercase tracking-[0.1em] text-da-brand">
              {owner?.title}
            </span>
            <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
              {node.subtitle}
            </span>
          </span>

          <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
            {node.metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between gap-[0.5rem] py-[0.375rem]">
                <span className="truncate text-2xs font-medium uppercase tracking-[0.06em] text-da-muted">
                  {m.label}
                </span>
                <span className={cn("da-nums shrink-0 text-2xs font-bold", STATE_TONE[m.state])}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-[0.5rem] text-2xs font-medium leading-[1.45] text-da-muted">
            {node.detail}
          </p>
        </Panel>

        <Panel title="Site Alarms" className="flex-1">
          {alarms.length === 0 ? (
            <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
              <CircleCheck className="size-[0.875rem] shrink-0 text-da-success" strokeWidth={2.2} />
              <span className="text-2xs font-medium text-da-muted">
                All site services nominal.
              </span>
            </div>
          ) : (
            <ul className="flex flex-col gap-[0.5rem]">
              {alarms.map(({ section, node: n }) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(n.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.4375rem] text-left transition-colors",
                      n.id === selectedId
                        ? "border-da-brand bg-da-brand-soft"
                        : "border-da-warn/35 bg-da-warn-soft hover:border-da-warn/60",
                    )}
                  >
                    <TriangleAlert
                      className="mt-[0.0625rem] size-[0.75rem] shrink-0 text-da-warn"
                      strokeWidth={2.2}
                    />
                    <span className="flex min-w-0 flex-col leading-none">
                      <span className="text-2xs font-bold text-da-text">{n.name}</span>
                      <span className="mt-[0.1875rem] text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                        {section}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
