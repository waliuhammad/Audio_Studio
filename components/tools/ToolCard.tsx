"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AudioTool } from "./tool-data";

interface ToolCardProps {
  tool: AudioTool;
  featured?: boolean;
}

export function ToolCard({
  tool,
  featured = false,
}: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <Link
      href={tool.href}
      className={`
        group
        flex
        min-w-0
        min-h-[118px]
        flex-col
        justify-between
        overflow-hidden
        rounded-xl
        border
        border-paper-border
        bg-paper-surface
        px-3.5
        py-3.5
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-amber/50
        hover:bg-paper-raised
        hover:shadow-sm
        dark:border-ink-border
        dark:bg-ink-surface
        dark:hover:border-amber/50
        dark:hover:bg-ink-raised
        sm:px-4
        sm:py-4
        ${
          featured
            ? "border-amber/30 dark:border-amber/30"
            : ""
        }
      `}
    >
      {/* ================================================= */}
      {/* TOP                                               */}
      {/* ================================================= */}

      <div className="flex min-w-0 items-start justify-between gap-2.5 sm:gap-3">

        {/* Icon + Name */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">

          {/* Icon */}
          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-amber/20
              bg-amber/10
              text-amber
              dark:border-amber/20
              dark:bg-amber/10
              sm:h-14
              sm:w-14
            "
          >
            <Icon
              className="
                h-5.5
                w-5.5
                sm:h-7
                sm:w-7
              "
              strokeWidth={1.8}
            />
          </div>

          {/* Name + Badge */}
          <div className="min-w-0">
            <h3
              className="
                truncate
                text-[13px]
                font-semibold
                tracking-tight
                text-graphite
                dark:text-mist
                sm:text-sm
              "
            >
              {tool.name}
            </h3>

            {tool.badge && (
              <span
                className="
                  mt-1
                  block
                  truncate
                  font-mono
                  text-[8px]
                  font-medium
                  uppercase
                  tracking-[0.08em]
                  text-amber
                  sm:text-[9px]
                  sm:tracking-wider
                "
              >
                {tool.badge}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <span
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-full
            text-graphite-faint
            transition-all
            duration-200
            group-hover:bg-amber
            group-hover:text-ink
            dark:text-mist-faint
          "
        >
          <ArrowUpRight
            className="h-3.5 w-3.5"
            strokeWidth={1.8}
          />
        </span>
      </div>

      {/* ================================================= */}
      {/* DESCRIPTION                                       */}
      {/* ================================================= */}

      <p
        className="
          min-w-0
          truncate
          pl-0
          text-[11px]
          leading-5
          text-graphite-muted
          dark:text-mist-muted
          sm:pl-[68px]
          sm:text-xs
        "
      >
        {tool.description}
      </p>
    </Link>
  );
}