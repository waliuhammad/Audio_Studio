import Link from "next/link";
import { Logo } from "@/components/navbar/Logo";
import {
  ChevronRight,
  Crown,
  FolderOpen,
  LayoutDashboard,
  Library,
  Settings,
  Trash2,
  Wrench,
} from "lucide-react";

export type SidebarActive =
  | "dashboard"
  | "projects"
  | "library"
  | "trash"
  | "settings";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { id: "projects", label: "My Projects", href: "/dashboard/projects", icon: FolderOpen },
      { id: "tools", label: "Tools", href: "/#tools", icon: Wrench },
    ],
  },
  {
    label: "Manage",
    items: [
      { id: "library", label: "Library", href: "/library", icon: Library },
      { id: "trash", label: "Trash", href: "/trash", icon: Trash2 },
    ],
  },
  {
    label: "Account",
    items: [{ id: "settings", label: "Settings", href: "/settings", icon: Settings }],
  },
];

export function Sidebar({ active }: { active: SidebarActive }) {
  return (
    <aside
      className="
        sticky
        top-0
        hidden
        h-screen
        w-[264px]
        shrink-0
        flex-col
        border-r
        border-paper-border
        bg-paper
        px-4
        py-5
        lg:flex
        dark:border-ink-border
        dark:bg-ink
      "
    >
      {/* Logo */}
      <div className="px-1.5 pb-6">
        <Logo />
      </div>

      {/* Nav */}
      <nav aria-label="Dashboard" className="flex flex-col gap-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className="
                mb-2
                px-2
                font-mono
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.2em]
                text-graphite-faint
                dark:text-mist-faint
              "
            >
              {group.label}
            </p>

            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === active;

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`
                        group
                        flex
                        min-w-0
                        items-center
                        gap-2.5
                        rounded-xl
                        px-2.5
                        py-2.5
                        transition-all
                        duration-200
                        ${
                          isActive
                            ? "bg-amber/10 text-amber"
                            : "text-graphite-muted hover:bg-paper-raised hover:text-graphite dark:text-mist-muted dark:hover:bg-ink-raised dark:hover:text-mist"
                        }
                      `}
                    >
                      <Icon
                        className="h-[17px] w-[17px] shrink-0"
                        strokeWidth={1.7}
                      />

                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                        {item.label}
                      </span>

                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Upgrade card */}
      <div
        className="
          mt-auto
          rounded-xl
          border
          border-amber/30
          bg-amber/[0.04]
          p-4
          dark:bg-amber/[0.03]
        "
      >
        <div className="flex items-center gap-2.5">
          <span
            className="
              flex
              h-9
              w-9
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
            <Crown className="h-4 w-4" strokeWidth={1.6} />
          </span>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-graphite dark:text-mist">
              Go Pro
            </p>
            <p className="truncate text-[11px] leading-4 text-graphite-muted dark:text-mist-muted">
              Unlock max limits & priority
            </p>
          </div>
        </div>

        <button
          type="button"
          className="
            mt-3
            flex
            h-9
            w-full
            items-center
            justify-center
            rounded-full
            bg-amber
            text-xs
            font-semibold
            text-ink
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-[0_6px_18px_rgba(245,158,11,0.22)]
            active:translate-y-0
          "
        >
          Upgrade
        </button>
      </div>

      {/* Profile */}
      <div
        className="
          mt-4
          flex
          items-center
          gap-2.5
          rounded-xl
          border
          border-paper-border
          bg-paper-surface
          p-2.5
          dark:border-ink-border
          dark:bg-ink-surface
        "
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/15 text-[12px] font-semibold text-amber">
          AL
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-graphite dark:text-mist">
            Ada Lovelace
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
            Free plan
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint" strokeWidth={1.7} />
      </div>
    </aside>
  );
}