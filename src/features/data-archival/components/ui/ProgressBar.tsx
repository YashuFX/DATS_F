import { cn } from "../../lib/cn";

/**
 * Track height is set in rem so the bar keeps its proportion on a 4K wall
 * display. The fill transition matches the store tick so progress reads as a
 * smooth crawl rather than a stutter.
 */
export function ProgressBar({
  value,
  color = "da-brand",
  className,
  label,
}: {
  /** 0..100 */
  value: number;
  /** Theme colour token name without the `--color-` prefix. */
  color?: string;
  className?: string;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-[0.25rem] w-full overflow-hidden rounded-full bg-da-border", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-linear"
        style={{ width: `${clamped}%`, backgroundColor: `var(--color-${color})` }}
      />
    </div>
  );
}
