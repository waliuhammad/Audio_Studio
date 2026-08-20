"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { useAccount } from "@/components/providers/SessionProvider";
import { signOut } from "@/lib/firebase/auth-client";

/**
 * Avatar + dropdown in the topbar.
 *
 * This is the only route out of the app: signOut() clears the server cookie
 * first and the Firebase client second, then a hard replace() to /sign-in
 * stops the browser restoring a cached signed-in page from history.
 */
export function AccountMenu() {
    const account = useAccount();
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);

    // Close on an outside click or Escape — a dropdown that survives either
    // one feels stuck, especially on the narrow topbar.
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const handleSignOut = async () => {
        setIsSigningOut(true);

        await signOut();

        // refresh() clears the router cache so the server components behind
        // the protected routes are not replayed from memory.
        router.replace("/sign-in");
        router.refresh();
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Account menu"
                className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    bg-amber/15
                    text-[12px]
                    font-semibold
                    text-amber
                    ring-2
                    ring-amber/20
                    transition-transform
                    duration-200
                    hover:scale-105
                "
            >
                {account.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={account.picture}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    account.initials
                )}
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className="
                        absolute
                        right-0
                        top-12
                        z-50
                        w-60
                        overflow-hidden
                        rounded-xl
                        border
                        border-paper-border
                        bg-paper-surface
                        shadow-[0_16px_48px_rgba(0,0,0,0.12)]
                        dark:border-ink-border
                        dark:bg-ink-surface
                        dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]
                    "
                >
                    <div className="border-b border-paper-border px-4 py-3 dark:border-ink-border">
                        <p className="truncate text-sm font-semibold text-graphite dark:text-mist">
                            {account.name}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-graphite-muted dark:text-mist-muted">
                            {account.email}
                        </p>

                        <span
                            className="
                                mt-2
                                inline-flex
                                rounded-full
                                border
                                border-amber/30
                                bg-amber/10
                                px-2
                                py-0.5
                                font-mono
                                text-[9px]
                                uppercase
                                tracking-[0.14em]
                                text-amber
                            "
                        >
                            {account.plan} plan
                        </span>
                    </div>

                    <div className="p-1.5">
                        <Link
                            href="/settings"
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                            className="
                                flex
                                items-center
                                gap-2.5
                                rounded-lg
                                px-2.5
                                py-2
                                text-[13px]
                                text-graphite
                                transition-colors
                                hover:bg-paper-raised
                                dark:text-mist
                                dark:hover:bg-ink-raised
                            "
                        >
                            <User className="h-4 w-4" strokeWidth={1.7} />
                            Your profile
                        </Link>

                        <Link
                            href="/settings"
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                            className="
                                flex
                                items-center
                                gap-2.5
                                rounded-lg
                                px-2.5
                                py-2
                                text-[13px]
                                text-graphite
                                transition-colors
                                hover:bg-paper-raised
                                dark:text-mist
                                dark:hover:bg-ink-raised
                            "
                        >
                            <SettingsIcon className="h-4 w-4" strokeWidth={1.7} />
                            Settings
                        </Link>

                        <button
                            type="button"
                            role="menuitem"
                            disabled={isSigningOut}
                            onClick={() => void handleSignOut()}
                            className="
                                flex
                                w-full
                                items-center
                                gap-2.5
                                rounded-lg
                                px-2.5
                                py-2
                                text-left
                                text-[13px]
                                text-coral
                                transition-colors
                                hover:bg-coral/10
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <LogOut className="h-4 w-4" strokeWidth={1.7} />
                            {isSigningOut ? "Signing out…" : "Sign out"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
