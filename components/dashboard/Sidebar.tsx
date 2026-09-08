"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "@/components/providers/SessionProvider";
import { Avatar } from "./Avatar";
import { Logo } from "@/components/navbar/Logo";
import {
    ChevronLeft,
    ChevronRight,
    Crown,
    LogOut,
} from "lucide-react";
import { NAV_GROUPS, type SidebarActive } from "./nav-data";
import { signOut } from "@/lib/firebase/auth-client";

export type { SidebarActive };

/**
 * Remembered across navigations, because the sidebar remounts on every page
 * and a rail that sprang back open each time you moved would be worse than
 * one that never collapsed at all.
 */
const COLLAPSED_KEY = "audio-studio:sidebar-collapsed";

export function Sidebar({ active }: { active: SidebarActive }) {
    const account = useAccount();
    const router = useRouter();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    /*
     * Read after mount rather than during render. The server has no
     * localStorage, so seeding the state from it up front would render a
     * different width than the client and trip a hydration mismatch. Everyone
     * gets the expanded rail for one frame; only people who collapsed it see
     * it close, which is the smaller of the two wrongs.
     */
    useEffect(() => {
        try {
            setIsCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
        } catch {
            // Storage can throw outright when the browser blocks site data.
        }
    }, []);

    const toggleCollapsed = () => {
        setIsCollapsed((previous) => {
            const next = !previous;

            try {
                window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
            } catch {
                // Not being able to remember it is not a reason to refuse it.
            }

            return next;
        });
    };

    /*
     * Same sequence as the account menu: clear the server cookie first and the
     * Firebase client second, then replace() so the back button cannot restore
     * a cached signed-in page, and refresh() so the protected server
     * components are not replayed from the router cache.
     */
    const handleSignOut = async () => {
        setIsSigningOut(true);

        await signOut();

        router.replace("/sign-in");
        router.refresh();
    };

    return (
        <aside
            className={`
                sticky
                top-0
                hidden
                h-screen
                shrink-0
                flex-col
                border-r
                border-paper-border
                bg-paper
                py-5
                transition-[width]
                duration-300
                lg:flex
                dark:border-ink-border
                dark:bg-ink
                ${isCollapsed ? "w-[76px] px-3" : "w-[264px] px-4"}
            `}
        >
            {/* ============================================= */}
            {/* HEADER — logo + collapse toggle               */}
            {/* ============================================= */}

            <div
                className={`
                    flex items-center pb-6
                    ${isCollapsed ? "justify-center" : "justify-between gap-2 px-1.5"}
                `}
            >
                {!isCollapsed && (
                    <div className="min-w-0">
                        <Logo />
                    </div>
                )}

                <button
                    type="button"
                    onClick={toggleCollapsed}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!isCollapsed}
                    className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-paper-border
                        text-graphite-muted
                        transition-colors
                        duration-200
                        hover:border-amber/50
                        hover:text-amber
                        dark:border-ink-border
                        dark:text-mist-muted
                        dark:hover:border-amber/50
                        dark:hover:text-amber
                    "
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                    ) : (
                        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
                    )}
                </button>
            </div>

            {/* ============================================= */}
            {/* NAV                                           */}
            {/* ============================================= */}

            <nav aria-label="Dashboard" className="flex flex-col gap-6">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        {/* Group headings are words, so they go with the words. */}
                        {!isCollapsed && (
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
                        )}

                        <ul className="flex flex-col gap-1">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.id === active;

                                return (
                                    <li key={item.id}>
                                        <Link
                                            href={item.href}
                                            title={isCollapsed ? item.label : undefined}
                                            aria-label={isCollapsed ? item.label : undefined}
                                            className={`
                                                group
                                                flex
                                                min-w-0
                                                items-center
                                                rounded-xl
                                                py-2.5
                                                transition-all
                                                duration-200
                                                ${isCollapsed
                                                    ? "justify-center px-0"
                                                    : "gap-2.5 px-2.5"
                                                }
                                                ${isActive
                                                    ? "bg-amber/10 text-amber"
                                                    : "text-graphite-muted hover:bg-paper-raised hover:text-graphite dark:text-mist-muted dark:hover:bg-ink-raised dark:hover:text-mist"
                                                }
                                            `}
                                        >
                                            <Icon
                                                className="h-[17px] w-[17px] shrink-0"
                                                strokeWidth={1.7}
                                            />

                                            {!isCollapsed && (
                                                <>
                                                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                                                        {item.label}
                                                    </span>

                                                    {isActive && (
                                                        <span
                                                            aria-hidden="true"
                                                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* ============================================= */}
            {/* UPGRADE                                       */}
            {/* ============================================= */}

            {isCollapsed ? (
                /* The card is mostly prose, so collapsed it becomes the one
                   thing it was for: a way to the pricing section. */
                <Link
                    href="/#pricing"
                    title="Go Pro"
                    aria-label="Go Pro"
                    className="
                        mt-auto
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        self-center
                        rounded-xl
                        border
                        border-amber/30
                        bg-amber/10
                        text-amber
                        transition-colors
                        duration-200
                        hover:bg-amber
                        hover:text-ink
                    "
                >
                    <Crown className="h-4 w-4" strokeWidth={1.6} />
                </Link>
            ) : (
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
                                Unlock max limits &amp; priority
                            </p>
                        </div>
                    </div>

                    {/*
                      A plain <button> with no handler, so clicking "Upgrade" did nothing.
                      There is no checkout to send anyone to yet, but the pricing section
                      is real — so it points there instead of silently failing.
                    */}
                    <Link
                        href="/#pricing"
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
                    </Link>
                </div>
            )}

            {/* ============================================= */}
            {/* PROFILE                                       */}
            {/* ============================================= */}

            <Link
                href="/settings"
                title={isCollapsed ? account.name : undefined}
                aria-label={isCollapsed ? account.name : undefined}
                className={`
                    mt-4
                    flex
                    items-center
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface
                    transition-colors
                    hover:border-amber/40
                    dark:border-ink-border
                    dark:bg-ink-surface
                    dark:hover:border-amber/40
                    ${isCollapsed ? "justify-center p-1.5" : "gap-2.5 p-2.5"}
                `}
            >
                <Avatar size={36} />

                {!isCollapsed && (
                    <>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold text-graphite dark:text-mist">
                                {account.name}
                            </p>
                            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
                                {account.plan} plan
                            </p>
                        </div>

                        <ChevronRight
                            className="h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint"
                            strokeWidth={1.7}
                        />
                    </>
                )}
            </Link>

            {/* ============================================= */}
            {/* SIGN OUT                                      */}
            {/* ============================================= */}

            {/*
              Signing out used to be reachable only from the topbar dropdown.
              Collapsed, that leaves a rail of icons with no visible way out,
              so the door is on the rail itself now — in both states, since a
              control that appears only when collapsed is harder to find, not
              easier.
            */}
            <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                title={isCollapsed ? "Sign out" : undefined}
                aria-label={isCollapsed ? "Sign out" : undefined}
                className={`
                    mt-2
                    flex
                    items-center
                    rounded-xl
                    py-2.5
                    text-graphite-muted
                    transition-colors
                    duration-200
                    hover:bg-coral/10
                    hover:text-coral
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:text-mist-muted
                    dark:hover:bg-coral/10
                    dark:hover:text-coral
                    ${isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"}
                `}
            >
                <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.7} />

                {!isCollapsed && (
                    <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium">
                        {isSigningOut ? "Signing out…" : "Sign out"}
                    </span>
                )}
            </button>
        </aside>
    );
}
