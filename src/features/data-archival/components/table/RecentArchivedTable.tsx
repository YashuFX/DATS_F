"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { DATA_TYPE_MAP } from "../../config";
import { DATA_TYPE_ICON } from "../../lib/icons";
import { formatBytes, formatClock } from "../../lib/format";
import type { ArchiveRecord } from "../../types";
import { Button } from "../ui/Button";
import { PriorityBadge } from "../ui/Badge";
import { Card, CardHeader } from "../ui/Card";
import { useArchivalStore } from "../../store/useArchivalStore";

const COLS = [
  { key: "time", label: "Time (IST)", width: "7.5rem" },
  { key: "type", label: "Data Type", width: "8.75rem" },
  { key: "source", label: "Source", width: "5.5rem" },
  { key: "mission", label: "Mission / Task", width: "6.5rem" },
  { key: "file", label: "File / Record Name", width: "auto" },
  { key: "size", label: "Size", width: "4.25rem" },
  { key: "priority", label: "Priority", width: "4.5rem" },
  { key: "status", label: "Status", width: "5rem" },
] as const;

function Row({ record }: { record: ArchiveRecord }) {
  const meta = DATA_TYPE_MAP[record.dataType] ?? {
    label: record.dataType,
    color: "da-c1",
  };
  const Icon = DATA_TYPE_ICON[record.dataType] ?? CircleCheck;

  return (
    <tr className="h-[2.125rem] border-b-[max(1px,0.0625rem)] border-da-border/70 transition-colors last:border-b-0 hover:bg-da-subtle">
      <td className="da-nums px-[0.75rem] text-2xs font-medium text-da-muted">
        {formatClock(record.timestamp)}
      </td>
      <td className="px-[0.75rem]">
        <span className="flex items-center gap-[0.375rem]">
          <span
            className="flex size-[1.125rem] shrink-0 items-center justify-center rounded-[0.1875rem]"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-${meta.color}) 14%, transparent)`,
              color: `var(--color-${meta.color})`,
            }}
          >
            <Icon className="size-[0.6875rem]" strokeWidth={2.2} />
          </span>
          <span className="truncate text-2xs font-medium text-da-text">{meta.label}</span>
        </span>
      </td>
      <td className="px-[0.75rem] text-2xs font-medium text-da-muted">{record.source}</td>
      <td className="da-nums px-[0.75rem] text-2xs font-semibold text-da-text">
        {record.mission}
      </td>
      <td className="max-w-0 px-[0.75rem]">
        <span className="block truncate text-2xs font-medium text-da-muted">
          {record.fileName}
        </span>
      </td>
      <td className="da-nums px-[0.75rem] text-2xs font-semibold text-da-text">
        {formatBytes(record.sizeBytes)}
      </td>
      <td className="px-[0.75rem]">
        <PriorityBadge priority={record.priority} />
      </td>
      <td className="px-[0.75rem]">
        <span className="inline-flex items-center gap-[0.25rem] text-2xs font-semibold text-da-success">
          <CircleCheck className="size-[0.75rem]" strokeWidth={2.2} />
          Archived
        </span>
      </td>
    </tr>
  );
}

export function RecentArchivedTable() {
  const records = useArchivalStore((s) => s.records);
  return (
    <Card className="min-h-0 flex-1">
      <CardHeader
        title="Recent Archived Data"
        action={
          <Link href="/data-archival/logs">
            <Button size="sm">View All Archives</Button>
          </Link>
        }
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            {COLS.map((c) => (
              <col key={c.key} style={c.width === "auto" ? undefined : { width: c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="h-[1.875rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="px-[0.75rem] text-left text-3xs font-semibold uppercase tracking-[0.07em] text-da-label"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <Row key={r.id} record={r} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
