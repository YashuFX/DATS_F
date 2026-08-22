/**
 * Capacity ring for STORAGE UTILIZATION.
 *
 * Geometry is traced from the approved design rather than guessed. Measured off
 * the reference at its native scale: outer radius 37.5px, value arc 5px, track
 * 4px — so the ring is thin with a large open centre, and the value arc is
 * deliberately a touch thicker than the track it sits on. Expressed here as
 * ratios of the 100-unit viewBox radius (5/35 and 4/35) so it holds at any size.
 */
export function RadialGauge({
  /** 0..100 */
  value,
  className,
  color = "da-gauge",
  trackColor = "da-border",
}: {
  value: number;
  className?: string;
  color?: string;
  trackColor?: string;
}) {
  // Design ratios are arc 5/35 and track 4/35 of the radius. Drawn at r=40 so
  // the ring fills ~86% of the viewBox and the element wastes no layout width.
  const radius = 40;
  const arcWidth = radius * (5 / 35);
  const trackWidth = radius * (4 / 35);
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const dash = (clamped / 100) * circumference;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`Storage utilisation ${clamped.toFixed(1)} percent`}
    >
      {/* rotate so the arc begins at 12 o'clock and sweeps clockwise */}
      <g transform="rotate(-90 50 50)">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={`var(--color-${trackColor})`}
          strokeWidth={trackWidth}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={`var(--color-${color})`}
          strokeWidth={arcWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: "stroke-dasharray 900ms ease-out" }}
        />
      </g>
    </svg>
  );
}
