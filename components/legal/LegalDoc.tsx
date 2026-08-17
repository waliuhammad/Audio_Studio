import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

export type LegalSection = {
  id: string;
  heading: string;
  body: string[];
};

export function LegalDoc({
  eyebrow,
  title,
  description,
  updated,
  contactNote,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  contactNote: string;
  sections: LegalSection[];
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* ================================================= */}
      {/* AMBIENT GLOWS                                     */}
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
      {/* TOP BAR                                          */}
      {/* ================================================= */}

      <header className="border-b border-paper-border bg-paper/85 backdrop-blur-xl dark:border-ink-border dark:bg-ink/85">
        <div className="container-studio flex h-16 items-center gap-2">
          <Link
            href="/"
            className="group flex items-center gap-2 text-[13px] font-medium text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} />
            <span className="hidden sm:inline">Back to home</span>
          </Link>

          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
            Audio Studio
          </span>
        </div>
      </header>

      {/* ================================================= */}
      {/* DOCUMENT                                         */}
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

            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.7} />
              Last updated {updated}
            </span>
          </div>

          {/* Sections */}
          <div
            className="
              mt-4
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
            {/* TOC */}
            <nav aria-label="On this page" className="mb-8 border-b border-paper-border pb-6 dark:border-ink-border">
              <p className="mb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
                On this page
              </p>
              <ol className="flex flex-col gap-1.5">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="group flex items-center gap-2 text-[13px] text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
                    >
                      <span className="w-5 shrink-0 font-mono text-[9px] tracking-[0.08em] text-graphite-faint dark:text-mist-faint">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Body */}
            <div className="flex flex-col gap-8">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="flex items-baseline gap-3 font-display text-lg font-semibold tracking-tight text-graphite dark:text-mist">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-amber">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.heading}
                  </h2>

                  {section.body.map((paragraph, i) => (
                    <p
                      key={i}
                      className="mt-3 text-[13px] leading-7 text-graphite-muted dark:text-mist-muted sm:text-sm"
                    >
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            {/* Contact note */}
            <div className="mt-10 flex flex-col gap-3 rounded-xl border border-amber/25 bg-amber/[0.04] p-4 sm:flex-row sm:items-center dark:bg-amber/[0.03]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber/20 bg-amber/10 text-amber">
                <Mail className="h-4 w-4" strokeWidth={1.7} />
              </span>

              <div className="min-w-0 flex-1 text-[12px] leading-5 text-graphite-muted dark:text-mist-muted">
                {contactNote}{" "}
                <a
                  href="mailto:support@audiostudio.com"
                  className="font-medium text-graphite transition-colors hover:text-amber dark:text-mist dark:hover:text-amber"
                >
                  support@audiostudio.com
                </a>
              </div>
            </div>
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