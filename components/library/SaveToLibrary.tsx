"use client";

import { useEffect, useState } from "react";
import { Check, CloudUpload, Loader2 } from "lucide-react";

/**
 * "Save to library" for any screen that produces a file.
 *
 * Tools are usable signed-out — that is the whole pitch — so this button has
 * to cope with an anonymous visitor. It asks the session endpoint once on
 * mount and simply renders nothing when there is nobody to save for, rather
 * than teasing an action that would fail on click.
 *
 * `getBlob` is a callback, not a Blob, because most tools only have their
 * result after the user has pressed something. Passing a producer means the
 * button can sit in the layout from the start.
 */

type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveToLibraryProps {
    /** Produces the file to store. May be async — e.g. a fetch or an encode. */
    getBlob: () => Promise<Blob | null> | Blob | null;
    /** Filename shown in the library, e.g. "podcast-trimmed.mp3". */
    fileName: string;
    /** Optional descriptor, e.g. "1920×1080 · 01:42". */
    meta?: string;
    /** Disable while the tool itself is busy. */
    disabled?: boolean;
    className?: string;
}

export function SaveToLibrary({
    getBlob,
    fileName,
    meta,
    disabled = false,
    className = "",
}: SaveToLibraryProps) {
    const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
    const [state, setState] = useState<SaveState>("idle");
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/auth/session")
            .then((response) => (response.ok ? response.json() : { user: null }))
            .then((data: { user: unknown }) => {
                if (!cancelled) setIsSignedIn(Boolean(data.user));
            })
            .catch(() => {
                if (!cancelled) setIsSignedIn(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Nothing to offer an anonymous visitor, and nothing to show until we know.
    if (isSignedIn !== true) return null;

    const handleSave = async () => {
        if (state === "saving" || disabled) return;

        setState("saving");
        setMessage(null);

        try {
            const blob = await getBlob();

            if (!blob || blob.size === 0) {
                throw new Error("There is nothing to save yet.");
            }

            const formData = new FormData();
            formData.append("file", new File([blob], fileName, { type: blob.type }));
            formData.append("name", fileName);

            if (meta) formData.append("meta", meta);

            const response = await fetch("/api/library", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as {
                    error?: string;
                };

                throw new Error(data.error ?? "Could not save to your library.");
            }

            setState("saved");
            setMessage("Saved to your library.");
        } catch (error) {
            setState("error");
            setMessage(
                error instanceof Error ? error.message : "Could not save that file."
            );
        }
    };

    return (
        <div className={`flex flex-col items-end gap-1.5 ${className}`}>
            <button
                type="button"
                onClick={() => void handleSave()}
                disabled={disabled || state === "saving"}
                className="
                    flex
                    h-10
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface
                    px-4
                    text-sm
                    font-medium
                    text-graphite
                    transition-colors
                    hover:border-amber/50
                    hover:text-amber
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    dark:border-ink-border
                    dark:bg-ink-surface
                    dark:text-mist
                    dark:hover:border-amber/50
                    dark:hover:text-amber
                "
            >
                {state === "saving" ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                        Saving…
                    </>
                ) : state === "saved" ? (
                    <>
                        <Check className="h-4 w-4 text-teal" strokeWidth={2.2} />
                        Saved
                    </>
                ) : (
                    <>
                        <CloudUpload className="h-4 w-4" strokeWidth={1.8} />
                        Save to library
                    </>
                )}
            </button>

            {message && (
                <p
                    className={`text-[11px] ${state === "error" ? "text-coral" : "text-teal"
                        }`}
                >
                    {message}
                </p>
            )}
        </div>
    );
}
