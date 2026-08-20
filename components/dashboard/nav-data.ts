import type { LucideIcon } from "lucide-react";
import {
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
    | "tools"
    | "library"
    | "trash"
    | "settings";

export interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: LucideIcon;
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

/**
 * Shared between the desktop Sidebar and the mobile drawer, so the two
 * can never drift apart.
 */
export const NAV_GROUPS: NavGroup[] = [
    {
        label: "Main",
        items: [
            {
                id: "dashboard",
                label: "Dashboard",
                href: "/dashboard",
                icon: LayoutDashboard,
            },
            {
                id: "projects",
                label: "My Projects",
                href: "/dashboard/projects",
                icon: FolderOpen,
            },
            { id: "tools", label: "Tools", href: "/dashboard/tools", icon: Wrench },
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
        items: [
            { id: "settings", label: "Settings", href: "/settings", icon: Settings },
        ],
    },
];

/** Map a pathname to the nav item id that should be highlighted. */
export function getActiveFromPath(pathname: string): string {
    if (pathname.startsWith("/dashboard/projects")) return "projects";
    if (pathname.startsWith("/dashboard/tools")) return "tools";
    if (pathname.startsWith("/dashboard")) return "dashboard";
    if (pathname.startsWith("/library")) return "library";
    if (pathname.startsWith("/trash")) return "trash";
    if (pathname.startsWith("/settings")) return "settings";

    return "";
}