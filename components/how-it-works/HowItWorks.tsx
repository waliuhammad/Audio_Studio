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
        scroll-mt-24
        pt-8
        pb-20
        sm:scroll-mt-28
        sm:pt-10
        sm:pb-24
        lg:scroll-mt-32
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
          grid-cols-1
          items-stretch
          gap-3
          sm:mt-9
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
                  flex
                  h-[170px]
                  w-full
                  min-w-0
                  flex-col
                  rounded-2xl
                  border
                  border-paper-border
                  bg-paper-surface
                  p-4
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
                  sm:p-6
                "
              >
                {/* ========================================= */}
                {/* TOP ROW                                   */}
                {/* ========================================= */}

                <div className="flex items-start justify-between gap-3">
                  {/* Icon */}
                  <div
                    className="
                      flex
                      h-12
                      w-12
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
                        h-6
                        w-6
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

                <div className="mt-auto pt-4 sm:pt-6">
                  <h3
                    className="
                      truncate
                      font-display
                      text-base
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
                      truncate
                      text-[11px]
                      leading-5
                      text-graphite-muted
                      dark:text-mist-muted
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