import { MC_HEALTH_META, type McHealth } from "../types";

/**
 * Status word rendered in its own health colour.
 *
 * Text, not a pill: these appear once per row in dense tables where a filled
 * chip on every line would out-shout the values it sits beside. "Nominal" is
 * accepted alongside the four health states because the parameter panel grades
 * settings (in band / out of band) rather than health.
 */
export function StatusText({ status }: { status: McHealth | "nominal" }) {
  const token = status === "nominal" ? "da-success" : MC_HEALTH_META[status].token;
  const label = status === "nominal" ? "Nominal" : MC_HEALTH_META[status].label;
  return (
    <span className="text-2xs font-semibold" style={{ color: `var(--color-${token})` }}>
      {label}
    </span>
  );
}
