import { Sidebar, Topbar } from "@/components/dashboard";
import {
  Check,
  Clock,
  FileAudio,
  FileVideo,
  Folder,
  Image,
  LayoutGrid,
  List,
  Music,
  MoreHorizontal,
  Play,
  Tag,
  Upload,
} from "lucide-react";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

type LibraryItem = {
  name: string;
  type: "Audio" | "Video" | "Image" | "Folder";
  icon: typeof FileAudio;
  meta: string;
  size: string;
  selected?: boolean;
};

const LIBRARY: LibraryItem[] = [
  { name: "drums_break_loop.wav", type: "Audio", icon: Music, meta: "Audio", size: "12.4 MB", selected: true },
  { name: "guitar_clean_riff.wav", type: "Audio", icon: FileAudio, meta: "Audio", size: "8.2 MB" },
  { name: "client_showreel.mp4", type: "Video", icon: FileVideo, meta: "1920×1080 · 01:42", size: "210.5 MB", selected: true },
  { name: "album_cover_art.png", type: "Image", icon: Image, meta: "3000×3000", size: "6.1 MB" },
  { name: "vo_announcer_v3.mp3", type: "Audio", icon: FileAudio, meta: "Audio", size: "3.8 MB" },
  { name: "Project_Master_2026", type: "Folder", icon: Folder, meta: "Folder", size: "—" },
  { name: "synth_pad_texture.wav", type: "Audio", icon: FileAudio, meta: "Audio", size: "22.0 MB" },
  { name: "broll_city_night.mp4", type: "Video", icon: FileVideo, meta: "1920×1080 · 00:58", size: "88.7 MB" },
  { name: "podcast_intro_sting.flac", type: "Audio", icon: Music, meta: "Audio", size: "4.9 MB" },
  { name: "thumbnail_wide.jpg", type: "Image", icon: Image, meta: "1920×1080", size: "1.4 MB" },
  { name: "Field_Recordings", type: "Folder", icon: Folder, meta: "Folder", size: "—" },
  { name: "foley_rain_close.wav", type: "Audio", icon: FileAudio, meta: "Audio", size: "15.3 MB" },
];

const TYPE_CHIPS = ["All", "Audio", "Video", "Image", "Folders"] as const;

/* ===================================================== */
/* LIBRARY TILE                                         */
/* ===================================================== */

function LibraryTile({ item }: { item: LibraryItem }) {
  const Icon = item.icon;

  return (
    <div
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
      <div className="relative flex h-[112px] items-center justify-center overflow-hidden bg-gradient-to-br from-graphite/[0.06] via-transparent to-amber/[0.07] dark:from-mist/5 dark:to-amber/[0.04]">
        {item.type === "Folder" ? (
          <Icon className="h-9 w-9 text-amber/80" strokeWidth={1.4} />
        ) : item.type === "Video" ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-amber transition-transform duration-300 group-hover:scale-105">
            <Play className="ml-0.5 h-4 w-4" strokeWidth={1.8} fill="currentColor" />
          </span>
        ) : (
          <Icon className="h-9 w-9 text-amber/70" strokeWidth={1.3} />
        )}

        {/* Selection */}
        <span
          className={`absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200 ${
            item.selected
              ? "border-amber bg-amber text-ink"
              : "border-paper-border bg-paper/80 text-transparent group-hover:border-amber dark:border-ink-border dark:bg-ink/80"
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>

        <span className="absolute right-2.5 top-2.5 font-mono text-[7px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
          {item.type}
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
            <span aria-hidden="true" className="h-0.5 w-0.5 shrink-0 rounded-full bg-graphite-faint dark:bg-mist-faint" />
            <span>{item.size}</span>
          </p>
        </div>

        <button
          type="button"
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
/* PAGE                                                 */
/* ===================================================== */

export default function LibraryPage() {
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
        <Topbar title="Library" subtitle="Audio Studio / Media Library" />

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
                  aria-label="Grid view"
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    bg-amber/10
                    text-amber
                  "
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={1.7} />
                </button>

                <button
                  type="button"
                  aria-label="List view"
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    text-graphite-muted
                    transition-colors
                    hover:text-amber
                    dark:text-mist-muted
                    dark:hover:text-amber
                  "
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
                className="h-4 w-4 cursor-pointer rounded border border-paper-border bg-paper-surface accent-amber dark:border-ink-border dark:bg-ink-surface"
              />
              <span className="text-[11px] font-medium text-graphite dark:text-mist">
                Select all
              </span>
            </label>

            <span aria-hidden="true" className="hidden h-4 w-px bg-paper-border sm:block dark:bg-ink-border" />

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {TYPE_CHIPS.map((chip, index) => {
                const active = index === 0;

                return (
                  <button
                    key={chip}
                    type="button"
                    className={`
                      shrink-0
                      rounded-full
                      px-3
                      py-1.5
                      text-[11px]
                      font-medium
                      transition-colors
                      ${
                        active
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

            <span aria-hidden="true" className="h-4 w-px bg-paper-border dark:bg-ink-border" />

            <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint">
              <Tag className="h-3.5 w-3.5 text-amber" strokeWidth={1.6} />
              {LIBRARY.length} items
            </span>
          </div>

          {/* ============================================= */}
          {/* LIBRARY GRID                                  */}
          {/* ============================================= */}

          <div className="mt-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {LIBRARY.map((item) => (
              <LibraryTile key={item.name} item={item} />
            ))}
          </div>

          {/* ============================================= */}
          {/* FOOTER NOTE                                   */}
          {/* ============================================= */}

          <p className="mt-8 text-center text-[11px] text-graphite-faint dark:text-mist-faint">
            Design preview — upload, selection and view toggles go live after approval.
          </p>
        </div>
      </div>
    </main>
  );
}