import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/Footer/Footer";
import { AUDIO_TOOLS } from "@/components/tools/tool-data";
import {
    ArrowRight,
    Cpu,
    Gauge,
    Layers,
    Lock,
    Sparkles,
    Wallet,
} from "lucide-react";

export const metadata: Metadata = {
    title: "About — Audio Studio",
    description:
        "Why we built Audio Studio: a fast, private, no-nonsense audio and video toolkit that runs in your browser.",
};

const PRINCIPLES = [
    {
        icon: Lock,
        title: "Private by default",
        body: "Wherever a job can run on your device, it does. Your files stay with you, and anything processed on our servers is deleted the moment it's returned.",
    },
    {
        icon: Gauge,
        title: "Fast over feature-stuffed",
        body: "Most people need to cut a clip, not learn a DAW. Every tool opens straight into the work — no project setup, no onboarding tour.",
    },
    {
        icon: Wallet,
        title: "Honest limits",
        body: "The free tier is genuinely usable, not a demo with a watermark. We tell you what the limits are up front instead of hiding them behind a signup wall.",
    },
    {
        icon: Cpu,
        title: "No account to try it",
        body: "Open a tool, drop a file, get your result. You only make an account when you actually want to save work across sessions.",
    },
];

const STATS = [
    { value: `${AUDIO_TOOLS.length}`, label: "Focused tools" },
    { value: "0", label: "Files stored after processing" },
    { value: "200 MB", label: "Max upload size" },
    { value: "Free", label: "To start, no card" },
];

const sectionEyebrowClass =
    "mb-3 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-amber sm:mb-4 sm:text-[10px]";

export default function AboutPage() {
    return (
        <>
            <Navbar />

            <main>
                {/* ================================================= */}
                {/* HERO                                              */}
                {/* ================================================= */}

                <section className="relative overflow-hidden py-14 sm:py-20 lg:py-24">
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

                    <div className="container-studio relative">
                        <div className="mx-auto max-w-3xl text-center">
                            <div className={`${sectionEyebrowClass} justify-center`}>
                                <span className="h-px w-5 bg-amber sm:w-6" />
                                About Audio Studio
                            </div>

                            <h1
                                className="
                  font-display
                  text-[2.35rem]
                  font-semibold
                  leading-[1.02]
                  tracking-[-0.04em]
                  text-graphite
                  sm:text-5xl
                  lg:text-[3.6rem]
                  dark:text-mist
                "
                            >
                                Audio editing without
                                <span className="text-amber"> the ceremony</span>
                            </h1>

                            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-graphite-muted sm:text-base dark:text-mist-muted">
                                Most audio work is small. Trim thirty seconds off a voice note.
                                Pull the audio out of a screen recording. Make a ringtone. None
                                of that should require installing a 2 GB program or uploading
                                your files to somewhere you don&apos;t trust.
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:mt-14 lg:grid-cols-4">
                            {STATS.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface
                    px-4
                    py-5
                    text-center
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-amber/40
                    dark:border-ink-border
                    dark:bg-ink-surface
                  "
                                >
                                    <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-amber sm:text-3xl">
                                        {stat.value}
                                    </p>
                                    <p className="mt-1.5 font-mono text-[9px] uppercase leading-4 tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ================================================= */}
                {/* STORY                                             */}
                {/* ================================================= */}

                <section className="py-14 sm:py-18 lg:py-20">
                    <div className="container-studio">
                        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                            <div>
                                <div className={sectionEyebrowClass}>
                                    <span className="h-px w-5 bg-amber sm:w-6" />
                                    Why we built it
                                </div>

                                <h2
                                    className="
                    font-display
                    text-[1.9rem]
                    font-semibold
                    leading-[1.05]
                    tracking-[-0.035em]
                    text-graphite
                    sm:text-4xl
                    dark:text-mist
                  "
                                >
                                    The tools existed. They were just miserable to use.
                                </h2>
                            </div>

                            <div className="space-y-4 text-sm leading-7 text-graphite-muted sm:text-[15px] dark:text-mist-muted">
                                <p>
                                    Search for a way to trim an MP3 and you land on a site covered
                                    in download buttons that aren&apos;t download buttons, a
                                    five-minute queue, and a result stamped with someone
                                    else&apos;s logo. The alternative is professional software
                                    that assumes you want to mix an album.
                                </p>

                                <p>
                                    Audio Studio is the middle ground. Each tool does one job and
                                    opens directly into it. The waveform editor gives you a real
                                    timeline with selection, zoom, and undo when you need
                                    precision — and when you just need a quick cut, the
                                    single-purpose tools get out of your way.
                                </p>

                                <p>
                                    Where the browser can do the work, we let it. That means your
                                    file never leaves your machine, the result is instant, and
                                    there&apos;s no queue. When a job genuinely needs server-side
                                    processing, we run it, hand back the file, and delete it.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ================================================= */}
                {/* PRINCIPLES                                        */}
                {/* ================================================= */}

                <section className="py-14 sm:py-18 lg:py-20">
                    <div className="container-studio">
                        <div className="mb-9 max-w-2xl sm:mb-12">
                            <div className={sectionEyebrowClass}>
                                <span className="h-px w-5 bg-amber sm:w-6" />
                                What we hold to
                            </div>

                            <h2
                                className="
                  font-display
                  text-[1.9rem]
                  font-semibold
                  leading-[1.05]
                  tracking-[-0.035em]
                  text-graphite
                  sm:text-4xl
                  dark:text-mist
                "
                            >
                                Four rules we don&apos;t bend
                            </h2>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {PRINCIPLES.map((principle) => {
                                const Icon = principle.icon;

                                return (
                                    <div
                                        key={principle.title}
                                        className="
                      group
                      rounded-2xl
                      border
                      border-paper-border
                      bg-paper-surface
                      p-5
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:border-amber/40
                      hover:shadow-lg
                      hover:shadow-ink/5
                      dark:border-ink-border
                      dark:bg-ink-surface
                      dark:hover:shadow-black/20
                      sm:p-6
                    "
                                    >
                                        <span
                                            className="
                        mb-4
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-amber/20
                        bg-amber/10
                        text-amber
                      "
                                        >
                                            <Icon className="h-5 w-5" strokeWidth={1.7} />
                                        </span>

                                        <h3 className="text-[15px] font-semibold text-graphite dark:text-mist">
                                            {principle.title}
                                        </h3>

                                        <p className="mt-2 text-[13px] leading-6 text-graphite-muted dark:text-mist-muted">
                                            {principle.body}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ================================================= */}
                {/* CTA                                               */}
                {/* ================================================= */}

                <section className="pb-16 pt-6 sm:pb-20 lg:pb-24">
                    <div className="container-studio">
                        <div
                            className="
                relative
                overflow-hidden
                rounded-2xl
                border
                border-amber/25
                bg-amber/[0.04]
                px-6
                py-12
                text-center
                sm:px-10
                sm:py-14
                dark:bg-amber/[0.03]
              "
                        >
                            <div
                                aria-hidden="true"
                                className="
                  pointer-events-none
                  absolute
                  left-1/2
                  top-0
                  h-56
                  w-56
                  -translate-x-1/2
                  rounded-full
                  bg-amber/[0.10]
                  blur-[90px]
                "
                            />

                            <div className="relative">
                                <span
                                    className="
                    mx-auto
                    mb-5
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-amber/25
                    bg-amber/10
                    text-amber
                  "
                                >
                                    <Sparkles className="h-5 w-5" strokeWidth={1.7} />
                                </span>

                                <h2
                                    className="
                    font-display
                    text-[1.7rem]
                    font-semibold
                    leading-[1.05]
                    tracking-[-0.035em]
                    text-graphite
                    sm:text-[2.1rem]
                    dark:text-mist
                  "
                                >
                                    Try it with a file you already have
                                </h2>

                                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-graphite-muted dark:text-mist-muted">
                                    No account, no upload queue. Drop something into the editor
                                    and see how far you get.
                                </p>

                                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                                    <Link
                                        href="/editor"
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
                      hover:gap-4
                      hover:border-amber
                      hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]
                      active:translate-y-0
                      active:scale-[0.98]
                    "
                                    >
                                        Open the editor
                                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                                    </Link>

                                    <Link
                                        href="/#tools"
                                        className="
                      group
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
                                        <Layers className="h-4 w-4" strokeWidth={1.8} />
                                        Browse all {AUDIO_TOOLS.length} tools
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}