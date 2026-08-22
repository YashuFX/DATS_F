"use client";

import { Waypoints } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { authConfig } from "../config";
import { useSession } from "../hooks/useSession";

/**
 * Gate for everything behind sign-in.
 *
 * The session lives in the browser, so this is a client-side guard: it holds a
 * splash while the session is being read, and redirects anonymous visitors to
 * the login screen carrying `next`, so they land where they were going instead
 * of always on the home page.
 *
 * `usePathname` rather than `useSearchParams` on purpose — the latter forces
 * the whole tree under it to be client-rendered unless it sits inside a
 * Suspense boundary, and a guard wraps entire routes.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const state = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status !== "anonymous") return;
    const next = pathname && pathname !== authConfig.homePath ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`${authConfig.loginPath}${next}`);
  }, [state.status, pathname, router]);

  if (state.status === "authenticated") return <>{children}</>;

  // Shown while reading the session, and for the frame between deciding to
  // redirect and the router acting on it — never the protected content.
  return (
    <div className="dats-archival flex min-h-[100dvh] flex-col items-center justify-center gap-[0.875rem] bg-da-bg text-da-text">
      <span className="flex size-[2.75rem] animate-pulse items-center justify-center rounded-[0.5rem] bg-da-brand text-da-on-brand shadow-da-brand-lg">
        <Waypoints className="size-[1.375rem]" strokeWidth={2} />
      </span>
      <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-da-muted">
        {state.status === "checking" ? "Restoring session…" : "Redirecting to sign in…"}
      </span>
    </div>
  );
}
