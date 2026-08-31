/**
 * Prerendered stand-in while the dome screen waits on URL drill parameters.
 * Shaped like the real layout so the swap on hydration is a fill, not a jump.
 */
export function ScreenFallback() {
  return (
    <div className="flex h-full min-h-0 flex-col p-[0.75rem]">
      <span className="da-card min-h-0 flex-1" />
    </div>
  );
}
