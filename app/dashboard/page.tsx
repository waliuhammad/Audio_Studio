"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar, Topbar } from "@/components/dashboard";
import {
  ArrowUpRight,
  Clock,
  FolderOpen,
  Gauge,
  HardDrive,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountSummary } from "@/lib/dashboard/account";
import { QUICK_TOOLS } from "@/lib/dashboard/quick-tools";
import { fetchProjects } from "@/lib/dashboard/api";
import { useAccount } from "@/components/providers/SessionProvider";
import {
  formatAge,
  formatSize,
  getIconForKind,
  KIND_LABEL,
  STATUS_LABEL,
  type Project,
} from "@/lib/dashboard/types";

/* ===================================================== */
/* DERIVED STATS                                         */
/* ===================================================== */

interface Stat {
  label: string;
  value: string;
  hint: string;
  trend: "up" | "down" | "flat";
  icon: LucideIcon;
  progress?: number;
}

/**
 * Hints are plain facts, not trends.
 *
 * The mock version claimed things like "+12% vs last month", which nothing in
 * the data can support — we store no history to compare against. Showing an
 * invented delta next to a real number is worse than showing no delta.
 */
function buildStats(account: AccountSummary): Stat[] {
  const storagePercent =
    account.storageLimitBytes > 0
      ? Math.round((account.storageUsedBytes / account.storageLimitBytes) * 100)
      : 0;

  return [
    {
      label: "Projects",
      value: String(account.projectCount),
      hint: account.projectCount === 1 ? "saved project" : "saved projects",
      trend: "flat",
      icon: FolderOpen,
    },
    {
      label: "Files processed",
      value: String(account.filesProcessed),
      hint: "since you joined",
      trend: "flat",
      icon: Zap,
    },
    {
      label: "Storage used",
      value: formatSize(account.storageUsedBytes),
      hint: `of ${formatSize(account.storageLimitBytes)}`,
      trend: "flat",
      icon: HardDrive,
      progress: storagePercent,
    },
    {
      label: "Processing time",
      value: `${(account.processingMinutes / 60).toFixed(1)} h`,
      hint: "total",
      trend: "flat",
      icon: Clock,
    },
  ];
}

/**
 * The greeting used to be the constant "Good evening", which read as a lie at
 * nine in the morning. It is now derived from the clock — but only after mount,
 * because the server renders in ITS timezone and the browser in the user's, and
 * a mismatch between the two is a hydration error.
 */
function greetingFor(hour: number): string {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";

    return "Good evening";
}

/* ===================================================== */
/* SUB-COMPONENTS                                        */
/* ===================================================== */

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;

  return (
    <div
      className="
        group
        min-w-0
        rounded-xl
        border
        border-paper-border
        bg-paper-surface
        p-4
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:border-amber/40
        hover:shadow-sm
        dark:border-ink-border
        dark:bg-ink-surface
        dark:hover:border-amber/40
      "
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="
            hidden
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
            sm:flex
          "
        >
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>

        {stat.trend === "up" && (
          <span className="hidden items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-teal sm:flex">
            <TrendingUp className="h-3 w-3" strokeWidth={1.8} />
            Up
          </span>
        )}

        {stat.trend === "down" && (
          <span className="hidden items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-coral sm:flex">
            <TrendingUp className="h-3 w-3 rotate-180" strokeWidth={1.8} />
            Down
          </span>
        )}
      </div>

      <p className="mt-4 font-display text-base font-semibold tracking-[-0.02em] text-graphite dark:text-mist sm:text-[1.45rem]">
        {stat.value}
      </p>

      <p className="mt-1 truncate text-[10px] font-medium text-graphite dark:text-mist sm:text-[11px]">
        {stat.label}
      </p>

      <p className="hidden mt-0.5 text-[11px] text-graphite-muted dark:text-mist-muted sm:block">
        {stat.hint}
      </p>

      {typeof stat.progress === "number" && (
        <div className="hidden sm:block mt-3 h-1 overflow-hidden rounded-full bg-graphite/10 dark:bg-mist/10">
          <div
            className="h-full rounded-full bg-amber transition-all duration-500"
            style={{ width: `${stat.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ProjectRow({
  project,
  isLast,
  isOpen,
  onToggleMenu,
}: {
  project: Project;
  isLast: boolean;
  isOpen: boolean;
  onToggleMenu: () => void;
}) {
  const Icon = getIconForKind(project.kind, project.name);

  return (
    <div
      className={`group relative flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-paper-raised sm:gap-4 sm:px-5 dark:hover:bg-ink-raised ${isLast ? "" : "border-b border-paper-border dark:border-ink-border"
        }`}
    >
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
        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-graphite-muted dark:text-mist-muted">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em]">
            {KIND_LABEL[project.kind]}
          </span>
          <span
            aria-hidden="true"
            className="h-0.5 w-0.5 rounded-full bg-graphite-faint dark:bg-mist-faint"
          />
          <span>{formatSize(project.sizeBytes)}</span>
          <span
            aria-hidden="true"
            className="hidden h-0.5 w-0.5 rounded-full bg-graphite-faint sm:block dark:bg-mist-faint"
          />
          <span className="hidden sm:inline">{formatAge(project.ageMinutes)}</span>
        </p>
      </div>

      <span
        className="
          hidden
          shrink-0
          items-center
          gap-1
          rounded-full
          px-2
          py-1
          font-mono
          text-[8px]
          uppercase
          tracking-[0.1em]
          sm:flex
        "
      >
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
        onClick={onToggleMenu}
        aria-label={`Actions for ${project.name}`}
        aria-expanded={isOpen}
        className="
          flex
          h-8
          w-8
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

      {isOpen && (
        <div
          role="menu"
          className="
            absolute
            right-4
            top-12
            z-20
            w-40
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
          <Link
            href="/editor"
            role="menuitem"
            className="block px-3 py-2 text-[12px] text-graphite transition-colors hover:bg-amber/10 hover:text-amber dark:text-mist"
          >
            Open in editor
          </Link>
          <Link
            href="/dashboard/projects"
            role="menuitem"
            className="block px-3 py-2 text-[12px] text-graphite transition-colors hover:bg-amber/10 hover:text-amber dark:text-mist"
          >
            View details
          </Link>
        </div>
      )}
    </div>
  );
}

/* ===================================================== */
/* PAGE                                                  */
/* ===================================================== */

export default function DashboardPage() {
  const account = useAccount();

  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Empty until mount, so server and client agree on the first paint.
  const [greeting, setGreeting] = useState("");

  const [memberSince, setMemberSince] = useState("—");

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));

    const joined = new Date(account.createdAt);

    if (!Number.isNaN(joined.getTime())) {
      setMemberSince(
        joined.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })
      );
    }
  }, [account.createdAt]);

  const stats = useMemo(() => buildStats(account), [account]);

  const storagePercent =
    account.storageLimitBytes > 0
      ? Math.round((account.storageUsedBytes / account.storageLimitBytes) * 100)
      : 0;

  const recentProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matched = query
      ? projects.filter((project) =>
        project.name.toLowerCase().includes(query)
      )
      : projects;

    return [...matched]
      .sort((a, b) => a.ageMinutes - b.ageMinutes)
      .slice(0, 4);
  }, [projects, searchQuery]);

  const firstName = account.name.split(" ")[0] ?? account.name;

  return (
    <main
      className="relative flex min-h-screen bg-paper dark:bg-ink"
      onClick={() => setOpenMenuId(null)}
    >
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

      <Sidebar active="dashboard" />

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          title="Dashboard"
          subtitle="Audio Studio / Overview"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="container-studio flex-1 py-8 sm:py-10">
          {/* Welcome */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
                {greeting || "Welcome"}
              </div>

              <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite sm:text-4xl dark:text-mist">
                Welcome back, {firstName}.
              </h1>

              <p className="mt-2 max-w-xl text-[13px] leading-6 text-graphite-muted sm:text-sm dark:text-mist-muted">
                Here&apos;s what&apos;s happening in your studio today.
              </p>
            </div>

            <Link
              href="/#tools"
              className="
                group
                inline-flex
                shrink-0
                items-center
                gap-2
                text-sm
                font-medium
                text-graphite-muted
                transition-colors
                hover:text-amber
                dark:text-mist-muted
                dark:hover:text-amber
              "
            >
              Browse the toolkit

              <ArrowUpRight
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={1.6}
              />
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-7 grid grid-cols-4 gap-2.5 sm:grid-cols-2 sm:mt-9 sm:gap-4 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>

          {/* ============================================= */}
          {/* WORKSPACE GRID                                */}
          {/* ============================================= */}

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr] sm:mt-6">
            {/* =========================================== */}
            {/* RECENT PROJECTS                             */}
            {/* =========================================== */}

            <section
              className="
                min-w-0
                rounded-xl
                border
                border-paper-border
                bg-paper-surface
                dark:border-ink-border
                dark:bg-ink-surface
              "
            >
              <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FolderOpen
                    className="h-4 w-4 shrink-0 text-amber"
                    strokeWidth={1.7}
                  />

                  <h2 className="truncate font-display text-sm font-semibold tracking-tight text-graphite sm:text-base dark:text-mist">
                    Recent projects
                  </h2>
                </div>

                <Link
                  href="/dashboard/projects"
                  className="
                    shrink-0
                    font-mono
                    text-[9px]
                    uppercase
                    tracking-[0.12em]
                    text-graphite-faint
                    transition-colors
                    hover:text-amber
                    dark:text-mist-faint
                    dark:hover:text-amber
                  "
                >
                  View all
                </Link>
              </header>

              <div className="mt-3 flex flex-col sm:mt-4">
                {isLoading ? (
                  <div className="flex flex-col gap-2 px-4 pb-4 sm:px-5">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-12 animate-pulse rounded-lg bg-paper-raised dark:bg-ink-raised"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="px-4 py-10 text-center sm:px-5">
                    <p className="text-[13px] text-coral">{loadError}</p>

                    <button
                      type="button"
                      onClick={() => void load()}
                      className="mt-2 text-[12px] font-medium text-amber underline underline-offset-2"
                    >
                      Try again
                    </button>
                  </div>
                ) : recentProjects.length === 0 ? (
                  <p className="px-4 py-10 text-center text-[13px] text-graphite-muted sm:px-5 dark:text-mist-muted">
                    {searchQuery.trim()
                      ? `No projects match “${searchQuery.trim()}”.`
                      : "Nothing here yet — save a file from the editor or any tool and it will show up."}
                  </p>
                ) : (
                  recentProjects.map((project, index) => (
                    <div
                      key={project.id}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ProjectRow
                        project={project}
                        isLast={index === recentProjects.length - 1}
                        isOpen={openMenuId === project.id}
                        onToggleMenu={() =>
                          setOpenMenuId((previous) =>
                            previous === project.id ? null : project.id
                          )
                        }
                      />
                    </div>
                  ))
                )}
              </div>

              <footer className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <Link
                  href="/editor"
                  className="
                    flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-dashed
                    border-paper-border
                    text-xs
                    font-medium
                    text-graphite-muted
                    transition-all
                    duration-200
                    hover:border-amber/50
                    hover:text-amber
                    dark:border-ink-border
                    dark:text-mist-muted
                    dark:hover:border-amber/50
                    dark:hover:text-amber
                  "
                >
                  <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
                  New project
                </Link>
              </footer>
            </section>

            {/* =========================================== */}
            {/* RIGHT RAIL                                   */}
            {/* =========================================== */}

            <div className="flex min-w-0 flex-col gap-4">
              {/* Storage */}
              <section
                className="
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-surface
                  p-4
                  sm:p-5
                  dark:border-ink-border
                  dark:bg-ink-surface
                "
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <HardDrive
                      className="h-4 w-4 shrink-0 text-amber"
                      strokeWidth={1.7}
                    />

                    <h2 className="truncate font-display text-sm font-semibold tracking-tight text-graphite dark:text-mist">
                      Storage
                    </h2>
                  </div>

                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                    {storagePercent}% used
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="font-display text-3xl font-semibold tracking-[-0.04em] text-graphite dark:text-mist">
                    {formatSize(account.storageUsedBytes)}
                  </p>

                  <p className="pb-1 text-[11px] text-graphite-muted dark:text-mist-muted">
                    of {formatSize(account.storageLimitBytes)}
                  </p>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-graphite/10 dark:bg-mist/10">
                  <div
                    className="h-full rounded-full bg-amber transition-all duration-500"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Gauge
                    className="h-3.5 w-3.5 shrink-0 text-amber"
                    strokeWidth={1.6}
                  />

                  <p className="text-[11px] text-graphite-muted dark:text-mist-muted">
                    Free up space or upgrade to increase your limit.
                  </p>
                </div>
              </section>

              {/* Quick tools */}
              <section
                className="
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-surface
                  p-4
                  sm:p-5
                  dark:border-ink-border
                  dark:bg-ink-surface
                "
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Wrench
                      className="h-4 w-4 shrink-0 text-amber"
                      strokeWidth={1.7}
                    />

                    <h2 className="truncate font-display text-sm font-semibold tracking-tight text-graphite dark:text-mist">
                      Quick tools
                    </h2>
                  </div>

                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                    Shortcuts
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {QUICK_TOOLS.map((tool) => (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      className="
                        group
                        flex
                        min-w-0
                        flex-col
                        items-start
                        gap-2.5
                        rounded-xl
                        border
                        border-paper-border
                        bg-paper-surface
                        p-3
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:border-amber/50
                        hover:bg-paper-raised
                        dark:border-ink-border
                        dark:bg-ink-surface
                        dark:hover:border-amber/50
                        dark:hover:bg-ink-raised
                      "
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber transition-colors group-hover:bg-amber group-hover:text-ink">
                        <Wrench className="h-[17px] w-[17px]" strokeWidth={1.7} />
                      </span>

                      <span className="min-w-0 truncate text-[11px] font-medium leading-4 text-graphite dark:text-mist">
                        {tool.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Account card */}
              <section
                className="
                  rounded-xl
                  border
                  border-amber/25
                  bg-amber/[0.04]
                  p-4
                  sm:p-5
                  dark:bg-amber/[0.03]
                "
              >
                {/*
                  This slot used to hold a "daily streak — 7 days active" card
                  with seven filled bars, hardcoded. Every account saw the same
                  seven days on the day it was created. Nothing in the data can
                  support a streak — no per-day activity is recorded — so the
                  space now shows facts the profile actually holds.
                */}
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                    <Zap className="h-4 w-4" strokeWidth={1.6} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-graphite dark:text-mist">
                      Your account
                    </p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-amber">
                      {account.plan} plan
                    </p>
                  </div>
                </div>

                <dl className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] text-graphite-muted dark:text-mist-muted">
                      Member since
                    </dt>
                    <dd className="text-[12px] font-medium text-graphite dark:text-mist">
                      {memberSince}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] text-graphite-muted dark:text-mist-muted">
                      Files processed
                    </dt>
                    <dd className="text-[12px] font-medium text-graphite dark:text-mist">
                      {account.filesProcessed}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] text-graphite-muted dark:text-mist-muted">
                      Saved projects
                    </dt>
                    <dd className="text-[12px] font-medium text-graphite dark:text-mist">
                      {account.projectCount}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}