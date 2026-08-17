import { Sidebar, Topbar } from "@/components/dashboard";
import {
  Calendar,
  FileAudio,
  FileVideo,
  Folder,
  Image,
  Music,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

type TrashItem = {
  name: string;
  type: "Audio" | "Video" | "Image" | "Folder";
  icon: typeof FileAudio;
  size: string;
  deleted: string;
  expiresIn: string;
};

const TRASH: TrashItem[] = [
  { name: "old_voiceover_draft_09.mp3", type: "Audio", icon: FileAudio, size: "5.6 MB", deleted: "Feb 12, 2026", expiresIn: "18 days left" },
  { name: "outtake_clip_alt_01.mov", type: "Video", icon: FileVideo, size: "184.3 MB", deleted: "Feb 10, 2026", expiresIn: "16 days left" },
  { name: "rough_beat_v2.wav", type: "Audio", icon: Music, size: "14.2 MB", deleted: "Feb 8, 2026", expiresIn: "14 days left" },
  { name: "old_logo_draft.png", type: "Image", icon: Image, size: "2.1 MB", deleted: "Feb 5, 2026", expiresIn: "11 days left" },
  { name: "Archive_2025", type: "Folder", icon: Folder, size: "—", deleted: "Feb 1, 2026", expiresIn: "7 days left" },
];

/* ===================================================== */
/* TRASH ROW                                            */
/* ===================================================== */

function TrashRow({ item }: { item: TrashItem }) {
  const Icon = item.icon;

  return (
    <div
      className="
        group
        flex
        min-w-0
        items-center
        gap-3
        px-4
        py-3.5
        transition-colors
        hover:bg-paper-raised
        sm:gap-4
        sm:px-6
        dark:hover:bg-ink-raised
      "
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
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-graphite dark:text-mist">
          {item.name}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-graphite-muted dark:text-mist-muted">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em]">{item.type}</span>
          <span aria-hidden="true" className="h-0.5 w-0.5 shrink-0 rounded-full bg-graphite-faint dark:bg-mist-faint" />
          <span>{item.size}</span>
        </p>
      </div>

      <div className="hidden min-w-0 flex-col items-end sm:flex">
        <p className="flex items-center gap-1.5 text-[11px] text-graphite-muted dark:text-mist-muted">
          <Calendar className="h-3 w-3" strokeWidth={1.6} />
          {item.deleted}
        </p>
        <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-coral">
          {item.expiresIn}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={`Restore ${item.name}`}
          className="
            flex
            h-8
            items-center
            gap-1.5
            rounded-full
            border
            border-paper-border
            bg-paper-surface
            px-3
            text-[11px]
            font-medium
            text-graphite-muted
            transition-all
            duration-200
            hover:border-amber/50
            hover:text-amber
            dark:border-ink-border
            dark:bg-ink-surface
            dark:text-mist-muted
            dark:hover:border-amber/50
            dark:hover:text-amber
          "
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span className="hidden sm:inline">Restore</span>
        </button>

        <button
          type="button"
          aria-label={`Delete forever ${item.name}`}
          className="
            flex
            h-8
            items-center
            justify-center
            rounded-full
            border
            border-transparent
            bg-coral/10
            px-2.5
            text-coral
            transition-all
            duration-200
            hover:bg-coral
            hover:text-ink
          "
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

/* ===================================================== */
/* PAGE                                                 */
/* ===================================================== */

export default function TrashPage() {
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

      <Sidebar active="trash" />

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar title="Trash" subtitle="Audio Studio / Trash" />

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
                Recently deleted
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
                Trash
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
                Deleted items are kept here temporarily before permanent removal.
              </p>
            </div>

            {/* Empty trash */}
            <button
              type="button"
              className="
                flex
                h-10
                shrink-0
                items-center
                gap-2
                rounded-full
                border
                border-coral/30
                bg-coral/5
                px-4
                text-xs
                font-semibold
                text-coral
                transition-all
                duration-200
                hover:bg-coral
                hover:text-ink
              "
            >
              <X className="h-4 w-4" strokeWidth={2} />
              Empty Trash
            </button>
          </div>

          {/* ============================================= */}
          {/* AUTO-DELETE BANNER                            */}
          {/* ============================================= */}

          <div
            className="
              mt-7
              flex
              flex-wrap
              items-center
              gap-x-3
              gap-y-2
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              px-4
              py-3
              sm:mt-9
              sm:px-5
              dark:border-ink-border
              dark:bg-ink-surface
            "
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-coral/20 bg-coral/10 text-coral">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.7} />
            </span>

            <p className="text-[12px] leading-5 text-graphite-muted dark:text-mist-muted">
              Items in Trash are automatically and permanently deleted after{" "}
              <span className="font-medium text-graphite dark:text-mist">30 days</span>.
            </p>

            <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint">
              {TRASH.length} items
            </span>
          </div>

          {/* ============================================= */}
          {/* TRASH LIST                                    */}
          {/* ============================================= */}

          <section
            className="
              mt-4
              overflow-hidden
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              dark:border-ink-border
              dark:bg-ink-surface
            "
          >
            <div className="flex flex-col">
              {TRASH.map((item, index) => (
                <div
                  key={item.name}
                  className={
                    index !== TRASH.length - 1
                      ? "border-b border-paper-border dark:border-ink-border"
                      : ""
                  }
                >
                  <TrashRow item={item} />
                </div>
              ))}
            </div>
          </section>

          {/* ============================================= */}
          {/* FOOTER NOTE                                   */}
          {/* ============================================= */}

          <p className="mt-8 text-center text-[11px] text-graphite-faint dark:text-mist-faint">
            Design preview — restore and permanent delete go live after approval.
          </p>
        </div>
      </div>
    </main>
  );
}