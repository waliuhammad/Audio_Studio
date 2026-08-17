"use client";

import { useMemo, useState } from "react";
import {
  Grid2X2,
  Search,
  SlidersHorizontal,
  Video,
  X,
} from "lucide-react";

import { ToolCard } from "./ToolCard";
import {
  AUDIO_TOOLS,
  type ToolCategory,
} from "./tool-data";

const CATEGORIES: ("All" | ToolCategory)[] = ["All", "Audio", "Video", "Other"];
export function ToolsSection() {
  const [category, setCategory] =
    useState<"All" | ToolCategory>("All");

  const [query, setQuery] = useState("");

  const filteredTools = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    return AUDIO_TOOLS.filter((tool) => {
      const matchesCategory =
        category === "All" || tool.category === category;

      if (!normalizedQuery) {
        return matchesCategory;
      }

      const searchableText = [
        tool.name,
        tool.description,
        tool.category,
        ...(tool.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesCategory &&
        searchableText.includes(
          normalizedQuery
        )
      );
    });
  }, [category, query]);

  const categoryLabel =
    category === "All" ? "All tools" : `${category} tools`;

  return (
    <section
      id="tools"
      aria-labelledby="tools-heading"
      className="
        relative
        overflow-hidden
        py-12
        sm:py-14
        lg:py-16
      "
    >
      <div className="container-studio">
        {/* Header */}
        <div
          className="
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-end
            lg:justify-between
            lg:gap-8
          "
        >
          {/* Heading */}
          <div className="max-w-2xl">
            <div
              className="
                mb-3
                flex
                items-center
                gap-2
                font-mono
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-amber
                sm:mb-4
                sm:text-[10px]
              "
            >
              <span
                className="
                  h-px
                  w-5
                  bg-amber
                  sm:w-6
                "
              />

              Audio Studio
            </div>

            <h2
              id="tools-heading"
              className="
                max-w-xl
                font-display
                text-[1.9rem]
                font-semibold
                leading-[1.05]
                tracking-[-0.035em]
                text-graphite
                dark:text-mist
                sm:text-3xl
                md:text-4xl
                lg:text-5xl
              "
            >
              Everything you need to
              shape your media.
            </h2>

            <p
              className="
                mt-3
                max-w-xl
                text-[13px]
                leading-6
                text-graphite-muted
                dark:text-mist-muted
                sm:mt-4
                sm:text-sm
                md:text-base
              "
            >
              Trim, convert, combine, and refine
              your audio and video with focused
              tools built for simple editing.
            </p>
          </div>

          {/* Search */}
          <label
            className="
              relative
              w-full
              shrink-0
              lg:max-w-[280px]
            "
          >
            <span className="sr-only">
              Search tools
            </span>

            <Search
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                h-4
                w-4
                -translate-y-1/2
                text-graphite-faint
                dark:text-mist-faint
              "
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search tools..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-paper-border
                bg-paper-surface
                pl-10
                pr-10
                text-sm
                text-graphite
                outline-none
                transition-all
                duration-200
                placeholder:text-graphite-faint
                focus:border-amber
                focus:ring-2
                focus:ring-amber/10

                dark:border-ink-border
                dark:bg-ink-surface
                dark:text-mist
                dark:placeholder:text-mist-faint
                dark:focus:border-amber
                dark:focus:ring-amber/10

                sm:h-10
                sm:rounded-none
                sm:border-x-0
                sm:border-t-0
                sm:bg-transparent
                sm:focus:ring-0
                dark:sm:bg-transparent
              "
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="
                  absolute
                  right-2.5
                  top-1/2
                  flex
                  h-7
                  w-7
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-full
                  text-graphite-faint
                  transition-colors
                  hover:bg-paper-raised
                  hover:text-amber
                  dark:hover:bg-ink-raised
                  dark:hover:text-amber
                "
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </div>

        {/* Category Navigation */}
        <div
          className="
            mt-7
            overflow-x-auto
            border-b
            border-paper-border
            scrollbar-none
            dark:border-ink-border
            sm:mt-9
          "
        >
          <div
            className="
              flex
              min-w-max
              items-center
              gap-0.5
            "
          >
           {CATEGORIES.map((item: "All" | ToolCategory) => {
              const active =
                category === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setCategory(item)
                  }
                  aria-pressed={active}
                  className={`
                    relative
                    shrink-0
                    px-3.5
                    py-3
                    text-xs
                    font-medium
                    transition-colors
                    sm:px-4

                    ${
                      active
                        ? "text-amber"
                        : "text-graphite-muted hover:text-amber dark:text-mist-muted dark:hover:text-amber"
                    }
                  `}
                >
                  {item}

                  {active && (
                    <span
                      className="
                        absolute
                        bottom-0
                        left-2.5
                        right-2.5
                        h-0.5
                        rounded-full
                        bg-amber
                        sm:left-3
                        sm:right-3
                      "
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Collection */}
        <div className="mt-7 sm:mt-8">
          {/* Collection Heading */}
          <div
            className="
              flex
              min-w-0
              items-center
              gap-2.5
              sm:gap-4
            "
          >
            {/* Category Icon */}
            <div
              className="
                flex
                min-w-0
                shrink-0
                items-center
                gap-2
                sm:gap-2.5
              "
            >
              {category === "Audio" && (
                <SlidersHorizontal
                  className="h-4 w-4 shrink-0 text-amber"
                />
              )}

              {category === "Video" && (
                <Video
                  className="h-4 w-4 shrink-0 text-amber"
                />
              )}

              {(category === "Other" ||
                category === "All") && (
                <Grid2X2
                  className="h-4 w-4 shrink-0 text-amber"
                />
              )}

              <h3
                className="
                  truncate
                  font-display
                  text-sm
                  font-semibold
                  tracking-tight
                  text-graphite
                  dark:text-mist
                  sm:text-base
                "
              >
                {categoryLabel}
              </h3>
            </div>

            {/* Divider */}
            <div
              className="
                h-px
                min-w-4
                flex-1
                bg-paper-border
                dark:bg-ink-border
              "
            />

            {/* Count */}
            <span
              className="
                shrink-0
                font-mono
                text-[9px]
                uppercase
                tracking-[0.12em]
                text-graphite-faint
                dark:text-mist-faint
                sm:text-[10px]
              "
            >
              {filteredTools.length}{" "}
              {filteredTools.length === 1 ? "tool" : "tools"}
            </span>
          </div>

          {/* Tools Grid */}
          {filteredTools.length > 0 ? (
            <div
              className="
                mt-4
                grid
                grid-cols-3
                gap-2
                sm:grid-cols-2
                sm:gap-3
                lg:grid-cols-3
              "
            >
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.href}
                  tool={tool}
                  featured={tool.featured}
                />
              ))}
            </div>
          ) : (
            <div
              className="
                mt-4
                rounded-xl
                border
                border-dashed
                border-paper-border
                px-5
                py-10
                text-center
                dark:border-ink-border
                sm:px-6
                sm:py-12
              "
            >
              <p
                className="
                  font-display
                  text-base
                  font-semibold
                  text-graphite
                  dark:text-mist
                "
              >
                No tools found.
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-graphite-muted
                  dark:text-mist-muted
                "
              >
                Try another search term or category.
              </p>

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
                className="
                  mt-4
                  text-xs
                  font-semibold
                  text-amber
                  underline
                  underline-offset-4
                  hover:opacity-80
                "
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}