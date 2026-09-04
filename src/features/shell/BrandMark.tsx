import Image from "next/image";
import Link from "next/link";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * The console's identity block — ISRO mark, product name, attribution.
 *
 * One component used by every shell so the branding cannot drift between
 * sections: before this, each shell drew its own tinted glyph tile and its own
 * wordmark, which meant six places to edit and six chances to disagree.
 *
 * The product name is responsive rather than variant-driven. "Digital Array
 * Based Telemetry System" is 35 characters and shares a 4 rem header with up to
 * six live stats, so it renders in full only where there is room (`2xl`) and
 * collapses to "DATS" below that. Same element, same DOM — nothing is
 * duplicated and nothing is hidden from a screen reader, which reads the
 * `title` attribute either way.
 *
 * `section` is the per-screen label that used to BE the wordmark. It survives
 * as a quieter run after a hairline, because an operator still needs to know
 * which console they are looking at.
 */
export function BrandMark({
  section,
  href = "/dashboard",
  className,
}: {
  /** Per-screen label, e.g. "Array Monitor". Omitted on the M&C board itself. */
  section?: string;
  /** Where the mark navigates. Null disables the link. */
  href?: string | null;
  className?: string;
}) {
  const identity = (
    <span className="flex shrink-0 items-center gap-[0.5rem]">
      <Image
        src="/isro_logo.png"
        alt="ISRO"
        width={736}
        height={741}
        priority
        className="size-[2rem] shrink-0 rounded-[0.375rem] object-contain"
      />
      <span className="flex flex-col leading-none">
        <span
          title="Digital Array Based Telemetry System"
          className="text-md font-bold tracking-[-0.01em] text-da-text"
        >
          <span className="2xl:hidden">DATS</span>
          <span className="hidden 2xl:inline">Digital Array Based Telemetry System</span>
        </span>
        <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
          Developed by <span className="font-bold text-da-brand">RDA</span>
        </span>
      </span>
    </span>
  );

  return (
    <div className={cn("flex min-w-0 shrink-0 items-center gap-[0.625rem]", className)}>
      {href ? (
        <Link
          href={href}
          aria-label="Digital Array Based Telemetry System — go to Monitoring and Controlling"
          className="rounded-[0.375rem] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-da-brand)]"
        >
          {identity}
        </Link>
      ) : (
        identity
      )}

      {section && (
        <>
          <span aria-hidden className="hidden h-[1.75rem] w-[max(1px,0.0625rem)] shrink-0 bg-da-border lg:block" />
          <span className="hidden truncate text-2xs font-bold uppercase tracking-[0.09em] text-da-muted lg:block">
            {section}
          </span>
        </>
      )}
    </div>
  );
}
