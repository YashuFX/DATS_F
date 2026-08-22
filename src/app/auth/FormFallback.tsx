/**
 * Prerendered stand-in for a form that is waiting on the URL's search params.
 *
 * Shaped like the real card — same width, same rhythm — so the swap on
 * hydration is a fill, not a jump.
 */
export function FormFallback({ title, lines }: { title: string; lines: number }) {
  return (
    <section className="da-auth-card flex flex-col gap-[1.25rem] p-[1.75rem] dark:shadow-none">
      <h1 className="text-2xl font-bold tracking-[-0.02em] text-da-text">{title}</h1>
      <div className="flex flex-col gap-[1rem]">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex flex-col gap-[0.375rem]">
            <span className="h-[0.5rem] w-[4.5rem] rounded-full bg-da-border" />
            <span className="h-[2.5rem] w-full rounded-[0.3125rem] bg-da-subtle" />
          </div>
        ))}
        <span className="h-[2.5rem] w-full rounded-[0.3125rem] bg-da-border" />
      </div>
    </section>
  );
}
