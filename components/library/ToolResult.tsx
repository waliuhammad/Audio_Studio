"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { SaveToLibrary } from "./SaveToLibrary";

/**
 * Lets any tool offer "save to library" without rearranging its layout.
 *
 * Every tool page already builds a Blob and triggers a download; the only
 * thing missing was somewhere to put a second button. Rather than editing the
 * JSX of twenty differently-shaped pages, each page publishes its result here
 * and the bar renders itself from the shared tools layout.
 *
 * Tools stay usable signed-out — SaveToLibrary hides itself for anonymous
 * visitors, so the bar simply never appears for them.
 */

export interface ToolResult {
    blob: Blob;
    /** Filename to store, including extension. */
    fileName: string;
    /** Optional descriptor shown in the library, e.g. "MP3 · 3:24". */
    meta?: string;
}

interface ToolResultContextValue {
    setResult: (result: ToolResult | null) => void;
}

const ToolResultContext = createContext<ToolResultContextValue | null>(null);

export function ToolResultProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [result, setResult] = useState<ToolResult | null>(null);

    // Stable identity so a page can call setResult from inside an effect
    // without re-triggering it.
    const value = useMemo<ToolResultContextValue>(() => ({ setResult }), []);

    const getBlob = useCallback(() => result?.blob ?? null, [result]);

    return (
        <ToolResultContext.Provider value={value}>
            {children}

            {result && (
                <div
                    className="
                        pointer-events-none
                        fixed
                        inset-x-0
                        bottom-0
                        z-40
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
                            max-w-full
                            items-center
                            gap-3
                            rounded-2xl
                            border
                            border-paper-border
                            bg-paper-surface/95
                            px-4
                            py-3
                            shadow-[0_16px_48px_rgba(0,0,0,0.14)]
                            backdrop-blur-xl
                            dark:border-ink-border
                            dark:bg-ink-surface/95
                        "
                    >
                        <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-graphite dark:text-mist">
                                {result.fileName}
                            </p>

                            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
                                Ready
                            </p>
                        </div>

                        <SaveToLibrary
                            getBlob={getBlob}
                            fileName={result.fileName}
                            meta={result.meta}
                        />
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
        }
    );
}
