"use client";

import { CircleAlert, Loader } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { passwordStrength } from "../lib/validate";

/** Staggered entrance for a stack of fields — index drives the delay. */
export function Rise({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("da-rise", className)} style={{ animationDelay: `${index * 0.05}s` }}>
      {children}
    </div>
  );
}

/** Whole-form failure — a rejected credential, or storage being unavailable. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="da-slide-in flex items-start gap-[0.5rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-danger/35 bg-da-danger-soft px-[0.75rem] py-[0.5rem]"
    >
      <CircleAlert className="mt-[0.0625rem] size-[0.875rem] shrink-0 text-da-danger" strokeWidth={2.2} />
      <span className="text-2xs font-medium leading-[1.35] text-da-danger">{message}</span>
    </div>
  );
}

/**
 * Password strength, shown as four segments rather than a bar so the step from
 * one level to the next is legible without reading the label.
 */
export function StrengthMeter({ password }: { password: string }) {
  const { score, label, color } = passwordStrength(password);

  return (
    <div className="flex flex-col gap-[0.3125rem]">
      <div className="flex items-center gap-[0.25rem]">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className="h-[0.1875rem] flex-1 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                step <= score
                  ? `var(--color-${color})`
                  : "var(--color-da-border)",
            }}
          />
        ))}
      </div>
      <span className="flex items-center justify-between text-2xs font-medium text-da-label">
        <span>Password strength</span>
        <span
          className="font-semibold"
          style={{ color: password ? `var(--color-${color})` : undefined }}
        >
          {label}
        </span>
      </span>
    </div>
  );
}

/**
 * Primary action. While `pending`, the label is replaced by a spinner and a
 * light pass runs across the fill, so a slow hash never looks like a dead click.
 */
export function SubmitButton({
  pending,
  children,
  pendingLabel = "Working…",
}: {
  pending: boolean;
  children: ReactNode;
  pendingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "relative flex h-[2.5rem] w-full items-center justify-center gap-[0.5rem] overflow-hidden rounded-[0.3125rem] bg-da-brand text-2xs font-bold uppercase tracking-[0.08em] text-da-on-brand shadow-da-brand transition-colors",
        pending ? "cursor-wait" : "cursor-pointer hover:bg-da-brand-hover",
        "focus-visible:outline-[max(2px,0.125rem)] focus-visible:outline-offset-[0.125rem] focus-visible:outline-da-brand",
      )}
    >
      {pending && (
        <span
          aria-hidden
          className="da-shimmer absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(100deg, transparent 20%, color-mix(in srgb, var(--color-da-on-brand) 22%, transparent) 50%, transparent 80%)",
          }}
        />
      )}
      {pending ? (
        <>
          <Loader className="size-[0.875rem] animate-spin" strokeWidth={2.4} />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** The three-step progress dots on the recovery flow. */
export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <span className="flex items-center gap-[0.3125rem]" aria-label={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[0.1875rem] rounded-full transition-all duration-300",
            i === step ? "w-[1.25rem] bg-da-brand" : "w-[0.375rem] bg-da-border-strong",
          )}
        />
      ))}
    </span>
  );
}
