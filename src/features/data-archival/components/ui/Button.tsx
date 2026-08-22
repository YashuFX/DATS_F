"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "outline" | "ghost" | "link";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  // The dark comp never fills a primary action: APPLY FILTERS is a tinted
  // teal outline, not a solid slab, which keeps the accent from shouting on a
  // near-black board. Hover deepens the tint instead of darkening a fill.
  primary:
    "bg-da-brand text-da-on-brand hover:bg-da-brand-hover active:translate-y-[0.03125rem] shadow-[var(--shadow-da-brand)] dark:border-[max(1px,0.0625rem)] dark:border-da-brand/45 dark:bg-da-brand-soft dark:text-da-brand dark:hover:bg-da-brand/20 dark:hover:text-da-brand-hover",
  outline:
    "border-[max(1px,0.0625rem)] border-da-brand/35 text-da-brand bg-da-surface hover:bg-da-brand-soft",
  ghost:
    "border-[max(1px,0.0625rem)] border-da-border text-da-muted bg-da-surface hover:bg-da-subtle hover:text-da-text",
  link: "text-da-brand hover:underline underline-offset-2",
};

const SIZES: Record<Size, string> = {
  sm: "h-[1.5rem] px-[0.5rem] text-3xs gap-[0.25rem] rounded-[0.25rem]",
  md: "h-[1.875rem] px-[0.75rem] text-2xs gap-[0.375rem] rounded-[0.25rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  className,
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center font-semibold uppercase tracking-[0.05em] whitespace-nowrap transition-colors duration-150",
        "focus-visible:outline-[max(2px,0.125rem)] focus-visible:outline-offset-[0.125rem] focus-visible:outline-da-brand",
        variant === "link" ? "h-auto p-0 text-2xs" : SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
