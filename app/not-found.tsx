import Link from "next/link";
import { ArrowLeft, Compass, Search, Wrench } from "lucide-react";
import { Logo } from "@/components/navbar/Logo";
import { AUDIO_TOOLS } from "@/components/tools/tool-data";

export const metadata = {
    title: "Page not found",
    robots: { index: false, follow: false },
};

/** Four popular tools to offer as a way out of the dead end. */
const SUGGESTIONS = AUDIO_TOOLS.filter((tool) => tool.featured).slice(0, 4);

export default function NotFound() {
    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden">
            {/* Ambient glow */}
            <div
                aria-hidden="true"
                className="
          pointer-events-none
          absolute
          left-1/2
          top-[-140px]
          h-96
          w-96
          -translate-x-1/2
          rounded-full
          bg-amber/[0.06]
          blur-[110px]
        "
            />

            <div className="container-studio relative flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24">
                <div className="mb-8">
                    <Logo />
                </div>

                <span
                    className="
            mb-6
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            border
            border-amber/20
            bg-amber/10
            text-amber
          "
                >
                    <Compass className="h-7 w-7" strokeWidth={1.6} />
                </span>

                <p
                    className="
            mb-3
            font-mono
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.18em]
            text-amber
            sm:text-[10px]
          "
                >
                    Error 404
                </p>

                <h1
                    className="
            font-display
            text-[2rem]
            font-semibold
            leading-[1.05]
            tracking-[-0.04em]
            text-graphite
            sm:text-4xl
            lg:text-5xl
            dark:text-mist
          "
                >
                    This page doesn&apos;t exist
                </h1>

                <p className="mt-4 max-w-md text-sm leading-6 text-graphite-muted sm:text-base dark:text-mist-muted">
                    The link may be out of date, or the page may have moved. Here are a few
                    places worth trying instead.
                </p>

                {/* Primary actions */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/"
                        className="
              group
              inline-flex
              min-h-12
              items-center
              justify-center
              gap-2
              rounded-full
              border
              border-amber/40
              bg-amber
              px-6
              py-3
              text-sm
              font-semibold
              text-ink
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:gap-3
              hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]
              active:translate-y-0
              active:scale-[0.98]
            "
                    >
                        <ArrowLeft
                            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                            strokeWidth={2}
                        />
                        Back to home
                    </Link>

                    <Link
                        href="/#tools"
                        className="
              inline-flex
              min-h-12
              items-center
              justify-center
              gap-2
              rounded-full
              border
              border-paper-border
              px-6
              py-3
              text-sm
              font-semibold
              text-graphite
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:border-amber/50
              hover:text-amber
              active:translate-y-0
              dark:border-ink-border
              dark:text-mist
            "
                    >
                        <Search className="h-4 w-4" strokeWidth={1.8} />
                        Browse all {AUDIO_TOOLS.length} tools
                    </Link>
                </div>

                {/* Suggested tools */}
                <div className="mt-12 w-full max-w-2xl">
                    <div className="mb-4 flex items-center justify-center gap-2.5">
                        <span aria-hidden="true" className="h-px w-5 bg-amber" />
                        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-amber">
                            Popular tools
                        </span>
                        <span aria-hidden="true" className="h-px w-5 bg-amber" />
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {SUGGESTIONS.map((tool) => {
                            const Icon = tool.icon;

                            return (
                                <Link
                                    key={tool.href}
                                    href={tool.href}
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

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium text-graphite dark:text-mist">
                                            {tool.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] text-graphite-muted dark:text-mist-muted">
                                            {tool.description}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <p className="mt-10 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                    <Wrench className="h-3 w-3" strokeWidth={1.8} />
                    Still stuck?{" "}
                    <Link href="/support" className="text-amber transition-colors hover:text-amber-strong">
                        Contact support
                    </Link>
                </p>
            </div>
        </main>
    );
}