"use client";

import { useMemo, useState } from "react";
import { Sidebar, Topbar } from "@/components/dashboard";
import { ToolCard } from "@/components/tools/ToolCard";
import { AUDIO_TOOLS, type ToolCategory } from "@/components/tools/tool-data";

/**
 * The in-app tools index.
 *
 * Before this existed, both the sidebar's "Tools" link and the dashboard's
 * "Browse the toolkit" link pointed at "/#tools" — the marketing landing
 * page's anchor section. That took a signed-in user out of the dashboard
 * shell entirely. This page reuses the same AUDIO_TOOLS data and ToolCard
 * used there, but renders inside the authenticated Sidebar/Topbar shell so
 * "Tools" behaves like every other dashboard section instead of an exit.
 */

const CATEGORY_TABS = ["All", "Audio", "Video", "Other"] as const;
type CategoryTab = (typeof CATEGORY_TABS)[number];

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<CategoryTab>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return AUDIO_TOOLS.filter((tool) => {
      const matchesCategory =
        activeTab === "All" || tool.category === (activeTab as ToolCategory);

      if (!matchesCategory) return false;
      if (!query) return true;

      return (
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
      );
    });
  }, [activeTab, searchQuery]);

  return (
    <main className="relative flex min-h-screen bg-paper dark:bg-ink">
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-44
          top-[-140px]
          h-96
          w-96
          rounded-full
          bg-amber/[0.04]
          blur-[120px]
        "
      />

      <Sidebar active="tools" />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          title="Tools"
          subtitle="Audio Studio / Tools"
          searchPlaceholder="Search tools..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="container-studio flex-1 py-8 sm:py-10">
          {/* Header */}
          <div>
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
                tracking-[0.2em]
                text-amber
              "
            >
              <span aria-hidden="true" className="h-px w-6 bg-amber" />
              Toolkit
            </div>

            <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-graphite dark:text-mist sm:text-3xl">
              Every tool, in one place.
            </h1>

            <p className="mt-2 max-w-xl text-[13px] leading-6 text-graphite-muted dark:text-mist-muted sm:text-sm">
              Anything you process here can be saved straight to your
              library and shows up on your dashboard.
            </p>
          </div>

          {/* Category tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`
                  rounded-full
                  border
                  px-4
                  py-1.5
                  text-xs
                  font-medium
                  transition-colors
                  duration-200
                  ${
                    activeTab === tab
                      ? "border-amber/50 bg-amber/10 text-amber"
                      : "border-paper-border text-graphite-muted hover:border-amber/40 hover:text-amber dark:border-ink-border dark:text-mist-muted"
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tool grid */}
          {filteredTools.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.href} tool={tool} featured={tool.featured} />
              ))}
            </div>
          ) : (
            <div
              className="
                mt-6
                flex
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-dashed
                border-paper-border
                px-6
                py-16
                text-center
                dark:border-ink-border
              "
            >
              <p className="text-sm font-medium text-graphite dark:text-mist">
                No tools match &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="mt-1 text-[13px] text-graphite-muted dark:text-mist-muted">
                Try a different search term or category.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}