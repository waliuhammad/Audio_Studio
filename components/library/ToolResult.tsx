"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { AlertCircle, X } from "lucide-react";

/**
 * Lets any tool offer "save to library" without rearranging its layout.
 *
 * Each tool publishes its real processed Blob and default filename here. The
 * provider owns the editable filename and the single browser download path.
 *
 * Tools stay usable signed-out — SaveToLibrary hides itself for anonymous
 * visitors, so the bar simply never appears for them.
 */

export interface ToolResult {
    blob: Blob;
    /** Initial complete filename shown in the editable Rename field. */
    defaultFileName: string;
    /** Output extension, including or excluding the leading dot. */
    extension?: string;
    /** Fallback basename used when the Rename field is empty. */
    fallbackBaseName?: string;
    /** Optional descriptor shown in the library, e.g. "MP3 · 3:24". */
    meta?: string;
}

interface ToolResultContextValue {
    setResult: (result: ToolResult | null) => void;
    /**
     * Report a failure to the user.
     *
     * Tools used to call alert() for this, which blocks the page, cannot be
     * styled, and looks like a browser warning rather than part of the app.
     * Routing it through the provider means a tool needs no error state or
     * markup of its own — same reason setResult lives here.
     */
    showError: (message: string) => void;
    result: ToolResult | null;
    renameValue: string;
    setRenameValue: (val: string) => void;
}

const ToolResultContext = createContext<ToolResultContextValue | null>(null);

export function ToolResultProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [result, setResult] = useState<ToolResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");

    const publishResult = useCallback((nextResult: ToolResult | null) => {
        setResult(nextResult);
        setRenameValue(nextResult?.defaultFileName ?? "");

        // A new result means the previous failure is no longer the current
        // state of things.
        if (nextResult) setErrorMessage(null);
    }, []);

    const showError = useCallback((message: string) => {
        setErrorMessage(message);
    }, []);

    // Stable identity so a page can call setResult from inside an effect
    // without re-triggering it.
    const value = useMemo<ToolResultContextValue>(() => ({
        setResult: publishResult,
        showError,
        result,
        renameValue,
        setRenameValue,
    }), [publishResult, showError, result, renameValue]);

    return (
        <ToolResultContext.Provider value={value}>
            {children}

            {errorMessage && (
                <div
                    role="alert"
                    className="
                        pointer-events-none
                        fixed
                        inset-x-0
                        bottom-0
                        z-50
                        flex
                        justify-center
                        px-4
                        pb-4
                    "
                >
                    <div
                        className="
                            pointer-events-auto
                            flex
                            max-w-lg
                            items-start
                            gap-3
                            rounded-2xl
                            border
                            border-coral/40
                            bg-paper-surface/95
                            px-4
                            py-3
                            shadow-[0_16px_48px_rgba(0,0,0,0.14)]
                            backdrop-blur-xl
                            dark:bg-ink-surface/95
                        "
                    >
                        <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0 text-coral"
                            strokeWidth={1.9}
                        />

                        <p className="min-w-0 flex-1 text-[13px] leading-5 text-graphite dark:text-mist">
                            {errorMessage}
                        </p>

                        <button
                            type="button"
                            onClick={() => setErrorMessage(null)}
                            aria-label="Dismiss"
                            className="shrink-0 rounded-lg p-1 text-graphite-muted transition-colors hover:text-coral dark:text-mist-muted"
                        >
                            <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                    </div>
                </div>
            )}

        </ToolResultContext.Provider>
    );
}

/**
 * Returns a no-op outside a provider.
 *
 * A tool rendered without the layout (a test, or a page moved out of the
 * route group) should still work — losing the save button is a far better
 * failure than crashing the whole tool.
 */
export function useToolResult(): ToolResultContextValue {
    return (
        useContext(ToolResultContext) ?? {
            setResult: () => undefined,
            showError: () => undefined,
            result: null,
            renameValue: "",
            setRenameValue: () => undefined,
        }
    );
}
