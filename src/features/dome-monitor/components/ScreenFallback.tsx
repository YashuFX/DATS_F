/**
 * Prerendered stand-in while the dome screen waits on URL drill parameters.
 * Shaped like the real layout so the swap on hydration is a fill, not a jump.
 */
export function ScreenFallback() {
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[3.25rem_minmax(0,1fr)_2.5rem] gap-[0.75rem]">
        <span className="da-card" />
        <span className="da-card" />
        <span className="rounded-[0.25rem] bg-da-subtle" />
      </div>
      <span className="da-card" />
    </div>
  );
}
