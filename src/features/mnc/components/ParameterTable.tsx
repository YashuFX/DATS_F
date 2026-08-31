import { StatusText } from "./StatusText";
import type { ParameterRow } from "../types";

/**
 * The dense parameter readout shared by Health Preview and Parameter Panel.
 *
 * One component, two column sets: the two panels differ only in whether a
 * limit is expressed as a single threshold ("< 60") or an explicit band
 * (min/max). Splitting them into two components would duplicate the row
 * rendering, the zebra rule and the number alignment for one column's
 * difference.
 *
 * `da-nums` on the numeric cells locks digit width so a value ticking in place
 * never nudges the column beside it.
 */
export function ParameterTable({
  rows,
  variant,
}: {
  rows: ParameterRow[];
  /** "threshold" = single limit column. "band" = Min + Max columns. */
  variant: "threshold" | "band";
}) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b-[max(1px,0.0625rem)] border-da-border">
          <th className="px-[0.75rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Parameter</th>
          <th className="px-[0.375rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Value</th>
          <th className="px-[0.375rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Unit</th>
          {variant === "band" ? (
            <>
              <th className="px-[0.375rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Min</th>
              <th className="px-[0.375rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Max</th>
              <th className="px-[0.75rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Status</th>
            </>
          ) : (
            <>
              <th className="px-[0.375rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Status</th>
              <th className="px-[0.75rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">Threshold</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.parameter} className="border-b-[max(1px,0.0625rem)] border-da-border/50 last:border-b-0">
            <td className="px-[0.75rem] py-[0.4375rem] text-2xs font-medium text-da-text">{row.parameter}</td>
            <td className="da-nums px-[0.375rem] py-[0.4375rem] text-2xs font-semibold text-da-text">{row.value}</td>
            <td className="px-[0.375rem] py-[0.4375rem] text-2xs text-da-muted">{row.unit}</td>
            {variant === "band" ? (
              <>
                <td className="da-nums px-[0.375rem] py-[0.4375rem] text-2xs text-da-muted">{row.min ?? "-"}</td>
                <td className="da-nums px-[0.375rem] py-[0.4375rem] text-2xs text-da-muted">{row.max ?? "-"}</td>
                <td className="px-[0.75rem] py-[0.4375rem]"><StatusText status={row.status} /></td>
              </>
            ) : (
              <>
                <td className="px-[0.375rem] py-[0.4375rem]"><StatusText status={row.status} /></td>
                <td className="da-nums px-[0.75rem] py-[0.4375rem] text-2xs text-da-muted">{row.threshold ?? "-"}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
