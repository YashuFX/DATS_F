import { Radio, ShieldCheck, Waypoints } from "lucide-react";
import { authConfig } from "../config";

/**
 * The left half of the sign-in screen: a live PPI-style array display.
 *
 * Drawn entirely with elements and gradients — no image, no chart library, no
 * canvas — so it costs one paint, themes itself from the same tokens as the
 * board, and scales with the root font-size like everything else. Three layers:
 * a drifting wash, static range rings with a rotating sweep arm, and rings
 * emitting from the hub on a stagger.
 *
 * All three animations are switched off by the reduced-motion block in
 * `globals.css`, which leaves a still, legible display rather than a blank box.
 */
export function BrandPanel() {
  return (
    // No breakpoint hides this panel, deliberately: the board scales by root
    // font-size rather than switching layouts at pixel widths, and the sign-in
    // screen follows the same rule so the two never disagree about what "large"
    // means.
    <section className="relative isolate flex min-w-0 flex-1 flex-col justify-between overflow-hidden border-r-[max(1px,0.0625rem)] border-da-border bg-da-chrome p-[2.5rem]">
      {/* Wash — two slow-drifting pools of accent, well under the content. */}
      <span
        aria-hidden
        className="da-drift pointer-events-none absolute -left-[8rem] -top-[10rem] -z-10 size-[40rem] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-da-brand) 22%, transparent), transparent 68%)",
        }}
      />
      <span
        aria-hidden
        className="da-drift pointer-events-none absolute -bottom-[14rem] -right-[6rem] -z-10 size-[34rem] rounded-full opacity-60"
        style={{
          animationDelay: "-11s",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-da-c3) 20%, transparent), transparent 70%)",
        }}
      />

      {/* Wordmark */}
      <header className="da-rise flex items-center gap-[0.625rem]">
        <span className="flex size-[2.25rem] items-center justify-center rounded-[0.375rem] bg-da-brand text-da-on-brand shadow-da-brand-lg">
          <Waypoints className="size-[1.1875rem]" strokeWidth={2} />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-lg font-bold tracking-[-0.01em] text-da-text">
            {authConfig.brand.title}
          </span>
          <span className="mt-[0.25rem] text-2xs font-medium uppercase tracking-[0.1em] text-da-muted">
            {authConfig.brand.tagline}
          </span>
        </span>
      </header>

      {/* Array display */}
      <div className="relative mx-auto flex aspect-square w-full max-w-[24rem] items-center justify-center">
        {/* Range rings */}
        {[100, 74, 48].map((size) => (
          <span
            key={size}
            aria-hidden
            className="absolute rounded-full border-[max(1px,0.0625rem)] border-da-border"
            style={{ width: `${size}%`, height: `${size}%` }}
          />
        ))}

        {/* Cross hairs */}
        <span aria-hidden className="absolute h-full w-[max(1px,0.0625rem)] bg-da-border/70" />
        <span aria-hidden className="absolute h-[max(1px,0.0625rem)] w-full bg-da-border/70" />

        {/* Sweep arm — a conic wedge rotating behind everything else. */}
        <span
          aria-hidden
          className="da-sweep absolute size-full rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 288deg, color-mix(in srgb, var(--color-da-brand) 4%, transparent) 320deg, color-mix(in srgb, var(--color-da-brand) 30%, transparent) 358deg, transparent 360deg)",
          }}
        />

        {/* Emitted rings, one every 1.5s. */}
        {[0, 1.5, 3].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="da-emit absolute size-full rounded-full border-[max(1px,0.0625rem)] border-da-brand"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}

        {/* Hub */}
        <span className="relative flex size-[3.5rem] items-center justify-center rounded-full border-[max(1px,0.0625rem)] border-da-border bg-da-surface text-da-brand shadow-da-card">
          <Radio className="size-[1.5rem]" strokeWidth={1.8} />
        </span>

        {/* Tile returns, placed off the centre at fixed bearings. */}
        {[
          { top: "22%", left: "31%", delay: "0s" },
          { top: "63%", left: "24%", delay: "0.9s" },
          { top: "34%", left: "72%", delay: "1.7s" },
          { top: "71%", left: "66%", delay: "2.4s" },
        ].map((tile) => (
          <span
            key={`${tile.top}-${tile.left}`}
            aria-hidden
            className="absolute size-[0.4375rem] rounded-[0.0625rem] bg-da-brand"
            style={{ top: tile.top, left: tile.left, animationDelay: tile.delay }}
          />
        ))}
      </div>

      {/* Blurb */}
      <footer className="da-rise flex flex-col gap-[0.75rem]" style={{ animationDelay: "0.1s" }}>
        <p className="max-w-[26rem] text-md font-medium leading-[1.6] text-da-text">
          {authConfig.brand.blurb}
        </p>
        <span className="flex items-center gap-[0.375rem] text-2xs font-semibold uppercase tracking-[0.08em] text-da-muted">
          <ShieldCheck className="size-[0.875rem] text-da-success" strokeWidth={2.2} />
          Credentials are hashed before they are stored
        </span>
      </footer>
    </section>
  );
}
