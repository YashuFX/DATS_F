"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authConfig } from "../config";
import { signOut } from "../lib/store";

/**
 * Ends the session and returns to sign-in. `replace`, not `push`, so Back does
 * not walk into a screen the visitor no longer has a session for.
 */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        signOut();
        router.replace(authConfig.loginPath);
      }}
      className={
        className ??
        "inline-flex h-[1.75rem] cursor-pointer items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface px-[0.625rem] text-2xs font-semibold uppercase tracking-[0.05em] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
      }
    >
      <LogOut className="size-[0.75rem]" strokeWidth={2.2} />
      Sign out
    </button>
  );
}
