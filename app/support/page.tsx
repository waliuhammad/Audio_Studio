import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

const CATEGORIES = [
  { title: "Getting started", description: "Setting up, uploading, and first edits.", icon: Sparkles, href: "/#how-it-works" },
  { title: "Audio tools", description: "Trimming, merging, converting, and effects.", icon: Wrench, href: "/#tools" },
  { title: "Video tools", description: "Video to audio, trimming, and conversion.", icon: FileText, href: "/#tools" },
  { title: "Export & formats", description: "Output formats, quality, and downloads.", icon: Globe, href: "/#tools" },
  { title: "Account & billing", description: "Plans, upgrades, and account settings.", icon: CreditCard, href: "/pricing" },
];

const CONTACT_CARDS = [
  { title: "Email support", description: "Get a reply within 24 hours on business days.", icon: Mail },
  { title: "Live chat", description: "Chat with our team in real time.", icon: MessageSquare },
  { title: "Help center", description: "Guides, tutorials, and troubleshooting.", icon: BookOpen },
];

/* ===================================================== */
/* PAGE                                                  */
/* ===================================================== */

export default function SupportPage() {
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

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-44
          bottom-[-140px]
          h-80
          w-80
          rounded-full
          bg-amber/[0.04]
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
      {/* BODY                                             */}
      {/* ================================================= */}

      <div className="container-studio relative flex flex-1 justify-center py-12 sm:py-16">
        <div className="w-full max-w-3xl">
          {/* Hero */}
          <div
            className="
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              px-5
              py-8
              text-center
              sm:px-10
              sm:py-10
              dark:border-ink-border
              dark:bg-ink-surface
            "
          >
            <div
              className="
                mb-4
                flex
                items-center
                justify-center
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
              <span className="h-px w-5 bg-amber" />
              Help center
              <span className="h-px w-5 bg-amber" />
            </div>

            <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite sm:text-4xl dark:text-mist">
              How can we help?
            </h1>

            <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-graphite-muted sm:text-sm dark:text-mist-muted">
              Search guides and answers, or reach out to our team for direct help.
            </p>

            {/* Search */}
            <label className="relative mx-auto mt-6 block w-full max-w-md">
              <span className="sr-only">Search help</span>
              <Search
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  left-4
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  text-graphite-faint
                  dark:text-mist-faint
                "
              />
              <input
                type="search"
                placeholder="Search the help center..."
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-surface/50
                  pl-11
                  pr-4
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
            </label>
          </div>

          {/* Categories */}
          <div className="mt-4">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-px w-5 bg-amber sm:w-6" />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-amber sm:text-[10px]">
                Browse by topic
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;

                return (
                  <Link
                    key={category.title}
                    href={category.href}
                    className="
                      group
                      flex
                      min-w-0
                      items-center
                      gap-3
                      rounded-xl
                      border
                      border-paper-border
                      bg-paper-surface
                      p-3.5
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:border-amber/50
                      hover:bg-paper-raised
                      dark:border-ink-border
                      dark:bg-ink-surface
                      dark:hover:border-amber/50
                      dark:hover:bg-ink-raised
                    "
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber transition-colors group-hover:bg-amber group-hover:text-ink">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-graphite dark:text-mist">
                        {category.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-graphite-muted dark:text-mist-muted">
                        {category.description}
                      </p>
                    </div>

                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-graphite-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-amber dark:text-mist-faint"
                      strokeWidth={1.8}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Contact */}
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-px w-5 bg-amber sm:w-6" />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-amber sm:text-[10px]">
                Still need help?
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {CONTACT_CARDS.map((card) => {
                const Icon = card.icon;

                return (
                  <a
                    key={card.title}
                    href={`mailto:support@audiostudio.com`}
                    className="
                      group
                      flex
                      min-w-0
                      flex-col
                      rounded-xl
                      border
                      border-paper-border
                      bg-paper-surface
                      p-4
                      text-left
                      transition-all
                      duration-200
                      hover:-translate-y-0.5
                      hover:border-amber/50
                      dark:border-ink-border
                      dark:bg-ink-surface
                      dark:hover:border-amber/50
                    "
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber transition-colors group-hover:bg-amber group-hover:text-ink">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                    </span>

                    <p className="mt-3 text-[13px] font-medium text-graphite dark:text-mist">
                      {card.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
                      {card.description}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Trust footer */}
          <div
            className="
              mt-8
              flex
              flex-wrap
              items-center
              justify-center
              gap-x-5
              gap-y-2
              font-mono
              text-[9px]
              uppercase
              tracking-[0.12em]
              text-graphite-faint
              dark:text-mist-faint
            "
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal" strokeWidth={1.8} />
              Avg. reply under 24h
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber" strokeWidth={1.8} />
              Your files stay private
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}