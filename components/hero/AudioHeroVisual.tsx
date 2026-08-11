"use client";

import { motion } from "framer-motion";
import {
  AudioLines,
  Headphones,
  Radio,
  Volume2,
} from "lucide-react";

const WAVEFORM = [
  18, 28, 42, 24, 55, 36, 68, 32, 48, 76,
  42, 62, 30, 72, 46, 84, 38, 60, 28, 52,
  74, 34, 58, 26, 44, 70, 36, 64, 30, 48,
  66, 38, 78, 28, 54, 42, 68, 32, 50, 24,
];

export function AudioHeroVisual() {
  return (
    <div className="relative mx-auto h-[390px] w-full max-w-[560px]">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.055] blur-[90px]"
        aria-hidden="true"
      />

      {/* Outer rotating signal ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: "linear",
        }}
       className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber/50 dark:border-amber/10"
      >
        {/* Moving signal ball */}
        <span className="absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-amber shadow-[0_0_10px_rgba(245,158,11,0.45)]" />
      </motion.div>

      {/* Main technical circle */}
      <div className="absolute left-1/2 top-1/2 h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-graphite/25 bg-graphite/[0.015] dark:border-ink-border/70 dark:bg-transparent">
        {/* Small amber markers */}
        <span className="absolute left-1/2 top-[-2px] h-1 w-7 -translate-x-1/2 rounded-full bg-amber/60" />

        <span className="absolute bottom-[-2px] left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-amber/35" />

        <span className="absolute left-[-2px] top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-amber/25" />

        <span className="absolute right-[-2px] top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-amber/25" />
      </div>

      {/* Inner main audio interface */}
      <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-graphite/20 bg-paper/90 shadow-2xl shadow-ink/10 backdrop-blur-xl dark:border-ink-border dark:bg-ink/85 dark:shadow-black/40">
        {/* Inner ring */}
        <div className="absolute inset-5 rounded-full border border-amber/15" />

        {/* Central console */}
        <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full border border-amber/20 bg-ink shadow-inner dark:bg-black/40">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber/30 bg-amber/[0.06]">
            <Headphones
              className="h-7 w-7 text-amber"
              strokeWidth={1.35}
            />

            {/* Pulse */}
            <motion.span
              animate={{
                scale: [1, 1.45, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute inset-0 rounded-full border border-amber/40"
            />
          </div>

          <span className="mt-3 font-mono text-[8px] uppercase tracking-[0.25em] text-mist/40">
            Audio Studio
          </span>
        </div>

        {/* Live indicator */}
        <div className="absolute left-7 top-8 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />

          <span className="font-mono text-[7px] uppercase tracking-wider text-graphite-faint dark:text-mist-faint">
            Live
          </span>
        </div>

        {/* Audio icon */}
        <div className="absolute bottom-8 right-7">
          <AudioLines
            className="h-4 w-4 text-amber/60"
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Animated waveform */}
      <div className="absolute left-1/2 top-1/2 flex h-20 w-[280px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[3px]">
        {WAVEFORM.map((height, index) => (
          <motion.span
            key={index}
            animate={{
              scaleY: [0.5, 1, 0.65, 0.9, 0.5],
              opacity: [0.45, 0.9, 0.6, 0.85, 0.45],
            }}
            transition={{
              duration: 2.2 + (index % 5) * 0.12,
              repeat: Infinity,
              delay: index * 0.025,
              ease: "easeInOut",
            }}
            className="w-[3px] origin-center rounded-full bg-amber"
            style={{
              height: `${height}%`,
            }}
          />
        ))}
      </div>

      {/* Signal status */}
      <div className="absolute right-1 top-3">
        <div className="flex items-center gap-2">
          <Radio
            className="h-3.5 w-3.5 text-amber"
            strokeWidth={1.5}
          />

          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
            Signal active
          </span>
        </div>
      </div>

      {/* Current track */}
      <div className="absolute bottom-2 left-0 rounded-xl border border-paper-border bg-paper/80 px-3.5 py-2.5 shadow-lg backdrop-blur-xl dark:border-ink-border dark:bg-ink/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/10 text-amber">
            <AudioLines
              className="h-3.5 w-3.5"
              strokeWidth={1.7}
            />
          </div>

          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
              Current track
            </p>

            <p className="mt-0.5 text-[11px] font-medium text-graphite dark:text-mist">
              studio_session.wav
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 w-20 overflow-hidden rounded-full bg-graphite/10 dark:bg-mist/10">
            <motion.div
              animate={{
                width: ["30%", "72%", "48%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-full rounded-full bg-amber"
            />
          </div>

          <span className="font-mono text-[8px] text-graphite-faint dark:text-mist-faint">
            01:42
          </span>
        </div>
      </div>

      {/* Volume indicator */}
      <div className="absolute bottom-3 right-0 flex items-center gap-2 rounded-xl border border-paper-border bg-paper/80 px-3 py-2 backdrop-blur-xl dark:border-ink-border dark:bg-ink/80">
        <Volume2
          className="h-3.5 w-3.5 text-amber"
          strokeWidth={1.5}
        />

        <div className="flex h-5 items-end gap-[2px]">
          {[2, 4, 7, 10, 7, 5].map((height, index) => (
            <motion.span
              key={index}
              animate={{
                height: [`${height}px`, `${height + 4}px`, `${height}px`],
              }}
              transition={{
                duration: 1.2,
                delay: index * 0.08,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-[2px] rounded-full bg-amber/70"
            />
          ))}
        </div>
      </div>

      {/* Technical labels */}
      <span className="absolute left-2 top-5 font-mono text-[7px] tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
        AS / 01
      </span>

      <span className="absolute bottom-0 right-2 font-mono text-[7px] tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
        44.1 kHz
      </span>
    </div>
  );
}