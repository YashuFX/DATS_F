"use client";

import Link from "next/link";
import { ExternalLink, Maximize2, Minimize2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/features/data-archival/lib/cn";
import { useRuntimeConfig } from "@/lib/runtimeConfig";

/**
 * Shared chrome for every M&C panel: a title rail, optional right-hand
 * controls, and an expand affordance.
 *
 * WHAT EXPAND DOES is the operator's call, from Settings → Console → Panels,
 * because the two useful answers are genuinely different jobs:
 *
 *   "Expand in place" (default) lifts the panel over the board at the coverage
 *   they picked — the board stays behind it, the other panels keep running,
 *   and closing puts them back where they were. This is the one you want when
 *   you are watching one thing closely for a minute and then going back.
 *
 *   "Open full page" navigates to the section's own screen, which is where the
 *   full instrument lives, with its own controls and its own history entry.
 *
 * Expanding in place moves the SAME `<section>` rather than rendering a second
 * copy inside a dialog. That is not a micro-optimisation: this panel is the
 * host for a live Cesium viewer and a running orbit propagator, and rendering
 * a modal copy would either stand up a second globe or unmount and re-init the
 * first one — a loading spinner every time an operator opened it. Going
 * `position: fixed` in place leaves the React subtree, the WebGL context and
 * the sim clock exactly where they were; only the box changes size. The
 * geometry itself is in `globals.css` under `.da-panel-expanded`.
 *
 * `expandHref` stays a real route either way. In overlay mode it moves into
 * the expanded header as "Open full page", so the section's own screen is
 * never more than one click away and middle-click still opens a tab.
 */
export function Panel({
  title,
  expandHref,
  expandLabel,
  controls,
  footer,
  bodyClassName,
  className,
  children,
}: {
  title: string;
  /** Where the expand control goes in page mode, and what the expanded header
   *  links out to in overlay mode. Omitted = no expand affordance. */
  expandHref?: string;
  expandLabel?: string;
  /** Rendered at the right of the title rail, before the expand control. */
  controls?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const {
    panelExpand,
    panelOverlaySize,
    panelOverlayBackdrop,
    panelOverlayDismiss,
  } = useRuntimeConfig();

  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const asOverlay = panelExpand === "overlay";

  /* Derived, not synchronised. Switching the preference to "Open full page"
     while a panel is open has to put that panel back on the board, and reading
     the two together does it in the same render rather than a beat later —
     which is also the only reading that has no state to leave stale. */
  const isExpanded = expanded && asOverlay;

  const close = useCallback(() => setExpanded(false), []);

  /* Escape, and a focus loop.
   *
   * `keydown` is captured at the document rather than bound to the section so
   * the key still works when focus has wandered into a child that swallows it
   * — the globe canvas takes keyboard input of its own. */
  useEffect(() => {
    if (!isExpanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      // A dialog that lets Tab walk out into the board behind it is a dialog
      // in appearance only. Cheaper than a library, and this tree is small.
      const root = sectionRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!root.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isExpanded, close]);

  /* What the transition itself has to do — and nothing on mount, which is why
     the guard is here at all: five panels each grabbing focus and shouting
     `resize` at a board that has only just finished its first layout is noise
     with nothing to correct. The effect re-runs only when `isExpanded` moves,
     so past the first run "closed" always means "just closed". */
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }

    // Focus into the panel on open, back to the control that opened it on close.
    if (isExpanded) closeRef.current?.focus();
    else openerRef.current?.focus({ preventScroll: true });

    /* Then tell the contents their box moved. Anything sized by a
       ResizeObserver (the dome canvas, the auto-paged tables) already knows.
       Cesium does not — it binds `resize` on the window and nothing else — so
       the globe would keep drawing at the small panel's dimensions and
       letterbox inside the large one until the operator happened to resize the
       browser. One synthetic event covers both. */
    const frame = window.requestAnimationFrame(() =>
      window.dispatchEvent(new Event("resize")),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [isExpanded]);

  const showExpand = Boolean(expandHref);
  const openLabel = asOverlay
    ? `Expand ${title}`
    : (expandLabel ?? `Open ${title}`);

  return (
    <>
      {/* The panel leaves the grid when it goes fixed. Without something to
          hold the cell, the board behind the backdrop reshuffles on open and
          again on close — visible at the moment the panel shrinks back into a
          slot that has moved. */}
      {isExpanded && (
        <div
          aria-hidden
          className={cn(
            "flex min-h-0 min-w-0 items-center justify-center rounded-[var(--radius-da)] border-[max(1px,0.0625rem)] border-dashed border-da-border bg-da-subtle/50",
            className,
          )}
        >
          <span className="text-3xs font-bold uppercase tracking-[0.09em] text-da-label">
            Expanded
          </span>
        </div>
      )}

      <section
        ref={sectionRef}
        role={isExpanded ? "dialog" : undefined}
        aria-modal={isExpanded || undefined}
        aria-label={isExpanded ? title : undefined}
        className={cn(
          "da-card flex min-h-0 min-w-0 flex-col overflow-hidden",
          isExpanded ? "da-panel-expanded" : className,
        )}
        style={
          isExpanded
            ? /* A string, not the number: the rule multiplies this by 1vw, and
                 a renderer that helpfully appended "px" would make the whole
                 declaration invalid and silently drop the panel back to full
                 width. */
              ({ "--da-panel-expand": String(panelOverlaySize) } as CSSProperties)
            : undefined
        }
      >
        <header className="flex h-[2.25rem] shrink-0 items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
          <h2 className="truncate text-2xs font-bold uppercase tracking-[0.09em] text-da-text">
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-[0.375rem]">
            {controls}

            {/* Expanded, the route the expand control used to take becomes an
                explicit way out to the full instrument — same destination,
                same <Link>, now beside the panel rather than instead of it. */}
            {isExpanded && expandHref && (
              <Link
                href={expandHref}
                aria-label={expandLabel ?? `Open ${title}`}
                title={expandLabel ?? `Open ${title}`}
                className="hidden h-[1.375rem] items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted transition-colors hover:border-da-brand hover:text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)] sm:inline-flex"
              >
                <ExternalLink className="size-[0.6875rem]" strokeWidth={2.3} />
                Full page
              </Link>
            )}

            {showExpand &&
              (asOverlay ? (
                isExpanded ? (
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label={`Close ${title}`}
                    title="Close — Esc"
                    className="flex size-[1.375rem] cursor-pointer items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
                  >
                    <X className="size-[0.875rem]" strokeWidth={2.4} />
                  </button>
                ) : (
                  <button
                    ref={openerRef}
                    type="button"
                    onClick={() => setExpanded(true)}
                    aria-label={openLabel}
                    aria-haspopup="dialog"
                    aria-expanded={false}
                    title={openLabel}
                    className="flex size-[1.375rem] cursor-pointer items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
                  >
                    <Maximize2 className="size-[0.8125rem]" strokeWidth={2.2} />
                  </button>
                )
              ) : (
                <Link
                  href={expandHref!}
                  aria-label={openLabel}
                  title={openLabel}
                  className="flex size-[1.375rem] items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
                >
                  <Maximize2 className="size-[0.8125rem]" strokeWidth={2.2} />
                </Link>
              ))}
          </div>
        </header>

        <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t-[max(1px,0.0625rem)] border-da-border px-[0.75rem] py-[0.5rem]">
            {footer}
          </div>
        )}

        {/* A second, unambiguous way out, on the panel's own bottom rail.
            The rail's icon is the one an operator finds by muscle memory; this
            is the one they find by reading. Only while expanded. */}
        {isExpanded && (
          <div className="flex h-[2.5rem] shrink-0 items-center justify-between gap-[0.75rem] border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.75rem]">
            <span className="truncate text-3xs font-medium text-da-muted">
              Press{" "}
              <kbd className="da-nums rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.25rem] py-[0.0625rem] font-bold text-da-text">
                Esc
              </kbd>{" "}
              {panelOverlayDismiss ? "or click outside " : ""}to return to the
              board.
            </span>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-[1.75rem] shrink-0 cursor-pointer items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.75rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted transition-colors hover:border-da-brand hover:text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
            >
              <Minimize2 className="size-[0.6875rem]" strokeWidth={2.5} />
              Close
            </button>
          </div>
        )}
      </section>

      {/* Portalled to the body so the dim sits over the whole console —
          rendered here it would land inside the board's scroll container and
          stop at the header. */}
      {isExpanded &&
        createPortal(
          <div
            aria-hidden
            onClick={panelOverlayDismiss ? close : undefined}
            className={cn(
              "da-panel-backdrop fixed inset-0 z-50",
              panelOverlayBackdrop === "blur" &&
                "bg-black/55 backdrop-blur-[0.125rem]",
              panelOverlayBackdrop === "dim" && "bg-black/55",
              panelOverlayBackdrop === "clear" && "bg-transparent",
              panelOverlayDismiss && "cursor-zoom-out",
            )}
          />,
          document.body,
        )}
    </>
  );
}
