"use client";

import { Activity, Cable, Globe, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { notify } from "../../store/notifyStore";
import { useSettingsStore } from "../../store/settingsStore";
import {
  Btn,
  Field,
  Note,
  NumberInput,
  Panel,
  PanelGrid,
  Slider,
  TabHeader,
  TextInput,
} from "../ui";

/**
 * Endpoints, and a test that actually goes out on the wire.
 *
 * The test is the point. A settings screen that stores a URL and never touches
 * it teaches an operator that a typo here is invisible until something else
 * fails at 03:00 — so both fields get a probe that honours the timeout and the
 * retry count sitting next to them, and reports what really came back.
 *
 * The HTTP probe is sent `no-cors`, which is the honest limit of what a browser
 * can tell you about a foreign origin: the response is opaque, so a completed
 * request proves the host answered, and nothing more. That distinction is in
 * the result text rather than glossed over.
 */

type Result =
  | { state: "idle" }
  | { state: "busy"; label: string }
  | { state: "ok"; label: string; rtt: number }
  | { state: "fail"; label: string };

function ResultLine({ result }: { result: Result }) {
  if (result.state === "idle") return null;
  return (
    <span
      className={cn(
        "flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.375rem] text-3xs font-bold uppercase tracking-[0.08em]",
        result.state === "ok" && "border-da-success bg-da-success-soft text-da-success",
        result.state === "fail" && "border-da-danger bg-da-danger-soft text-da-danger",
        result.state === "busy" && "border-da-warn bg-da-warn-soft text-da-warn-text",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{result.label}</span>
      {result.state === "ok" && (
        <span className="da-nums shrink-0 font-mono">{result.rtt} ms</span>
      )}
    </span>
  );
}

export function NetworkTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  const [http, setHttp] = useState<Result>({ state: "idle" });
  const [ws, setWs] = useState<Result>({ state: "idle" });

  /* Probes outlive a click but must not outlive the screen. */
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  async function testHttp() {
    setHttp({ state: "busy", label: "Contacting endpoint…" });
    const attempts = Math.max(1, settings.retryAttempts + 1);

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = window.setTimeout(
        () => controller.abort(),
        settings.requestTimeoutMs,
      );
      const started = performance.now();
      try {
        await fetch(settings.apiBaseUrl, {
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });
        window.clearTimeout(timer);
        if (!live.current) return;
        const rtt = Math.round(performance.now() - started);
        setHttp({ state: "ok", label: "Host answered (opaque response)", rtt });
        notify("success", `Endpoint reachable — ${rtt} ms`);
        return;
      } catch {
        window.clearTimeout(timer);
        if (!live.current) return;
        if (attempt < attempts) {
          setHttp({
            state: "busy",
            label: `No answer — retry ${attempt} of ${settings.retryAttempts}`,
          });
        }
      }
    }

    if (!live.current) return;
    setHttp({
      state: "fail",
      label: `Unreachable after ${attempts} attempt${attempts > 1 ? "s" : ""}`,
    });
    notify("error", `Endpoint unreachable — ${settings.apiBaseUrl}`);
  }

  function testWs() {
    setWs({ state: "busy", label: "Opening socket…" });
    const started = performance.now();
    let socket: WebSocket;
    try {
      socket = new WebSocket(settings.wsUrl);
    } catch {
      setWs({ state: "fail", label: "Not a valid WebSocket URL" });
      return;
    }

    const timer = window.setTimeout(() => {
      socket.close();
      if (live.current) {
        setWs({ state: "fail", label: "Timed out before the socket opened" });
        notify("error", `Stream did not open — ${settings.wsUrl}`);
      }
    }, settings.requestTimeoutMs);

    socket.onopen = () => {
      window.clearTimeout(timer);
      const rtt = Math.round(performance.now() - started);
      socket.close();
      if (!live.current) return;
      setWs({ state: "ok", label: "Socket opened and closed cleanly", rtt });
      notify("success", `Stream reachable — ${rtt} ms`);
    };

    socket.onerror = () => {
      window.clearTimeout(timer);
      if (!live.current) return;
      setWs({ state: "fail", label: "Socket refused the connection" });
    };
  }

  return (
    <>
      <TabHeader
        title="Network"
        description="Where this console looks for the ground segment, and how patient it is when the segment does not answer."
      />

      <PanelGrid>
        <Panel
          title="Endpoints"
          icon={Globe}
          description="Both are probed by the buttons below, using the timeout and retries on the right."
        >
          <Field label="API base URL" hint="Records, tasks, alerts and export jobs.">
            <TextInput
              mono
              value={settings.apiBaseUrl}
              onChange={(e) => update({ apiBaseUrl: e.target.value })}
              placeholder="http://host:port/api"
            />
          </Field>
          <span className="flex items-center gap-[0.5rem]">
            <Btn icon={Cable} onClick={testHttp} disabled={http.state === "busy"}>
              Test endpoint
            </Btn>
            <span className="min-w-0 flex-1">
              <ResultLine result={http} />
            </span>
          </span>

          <Field
            label="Stream URL"
            hint="Live telemetry and alert push. Opened, verified and closed by the test."
          >
            <TextInput
              mono
              value={settings.wsUrl}
              onChange={(e) => update({ wsUrl: e.target.value })}
              placeholder="ws://host:port/stream"
            />
          </Field>
          <span className="flex items-center gap-[0.5rem]">
            <Btn icon={Radio} onClick={testWs} disabled={ws.state === "busy"}>
              Test stream
            </Btn>
            <span className="min-w-0 flex-1">
              <ResultLine result={ws} />
            </span>
          </span>

          <Note>
            A browser cannot read a cross-origin response body without CORS, so a
            pass here means the host answered — not that it answered correctly.
          </Note>
        </Panel>

        <Panel
          title="Timing"
          icon={Activity}
          description="Applied by the probes above and by anything else that talks to the segment."
        >
          <Field
            label="Request timeout"
            hint="How long a single attempt waits before it is abandoned."
          >
            <Slider
              value={settings.requestTimeoutMs}
              onValue={(v) => update({ requestTimeoutMs: v })}
              min={500}
              max={30000}
              step={500}
              format={(v) => `${(v / 1000).toFixed(1)} s`}
            />
          </Field>

          <Field
            label="Retries"
            hint="Extra attempts after the first failure. Zero fails fast."
          >
            <Slider
              value={settings.retryAttempts}
              onValue={(v) => update({ retryAttempts: v })}
              min={0}
              max={5}
              step={1}
              format={(v) => `${v}`}
            />
          </Field>

          <Field
            label="Poll interval"
            hint="How often a screen without a live socket re-asks for its data."
          >
            <NumberInput
              value={settings.pollIntervalSec}
              onValue={(v) => update({ pollIntervalSec: v })}
              min={1}
              max={300}
              suffix="sec"
            />
          </Field>

          <Note>
            Worst case before a screen gives up:{" "}
            {(
              ((settings.retryAttempts + 1) * settings.requestTimeoutMs) /
              1000
            ).toFixed(1)}{" "}
            s.
          </Note>
        </Panel>
      </PanelGrid>
    </>
  );
}
