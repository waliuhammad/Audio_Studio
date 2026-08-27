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
      aria-label={`Open ${tool.name}`}
      className={`
        group
        flex
        min-w-0
        min-h-[128px]
        flex-col
        items-center
        justify-center
        gap-2
        overflow-hidden
        rounded-xl
        border
        border-paper-border
        bg-paper-surface
        px-2.5
        py-3
        text-center
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
        sm:min-h-[118px]
        sm:items-stretch
        sm:justify-between
        sm:px-4
        sm:py-4
        sm:text-left
        ${
          featured
            ? "border-amber/30 dark:border-amber/30"
            : ""
        }
      `}
    >
      {/* TOP */}
      <div
        className="
          flex
          min-w-0
          w-full
          flex-col
          items-center
          justify-center
          gap-2
          sm:w-auto
          sm:flex-row
          sm:items-start
          sm:justify-between
          sm:gap-3
        "
      >
        {/* ICON + NAME */}
        <div
          className="
            flex
            min-w-0
            w-full
            flex-col
            items-center
            gap-2
            sm:w-auto
            sm:flex-row
            sm:items-center
            sm:gap-3
          "
        >
          {/* ICON */}
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
              dark:border-amber/20
              dark:bg-amber/10
              sm:h-11
              sm:w-11
            "
          >
            <Icon
              className="
                h-[18px]
                w-[18px]
                sm:h-5
                sm:w-5
              "
              strokeWidth={1.8}
            />
          </div>

          {/* NAME + BADGE */}
          <div className="min-w-0 w-full sm:w-auto">
            <h3
              className="
                line-clamp-2
                text-[11px]
                font-semibold
                leading-normal
                tracking-tight
                text-graphite
                dark:text-mist
                sm:truncate
                sm:text-[13px]
                sm:leading-relaxed
              "
            >
              {tool.name}
            </h3>

            {tool.badge && (
              <span
                className="
                  mt-1
                  hidden
                  truncate
                  font-mono
                  text-[8px]
                  font-medium
                  uppercase
                  tracking-[0.08em]
                  text-amber
                  sm:block
                  sm:text-[9px]
                  sm:tracking-wider
                "
              >
                {tool.badge}
              </span>
            )}
          </div>
        </div>

        {/* ARROW */}
        <span
          className="
            hidden
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
            sm:flex
          "
        >
          <ArrowUpRight
            className="h-3.5 w-3.5"
            strokeWidth={1.8}
          />
        </span>
      </div>

      {/* DESCRIPTION */}
      <p
        className="
          hidden
          min-w-0
          truncate
          pl-0
          text-[11px]
          leading-5
          text-graphite-muted
          dark:text-mist-muted
          sm:block
          sm:pl-[68px]
          sm:text-xs
        "
      >
        {tool.description}
      </p>
    </Link>
  );
}