"use client";

import * as React from "react";
import { useSessionStatus } from "./useSessionStatus";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NAV_LINKS } from "@/lib/navigation";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  // Same reason as the desktop navbar: the label must match reality.
  const isSignedIn = useSessionStatus();

  // Lock background scroll while the drawer is open.
  React.useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-sm flex-col bg-paper-surface p-6 shadow-2xl dark:bg-ink-surface md:hidden"
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
              <Link
                href="/sign-up?next=/editor&new=1"
                onClick={onClose}
                className="rounded-full bg-amber px-4 py-2.5 text-center font-semibold text-ink"
              >
                Start Editing
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}