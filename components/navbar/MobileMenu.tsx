"use client";

import * as React from "react";
import { useSessionStatus } from "./useSessionStatus";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/navigation";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  // Same reason as the desktop navbar: the label must match reality.
  const isSignedIn = useSessionStatus();

  // Lock background scroll while the drawer is open, and let Escape close it.
  //
  // The drawer is xl:hidden to match the hamburger in Navbar.tsx. It used to
  // be md:hidden, so from 768px to 1279px the button showed but the drawer
  // did not — tapping it locked scrolling with nothing on screen to close.
  React.useEffect(() => {
    if (!open) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    /*
     * Always mounted, and slid/faded with CSS transitions instead of mounting
     * on open. `invisible` when closed keeps the drawer's links out of the tab
     * order and the accessibility tree; visibility flips at the END of the
     * closing transition and the START of the opening one, so the slide shows.
     */
    <>
          <div
            className={cn(
              "fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm transition-[opacity,visibility] duration-200 xl:hidden",
              open ? "visible opacity-100" : "invisible opacity-0"
            )}
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-sm flex-col bg-paper-surface p-6 shadow-2xl transition-[transform,visibility] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none dark:bg-ink-surface xl:hidden",
              open ? "visible translate-x-0" : "invisible translate-x-full"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="font-display text-base font-semibold text-graphite dark:text-mist">
                Menu
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-paper-border text-graphite-muted hover:text-amber-strong dark:border-ink-border dark:text-mist-muted dark:hover:text-amber"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <nav aria-label="Mobile">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="block rounded-lg px-3 py-3 font-display text-lg font-medium text-graphite transition-colors hover:bg-paper-raised hover:text-amber-strong dark:text-mist dark:hover:bg-ink-raised dark:hover:text-amber"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-paper-border pt-6 dark:border-ink-border">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-in"}
                onClick={onClose}
                className="rounded-full border border-paper-border px-4 py-2.5 text-center font-medium text-graphite dark:border-ink-border dark:text-mist"
              >
                {isSignedIn ? "Dashboard" : "Sign In"}
              </Link>
              {/*
                Signed in, this goes where the label promises. It sent everyone
                to the sign-up form, so someone with an account tapping "Start
                Editing" hit a registration wall instead of the editor.

                /editor rather than /dashboard: the button offers to start
                editing, and the Dashboard link directly above already covers
                the other destination.
              */}
              <Link
                href={
                  isSignedIn ? "/editor" : "/sign-up?next=/editor&new=1"
                }
                onClick={onClose}
                className="rounded-full bg-amber px-4 py-2.5 text-center font-semibold text-ink"
              >
                Start Editing
              </Link>
            </div>
          </div>
    </>
  );
}