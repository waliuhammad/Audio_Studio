"use client";

import * as React from "react";
import { useSessionStatus } from "./useSessionStatus";
import Link from "next/link";
import { useTheme } from "next-themes";

import {
  Home,
  Wrench,
  Workflow,
  CreditCard,
  CircleHelp,
  Sun,
  Moon,
  ArrowUpRight,
  Menu,
} from "lucide-react";

import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
    icon: Home,
  },
  {
    label: "Tools",
    href: "/#tools",
    icon: Wrench,
  },
  {
    label: "How It Works",
    href: "/#how-it-works",
    icon: Workflow,
  },
  {
    label: "Pricing",
    href: "/#pricing",
    icon: CreditCard,
  },
  {
    label: "FAQ",
    href: "/#faq",
    icon: CircleHelp,
  },
];

function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="
          h-10
          w-[96px]
          rounded-full
          border
          border-paper-border/70
          bg-paper-surface/70
          dark:border-ink-border/70
          dark:bg-ink-surface/70
          sm:h-11
          sm:w-[104px]
        "
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="
        group
        relative
        flex
        h-10
        w-[96px]
        items-center
        rounded-full
        border
        border-paper-border
        bg-paper
        p-1
        shadow-sm
        transition-all
        duration-300
        hover:border-amber/40
        hover:shadow-[0_5px_20px_rgba(245,158,11,0.12)]
        dark:border-ink-border
        dark:bg-ink
        dark:hover:border-amber/40
        dark:hover:shadow-[0_5px_20px_rgba(245,158,11,0.10)]
        sm:h-11
        sm:w-[104px]
      "
    >
      {/* Sliding amber indicator */}
      <span
        aria-hidden="true"
        className={cn(
          `
            absolute
            top-1/2
            h-7
            w-7
            -translate-y-1/2
            rounded-full
            bg-amber
            shadow-[0_3px_12px_rgba(245,158,11,0.25)]
            transition-all
            duration-300
            ease-out
            sm:h-8
            sm:w-8
          `,
          // 100% is the button's padding box, so `100% - (indicator + p-1)`
          // lands the circle exactly on the moon cell at any pill width.
          isDark
            ? "left-[calc(100%_-_2rem)] sm:left-[calc(100%_-_2.25rem)]"
            : "left-1",
        )}
      />

      {/* Sun */}
      <span
        className={cn(
          `
            relative
            z-10
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            transition-colors
            duration-300
            sm:h-8
            sm:w-8
          `,
          isDark
            ? "text-graphite-muted dark:text-mist-muted"
            : "text-ink",
        )}
      >
        <Sun
          className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]"
          strokeWidth={1.8}
        />
      </span>

      {/* Current mode */}
      <span
        className="
          relative
          z-10
          flex-1
          whitespace-nowrap
          text-center
          text-[10px]
          font-semibold
          text-graphite
          transition-colors
          duration-300
          dark:text-mist
          sm:text-[11px]
        "
      >
        {isDark ? "Dark" : "Light"}
      </span>

      {/* Moon */}
      <span
        className={cn(
          `
            relative
            z-10
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            transition-colors
            duration-300
            sm:h-8
            sm:w-8
          `,
          isDark
            ? "text-ink"
            : "text-graphite-muted dark:text-mist-muted",
        )}
      >
        <Moon
          className="h-[15px] w-[15px] sm:h-[16px] sm:w-[16px]"
          strokeWidth={1.8}
        />
      </span>
    </button>
  );
}

/**
 * Compact icon-only theme switch for narrow screens, where the full pill
 * control (96px+) would crowd the logo and "Open Editor" together. Mirrors
 * ThemeControl's mount-guard so it never flashes the wrong icon.
 */
function MobileThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="
          h-10
          w-10
          shrink-0
          rounded-xl
          border
          border-paper-border/70
          bg-paper-surface/70
          dark:border-ink-border/70
          dark:bg-ink-surface/70
        "
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="
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
        transition-all
        duration-200
        hover:border-amber
        hover:bg-amber
        hover:text-ink
        dark:border-ink-border
        dark:text-mist-muted
        dark:hover:border-amber
        dark:hover:bg-amber
        dark:hover:text-ink
      "
    >
      {isDark ? (
        <Sun className="h-[17px] w-[17px]" strokeWidth={1.8} />
      ) : (
        <Moon className="h-[17px] w-[17px]" strokeWidth={1.8} />
      )}
    </button>
  );
}

export function Navbar() {
  /*
   * The navbar used to render "Sign In" unconditionally, so a signed-in
   * visitor was told they were signed out — and then "Open Editor" correctly
   * took them straight to the editor, which looked like the gate was broken.
   * It was not: the label was.
   */
  const isSignedIn = useSessionStatus();

  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className="
        sticky
        top-0
        z-50
        w-full
        overflow-x-clip
        px-2.5
        pt-3
        sm:px-4
        sm:pt-4
        lg:px-5
        lg:pt-5
      "
    >
      <div className="relative mx-auto w-full max-w-[1320px]">

        {/* ================================================= */}
        {/* SOFT AMBER LIGHT                                  */}
        {/* ================================================= */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-[-28px]
            h-20
            w-[260px]
            -translate-x-1/2
            rounded-full
            bg-amber/20
            blur-3xl
            sm:h-24
            sm:w-[380px]
          "
        />

        {/* ================================================= */}
        {/* MAIN NAVBAR                                       */}
        {/* ================================================= */}

        <div
          className={cn(
            `
              relative
              flex
              min-h-[66px]
              w-full
              items-center
              gap-3
              rounded-[21px]
              border
              px-2.5
              py-2
              backdrop-blur-xl
              transition-all
              duration-300
              sm:min-h-[72px]
              sm:gap-0
              sm:rounded-[23px]
              sm:px-3
              lg:min-h-[76px]
              lg:rounded-[25px]
              lg:px-5
            `,
            "border-paper-border/80 bg-paper/92",
            "dark:border-ink-border/80 dark:bg-ink/92",
            scrolled
              ? "shadow-[0_18px_55px_rgba(0,0,0,0.10)] dark:shadow-[0_18px_55px_rgba(0,0,0,0.35)]"
              : "shadow-[0_10px_35px_rgba(0,0,0,0.07)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.25)]",
          )}
        >

          {/* ================================================= */}
          {/* LOGO                                              */}
          {/* ================================================= */}

          <div className="min-w-0 shrink-0 origin-left scale-[0.85] sm:scale-100">
            <Logo />
          </div>

          {/* ================================================= */}
          {/* LEFT SEPARATOR                                    */}
          {/* ================================================= */}

          <div
            aria-hidden="true"
            className="
              mx-2
              hidden
              h-10
              w-px
              bg-paper-border
              xl:block
              dark:bg-ink-border
            "
          />

          {/* ================================================= */}
          {/* DESKTOP NAVIGATION                                */}
          {/* ================================================= */}

          <nav
            aria-label="Primary"
            className="
              hidden
              min-w-0
              flex-1
              items-center
              justify-center
              xl:flex
            "
          >
            <div className="flex items-center gap-0.5">

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="
                      group
                      relative
                      flex
                      min-w-[78px]
                      flex-col
                      items-center
                      justify-center
                      gap-1
                      rounded-[15px]
                      px-2
                      py-2
                      transition-all
                      duration-300
                      hover:bg-amber/10
                      sm:min-w-[82px]
                      sm:px-2.5
                    "
                  >
                    <Icon
                      className="
                        h-[19px]
                        w-[19px]
                        text-graphite-muted
                        transition-all
                        duration-300
                        group-hover:-translate-y-0.5
                        group-hover:text-amber
                        dark:text-mist-muted
                        dark:group-hover:text-amber
                      "
                      strokeWidth={1.75}
                    />

                    <span
                      className="
                        whitespace-nowrap
                        text-[9px]
                        font-medium
                        text-graphite-muted
                        transition-colors
                        duration-300
                        group-hover:text-amber
                        dark:text-mist-muted
                        dark:group-hover:text-amber
                        sm:text-[10px]
                      "
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}

            </div>
          </nav>

          {/* ================================================= */}
          {/* RIGHT SEPARATOR                                   */}
          {/* ================================================= */}

          <div
            aria-hidden="true"
            className="
              mr-1
              hidden
              h-10
              w-px
              bg-paper-border
              xl:block
              dark:bg-ink-border
            "
          />

          {/* ================================================= */}
          {/* RIGHT CONTROLS                                    */}
          {/* ================================================= */}

          <div
            className="
              ml-auto
              flex
              shrink-0
              items-center
              gap-1.5
              sm:gap-2
            "
          >

            {/* Sign In — becomes Dashboard once there is a session */}
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-in"}
              className="
                hidden
                h-10
                items-center
                rounded-xl
                px-2.5
                text-[12px]
                font-medium
                text-graphite-muted
                transition-all
                duration-200
                hover:bg-amber/10
                hover:text-amber
                dark:text-mist-muted
                dark:hover:bg-amber/10
                dark:hover:text-amber
                xl:flex
              "
            >
              {isSignedIn ? "Dashboard" : "Sign In"}
            </Link>

            {/* Theme — full pill control from sm up */}
            <div className="hidden sm:block">
              <ThemeControl />
            </div>

            {/* Theme — compact icon-only toggle below sm */}
            <div className="sm:hidden">
              <MobileThemeToggle />
            </div>

            {/* Open Editor */}
            <Link
              href="/editor"
              className="
                group
                relative
                flex
                h-10
                items-center
                gap-1
                overflow-hidden
                rounded-full
                bg-amber
                px-2.5
                text-[11px]
                font-semibold
                text-ink
                shadow-[0_6px_20px_rgba(245,158,11,0.18)]
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:shadow-[0_10px_28px_rgba(245,158,11,0.30)]
                active:translate-y-0
                sm:h-11
                sm:gap-2
                sm:px-4
                sm:text-[12px]
              "
            >
              <span
                aria-hidden="true"
                className="
                  absolute
                  inset-y-0
                  -left-12
                  w-8
                  -skew-x-12
                  bg-white/35
                  opacity-0
                  transition-all
                  duration-500
                  group-hover:left-[130%]
                  group-hover:opacity-100
                "
              />

              <span className="relative whitespace-nowrap">
                Open Editor
              </span>

              <ArrowUpRight
                className="
                  relative
                  hidden
                  h-4
                  w-4
                  transition-transform
                  duration-300
                  group-hover:-translate-y-0.5
                  group-hover:translate-x-0.5
                  sm:block
                "
                strokeWidth={1.9}
              />
            </Link>

            {/* ================================================= */}
            {/* MOBILE MENU                                      */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="
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
                transition-all
                duration-200
                hover:border-amber
                hover:bg-amber
                hover:text-ink
                dark:border-ink-border
                dark:text-mist-muted
                dark:hover:border-amber
                dark:hover:bg-amber
                dark:hover:text-ink
                xl:hidden
                sm:h-11
                sm:w-11
              "
            >
              <Menu
                className="h-[18px] w-[18px]"
                strokeWidth={1.8}
              />
            </button>

          </div>
        </div>

        {/* ================================================= */}
        {/* TOP HIGHLIGHT                                     */}
        {/* ================================================= */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            left-1/2
            top-0
            h-px
            w-32
            -translate-x-1/2
            bg-amber/50
            blur-[1px]
            sm:w-48
          "
        />
      </div>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </header>
  );
}