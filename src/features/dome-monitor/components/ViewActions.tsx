"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Camera, Check, Link2, X } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { useDomeStore } from "../store/domeStore";

/**
 * ViewActions — the round control rail beside the orbit globe.
 *
 * The globe is the continuous control (grab and turn); this is the discrete
 * one (press and something happens). Together they read as one instrument
 * cluster on the viewport's left edge, which is the only edge the detail
 * panel never covers.
 *
 * WHAT IS AND IS NOT HERE. Every action on this rail acts on THIS VIEWPORT
 * and fills a gap that nothing else on the screen fills:
 *
 *   - HOLD FEED   the telemetry link ticks every 4 s with no way to stop it,
 *                 so reading a face's flagged-element list means reading
 *                 numbers that move underneath you.
 *   - SNAPSHOT    there is no way to get the dome out of the app and into a
 *                 handover note or an incident report.
 *   - COPY LINK   selection already lives in `?face=&element=`
 *                 (useSelectionUrlSync) precisely so it can be handed to the
 *                 next shift — but nothing surfaces that.
 *
 * Deliberately NOT here: anything that only navigates elsewhere. Settings,
 * Scheduler and the rest are one press away in the global section nav (the
 * compass at the viewport's bottom edge), and the fastest way to make a HUD
 * unreadable is to mirror the app's navigation inside it. A control rail on
 * an instrument earns its place by doing things to the instrument.
 */

/** How long a press keeps showing its confirmation tick. */
const CONFIRM_MS = 1400;

function RoundButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  /** Latched-on look — used for the held feed, which must stay visible. */
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex size-[1.875rem] cursor-pointer items-center justify-center rounded-full",
        "border-[max(1px,0.0625rem)] transition-colors",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-[color:var(--color-da-brand)]",
        active
          ? // A held feed means the dome is showing stale data. That has to
            // be loud, not a subtly depressed button — same warn token the
            // degraded state uses everywhere else.
            "border-da-warn/60 bg-da-warn-soft text-da-warn-text"
          : "border-da-border bg-da-field text-da-muted hover:bg-da-subtle hover:text-da-text",
      )}
    >
      {children}
    </button>
  );
}

export function ViewActions() {
  const feedPaused = useDomeStore((s) => s.feedPaused);
  const setFeedPaused = useDomeStore((s) => s.setFeedPaused);
  const requestSnapshot = useDomeStore((s) => s.requestSnapshot);

  const [confirmed, setConfirmed] = useState<"snapshot" | "link" | "failed" | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // A press that lands while a previous confirmation is still showing must
  // restart the clock, not leave a stale tick behind when the first expires.
  const confirm = useCallback((which: "snapshot" | "link" | "failed") => {
    setConfirmed(which);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setConfirmed(null), CONFIRM_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onSnapshot = useCallback(() => {
    requestSnapshot();
    confirm("snapshot");
  }, [requestSnapshot, confirm]);

  /**
   * Last-resort copy for when the async Clipboard API is unavailable.
   *
   * `navigator.clipboard` needs a secure context and a permission that can be
   * refused outright; `execCommand` is deprecated but needs neither, so it
   * still covers the http:// deployments this console gets installed on.
   */
  const copyByExecCommand = useCallback((text: string) => {
    const field = document.createElement("textarea");
    field.value = text;
    // Off-screen rather than hidden: an element with no layout cannot be
    // selected, and `execCommand("copy")` copies the selection.
    field.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(field);
    field.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      field.remove();
    }
  }, []);

  const onCopyLink = useCallback(async () => {
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      confirm("link");
      return;
    } catch {
      // fall through
    }
    // Never a `window.prompt` here. It is a modal that blocks the whole
    // renderer until dismissed — on a wall-mounted ops console that is a
    // frozen dome and an operator hunting for a dialog, which is a far worse
    // outcome than a copy that quietly did not happen.
    confirm(copyByExecCommand(link) ? "link" : "failed");
  }, [confirm, copyByExecCommand]);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-[0.375rem] rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 px-[0.375rem] py-[0.5rem] shadow-da-card backdrop-blur-[0.5rem]">
      <RoundButton
        label={feedPaused ? "Resume live telemetry" : "Hold live telemetry"}
        onClick={() => setFeedPaused(!feedPaused)}
        active={feedPaused}
      >
        {feedPaused ? (
          <Play className="size-[0.8125rem]" strokeWidth={2.4} fill="currentColor" />
        ) : (
          <Pause className="size-[0.8125rem]" strokeWidth={2.4} />
        )}
      </RoundButton>

      <RoundButton label="Save a PNG of this view" onClick={onSnapshot}>
        {confirmed === "snapshot" ? (
          <Check className="size-[0.875rem] text-da-brand" strokeWidth={2.6} />
        ) : (
          <Camera className="size-[0.875rem]" strokeWidth={2.2} />
        )}
      </RoundButton>

      <RoundButton
        label={confirmed === "failed" ? "Copying failed — copy the address bar instead" : "Copy a link to this view"}
        onClick={onCopyLink}
      >
        {confirmed === "link" ? (
          <Check className="size-[0.875rem] text-da-brand" strokeWidth={2.6} />
        ) : confirmed === "failed" ? (
          <X className="size-[0.875rem] text-da-danger" strokeWidth={2.6} />
        ) : (
          <Link2 className="size-[0.875rem]" strokeWidth={2.2} />
        )}
      </RoundButton>
    </div>
  );
}
