/**
 * The minimum a slice must provide. `DistributionSlice` satisfies it, and so
 * does any ad-hoc breakdown a tab wants to ring — queue mix, output formats.
 */
export interface DonutSlice {
  id: string;
  percent: number;
  /** Token name without the `--color-` prefix. */
  color: string;
}

/**
 * Segmented ring drawn with stroke-dasharray on a single circle per slice.
 *
 * The design's legend percentages sum to 88%, so arc lengths are normalised to
 * the actual total — the ring closes cleanly while the printed percentages stay
 * verbatim from the design. See the note in `data/seed.ts`.
 */
export function DonutChart({
  slices,
  className,
  thickness = 15,
  label = "Data distribution by type",
}: {
  slices: DonutSlice[];
  className?: string;
  thickness?: number;
  label?: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + s.percent, 0) || 1;

  // A hairline gap between segments, scaled with the ring.
  const gap = 0.6;

  const arcLength = (percent: number) => (percent / total) * circumference;

  // Each arc starts where the previous one ended. Derived per slice rather than
  // accumulated into a closure variable: mutation during render is what the
  // compiler's immutability rule forbids. The ring has at most a handful of
  // slices, so the repeated prefix sum costs nothing.
  const arcs = slices.map((slice, i) => ({
    slice,
    length: arcLength(slice.percent),
    offset: slices
      .slice(0, i)
      .reduce((sum, previous) => sum + arcLength(previous.percent), 0),
  }));

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={label}>
      <g transform="rotate(-90 50 50)">
        {arcs.map(({ slice, length, offset }) => {
          const dash = Math.max(0, length - gap);
          return (
            <circle
              key={slice.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={`var(--color-${slice.color})`}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
        })}
      </g>
    </svg>
  );
}
