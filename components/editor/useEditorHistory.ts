"use client";

import { useCallback, useMemo, useState } from "react";

export interface HistoryEntry<T> {
    value: T;
    label: string;
}

export interface EditorHistory<T> {
    current: T | null;
    label: string | null;
    canUndo: boolean;
    canRedo: boolean;
    undoLabel: string | null;
    redoLabel: string | null;
    steps: string[];
    stepIndex: number;
    reset: (value: T, label: string) => void;
    commit: (value: T, label: string) => void;
    undo: () => void;
    redo: () => void;
    clear: () => void;
}

const MAX_HISTORY = 25;

/**
 * Undo/redo stack for the editor.
 *
 * AudioBuffers are large, so the stack is capped at MAX_HISTORY entries and
 * the oldest states are dropped once it fills.
 */
export function useEditorHistory<T>(): EditorHistory<T> {
    const [entries, setEntries] = useState<HistoryEntry<T>[]>([]);
    const [index, setIndex] = useState(-1);

    const reset = useCallback((value: T, label: string) => {
        setEntries([{ value, label }]);
        setIndex(0);
    }, []);

    const commit = useCallback(
        (value: T, label: string) => {
            setEntries((previous) => {
                // Committing after an undo discards the redo branch.
                const kept = previous.slice(0, index + 1);
                const next = [...kept, { value, label }];

                if (next.length > MAX_HISTORY) {
                    const trimmed = next.slice(next.length - MAX_HISTORY);
                    setIndex(trimmed.length - 1);
                    return trimmed;
                }

                setIndex(next.length - 1);
                return next;
            });
        },
        [index]
    );

    const undo = useCallback(() => {
        setIndex((previous) => (previous > 0 ? previous - 1 : previous));
    }, []);

    const redo = useCallback(() => {
        setIndex((previous) =>
            previous < entries.length - 1 ? previous + 1 : previous
        );
    }, [entries.length]);

    const clear = useCallback(() => {
        setEntries([]);
        setIndex(-1);
    }, []);

    const steps = useMemo(() => entries.map((entry) => entry.label), [entries]);

    const currentEntry = entries[index];
    const previousEntry = index > 0 ? entries[index - 1] : undefined;
    const nextEntry = index < entries.length - 1 ? entries[index + 1] : undefined;

    return {
        current: currentEntry ? currentEntry.value : null,
        label: currentEntry ? currentEntry.label : null,
        canUndo: index > 0,
        canRedo: index >= 0 && index < entries.length - 1,
        undoLabel: previousEntry ? previousEntry.label : null,
        redoLabel: nextEntry ? nextEntry.label : null,
        steps,
        stepIndex: index,
        reset,
        commit,
        undo,
        redo,
        clear,
    };
}