"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus, Search, X } from "lucide-react";
import { AccountMenu } from "./AccountMenu";
import { MobileDrawer } from "./MobileDrawer";

interface TopbarProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  /** Controlled search value. Omit both search props to hide the field. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Where the primary action button goes. */
  newProjectHref?: string;
}

export function Topbar({
  title,
  subtitle = "Audio Studio",
  searchPlaceholder = "Search projects...",
  searchValue,
  onSearchChange,
  newProjectHref = "/editor",
}: TopbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isSearchEnabled = typeof onSearchChange === "function";
  const value = searchValue ?? "";

  return (
    <>
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <header className="sticky top-0 z-30 border-b border-paper-border bg-paper/85 backdrop-blur-xl dark:border-ink-border dark:bg-ink/85">
        <div className="container-studio flex h-16 items-center gap-4">
          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={isDrawerOpen}
            className="
              lg:hidden
              flex
              h-10
              w-10
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
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>

          {/* Title */}
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold tracking-tight text-graphite sm:text-lg dark:text-mist">
              {title}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
              {subtitle}
            </p>
          </div>

          {/* Search */}
          {isSearchEnabled && (
            <label className="relative ml-auto hidden w-full max-w-[260px] shrink-0 sm:block">
              <span className="sr-only">Search</span>

              <Search
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  left-3.5
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  text-graphite-faint
                  dark:text-mist-faint
                "
              />

              <input
                type="text"
                value={value}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                className="
                  h-10
                  w-full
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-surface/50
                  pl-10
                  pr-9
                  text-sm
                  text-graphite
                  outline-none
                  transition-all
                  duration-200
                  placeholder:text-graphite-faint
                  focus:border-amber
                  focus:bg-paper-surface
                  dark:border-ink-border
                  dark:bg-ink-surface/50
                  dark:text-mist
                  dark:placeholder:text-mist-faint
                  dark:focus:bg-ink-surface
                "
              />

              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  aria-label="Clear search"
                  className="
                    absolute
                    right-2.5
                    top-1/2
                    flex
                    h-5
                    w-5
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-full
                    text-graphite-faint
                    transition-colors
                    hover:text-amber
                    dark:text-mist-faint
                    dark:hover:text-amber
                  "
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </label>
          )}

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
            <Link
              href={newProjectHref}
              aria-label="New project"
              className="
                group
                flex
                h-10
                items-center
                gap-1.5
                rounded-full
                bg-amber
                px-3.5
                text-[11px]
                font-semibold
                text-ink
                shadow-[0_6px_20px_rgba(245,158,11,0.18)]
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:shadow-[0_10px_28px_rgba(245,158,11,0.30)]
                active:translate-y-0
              "
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">New Project</span>
            </Link>

            {/*
              A notification bell used to sit here with a permanent amber dot,
              so every account looked like it had something unread — forever.
              There is no notification system behind it, so both the button and
              its indicator are gone rather than faking a feature.
            */}
            <AccountMenu />
          </div>
        </div>
      </header>
    </>
  );
}