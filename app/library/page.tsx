"use client";

import { useMemo, useState } from "react";
import { Sidebar, Topbar } from "@/components/dashboard";
import {
  Check,
  LayoutGrid,
  List,
  MoreHorizontal,
  Play,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { LIBRARY } from "@/lib/dashboard/mock-data";
import {
  formatSize,
  getIconForKind,
  KIND_LABEL,
  matchesSearch,
  type LibraryItem,
  type MediaKind,
} from "@/lib/dashboard/types";

const TYPE_CHIPS = ["All", "Audio", "Video", "Image", "Folders"] as const;
type TypeChip = (typeof TYPE_CHIPS)[number];

const CHIP_TO_KIND: Record<Exclude<TypeChip, "All">, MediaKind> = {
  Audio: "audio",
  Video: "video",
  Image: "image",
  Folders: "folder",
};

type ViewMode = "grid" | "list";

/* ===================================================== */
/* LIBRARY TILE                                         */
/* ===================================================== */

function LibraryTile({
  item,
  isSelected,
  onToggleSelect,
}: {
  item: LibraryItem;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const Icon = getIconForKind(item.kind, item.name);

  return (
    <div
      className={`
        group
        min-w-0
        overflow-hidden
        rounded-xl
        border
        bg-paper-surface
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-sm
        dark:bg-ink-surface
        ${isSelected
          ? "border-amber shadow-sm"
          : "border-paper-border hover:border-amber/50 dark:border-ink-border dark:hover:border-amber/50"
        }
      `}
    >
      {/* Preview */}
      <div className="relative flex h-[112px] items-center justify-center overflow-hidden bg-gradient-to-br from-graphite/[0.06] via-transparent to-amber/[0.07] dark:from-mist/5 dark:to-amber/[0.04]">
        {item.kind === "video" ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-amber transition-transform duration-300 group-hover:scale-105">
            <Play className="ml-0.5 h-4 w-4" strokeWidth={1.8} fill="currentColor" />
          </span>
        ) : (
          <Icon
            className={`h-9 w-9 ${item.kind === "folder" ? "text-amber/80" : "text-amber/70"
              }`}
            strokeWidth={1.4}
          />
        )}

        {/* Selection */}
        <button
          type="button"
          onClick={onToggleSelect}
          aria-pressed={isSelected}
          aria-label={`${isSelected ? "Deselect" : "Select"} ${item.name}`}
          className={`absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200 ${isSelected
            ? "border-amber bg-amber text-ink opacity-100"
            : "border-paper-border bg-paper/80 text-transparent opacity-0 group-hover:opacity-100 hover:border-amber dark:border-ink-border dark:bg-ink/80"
            }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>

        <span className="absolute right-2.5 top-2.5 font-mono text-[7px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
          {KIND_LABEL[item.kind]}
        </span>
      </div>

      {/* Body */}
      <div className="flex min-w-0 items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-graphite dark:text-mist">
            {item.name}
          </p>

          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-graphite-muted dark:text-mist-muted">
            <span className="truncate">{item.meta}</span>
            <span
              aria-hidden="true"
              className="h-0.5 w-0.5 shrink-0 rounded-full bg-graphite-faint dark:bg-mist-faint"
            />
            <span>{formatSize(item.sizeBytes)}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={`Actions for ${item.name}`}
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-graphite-faint
            transition-colors
            hover:bg-amber/10
            hover:text-amber
            dark:text-mist-faint
            dark:hover:bg-amber/10
            dark:hover:text-amber
          "
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

/* ===================================================== */
/* LIBRARY ROW (list view)                              */
/* ===================================================== */

function LibraryRow({
  item,
  isSelected,
  onToggleSelect,
}: {
  item: LibraryItem;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const Icon = getIconForKind(item.kind, item.name);

  return (
    <div
      className={`
        group
        flex
        min-w-0
        items-center
        gap-3
        border-b
        border-paper-border
        px-3
        py-2.5
        transition-colors
        last:border-b-0
        hover:bg-paper-raised
        dark:border-ink-border
        dark:hover:bg-ink-raised
        ${isSelected ? "bg-amber/[0.05]" : ""}
      `}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? "Deselect" : "Select"} ${item.name}`}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ${isSelected
          ? "border-amber bg-amber text-ink"
          : "border-paper-border text-transparent hover:border-amber dark:border-ink-border"
          }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber/20 bg-amber/10 text-amber">
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-graphite dark:text-mist">
          {item.name}
        </p>
        <p className="truncate text-[10px] text-graphite-muted dark:text-mist-muted">
          {item.meta}
        </p>
      </div>

      <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint sm:block dark:text-mist-faint">
        {KIND_LABEL[item.kind]}
      </span>

      <span className="shrink-0 font-mono text-[10px] tabular-nums text-graphite-muted dark:text-mist-muted">
        {formatSize(item.sizeBytes)}
      </span>
    </div>
  );
}

/* ===================================================== */
/* PAGE                                                 */
/* ===================================================== */

export default function LibraryPage() {
  const [activeChip, setActiveChip] = useState<TypeChip>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const visibleItems = useMemo(() => {
    return LIBRARY.filter((item) => {
      if (removedIds.has(item.id)) return false;
      if (!matchesSearch(item, searchQuery)) return false;
      if (activeChip === "All") return true;

      return item.kind === CHIP_TO_KIND[activeChip];
    });
  }, [activeChip, removedIds, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleIds = visibleItems.map((item) => item.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const deleteSelected = () => {
    setRemovedIds((previous) => {
      const next = new Set(previous);
      selectedIds.forEach((id) => next.add(id));
      return next;
    });
    setSelectedIds(new Set());
  };

  const selectedCount = selectedIds.size;

  const viewButtonClass = (mode: ViewMode) =>
    `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${viewMode === mode
      ? "bg-amber/10 text-amber"
      : "text-graphite-muted hover:text-amber dark:text-mist-muted dark:hover:text-amber"
    }`;

  return (
    <main className="relative flex min-h-screen bg-paper dark:bg-ink">
      {/* ================================================= */}
      {/* AMBIENT GLOWS                                     */}
      {/* ================================================= */}

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

      {/* ================================================= */}
      {/* SIDEBAR                                          */}
      {/* ================================================= */}

      <Sidebar active="library" />

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          title="Library"
          subtitle="Audio Studio / Media Library"
          searchPlaceholder="Search library..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="container-studio flex-1 py-8 sm:py-10">
          {/* Header */}
          <div
            className="
              flex
              flex-col
              gap-6
              lg:flex-row
              lg:items-end
              lg:justify-between
              lg:gap-8
            "
          >
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
                  tracking-[0.18em]
                  text-amber
                  sm:text-[10px]
                "
              >
                <span className="h-px w-5 bg-amber sm:w-6" />
                Media library
              </div>

              <h1
                className="
                  font-display
                  text-[1.9rem]
                  font-semibold
                  leading-[1.05]
                  tracking-[-0.035em]
                  text-graphite
                  sm:text-4xl
                  lg:text-5xl
                  dark:text-mist
                "
              >
                Library
              </h1>

              <p
                className="
                  mt-3
                  max-w-xl
                  text-[13px]
                  leading-6
                  text-graphite-muted
                  sm:text-sm
                  dark:text-mist-muted
                "
              >
                Your reusable assets and source files, ready to drop into any
                project.
              </p>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <div
                className="
                  flex
                  h-10
                  shrink-0
                  items-center
                  gap-1
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-surface
                  p-1
                  dark:border-ink-border
                  dark:bg-ink-surface
                "
              >
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={viewButtonClass("grid")}
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={1.7} />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={viewButtonClass("list")}
                >
                  <List className="h-4 w-4" strokeWidth={1.7} />
                </button>
              </div>

              <button
                type="button"
                className="
                  group
                  flex
                  h-10
                  items-center
                  gap-1.5
                  rounded-full
                  bg-amber
                  px-4
                  text-xs
                  font-semibold
                  text-ink
                  shadow-[0_6px_20px_rgba(245,158,11,0.18)]
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:shadow-[0_10px_28px_rgba(245,158,11,0.30)]
                  active:translate-y-0
                "
              >
                <Upload className="h-4 w-4" strokeWidth={1.9} />
                Upload
              </button>
            </div>
          </div>

          {/* ============================================= */}
          {/* TOOLBAR                                       */}
          {/* ============================================= */}

          <div
            className="
              mt-7
              flex
              flex-wrap
              items-center
              gap-x-5
              gap-y-3
              border-y
              border-paper-border
              py-3
              sm:mt-9
              dark:border-ink-border
            "
          >
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 cursor-pointer rounded border border-paper-border bg-paper-surface accent-amber dark:border-ink-border dark:bg-ink-surface"
              />
              <span className="text-[11px] font-medium text-graphite dark:text-mist">
                Select all
              </span>
            </label>

            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-paper-border sm:block dark:bg-ink-border"
            />

            <div className="flex items-center gap-1 overflow-x-auto">
              {TYPE_CHIPS.map((chip) => {
                const active = chip === activeChip;

                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setActiveChip(chip)}
                    aria-pressed={active}
                    className={`
                      shrink-0
                      rounded-full
                      px-3
                      py-1.5
                      text-[11px]
                      font-medium
                      transition-colors
                      ${active
                        ? "bg-amber/10 text-amber"
                        : "text-graphite-muted hover:text-graphite dark:text-mist-muted dark:hover:text-mist"
                      }
                    `}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            <span
              aria-hidden="true"
              className="h-4 w-px bg-paper-border dark:bg-ink-border"
            />

            <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint">
              <Tag className="h-3.5 w-3.5 text-amber" strokeWidth={1.6} />
              {visibleItems.length} items
            </span>
          </div>

          {/* ============================================= */}
          {/* SELECTION BAR                                 */}
          {/* ============================================= */}

          {selectedCount > 0 && (
            <div
              className="
                mt-4
                flex
                flex-wrap
                items-center
                gap-3
                rounded-xl
                border
                border-amber/30
                bg-amber/[0.06]
                px-4
                py-2.5
              "
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                {selectedCount} selected
              </span>

              <span aria-hidden="true" className="h-4 w-px bg-amber/30" />

              <button
                type="button"
                onClick={deleteSelected}
                className="
                  flex
                  items-center
                  gap-1.5
                  text-[12px]
                  font-medium
                  text-graphite-muted
                  transition-colors
                  hover:text-coral
                  dark:text-mist-muted
                "
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                Move to trash
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="
                  ml-auto
                  flex
                  items-center
                  gap-1.5
                  text-[12px]
                  font-medium
                  text-graphite-muted
                  transition-colors
                  hover:text-amber
                  dark:text-mist-muted
                "
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Clear
              </button>
            </div>
          )}

          {/* ============================================= */}
          {/* LIBRARY CONTENT                               */}
          {/* ============================================= */}

          {visibleItems.length === 0 ? (
            <div
              className="
                mt-5
                flex
                flex-col
                items-center
                justify-center
                gap-3
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
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                <Tag className="h-5 w-5" strokeWidth={1.6} />
              </span>

              <p className="text-sm font-medium text-graphite dark:text-mist">
                Nothing to show
              </p>

              <p className="max-w-sm text-[13px] leading-6 text-graphite-muted dark:text-mist-muted">
                {searchQuery.trim()
                  ? `No assets match “${searchQuery.trim()}”.`
                  : `No ${activeChip.toLowerCase()} in your library yet.`}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="mt-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visibleItems.map((item) => (
                <LibraryTile
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                />
              ))}
            </div>
          ) : (
            <div
              className="
                mt-5
                overflow-hidden
                rounded-xl
                border
                border-paper-border
                bg-paper-surface
                dark:border-ink-border
                dark:bg-ink-surface
              "
            >
              {visibleItems.map((item) => (
                <LibraryRow
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}