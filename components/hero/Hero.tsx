"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { AudioHeroVisual } from "./AudioHeroVisual";

export function Hero() {
  const reduceMotion = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.55,
            delay,
            ease: [0.16, 1, 0.3, 1] as const,
          },
        };

  return (
    <section
      className="
        relative
        overflow-hidden
        pb-8
        pt-6
        sm:pb-10
        sm:pt-8
        lg:pb-10
        lg:pt-9
      "
    >
      {/* ================================================= */}
      {/* SUBTLE AMBIENT GLOW                               */}
      {/* ================================================= */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-40
          top-0
          h-64
          w-64
          rounded-full
          bg-amber/[0.035]
          blur-[90px]
          sm:h-72
          sm:w-72
          sm:blur-[100px]
        "
      />

      <div className="container-studio">

        {/* ================================================= */}
        {/* HERO GRID                                         */}
        {/* ================================================= */}

        <div
          className="
            grid
            items-center
            gap-8
            lg:grid-cols-[0.9fr_1.1fr]
            lg:gap-0
          "
        >

          {/* ================================================= */}
          {/* LEFT CONTENT                                      */}
          {/* ================================================= */}

          <div className="relative z-10 min-w-0">

            {/* Eyebrow */}
            <motion.div {...fadeUp(0)}>
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  font-mono
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-amber
                  sm:text-[10px]
                  sm:tracking-[0.2em]
                "
              >
                <Sparkles
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={1.7}
                />

                <span>Audio &amp; Video Studio</span>
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              {...fadeUp(0.06)}
              className="
                mt-4
                max-w-xl
                font-display
                text-[2.75rem]
                font-semibold
                leading-[0.96]
                tracking-[-0.045em]
                text-graphite
                dark:text-mist
                sm:mt-5
                sm:text-5xl
                sm:tracking-[-0.05em]
                md:text-6xl
                lg:text-[4.35rem]
              "
            >
              Make your sound
              <br />
              <span className="text-amber">
                stand out.
              </span>
            </motion.h1>

            {/* Accent */}
            <motion.div
              {...fadeUp(0.11)}
              className="
                mt-4
                flex
                items-center
                gap-2
                sm:mt-5
              "
            >
              <span className="h-[2px] w-10 rounded-full bg-amber sm:w-12" />
              <span className="h-[2px] w-2 rounded-full bg-amber/50" />
              <span className="h-[2px] w-1 rounded-full bg-amber/25" />
            </motion.div>

            {/* Description */}
            <motion.p
              {...fadeUp(0.15)}
              className="
                mt-4
                max-w-md
                text-[15px]
                leading-6
                text-graphite-muted
                dark:text-mist-muted
                sm:mt-5
                sm:text-base
                sm:leading-7
                md:text-lg
              "
            >
              A simple creative studio for editing,
              transforming, and preparing audio and video.
            </motion.p>

            {/* ================================================= */}
            {/* ACTIONS                                           */}
            {/* ================================================= */}

            <motion.div
              {...fadeUp(0.21)}
              className="
                mt-6
                flex
                flex-col
                items-stretch
                gap-4
                sm:mt-7
                sm:flex-row
                sm:flex-wrap
                sm:items-center
                sm:gap-5
              "
            >
              {/* Primary */}
              <Link
                href="/editor"
                className="
                  group
                  inline-flex
                  min-h-12
                  items-center
                  justify-center
                  gap-3
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
                  hover:gap-4
                  hover:border-amber
                  hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]
                  active:scale-[0.98]
                  sm:min-h-0
                  sm:justify-start
                "
              >
                <span>Open Studio</span>

                <span
                  className="
                    flex
                    h-6
                    w-6
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-ink/10
                  "
                >
                  <ArrowRight
                    className="
                      h-3.5
                      w-3.5
                      transition-transform
                      duration-300
                      group-hover:translate-x-0.5
                    "
                    strokeWidth={2}
                  />
                </span>
              </Link>

              {/* Secondary */}
              <Link
                href="/#tools"
                className="
                  group
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-2
                  text-sm
                  font-medium
                  text-graphite-muted
                  transition-colors
                  duration-200
                  hover:text-amber
                  dark:text-mist-muted
                  dark:hover:text-amber
                  sm:min-h-0
                  sm:justify-start
                "
              >
                <span>Browse the toolkit</span>

                <span
                  className="
                    font-mono
                    text-[10px]
                    text-graphite-faint
                    transition-colors
                    group-hover:text-amber
                    dark:text-mist-faint
                  "
                >
                  19 tools
                </span>

                <ArrowRight
                  className="
                    h-3.5
                    w-3.5
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                  strokeWidth={1.6}
                />
              </Link>
            </motion.div>

            {/* ================================================= */}
            {/* DETAILS                                           */}
            {/* ================================================= */}

            <motion.div
              {...fadeUp(0.28)}
              className="
                mt-6
                flex
                items-center
                justify-between
                gap-3
                border-t
                border-paper-border
                pt-4
                dark:border-ink-border
                sm:mt-7
                sm:justify-start
                sm:gap-5
              "
            >
              {/* Tools */}
              <div className="min-w-0">
                <p
                  className="
                    font-mono
                    text-sm
                    font-semibold
                    text-graphite
                    dark:text-mist
                    sm:text-sm
                  "
                >
                  18+
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    uppercase
                    tracking-[0.12em]
                    text-graphite-faint
                    dark:text-mist-faint
                    sm:text-[9px]
                    sm:tracking-wider
                  "
                >
                  Tools
                </p>
              </div>

              <span
                className="
                  h-6
                  w-px
                  shrink-0
                  bg-paper-border
                  dark:bg-ink-border
                "
              />

              {/* Browser */}
              <div className="min-w-0">
                <p
                  className="
                    font-mono
                    text-sm
                    font-semibold
                    text-graphite
                    dark:text-mist
                  "
                >
                  Browser
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    uppercase
                    tracking-[0.12em]
                    text-graphite-faint
                    dark:text-mist-faint
                    sm:text-[9px]
                    sm:tracking-wider
                  "
                >
                  No install
                </p>
              </div>

              <span
                className="
                  h-6
                  w-px
                  shrink-0
                  bg-paper-border
                  dark:bg-ink-border
                "
              />

              {/* Simple */}
              <div className="min-w-0">
                <p
                  className="
                    font-mono
                    text-sm
                    font-semibold
                    text-graphite
                    dark:text-mist
                  "
                >
                  Simple
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    uppercase
                    tracking-[0.12em]
                    text-graphite-faint
                    dark:text-mist-faint
                    sm:text-[9px]
                    sm:tracking-wider
                  "
                >
                  Focused editing
                </p>
              </div>
            </motion.div>
          </div>

          {/* ================================================= */}
          {/* RIGHT — AUDIO VISUAL                              */}
          {/* ================================================= */}

          <motion.div
            initial={
              reduceMotion
                ? undefined
                : {
                    opacity: 0,
                    scale: 0.97,
                    y: 14,
                  }
            }
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }
            }
            transition={{
              duration: 0.7,
              delay: 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="
              relative
              mx-auto
              flex
              w-full
              min-w-0
              max-w-[560px]
              items-center
              justify-center
              lg:mx-0
              lg:max-w-none
            "
          >
            <div
              className="
                w-full
                min-w-0
                scale-[0.88]
                sm:scale-95
                md:scale-100
                lg:scale-100
              "
            >
              <AudioHeroVisual />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}