"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * The auth form field.
 *
 * Taller and calmer than the board's 1.75rem filter controls — this screen is
 * read once, not scanned all day — but built from the same vocabulary: hairline
 * border, tight radius, brand focus ring, `da-field` surface so dark mode
 * recesses the input under the card without a heavier outline.
 */

const CONTROL =
  "h-[2.5rem] w-full rounded-[0.3125rem] border-[max(1px,0.0625rem)] bg-da-field px-[0.75rem] text-base text-da-text transition-colors placeholder:text-da-label focus:outline-none";

export function Field({
  label,
  error,
  hint,
  icon,
  className,
  ...rest
}: {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  icon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-[0.375rem]", className)}>
      <label
        htmlFor={id}
        className="text-2xs font-semibold uppercase tracking-[0.08em] text-da-muted"
      >
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-[0.75rem] top-1/2 -translate-y-1/2 text-da-label">
            {icon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            CONTROL,
            // Ternary, not `&&`: `icon` is a ReactNode, so `icon && …` widens
            // to include 0 and 0n, which `cn` does not accept.
            icon ? "pl-[2.25rem]" : undefined,
            error
              ? "border-da-danger focus:border-da-danger"
              : "border-da-border focus:border-da-brand",
          )}
          {...rest}
        />
      </div>

      {error ? (
        <span id={errorId} role="alert" className="text-2xs font-medium text-da-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-2xs font-medium text-da-label">{hint}</span>
      )}
    </div>
  );
}

/** Password field with a reveal toggle. */
export function PasswordField({
  label,
  error,
  hint,
  className,
  ...rest
}: {
  label: string;
  error?: string | null;
  hint?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = `${id}-error`;
  const [shown, setShown] = useState(false);

  return (
    <div className={cn("flex flex-col gap-[0.375rem]", className)}>
      <label
        htmlFor={id}
        className="text-2xs font-semibold uppercase tracking-[0.08em] text-da-muted"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            CONTROL,
            "pr-[2.5rem]",
            error
              ? "border-da-danger focus:border-da-danger"
              : "border-da-border focus:border-da-brand",
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-[0.5rem] top-1/2 flex size-[1.75rem] -translate-y-1/2 cursor-pointer items-center justify-center rounded-[0.25rem] text-da-label transition-colors hover:bg-da-subtle hover:text-da-text"
        >
          {shown ? (
            <EyeOff className="size-[0.9375rem]" strokeWidth={2} />
          ) : (
            <Eye className="size-[0.9375rem]" strokeWidth={2} />
          )}
        </button>
      </div>

      {error ? (
        <span id={errorId} role="alert" className="text-2xs font-medium text-da-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-2xs font-medium text-da-label">{hint}</span>
      )}
    </div>
  );
}

/** Native select styled as a field — the security question picker. */
export function SelectField({
  label,
  error,
  options,
  className,
  ...rest
}: {
  label: string;
  error?: string | null;
  options: { value: string; label: string }[];
} & InputHTMLAttributes<HTMLSelectElement>) {
  const id = useId();

  return (
    <div className={cn("flex flex-col gap-[0.375rem]", className)}>
      <label
        htmlFor={id}
        className="text-2xs font-semibold uppercase tracking-[0.08em] text-da-muted"
      >
        {label}
      </label>
      <select
        id={id}
        className={cn(
          CONTROL,
          "cursor-pointer appearance-none bg-[length:0.75rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-[2rem]",
          error
            ? "border-da-danger focus:border-da-danger"
            : "border-da-border focus:border-da-brand",
        )}
        style={{
          // Inline so the arrow inherits `currentColor` and flips with the
          // theme; a Tailwind arbitrary background would bake one hex in.
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239aa4b2' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...(rest as InputHTMLAttributes<HTMLSelectElement>)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="text-2xs font-medium text-da-danger">
          {error}
        </span>
      )}
    </div>
  );
}
