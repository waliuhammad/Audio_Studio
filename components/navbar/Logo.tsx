"use client";

import Link from "next/link";

const DOTS = [
  // Left baseline
  { x: 3, y: 50, r: 1.5 },
  { x: 8, y: 50, r: 1.6 },
  { x: 13, y: 50, r: 1.7 },
  { x: 18, y: 50, r: 1.8 },

  // First rise
  { x: 24, y: 47, r: 1.9 },
  { x: 24, y: 53, r: 1.9 },

  { x: 30, y: 42, r: 2 },
  { x: 30, y: 47, r: 2 },
  { x: 30, y: 53, r: 2 },
  { x: 30, y: 58, r: 2 },

  // Main peak
  { x: 36, y: 35, r: 2.1 },
  { x: 36, y: 41, r: 2.1 },
  { x: 36, y: 47, r: 2.1 },
  { x: 36, y: 53, r: 2.1 },
  { x: 36, y: 59, r: 2.1 },
  { x: 36, y: 65, r: 2.1 },

  { x: 42, y: 23, r: 2.2 },
  { x: 42, y: 29, r: 2.2 },
  { x: 42, y: 35, r: 2.2 },
  { x: 42, y: 41, r: 2.2 },
  { x: 42, y: 47, r: 2.2 },
  { x: 42, y: 53, r: 2.2 },
  { x: 42, y: 59, r: 2.2 },
  { x: 42, y: 65, r: 2.2 },
  { x: 42, y: 71, r: 2.2 },

  // Center dip
  { x: 48, y: 39, r: 2.2 },
  { x: 48, y: 45, r: 2.2 },
  { x: 48, y: 51, r: 2.2 },
  { x: 48, y: 57, r: 2.2 },
  { x: 48, y: 63, r: 2.2 },

  // Second peak
  { x: 54, y: 30, r: 2.2 },
  { x: 54, y: 36, r: 2.2 },
  { x: 54, y: 42, r: 2.2 },
  { x: 54, y: 48, r: 2.2 },
  { x: 54, y: 54, r: 2.2 },
  { x: 54, y: 60, r: 2.2 },
  { x: 54, y: 66, r: 2.2 },

  // Falling side
  { x: 60, y: 40, r: 2 },
  { x: 60, y: 45, r: 2 },
  { x: 60, y: 50, r: 2 },
  { x: 60, y: 55, r: 2 },
  { x: 60, y: 60, r: 2 },

  { x: 66, y: 45, r: 1.9 },
  { x: 66, y: 50, r: 1.9 },
  { x: 66, y: 55, r: 1.9 },

  // Fading line
  { x: 73, y: 48, r: 1.7 },
  { x: 79, y: 49, r: 1.6 },
  { x: 85, y: 50, r: 1.5 },
  { x: 91, y: 50, r: 1.4 },
  { x: 97, y: 50, r: 1.3 },
  { x: 103, y: 50, r: 1.2 },
];

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Audio Studio home"
      className="group flex min-w-0 items-center gap-1.5 sm:gap-2.5"
    >
      {/* ====================================================== */}
      {/* CUSTOM WAVEFORM MARK                                   */}
      {/* ====================================================== */}

      <svg
        width="104"
        height="58"
        viewBox="0 0 108 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-[62px] shrink-0 overflow-visible sm:h-[58px] sm:w-[104px]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="audioStudioGradient"
            x1="0"
            y1="0"
            x2="108"
            y2="0"
          >
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="27%" stopColor="#f97316" />
            <stop offset="52%" stopColor="#ec4899" />
            <stop offset="73%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <filter
            id="audioStudioGlow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur
              stdDeviation="1.8"
              result="blur"
            />

            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Very subtle center line */}
        <line
          x1="0"
          y1="50"
          x2="106"
          y2="50"
          stroke="currentColor"
          strokeWidth="0.6"
          strokeOpacity="0.08"
        />

        {/* Dotted waveform */}
        <g
          fill="url(#audioStudioGradient)"
          filter="url(#audioStudioGlow)"
          className="
            transition-all
            duration-500
            group-hover:brightness-110
          "
        >
          {DOTS.map((dot, index) => (
            <circle
              key={index}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
            />
          ))}
        </g>
      </svg>

      {/* ====================================================== */}
      {/* WORDMARK                                                */}
      {/* ====================================================== */}

      <div className="flex min-w-0 flex-col justify-center leading-none">
        <span
          className="
            font-display
            text-[13px]
            font-medium
            tracking-[0.06em]
            text-graphite
            dark:text-mist
            sm:text-[18px]
            sm:tracking-[0.10em]
          "
        >
          AUDIO
        </span>

        <span
          className="
            mt-[3px]
            block
            text-[7px]
            font-medium
            uppercase
            tracking-[0.32em]
            text-graphite-muted
            dark:text-mist-muted
            sm:mt-[5px]
            sm:text-[8px]
            sm:tracking-[0.48em]
          "
        >
          STUDIO
        </span>
      </div>
    </Link>
  );
}