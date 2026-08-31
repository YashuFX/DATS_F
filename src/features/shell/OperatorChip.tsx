import { User } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * Who is driving the console, and whether the session is live.
 *
 * Present on every screen for the same reason the data-age clock is: on a
 * shared wall display "who is signed in" is not a settings detail, it is part
 * of knowing whether what you are looking at is yours to act on.
 *
 * The label collapses below `md`, where the dot alone still carries the
 * liveness signal — the part that changes.
 */
export function OperatorChip({
  name = "Operator",
  online = true,
  className,
}: {
  name?: string;
  online?: boolean;
  className?: string;
}) {
  return (
    <span
      title={`${name} — ${online ? "online" : "offline"}`}
      className={cn(
        "flex shrink-0 items-center gap-[0.5rem] rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem] py-[0.3125rem]",
        className,
      )}
    >
      <User className="size-[0.9375rem] shrink-0 text-da-muted" strokeWidth={2.1} />
      <span className="hidden flex-col leading-none md:flex">
        <span className="text-2xs font-bold whitespace-nowrap text-da-text">{name}</span>
        <span className="mt-[0.125rem] flex items-center gap-[0.25rem] text-3xs text-da-muted">
          {online ? "Online" : "Offline"}
          <span
            className={cn("size-[0.375rem] rounded-full", online ? "bg-da-success" : "bg-da-offline")}
          />
        </span>
      </span>
      <span
        aria-hidden
        className={cn("size-[0.4375rem] rounded-full md:hidden", online ? "bg-da-success" : "bg-da-offline")}
      />
    </span>
  );
}
