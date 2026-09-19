"use client";

import Link from "next/link";
import type { AudioTool } from "./tool-data";

interface ToolCardProps {
  tool: AudioTool;
  featured?: boolean;
  /**
   * Tag a non-basic tool "Advanced". Only the Advanced filter asks for it, so
   * those tools carry no tag in the All grid.
   */
  showAdvancedTag?: boolean;
}

export function ToolCard({
  tool,
  featured = false,
  showAdvancedTag = false,
}: ToolCardProps) {
  const Icon = tool.icon;
  const tag = tool.basic ? "Basic" : showAdvancedTag ? "Advanced" : null;

  return (
    <Link
      href={tool.href}
      aria-label={`Open ${tool.name}`}
      className={`
        group
        relative
        flex
        min-w-0
        min-h-[104px]
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
        py-2
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
        sm:min-h-[150px]
        sm:items-stretch
        sm:justify-start
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
      {/*
        TOP: icon on the left, tier tag in the top-right corner. The name and
        description sit BELOW, at the card's full width — squeezed into the
        row beside the icon and tag they were cut to "Video..." on the
        four-column dashboard grid.
      */}
      <div
        className="
          flex
          w-full
          min-w-0
          items-start
          justify-center
          sm:justify-between
          sm:gap-2
        "
      >
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

        {/* TAG: pinned to the corner on phones, in the row from sm up */}
        {tag && (
          <span
            className="
              absolute
              right-1.5
              top-1.5
              shrink-0
              rounded-full
              border
              border-amber/20
              bg-amber/10
              px-1.5
              py-px
              font-mono
              text-[7px]
              font-medium
              uppercase
              tracking-[0.08em]
              text-amber
              sm:static
              sm:px-2
              sm:py-0.5
              sm:text-[9px]
              sm:tracking-[0.12em]
            "
          >
            {tag}
          </span>
        )}
      </div>

      {/* NAME + DESCRIPTION: full width, wrapping to two lines each. */}
      <div className="w-full min-w-0 sm:mt-1">
        <h3
          className="
            line-clamp-2
            text-[11px]
            font-semibold
            leading-snug
            tracking-tight
            text-graphite
            dark:text-mist
            sm:text-sm
          "
        >
          {tool.name}
        </h3>

        <p
          className="
            mt-1
            hidden
            text-[11px]
            leading-5
            text-graphite-muted
            dark:text-mist-muted
            sm:line-clamp-3
            sm:text-xs
          "
        >
          {tool.description}
        </p>
      </div>
    </Link>
  );
}