"use client";

import { useEffect } from "react";
import { readSession, signOut } from "@/features/auth";
import { setFormatOptions } from "@/features/data-archival/lib/format";
import { setRuntimeConfig } from "@/lib/runtimeConfig";
import { THEME_EVENT, watchSystemTheme } from "@/lib/theme";
import { applySettings } from "../lib/apply";
import { notify } from "../store/notifyStore";
import { useSettingsStore } from "../store/settingsStore";
import { NotificationHost } from "./NotificationHost";

/**
 * The bridge between the settings store and everything the store cannot reach
 * from inside React: the document's custom properties, the formatter module,
 * the OS theme preference and the session.
 *
 * Mounted once, in the root layout, above every console. It renders only the
 * notification host — the rest of it is effects.
 */
export function SettingsRuntime() {
  /* 1. Rehydrate.

     `persist` was created with `skipHydration`, so this is the moment the
     operator's saved settings enter React — one commit after the tree has
     already matched the server's. The paint was never wrong: the pre-paint
     script in `lib/apply.ts` restored the CSS variables before this ran. */
  useEffect(() => {
    void useSettingsStore.persist.rehydrate();
    useSettingsStore.setState({ hydrated: true });
  }, []);

  /* 2. Paint, and repaint on every change.

     Subscribed imperatively rather than through a selector so this component
     never re-renders for a settings change it only needs to forward to the DOM. */
  useEffect(() => {
    const push = () => {
      const { settings } = useSettingsStore.getState();
      applySettings(settings);
      setFormatOptions({
        timeZone: settings.timeZone,
        hour12: !settings.clock24h,
      });
      // The feature modules read this; none of them imports the settings store.
      setRuntimeConfig({
        tickMs: settings.clockTickMs,
        tableRows: settings.tableRows,
        timeZoneLabel: settings.timeZoneLabel,
        stationName: settings.stationName,
        archiveCap: settings.archiveCap,
        showSectionNav: settings.showSectionNav,
        panelExpand: settings.panelExpand,
        panelOverlaySize: settings.panelOverlaySize,
        panelOverlayBackdrop: settings.panelOverlayBackdrop,
        panelOverlayDismiss: settings.panelOverlayDismiss,
      });
    };

    push();
    const unsubscribe = useSettingsStore.subscribe(push);
    // Half the derived colours depend on which ground they land on, so a theme
    // switch has to recompute them even though no setting moved.
    window.addEventListener(THEME_EVENT, push);
    return () => {
      unsubscribe();
      window.removeEventListener(THEME_EVENT, push);
    };
  }, []);

  /* 3. Follow the OS while no explicit theme is stored. */
  useEffect(() => watchSystemTheme(), []);

  /* 4. Idle session timeout.

     Rearmed by any real interaction. Zero minutes means "never", which is the
     honest way to offer an off switch for a security control — rather than a
     toggle that leaves a stale number in the field beside it. */
  useEffect(() => {
    let timer: number | undefined;

    const arm = () => {
      window.clearTimeout(timer);
      const minutes = useSettingsStore.getState().settings.sessionTimeoutMin;
      if (minutes <= 0) return;
      timer = window.setTimeout(
        () => {
          if (!readSession()) return;
          signOut();
          notify("warning", `Session ended after ${minutes} min idle`);
        },
        minutes * 60_000,
      );
    };

    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    const unsubscribe = useSettingsStore.subscribe(arm);
    arm();

    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
      unsubscribe();
    };
  }, []);

  return <NotificationHost />;
}
