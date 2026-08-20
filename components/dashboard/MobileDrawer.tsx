"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, X } from "lucide-react";
import { Logo } from "@/components/navbar/Logo";
import { useAccount } from "@/components/providers/SessionProvider";
import { Avatar } from "./Avatar";
import { NAV_GROUPS, getActiveFromPath } from "./nav-data";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const account = useAccount();
  const active = getActiveFromPath(pathname ?? "");

  /* Close on Escape, and lock body scroll while open. */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${
        isOpen ? "" : "pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`
          absolute
          inset-0
          bg-ink/60
          backdrop-blur-sm
          transition-opacity
          duration-300
          ${isOpen ? "opacity-100" : "opacity-0"}
        `}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard menu"
        className={`
          absolute
          inset-y-0
          left-0
          flex
          w-[264px]
          max-w-[85vw]
          flex-col
          border-r
          border-paper-border
          bg-paper
          px-4
          py-5
          transition-transform
          duration-300
          dark:border-ink-border
          dark:bg-ink
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-1.5 pb-6">
          <Logo />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-paper-border
              text-graphite-muted
              transition-colors
              duration-200
              hover:border-amber/50
              hover:text-amber
              dark:border-ink-border
              dark:text-mist-muted
              dark:hover:border-amber/50
              dark:hover:text-amber
            "
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Nav */}
        <nav
          aria-label="Dashboard"
          className="flex flex-col gap-6 overflow-y-auto"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className="
                  mb-2
                  px-2
                  font-mono
                  text-[8px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-graphite-faint
                  dark:text-mist-faint
                "
              >
                {group.label}
              </p>

              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === active;

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`
                          flex
                          min-w-0
                          items-center
                          gap-2.5
                          rounded-xl
                          px-2.5
                          py-2.5
                          transition-all
                          duration-200
                          ${
                            isActive
                              ? "bg-amber/10 text-amber"
                              : "text-graphite-muted hover:bg-paper-raised hover:text-graphite dark:text-mist-muted dark:hover:bg-ink-raised dark:hover:text-mist"
                          }
                        `}
                      >
                        <Icon
                          className="h-[17px] w-[17px] shrink-0"
                          strokeWidth={1.7}
                        />

                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {item.label}
                        </span>

                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Upgrade card */}
        <div
          className="
            mt-auto
            rounded-xl
            border
            border-amber/30
            bg-amber/[0.04]
            p-4
            dark:bg-amber/[0.03]
          "
        >
          <div className="flex items-center gap-2.5">
            <span
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-amber/20
                bg-amber/10
                text-amber
              "
            >
              <Crown className="h-4 w-4" strokeWidth={1.6} />
            </span>

            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-graphite dark:text-mist">
                Go Pro
              </p>
              <p className="truncate text-[11px] leading-4 text-graphite-muted dark:text-mist-muted">
                Unlock max limits &amp; priority
              </p>
            </div>
          </div>

          <Link
            href="/#pricing"
            onClick={onClose}
            className="
              mt-3
              flex
              h-9
              w-full
              items-center
              justify-center
              rounded-full
              bg-amber
              text-xs
              font-semibold
              text-ink
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_6px_18px_rgba(245,158,11,0.22)]
              active:translate-y-0
            "
          >
            Upgrade
          </Link>
        </div>

        {/* Profile */}
        <Link
          href="/settings"
          onClick={onClose}
          className="
            mt-4
            flex
            items-center
            gap-2.5
            rounded-xl
            border
            border-paper-border
            bg-paper-surface
            p-2.5
            transition-colors
            duration-200
            hover:border-amber/50
            dark:border-ink-border
            dark:bg-ink-surface
            dark:hover:border-amber/50
          "
        >
          <Avatar size={36} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-graphite dark:text-mist">
              {account.name}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
              {account.plan} plan
            </p>
          </div>
        </Link>
      </aside>
    </div>
  );
}
