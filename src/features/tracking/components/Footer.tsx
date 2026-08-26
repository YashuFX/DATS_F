'use client';

import React from 'react';
import { Database, FileText, Download, Maximize2, Cpu } from 'lucide-react';

// Subcomponent to render Cellular signal style bars for metrics
function SignalBars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-end gap-0.5 h-3 shrink-0">
      {Array.from({ length: max }).map((_, idx) => {
        const barHeight = ((idx + 1) / max) * 100; // escalates height
        const active = idx < value;
        return (
          <div
            key={idx}
            className={`w-0.5 rounded-da-sm transition-colors duration-300`}
            style={{
              height: `${barHeight}%`,
              backgroundColor: active ? 'var(--color-da-success)' : 'currentColor',
              opacity: active ? 1 : 0.2,
            }}
          />
        );
      })}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-da-surface border-t-[max(1px,0.0625rem)] border-da-border px-6 py-2 flex items-center justify-between gap-4 transition-colors duration-200 shrink-0 select-none text-[0.625rem] font-bold text-da-muted">
      {/* Left side metrics */}
      <div className="flex flex-wrap items-center gap-6 justify-start">
        {/* Data Link */}
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-da-success" />
          <div className="flex items-center gap-1.5">
            <span className="text-da-label uppercase">Data Link</span>
            <span className="text-da-text uppercase font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-da-success animate-pulse" />
              Connected
            </span>
          </div>
        </div>

        {/* Telemetry */}
        <div className="flex items-center gap-2 px-4 border-l-[max(1px,0.0625rem)] border-da-border/60 h-5">
          <span className="text-da-label uppercase">Telemetry</span>
          <div className="flex items-center gap-2">
            <span className="text-da-text da-nums font-bold">12.4 Mbps</span>
            <SignalBars value={3} />
          </div>
        </div>

        {/* CPU */}
        {/* <div className="flex items-center gap-2 px-4 border-l-[max(1px,0.0625rem)] border-da-border/60 h-5">
          <span className="text-da-label uppercase">CPU</span>
          <div className="flex items-center gap-2">
            <span className="text-da-text da-nums font-bold">42%</span>
            <SignalBars value={2} />
          </div>
        </div> */}

        {/* GPU */}
        {/* <div className="flex items-center gap-2 px-4 border-l-[max(1px,0.0625rem)] border-da-border/60 h-5">
          <span className="text-da-label uppercase">GPU</span>
          <div className="flex items-center gap-2">
            <span className="text-da-text da-nums font-bold">35%</span>
            <SignalBars value={2} />
          </div>
        </div> */}

        {/* Memory */}
        {/* <div className="flex items-center gap-2 px-4 border-l-[max(1px,0.0625rem)] border-da-border/60 h-5">
          <span className="text-da-label uppercase">Memory</span>
          <div className="flex items-center gap-2">
            <span className="text-da-text da-nums font-bold">62%</span>
            <SignalBars value={3} />
          </div>
        </div> */}

        {/* Data Rate */}
        {/* <div className="flex items-center gap-2 px-4 border-l-[max(1px,0.0625rem)] border-da-border/60 h-5">
          <span className="text-da-label uppercase">Data Rate</span>
          <div className="flex items-center gap-2">
            <span className="text-da-text da-nums font-bold">1.24 Gbps</span>
            <SignalBars value={4} />
          </div>
        </div> */}
      </div>

      {/* Right side buttons */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1 bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da hover:text-da-text hover:bg-da-border/50 transition-all cursor-pointer">
          <FileText className="h-3 w-3" />
          <span>Logs</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1 bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da hover:text-da-text hover:bg-da-border/50 transition-all cursor-pointer">
          <Download className="h-3 w-3" />
          <span>Export Data</span>
        </button>

        <button className="p-1 hover:text-da-text transition-colors cursor-pointer" title="Expand View">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </footer>
  );
}
