import { Construction } from "lucide-react";

/**
 * Stub body for the five tabs that have no approved design yet. The route,
 * the chrome, and the navigation are real — only the body is pending, so each
 * screen can be dropped in later without touching the shell.
 */
export function TabPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex h-full items-center justify-center p-[0.875rem]">
      <div className="da-card flex w-[26rem] flex-col items-center gap-[0.625rem] px-[2rem] py-[2.5rem] text-center">
        <span className="flex size-[2.5rem] items-center justify-center rounded-full bg-da-brand-soft text-da-brand">
          <Construction className="size-[1.25rem]" strokeWidth={2} />
        </span>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-da-text">{title}</h2>
        <p className="max-w-[20rem] text-2xs leading-[1.05rem] text-da-muted">{note}</p>
      </div>
    </div>
  );
}
