import Link from "next/link";
import { ArrowLeft, ArrowRight, Hammer } from "lucide-react";

/**
 * Placeholder for a tool that is listed but not built yet.
 *
 * The Audio Mixture and Video Mixture cards ship in the tools grid with a
 * "New" badge, but their pages were committed empty. An empty page.tsx has no
 * default export, so Next could not prerender it and the whole production
 * build failed — meaning nothing else could deploy either.
 *
 * This gives those routes something real to render. It says plainly that the
 * tool is not ready rather than showing a broken shell, and points at the
 * tools that do work, so a visitor who clicks the card is not stranded.
 *
 * Delete the page's use of this when the actual tool lands.
 */
export function ComingSoon({
  eyebrow,
  title,
  description,
  backHref = "/#tools",
  suggestions = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  suggestions?: { label: string; href: string }[];
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-44
          top-[-120px]
          h-80
          w-80
          rounded-full
          bg-amber/[0.05]
          blur-[110px]
          sm:h-96
          sm:w-96
        "
      />

      <header className="border-b border-paper-border bg-paper/85 backdrop-blur-xl dark:border-ink-border dark:bg-ink/85">
        <div className="container-studio flex h-16 items-center gap-2">
          <Link
            href={backHref}
            className="group flex items-center gap-2 text-[13px] font-medium text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={1.8}
            />
            <span className="hidden sm:inline">Back to tools</span>
          </Link>

          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
            Audio Studio
          </span>
        </div>
      </header>

      <div className="container-studio relative flex flex-1 justify-center py-12 sm:py-16">
        <div className="w-full max-w-3xl">
          <div
            className="
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              px-5
              py-7
              sm:px-8
              sm:py-9
              dark:border-ink-border
              dark:bg-ink-surface
            "
          >
            <div
              className="
                mb-3
                flex
                items-center
                gap-2
                font-mono
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-amber
                sm:text-[10px]
              "
            >
              <span className="h-px w-5 bg-amber sm:w-6" />
              {eyebrow}
            </div>

            <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite sm:text-4xl dark:text-mist">
              {title}
            </h1>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-graphite-muted sm:text-sm dark:text-mist-muted">
              {description}
            </p>

            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber">
              <Hammer className="h-3.5 w-3.5" strokeWidth={1.7} />
              In development
            </span>

            <p className="mt-5 text-[12px] leading-6 text-graphite-muted dark:text-mist-muted">
              This one is not finished yet. Everything else in the toolkit is
              ready to use now.
            </p>
          </div>

          {suggestions.length > 0 && (
            <div
              className="
                mt-4
                rounded-xl
                border
                border-paper-border
                bg-paper-surface
                px-5
                py-6
                sm:px-8
                dark:border-ink-border
                dark:bg-ink-surface
              "
            >
              <p className="mb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
                Try instead
              </p>

              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="
                      group
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-paper-border
                      px-3.5
                      py-1.5
                      text-[11px]
                      font-medium
                      text-graphite-muted
                      transition-colors
                      hover:border-amber/50
                      hover:text-amber
                      dark:border-ink-border
                      dark:text-mist-muted
                      dark:hover:border-amber/50
                      dark:hover:text-amber
                    "
                  >
                    {item.label}
                    <ArrowRight
                      className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                      strokeWidth={2}
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
            © {new Date().getFullYear()} Audio Studio. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
