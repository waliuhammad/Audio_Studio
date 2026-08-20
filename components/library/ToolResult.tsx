"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { AlertCircle, CheckCircle2, Download, Pencil, X } from "lucide-react";
import { SaveToLibrary } from "./SaveToLibrary";
import { downloadBlob } from "@/lib/audio/audio-utils";
import {
    baseNameFromFilename,
    extensionFromFilename,
    normalizeDownloadFilename,
} from "@/lib/download/filename";

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
    downloadName: string;
    getBlob: () => Blob | null;
    /** When true, the provider will NOT render the global bottom result UI. */
    setInlineMode: (v: boolean) => void;
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
    const [inlineMode, setInlineMode] = useState(false);

    const extension = result?.extension ??
        (result ? extensionFromFilename(result.defaultFileName) : "bin");
    const fallbackBaseName = result?.fallbackBaseName ??
        (result ? baseNameFromFilename(result.defaultFileName) : "download");
    const downloadName = result
        ? normalizeDownloadFilename(renameValue, {
            extension,
            fallbackBaseName,
        })
        : "";

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
        downloadName,
        getBlob: () => result?.blob ?? null,
        setInlineMode: (v: boolean) => setInlineMode(v),
    }), [publishResult, showError, result, renameValue, downloadName]);

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

            {/* Global fallback result UI — hidden when a tool requests inline rendering */}
            {result && !inlineMode && (
                <div
                    className="
                        mx-auto
                        mt-6
                        w-full
                        max-w-3xl
                        px-4
                        pb-8
                    "
                >
                    <div
                        className="
                            rounded-2xl
                            border
                            border-orange-500/20
                            bg-orange-500/5
                            p-4
                            shadow-sm
                            dark:border-orange-500/20
                            sm:p-5
                        "
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                                <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-graphite dark:text-mist">
                                    Your file is ready
                                </p>
                                <p className="mt-1 text-xs text-graphite-muted dark:text-mist-muted">
                                    Choose the name for your downloaded file.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <label
                                htmlFor="tool-result-rename"
                                className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-graphite-muted dark:text-mist-muted"
                            >
                                Rename
                            </label>

                            <div className="relative">
                                <input
                                    id="tool-result-rename"
                                    type="text"
                                    value={renameValue}
                                    onChange={(event) => setRenameValue(event.target.value)}
                                    className="h-12 w-full rounded-xl border border-paper-border bg-paper-surface px-4 pr-11 text-sm font-medium text-graphite outline-none transition-all duration-200 hover:border-orange-500/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-ink-border dark:bg-ink-surface dark:text-mist"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <Pencil
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500/70"
                                    strokeWidth={1.8}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <button
                                type="button"
                                onClick={() => result && downloadBlob(result.blob, downloadName)}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:ring-offset-2 focus:ring-offset-paper-surface dark:focus:ring-offset-ink-surface sm:w-auto"
                            >
                                <Download className="h-4 w-4" strokeWidth={1.9} />
                                Download
                            </button>

                            <SaveToLibrary
                                getBlob={() => result?.blob ?? null}
                                fileName={downloadName}
                                meta={result.meta}
                                className="sm:ml-auto"
                            />
                        </div>
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
            downloadName: "",
            getBlob: () => null,
            setInlineMode: () => undefined,
        }
    );
}
