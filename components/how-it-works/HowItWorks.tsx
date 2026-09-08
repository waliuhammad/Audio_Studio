"use client";

import { motion } from "framer-motion";
import {
  Upload,
  SlidersHorizontal,
  AudioWaveform,
  Download,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Upload",
    description: "Bring in your audio or video.",
    icon: Upload,
  },
  {
    number: "02",
    title: "Choose",
    description: "Pick the tool you need.",
    icon: SlidersHorizontal,
  },
  {
    number: "03",
    title: "Edit",
    description: "Shape and refine your media.",
    icon: AudioWaveform,
  },
  {
    number: "04",
    title: "Export",
    description: "Download your finished file.",
    icon: Download,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="
        container-studio
        scroll-mt-32
        pt-8
        pb-20
        sm:scroll-mt-40
        sm:pt-10
        sm:pb-24
        lg:scroll-mt-44
        lg:pt-12
        lg:pb-28
      "
    >
      {/* ================================================= */}
      {/* HEADING                                           */}
      {/* ================================================= */}

      <div>
        <div
          className="
            mb-3
            flex
            items-center
            gap-2.5
            sm:mb-4
            sm:gap-3
          "
        >
          <span className="h-px w-6 bg-amber sm:w-8" />

          <span
            className="
              font-mono
              text-[9px]
              uppercase
              tracking-[0.2em]
              text-amber
              sm:text-[10px]
              sm:tracking-[0.22em]
            "
          >
            How it works
          </span>
        </div>

        <h2
          className="
            max-w-2xl
            font-display
            text-[1.9rem]
            font-semibold
            leading-[1.05]
            tracking-[-0.035em]
            text-graphite
            dark:text-mist
            sm:text-4xl
            lg:text-5xl
          "
        >
          Simple from start to finish.
        </h2>
      </div>

      {/* ================================================= */}
      {/* STEPS                                              */}
      {/* ================================================= */}

      <div
        className="
          mt-7
          grid
          max-w-[340px]
          mx-auto
          grid-cols-2
          items-stretch
          gap-4
          sm:mt-9
          sm:max-w-none
          sm:mx-0
          sm:grid-cols-2
          sm:gap-4
          lg:grid-cols-4
        "
      >
        {STEPS.map((step, index) => {
          const Icon = step.icon;

          return (
            <motion.div
              key={step.number}
              initial={{
                opacity: 0,
                y: 12,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.25,
              }}
              transition={{
                duration: 0.45,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="h-full min-w-0"
            >
              <div
                className="
                  relative
                  flex
                  h-[140px]
                  w-full
                  min-w-0
                  flex-col
                  items-start
                  rounded-2xl
                  border
                  border-paper-border
                  bg-paper-surface
                  p-3.5
                  text-left
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-amber/40
                  hover:shadow-lg
                  hover:shadow-ink/5
                  dark:border-ink-border
                  dark:bg-ink-surface
                  dark:hover:border-amber/40
                  dark:hover:shadow-black/20
                  sm:h-[180px]
                  sm:items-stretch
                  sm:p-6
                  sm:text-left
                "
              >
                {/* ========================================= */}
                {/* TOP ROW                                   */}
                {/* ========================================= */}

                <div className="relative flex w-full items-center justify-between sm:flex-row sm:items-start sm:justify-between">
                  {/* Icon */}
                  <div
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
                      sm:h-14
                      sm:w-14
                    "
                  >
                    <Icon
                      className="
                        h-[18px]
                        w-[18px]
                        sm:h-7
                        sm:w-7
                      "
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* Number */}
                  <span
                    className="
                      shrink-0
                      font-mono
                      text-[9px]
                      tracking-[0.16em]
                      text-graphite-faint
                      dark:text-mist-faint
                      sm:text-[10px]
                      sm:tracking-[0.18em]
                    "
                  >
                    {step.number}
                  </span>
                </div>

                {/* ========================================= */}
                {/* TEXT                                       */}
                {/* ========================================= */}

                <div className="mt-2.5 flex min-w-0 flex-col items-start sm:mt-4 sm:pt-6">
                  <h3
                    className="
                      truncate
                      w-full
                      font-display
                      text-sm
                      font-semibold
                      text-graphite
                      dark:text-mist
                      sm:text-lg
                    "
                  >
                    {step.title}
                  </h3>

                  <p
                    className="
                      mt-1
                      line-clamp-2
                      text-[11px]
                      leading-4
                      text-graphite-muted
                      dark:text-mist-muted
                      sm:truncate
                      sm:leading-5
                      sm:text-xs
                    "
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}