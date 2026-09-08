import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Shared shell for the long-form marketing and legal pages — About, Support,
 * Privacy, Terms.
 *
 * The four pages were rewritten to import this and it was never committed, so
 * all four failed to compile. It is reconstructed here from how they call it,
 * and deliberately borrows the chrome and tokens of components/legal/LegalDoc
 * so the set still reads as one family rather than two designs.
 *
 * A server component on purpose: every page using it exports `metadata`, and
 * none of them need state.
 */
export function ContentPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* ================================================= */}
      {/* AMBIENT GLOW                                      */}
      {/* ================================================= */}

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

      {/* ================================================= */}
      {/* TOP BAR                                           */}
      {/* ================================================= */}

      <header className="border-b border-paper-border bg-paper/85 backdrop-blur-xl dark:border-ink-border dark:bg-ink/85">
        <div className="container-studio flex h-16 items-center gap-2">
          <Link
            href="/"
            className="group flex items-center gap-2 text-[13px] font-medium text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={1.8}
            />
            <span className="hidden sm:inline">Back to home</span>
          </Link>

          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
            Audio Studio
          </span>
        </div>
      </header>

      {/* ================================================= */}
      {/* DOCUMENT                                          */}
      {/* ================================================= */}

      <div className="container-studio relative flex flex-1 justify-center py-12 sm:py-16">
        <div className="w-full max-w-3xl">
          {/* Header */}
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
          </div>

          {/* Body */}
          <div
            className="
              mt-4
              flex
              flex-col
              gap-8
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
            {children}
          </div>

          {/* Footer meta */}
          <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
            © {new Date().getFullYear()} Audio Studio. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * One titled block of prose.
 *
 * Paragraph styling is applied from here with a child selector rather than
 * asked of every caller, so the pages stay plain <p> tags and cannot drift
 * apart from one another.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <h2 className="font-display text-lg font-semibold tracking-tight text-graphite dark:text-mist">
        {title}
      </h2>

      <div
        className="
          [&>p]:mt-3
          [&>p]:text-[13px]
          [&>p]:leading-7
          [&>p]:text-graphite-muted
          [&>p]:sm:text-sm
          dark:[&>p]:text-mist-muted
          [&>ul]:mt-3
          [&>ul]:flex
          [&>ul]:list-disc
          [&>ul]:flex-col
          [&>ul]:gap-1.5
          [&>ul]:pl-5
          [&>ul]:text-[13px]
          [&>ul]:leading-7
          [&>ul]:text-graphite-muted
          [&>ul]:sm:text-sm
          dark:[&>ul]:text-mist-muted
          [&_a]:font-medium
          [&_a]:text-graphite
          [&_a]:transition-colors
          [&_a:hover]:text-amber
          dark:[&_a]:text-mist
        "
      >
        {children}
      </div>
    </section>
  );
}
