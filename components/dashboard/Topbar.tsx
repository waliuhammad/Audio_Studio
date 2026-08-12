import {
  Bell,
  Menu,
  Plus,
  Search,
} from "lucide-react";

export function Topbar({
  title,
  subtitle = "Audio Studio",
  searchPlaceholder = "Search projects...",
}: {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-paper-border bg-paper/85 backdrop-blur-xl dark:border-ink-border dark:bg-ink/85">
      <div className="container-studio flex h-16 items-center gap-4">
        {/* Mobile menu */}
        <button
          type="button"
          aria-label="Open menu"
          className="
            lg:hidden
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-paper-border
            text-graphite-muted
            dark:border-ink-border
            dark:text-mist-muted
          "
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>

        {/* Title */}
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold tracking-tight text-graphite sm:text-lg dark:text-mist">
            {title}
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
            {subtitle}
          </p>
        </div>

        {/* Search */}
        <label className="relative ml-auto hidden w-full max-w-[260px] shrink-0 sm:block">
          <span className="sr-only">Search</span>

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
            placeholder={searchPlaceholder}
            className="
              h-10
              w-full
              rounded-xl
              border
              border-paper-border
              bg-paper-surface/50
              pl-10
              pr-3
              text-sm
              text-graphite
              outline-none
              transition-all
              duration-200
              placeholder:text-graphite-faint
              focus:border-amber
              focus:bg-paper-surface
              dark:border-ink-border
              dark:bg-ink-surface/50
              dark:text-mist
              dark:placeholder:text-mist-faint
              dark:focus:bg-ink-surface
            "
          />
        </label>

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
          <button
            type="button"
            aria-label="New project"
            className="
              group
              flex
              h-10
              items-center
              gap-1.5
              rounded-full
              bg-amber
              px-3.5
              text-[11px]
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
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">New Project</span>
          </button>

          <button
            type="button"
            aria-label="Notifications"
            className="
              relative
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-paper-border
              text-graphite-muted
              transition-all
              duration-200
              hover:border-amber
              hover:text-amber
              dark:border-ink-border
              dark:text-mist-muted
              dark:hover:border-amber
              dark:hover:text-amber
            "
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.7} />

            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber" />
          </button>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/15 text-[12px] font-semibold text-amber ring-2 ring-amber/20">
            AL
          </span>
        </div>
      </div>
    </header>
  );
}