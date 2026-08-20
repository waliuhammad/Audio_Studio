"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar, Topbar } from "@/components/dashboard";
import {
  ArrowUpRight,
  Check,
  Clock,
  FolderOpen,
  MoreHorizontal,
  Play,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { fetchProjects, trashProject } from "@/lib/dashboard/api";
import {
  formatAge,
  formatDuration,
  formatSize,
  getIconForKind,
  KIND_LABEL,
  matchesSearch,
  sortItems,
  SORT_LABEL,
  STATUS_LABEL,
  type Project,
  type SortKey,
} from "@/lib/dashboard/types";

const FILTERS = ["All", "Recent", "Audio", "Video", "Drafts"] as const;
type Filter = (typeof FILTERS)[number];

const SORT_KEYS: SortKey[] = ["date", "name", "size"];

const WAVEFORM_BARS = [30, 55, 38, 72, 46, 88, 52, 70, 34, 62, 45, 78, 42, 60, 28];

/* ===================================================== */
/* PROJECT CARD                                         */
/* ===================================================== */

function ProjectPreview({ project }: { project: Project }) {
  if (project.kind === "video") {
    return (
      <div className="relative flex h-[120px] items-center justify-center overflow-hidden bg-gradient-to-br from-graphite/10 via-transparent to-amber/[0.08] dark:from-mist/5 dark:to-amber/[0.05]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-amber transition-transform duration-300 group-hover:scale-105">
          <Play className="ml-0.5 h-4 w-4" strokeWidth={1.8} fill="currentColor" />
        </span>

        <span className="absolute bottom-2.5 left-2.5 font-mono text-[7px] uppercase tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
          1920 × 1080
        </span>

        <span className="absolute bottom-2.5 right-2.5 font-mono text-[7px] uppercase tracking-[0.18em] text-amber">
          {formatDuration(project.durationSeconds)}
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-[120px] items-center justify-center overflow-hidden bg-gradient-to-br from-graphite/[0.06] via-transparent to-amber/[0.07] dark:from-mist/5 dark:to-amber/[0.04]">
      <div className="flex h-14 w-[60%] items-center gap-[3px]">
        {WAVEFORM_BARS.map((height, index) => (
          <span
            key={index}
            className="rounded-full bg-amber/70"
            style={{
              height: `${height}%`,
              width: `${100 / WAVEFORM_BARS.length}%`,
            }}
          />
        ))}
      </div>

      <span className="absolute bottom-2.5 left-2.5 font-mono text-[7px] uppercase tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
        44.1 kHz
      </span>

      <span className="absolute bottom-2.5 right-2.5 font-mono text-[7px] uppercase tracking-[0.18em] text-amber">
        {formatDuration(project.durationSeconds)}
      </span>
    </div>
  );
}

function ProjectCard({
  project,
  isSelected,
  onToggleSelect,
}: {
  project: Project;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const Icon = getIconForKind(project.kind, project.name);

  return (
    <article
      className={`
        group
        relative
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
      {/* Selection checkbox */}
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? "Deselect" : "Select"} ${project.name}`}
        className={`
          absolute
          left-2.5
          top-2.5
          z-10
          flex
          h-6
          w-6
          items-center
          justify-center
          rounded-md
          border
          transition-all
          duration-200
          ${isSelected
            ? "border-amber bg-amber text-ink opacity-100"
            : "border-paper-border bg-paper-surface/90 text-transparent opacity-0 backdrop-blur-sm group-hover:opacity-100 dark:border-ink-border dark:bg-ink-surface/90"
          }
        `}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>

      {/* Preview */}
      <ProjectPreview project={project} />

      {/* Body */}
      <div className="flex min-w-0 items-start gap-3 p-3.5 sm:p-4">
        <span
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-amber/20
            bg-amber/10
            text-amber
          "
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-graphite dark:text-mist">
            {project.name}
          </p>

          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-graphite-muted dark:text-mist-muted">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-amber">
              {KIND_LABEL[project.kind]}
            </span>
            <span
              aria-hidden="true"
              className="h-0.5 w-0.5 shrink-0 rounded-full bg-graphite-faint dark:bg-mist-faint"
            />
            <span>{formatSize(project.sizeBytes)}</span>
          </p>

          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-graphite-faint dark:text-mist-faint">
            <Clock className="h-3 w-3" strokeWidth={1.6} />
            {formatAge(project.ageMinutes)}
          </p>
        </div>

        <Link
          href={`/editor?project=${project.id}`}
          aria-label={`Open ${project.name}`}
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
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </Link>
      </div>

      {/* Status bar */}
      <div
        className="
          flex
          items-center
          justify-between
          border-t
          border-paper-border
          px-3.5
          py-2
          sm:px-4
          dark:border-ink-border
        "
      >
        <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-graphite-muted dark:text-mist-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${project.status === "processing"
              ? "bg-coral animate-pulse"
              : project.status === "draft"
                ? "bg-graphite-faint dark:bg-mist-faint"
                : "bg-teal"
              }`}
          />
          {STATUS_LABEL[project.status]}
        </span>

        <button
          type="button"
          onClick={onToggleSelect}
          aria-label={`Actions for ${project.name}`}
          className="
            flex
            h-6
            w-6
            items-center
            justify-center
            rounded
            text-graphite-faint
            transition-colors
            hover:bg-amber/10
            hover:text-amber
            dark:text-mist-faint
            dark:hover:bg-amber/10
            dark:hover:text-amber
          "
        >
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
      </div>
    </article>
  );
}

/* ===================================================== */
/* PAGE                                                 */
/* ===================================================== */

export default function ProjectsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);

    try {
      setProjects(await fetchProjects());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load your projects."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (!matchesSearch(project, searchQuery)) return false;

      switch (activeFilter) {
        case "Audio":
          return project.kind === "audio";
        case "Video":
          return project.kind === "video";
        case "Drafts":
          return project.status === "draft";
        case "Recent":
          // Within the last week.
          return project.ageMinutes <= 7 * 24 * 60;
        case "All":
        default:
          return true;
      }
    });

    return sortItems(filtered, sortKey, sortKey === "name");
  }, [activeFilter, projects, searchQuery, sortKey]);

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

  /**
   * Moves the selection to the trash — recoverable, not a hard delete.
   *
   * The list is only pruned for ids the server actually accepted, so a failed
   * request leaves the card on screen instead of making it vanish from a UI
   * that no longer matches the database.
   */
  const deleteSelected = async () => {
    if (selectedIds.size === 0 || isDeleting) return;

    setIsDeleting(true);
    setLoadError(null);

    const ids = Array.from(selectedIds);

    const results = await Promise.allSettled(ids.map((id) => trashProject(id)));

    const trashed = new Set(
      ids.filter((_, index) => results[index]?.status === "fulfilled")
    );

    if (trashed.size > 0) {
      setProjects((previous) =>
        previous.filter((project) => !trashed.has(project.id))
      );
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

      <Sidebar active="projects" />

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          title="My Projects"
          subtitle="Audio Studio / Projects"
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
                My workspace
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
                My Projects
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
                Everything you&apos;ve created, all in one place. Organize,
                reopen, and keep moving your sound forward.
              </p>
            </div>

            {/* Sort */}
            <div className="relative flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSortOpen((previous) => !previous)}
                aria-expanded={isSortOpen}
                className="
                  flex
                  h-10
                  shrink-0
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-surface
                  px-3
                  transition-colors
                  duration-200
                  hover:border-amber/50
                  dark:border-ink-border
                  dark:bg-ink-surface
                  dark:hover:border-amber/50
                "
              >
                <SlidersHorizontal
                  className="h-4 w-4 text-graphite-faint dark:text-mist-faint"
                  strokeWidth={1.7}
                />

                <span className="text-xs font-medium text-graphite dark:text-mist">
                  {SORT_LABEL[sortKey]}
                </span>
              </button>

              {isSortOpen && (
                <div
                  role="menu"
                  className="
                    absolute
                    right-0
                    top-12
                    z-20
                    w-36
                    overflow-hidden
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface
                    py-1
                    shadow-lg
                    shadow-ink/5
                    dark:border-ink-border
                    dark:bg-ink-surface
                    dark:shadow-black/30
                  "
                >
                  {SORT_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSortKey(key);
                        setIsSortOpen(false);
                      }}
                      className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        px-3
                        py-2
                        text-left
                        text-[12px]
                        transition-colors
                        hover:bg-amber/10
                        hover:text-amber
                        ${key === sortKey
                          ? "text-amber"
                          : "text-graphite dark:text-mist"
                        }
                      `}
                    >
                      {SORT_LABEL[key]}
                      {key === sortKey && (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================= */}
          {/* CATEGORY TABS                                 */}
          {/* ============================================= */}

          <div
            className="
              mt-7
              overflow-x-auto
              border-b
              border-paper-border
              sm:mt-9
              dark:border-ink-border
            "
          >
            <div className="flex min-w-max items-center gap-0.5">
              {FILTERS.map((filter) => {
                const active = filter === activeFilter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
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
                      ${active
                        ? "text-graphite dark:text-mist"
                        : "text-graphite-muted hover:text-graphite dark:text-mist-muted dark:hover:text-mist"
                      }
                    `}
                  >
                    {filter}

                    {active && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-0.5 bg-amber sm:left-3 sm:right-3" />
                    )}
                  </button>
                );
              })}
            </div>
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

              <span
                aria-hidden="true"
                className="h-4 w-px bg-amber/30"
              />

              <button
                type="button"
                onClick={() => void deleteSelected()}
                disabled={isDeleting}
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
                onClick={clearSelection}
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
          {/* COLLECTION HEADER                             */}
          {/* ============================================= */}

          <div className="mt-6 flex min-w-0 items-center gap-2.5 sm:mt-8 sm:gap-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber/20 bg-amber/10 text-amber">
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.7} />
            </span>

            <h2 className="truncate font-display text-sm font-semibold tracking-tight text-graphite sm:text-base dark:text-mist">
              {activeFilter === "All" ? "All projects" : `${activeFilter} projects`}
            </h2>

            <span
              aria-hidden="true"
              className="h-px min-w-4 flex-1 bg-paper-border dark:bg-ink-border"
            />

            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint sm:text-[10px] sm:tracking-wider">
              {visibleProjects.length}{" "}
              {visibleProjects.length === 1 ? "project" : "projects"}
            </span>
          </div>

          {/* ============================================= */}
          {/* PROJECTS GRID                                 */}
          {/* ============================================= */}

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

          {isLoading ? (
            <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-xl border border-paper-border bg-paper-surface dark:border-ink-border dark:bg-ink-surface"
                />
              ))}
            </div>
          ) : visibleProjects.length === 0 ? (
            <div
              className="
                mt-4
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
                <FolderOpen className="h-5 w-5" strokeWidth={1.6} />
              </span>

              <p className="text-sm font-medium text-graphite dark:text-mist">
                Nothing here yet
              </p>

              <p className="max-w-sm text-[13px] leading-6 text-graphite-muted dark:text-mist-muted">
                {searchQuery.trim()
                  ? `No projects match “${searchQuery.trim()}”.`
                  : projects.length === 0
                    ? "Your projects will appear here once you save something from the editor or a tool."
                    : `No projects in ${activeFilter}. Try another filter.`}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSelected={selectedIds.has(project.id)}
                  onToggleSelect={() => toggleSelect(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}