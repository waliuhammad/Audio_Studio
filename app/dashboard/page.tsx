import Link from "next/link";
import { Sidebar, Topbar } from "@/components/dashboard";
import {
  ArrowUpRight,
  Clock,
  Combine,
  FileAudio,
  FileVideo,
  FolderOpen,
  Gauge,
  HardDrive,
  MoreHorizontal,
  Music,
  Plus,
  Scissors,
  TrendingUp,
  Volume2,
  Wrench,
  Zap,
} from "lucide-react";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

type Stat = {
  label: string;
  value: string;
  hint: string;
  trend: "up" | "down" | "flat";
  icon: typeof FolderOpen;
  progress?: number;
};

const STATS: Stat[] = [
  {
    label: "Projects",
    value: "24",
    hint: "+3 this week",
    trend: "up",
    icon: FolderOpen,
  },
  {
    label: "Files processed",
    value: "342",
    hint: "+12% vs last month",
    trend: "up",
    icon: Zap,
  },
  {
    label: "Storage used",
    value: "6.2 GB",
    hint: "of 8.0 GB",
    trend: "flat",
    icon: HardDrive,
    progress: 78,
  },
  {
    label: "Processing time",
    value: "4.1 h",
    hint: "-8% vs last month",
    trend: "down",
    icon: Clock,
  },
];

const QUICK_TOOLS = [
  { name: "Audio Trimmer", href: "/tools/trimmer", icon: Scissors },
  { name: "Audio Merger", href: "/tools/merger", icon: Combine },
  { name: "Audio Converter", href: "/tools/converter", icon: FileAudio },
  { name: "Video to Audio", href: "/tools/video-to-audio", icon: FileVideo },
  { name: "Volume Normalizer", href: "/tools/volume-normalizer", icon: Volume2 },
  { name: "Ringtone Maker", href: "/tools/ringtone-maker", icon: Music },
];

const RECENT_PROJECTS = [
  {
    name: "podcast_episode_12.wav",
    type: "Audio",
    icon: FileAudio,
    size: "84.2 MB",
    updated: "2 hours ago",
    status: "Done",
  },
  {
    name: "client_demo_mix.mov",
    type: "Video",
    icon: FileVideo,
    size: "210.5 MB",
    updated: "Yesterday",
    status: "Done",
  },
  {
    name: "studio_session_master.wav",
    type: "Audio",
    icon: FileAudio,
    size: "148.9 MB",
    updated: "Yesterday",
    status: "Processing",
  },
  {
    name: "voiceover_final_02.mp3",
    type: "Audio",
    icon: FileAudio,
    size: "9.3 MB",
    updated: "3 days ago",
    status: "Done",
  },
];

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

      {typeof stat.progress === "number" && stat.progress !== undefined && (
        <div className="hidden sm:block mt-3 h-1 overflow-hidden rounded-full bg-graphite/10 dark:bg-mist/10">
          <div
            className="h-full rounded-full bg-amber"
            style={{ width: `${stat.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
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

      <Sidebar active="dashboard" />

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar title="Dashboard" subtitle="Audio Studio / Overview" />

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
                Good evening
              </div>

              <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite sm:text-4xl dark:text-mist">
                Welcome back, Ada.
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
            {STATS.map((stat) => (
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
                  <FolderOpen className="h-4 w-4 shrink-0 text-amber" strokeWidth={1.7} />

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
                {RECENT_PROJECTS.map((project, index) => {
                  const Icon = project.icon;

                  return (
                    <div
                      key={project.name}
                      className={`group flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-paper-raised sm:gap-4 sm:px-5 dark:hover:bg-ink-raised ${
                        index !== RECENT_PROJECTS.length - 1
                          ? "border-b border-paper-border dark:border-ink-border"
                          : ""
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
                            {project.type}
                          </span>
                          <span aria-hidden="true" className="h-0.5 w-0.5 rounded-full bg-graphite-faint dark:bg-mist-faint" />
                          <span>{project.size}</span>
                          <span aria-hidden="true" className="hidden h-0.5 w-0.5 rounded-full bg-graphite-faint sm:block dark:bg-mist-faint" />
                          <span className="hidden sm:inline">{project.updated}</span>
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
                          className={`h-1.5 w-1.5 rounded-full ${
                            project.status === "Processing"
                              ? "bg-coral animate-pulse"
                              : "bg-teal"
                          }`}
                        />
                        {project.status}
                      </span>

                      <button
                        type="button"
                        aria-label={`Actions for ${project.name}`}
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
                    </div>
                  );
                })}
              </div>

              <footer className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <Link
                  href="/dashboard/projects"
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
                    <HardDrive className="h-4 w-4 shrink-0 text-amber" strokeWidth={1.7} />

                    <h2 className="truncate font-display text-sm font-semibold tracking-tight text-graphite dark:text-mist">
                      Storage
                    </h2>
                  </div>

                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                    78% used
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="font-display text-3xl font-semibold tracking-[-0.04em] text-graphite dark:text-mist">
                    6.2<span className="text-base font-medium text-graphite-muted dark:text-mist-muted"> GB</span>
                  </p>

                  <p className="pb-1 text-[11px] text-graphite-muted dark:text-mist-muted">
                    of 8.0 GB
                  </p>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-graphite/10 dark:bg-mist/10">
                  <div className="h-full w-[78%] rounded-full bg-amber" />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 shrink-0 text-amber" strokeWidth={1.6} />

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
                    <Wrench className="h-4 w-4 shrink-0 text-amber" strokeWidth={1.7} />

                    <h2 className="truncate font-display text-sm font-semibold tracking-tight text-graphite dark:text-mist">
                      Quick tools
                    </h2>
                  </div>

                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                    Shortcuts
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {QUICK_TOOLS.map((tool) => {
                    const Icon = tool.icon;

                    return (
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
                          <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
                        </span>

                        <span className="min-w-0 truncate text-[11px] font-medium leading-4 text-graphite dark:text-mist">
                          {tool.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Activity card */}
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
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                    <Zap className="h-4 w-4" strokeWidth={1.6} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-graphite dark:text-mist">
                      Daily streak
                    </p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-amber">
                      7 days active
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <span
                      key={day}
                      className="h-2 flex-1 rounded-full bg-amber/70"
                    />
                  ))}
                </div>

                <p className="mt-3 text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
                  You&apos;ve processed files on 7 straight days. Keep the rhythm going.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}