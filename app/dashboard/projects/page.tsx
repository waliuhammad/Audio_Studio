import { Sidebar, Topbar } from "@/components/dashboard";
import {
  ArrowUpRight,
  Clock,
  FileAudio,
  FileVideo,
  FolderOpen,
  Grid2X2,
  MoreHorizontal,
  Music,
  Play,
  SlidersHorizontal,
} from "lucide-react";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

const FILTERS = ["All", "Recent", "Audio", "Video", "Drafts"] as const;

type ProjectVisual = "waveform" | "video" | "bars";

type Project = {
  name: string;
  category: "Audio" | "Video" | "Other";
  visual: ProjectVisual;
  icon: typeof FileAudio;
  size: string;
  date: string;
  status: "Done" | "Processing" | "Draft";
};

const PROJECTS: Project[] = [
  {
    name: "podcast_episode_12.wav",
    category: "Audio",
    visual: "waveform",
    icon: FileAudio,
    size: "84.2 MB",
    date: "2 hours ago",
    status: "Done",
  },
  {
    name: "client_demo_mix.mov",
    category: "Video",
    visual: "video",
    icon: FileVideo,
    size: "210.5 MB",
    date: "Yesterday",
    status: "Done",
  },
  {
    name: "studio_session_master.wav",
    category: "Audio",
    visual: "waveform",
    icon: FileAudio,
    size: "148.9 MB",
    date: "Yesterday",
    status: "Processing",
  },
  {
    name: "voiceover_final_02.mp3",
    category: "Audio",
    visual: "waveform",
    icon: FileAudio,
    size: "9.3 MB",
    date: "3 days ago",
    status: "Done",
  },
  {
    name: "wedding_highlight_reel.mp4",
    category: "Video",
    visual: "video",
    icon: FileVideo,
    size: "512.4 MB",
    date: "4 days ago",
    status: "Done",
  },
  {
    name: "beats_lofi_loop.wav",
    category: "Audio",
    visual: "waveform",
    icon: Music,
    size: "22.0 MB",
    date: "Last week",
    status: "Draft",
  },
  {
    name: "band_rehearsal_trim.m4a",
    category: "Audio",
    visual: "waveform",
    icon: FileAudio,
    size: "41.7 MB",
    date: "Last week",
    status: "Done",
  },
  {
    name: "product_demo_v2.mp4",
    category: "Video",
    visual: "video",
    icon: FileVideo,
    size: "620.1 MB",
    date: "2 weeks ago",
    status: "Processing",
  },
  {
    name: "intro_logo_sting.flac",
    category: "Other",
    visual: "bars",
    icon: Grid2X2,
    size: "6.8 MB",
    date: "3 weeks ago",
    status: "Done",
  },
];

const WAVEFORM_BARS = [30, 55, 38, 72, 46, 88, 52, 70, 34, 62, 45, 78, 42, 60, 28];

/* ===================================================== */
/* PROJECT CARD                                         */
/* ===================================================== */

function ProjectPreview({ project }: { project: Project }) {
  if (project.visual === "video") {
    return (
      <div className="relative flex h-[120px] items-center justify-center overflow-hidden bg-gradient-to-br from-graphite/10 via-transparent to-amber/[0.08] dark:from-mist/5 dark:to-amber/[0.05]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-amber transition-transform duration-300 group-hover:scale-105">
          <Play
            className="ml-0.5 h-4 w-4"
            strokeWidth={1.8}
            fill="currentColor"
          />
        </span>

        <span className="absolute bottom-2.5 left-2.5 font-mono text-[7px] uppercase tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
          1920 × 1080
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
        Studio
      </span>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const Icon = project.icon;

  return (
    <article
      className="
        group
        min-w-0
        overflow-hidden
        rounded-xl
        border
        border-paper-border
        bg-paper-surface
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-amber/50
        hover:shadow-sm
        dark:border-ink-border
        dark:bg-ink-surface
        dark:hover:border-amber/50
      "
    >
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
              {project.category}
            </span>
            <span aria-hidden="true" className="h-0.5 w-0.5 shrink-0 rounded-full bg-graphite-faint dark:bg-mist-faint" />
            <span>{project.size}</span>
          </p>

          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-graphite-faint dark:text-mist-faint">
            <Clock className="h-3 w-3" strokeWidth={1.6} />
            {project.date}
          </p>
        </div>

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
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
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
            className={`h-1.5 w-1.5 rounded-full ${
              project.status === "Processing"
                ? "bg-coral animate-pulse"
                : project.status === "Draft"
                  ? "bg-graphite-faint dark:bg-mist-faint"
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
        <Topbar title="My Projects" subtitle="Audio Studio / Projects" />

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

            {/* Filters */}
            <div className="flex shrink-0 items-center gap-2">
              <div
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
                  dark:border-ink-border
                  dark:bg-ink-surface
                "
              >
                <SlidersHorizontal
                  className="h-4 w-4 text-graphite-faint dark:text-mist-faint"
                  strokeWidth={1.7}
                />

                <span className="text-xs font-medium text-graphite dark:text-mist">
                  Recently added
                </span>
              </div>

              <button
                type="button"
                className="
                  flex
                  h-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-paper-border
                  bg-paper-surface
                  px-3.5
                  text-xs
                  font-medium
                  text-graphite-muted
                  transition-colors
                  hover:text-amber
                  dark:border-ink-border
                  dark:bg-ink-surface
                  dark:text-mist-muted
                  dark:hover:text-amber
                "
              >
                New Folder
              </button>
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
              scrollbar-none
              sm:mt-9
              dark:border-ink-border
            "
          >
            <div className="flex min-w-max items-center gap-0.5">
              {FILTERS.map((filter) => {
                const active = filter === "All";

                return (
                  <button
                    key={filter}
                    type="button"
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
          {/* COLLECTION HEADER                             */}
          {/* ============================================= */}

          <div className="mt-6 flex min-w-0 items-center gap-2.5 sm:mt-8 sm:gap-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber/20 bg-amber/10 text-amber">
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.7} />
            </span>

            <h2 className="truncate font-display text-sm font-semibold tracking-tight text-graphite sm:text-base dark:text-mist">
              All projects
            </h2>

            <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-paper-border dark:bg-ink-border" />

            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint sm:text-[10px] sm:tracking-wider">
              {PROJECTS.length} projects
            </span>
          </div>

          {/* ============================================= */}
          {/* PROJECTS GRID                                 */}
          {/* ============================================= */}

          <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PROJECTS.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>

          {/* ============================================= */}
          {/* EMPTY-STATE STYLE FOOTER NOTE                 */}
          {/* ============================================= */}

          <p className="mt-8 text-center text-[11px] text-graphite-faint dark:text-mist-faint">
            Design preview — filtering and folders will go live after approval.
          </p>
        </div>
      </div>
    </main>
  );
}