"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar, Topbar } from "@/components/dashboard";
import {
  Check,
  Download,
  Library as LibraryIcon,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  fetchLibrary,
  libraryDownloadUrl,
  trashLibraryItem,
} from "@/lib/dashboard/api";
import {
  formatAge,
  formatSize,
  getIconForKind,
  KIND_LABEL,
  matchesSearch,
  sortItems,
  SORT_LABEL,
  type LibraryItem,
  type SortKey,
} from "@/lib/dashboard/types";

/**
 * The Library — every asset the account has saved, whatever produced it.
 *
 * Projects are things you were working ON; the library is the flat pile of
 * finished media. Both read from the same Firestore shape, which is why this
 * screen shares the sort/search helpers with the projects grid rather than
 * inventing its own.
 */

const FILTERS = ["All", "Audio", "Video", "Images"] as const;
type Filter = (typeof FILTERS)[number];

const SORT_KEYS: SortKey[] = ["date", "name", "size"];

/* ===================================================== */
/* ROW                                                   */
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
        w-full
        items-center
        gap-3
        border-b
        border-paper-border
        px-3
        py-3
        text-left
        transition-colors
        last:border-b-0
        hover:bg-paper-raised
        dark:border-ink-border
        dark:hover:bg-ink-raised
        ${isSelected ? "bg-amber/[0.06]" : ""}
      `}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            transition-colors
            ${isSelected
              ? "border-amber bg-amber text-ink"
              : "border-paper-border bg-paper-surface text-graphite-muted dark:border-ink-border dark:bg-ink-surface dark:text-mist-muted"
            }
          `}
        >
          {isSelected ? (
            <Check className="h-4 w-4" strokeWidth={2.4} />
          ) : (
            <Icon className="h-4 w-4" strokeWidth={1.7} />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-graphite dark:text-mist">
            {item.name}
          </span>

          <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint">
            {KIND_LABEL[item.kind]}
            {item.meta ? ` · ${item.meta}` : ""}
          </span>
        </span>
      </button>

      <span className="hidden shrink-0 text-[11px] text-graphite-muted sm:block dark:text-mist-muted">
        {formatSize(item.sizeBytes)}
      </span>

      <span className="hidden w-28 shrink-0 text-right text-[11px] text-graphite-muted md:block dark:text-mist-muted">
        {formatAge(item.ageMinutes)}
      </span>

      <a
        href={libraryDownloadUrl(item.id)}
        aria-label={`Download ${item.name}`}
        className="
          shrink-0
          rounded-lg
          p-2
          text-graphite-muted
          transition-colors
          hover:bg-amber/10
          hover:text-amber
          dark:text-mist-muted
        "
      >
        <Download className="h-4 w-4" strokeWidth={1.8} />
      </a>
    </div>
  );
}

/* ===================================================== */
/* PAGE                                                  */
/* ===================================================== */

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoadError(null);

    try {
      setItems(await fetchLibrary());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load your library."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (!matchesSearch(item, searchQuery)) return false;

      switch (activeFilter) {
        case "Audio":
          return item.kind === "audio";
        case "Video":
          return item.kind === "video";
        case "Images":
          return item.kind === "image";
        case "All":
        default:
          return true;
      }
    });

    return sortItems(filtered, sortKey, sortKey === "name");
  }, [activeFilter, items, searchQuery, sortKey]);

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

  const clearSelection = () => setSelectedIds(new Set());

  /** Recoverable — items land in the trash, not the void. */
  const deleteSelected = async () => {
    if (selectedIds.size === 0 || isDeleting) return;

    setIsDeleting(true);
    setLoadError(null);

    const ids = Array.from(selectedIds);

    const results = await Promise.allSettled(
      ids.map((id) => trashLibraryItem(id))
    );

    const trashed = new Set(
      ids.filter((_, index) => results[index]?.status === "fulfilled")
    );

    if (trashed.size > 0) {
      setItems((previous) => previous.filter((item) => !trashed.has(item.id)));
    }

    if (trashed.size < ids.length) {
      setLoadError(
        `${ids.length - trashed.size} of ${ids.length} items could not be moved to trash.`
      );
    }

    clearSelection();
    setIsDeleting(false);
  };

  const selectedCount = selectedIds.size;

  const totalBytes = useMemo(
    () => items.reduce((sum, item) => sum + item.sizeBytes, 0),
    [items]
  );

  return (
    <main className="relative flex min-h-screen bg-paper dark:bg-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-44 top-[-120px] h-80 w-80 rounded-full bg-amber/[0.05] blur-[110px] sm:h-96 sm:w-96"
      />

      <Sidebar active="library" />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          title="Library"
          subtitle="Audio Studio / Library"
          searchPlaceholder="Search your library..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7">
          {/* ============================================= */}
          {/* TOOLBAR                                       */}
          {/* ============================================= */}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`
                    rounded-full
                    border
                    px-3
                    py-1.5
                    text-[11px]
                    font-medium
                    transition-colors
                    ${activeFilter === filter
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-paper-border text-graphite-muted hover:border-amber/40 hover:text-amber dark:border-ink-border dark:text-mist-muted"
                    }
                  `}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsSortOpen((previous) => !previous)}
                className="
                  flex
                  h-9
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-paper-border
                  px-3.5
                  text-[11px]
                  font-medium
                  text-graphite-muted
                  transition-colors
                  hover:border-amber/40
                  hover:text-amber
                  dark:border-ink-border
                  dark:text-mist-muted
                "
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />
                {SORT_LABEL[sortKey]}
              </button>

              {isSortOpen && (
                <div className="absolute right-0 top-11 z-20 w-36 overflow-hidden rounded-xl border border-paper-border bg-paper-surface p-1.5 shadow-lg dark:border-ink-border dark:bg-ink-surface">
                  {SORT_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSortKey(key);
                        setIsSortOpen(false);
                      }}
                      className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        rounded-lg
                        px-2.5
                        py-2
                        text-left
                        text-[12px]
                        transition-colors
                        hover:bg-paper-raised
                        dark:hover:bg-ink-raised
                        ${sortKey === key
                          ? "text-amber"
                          : "text-graphite dark:text-mist"
                        }
                      `}
                    >
                      {SORT_LABEL[key]}
                      {sortKey === key && (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================= */}
          {/* SELECTION BAR                                 */}
          {/* ============================================= */}

          {selectedCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber/30 bg-amber/[0.06] px-3.5 py-2.5">
              <span className="text-[12px] font-medium text-graphite dark:text-mist">
                {selectedCount} selected
              </span>

              <button
                type="button"
                onClick={() => void deleteSelected()}
                disabled={isDeleting}
                className="
                  ml-auto
                  flex
                  items-center
                  gap-1.5
                  rounded-full
                  border
                  border-coral/40
                  px-3
                  py-1.5
                  text-[11px]
                  font-medium
                  text-coral
                  transition-colors
                  hover:bg-coral/10
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                {isDeleting ? "Moving…" : "Move to trash"}
              </button>

              <button
                type="button"
                onClick={clearSelection}
                aria-label="Clear selection"
                className="rounded-full p-1.5 text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          )}

          {loadError && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-[13px] text-coral">
              <p className="flex-1">{loadError}</p>

              <button
                type="button"
                onClick={() => void load()}
                className="shrink-0 font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          {/* ============================================= */}
          {/* LIST                                          */}
          {/* ============================================= */}

          {isLoading ? (
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl border border-paper-border bg-paper-surface dark:border-ink-border dark:bg-ink-surface"
                />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-paper-border px-6 py-16 text-center dark:border-ink-border">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                <LibraryIcon className="h-5 w-5" strokeWidth={1.6} />
              </span>

              <p className="text-sm font-medium text-graphite dark:text-mist">
                Nothing here yet
              </p>

              <p className="max-w-sm text-[13px] leading-6 text-graphite-muted dark:text-mist-muted">
                {searchQuery.trim()
                  ? `No files match “${searchQuery.trim()}”.`
                  : items.length === 0
                    ? "Files you save from the editor or any tool will collect here."
                    : `No ${activeFilter.toLowerCase()} files. Try another filter.`}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-xl border border-paper-border bg-paper-surface dark:border-ink-border dark:bg-ink-surface">
                {visibleItems.map((item) => (
                  <LibraryRow
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                  />
                ))}
              </div>

              <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                {visibleItems.length} of {items.length} files ·{" "}
                {formatSize(totalBytes)} total
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
