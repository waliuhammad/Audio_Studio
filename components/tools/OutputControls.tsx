"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * The Format and Quality dropdowns that belong in a tool's result card,
 * beside the rename field.
 *
 * Every tool had its own copy of this markup — around eighty lines each, with
 * its own refs, open state and outside-click handling — and they had drifted:
 * some pages put the pair in a separate panel further up, some only had
 * Format, some only Quality. One component means they look and behave the same
 * everywhere, and a fix lands once.
 *
 * State lives here because it is presentational: which menu is open is nobody
 * else's business. The chosen values stay with the page, which is what has to
 * send them to the API and invalidate a stale result when they change.
 */

export interface OutputOption {
    label: string;
    value: string;
}

/**
 * The four levels every tool offers, matching what lib/server/quality.ts maps
 * them to. Pages can pass their own for formats, but quality is deliberately
 * uniform — a "High" that means something different per tool would be worse
 * than no label at all.
 */
export const QUALITY_OPTIONS: OutputOption[] = [
    { label: "High · 320kbps", value: "high" },
    { label: "Medium · 192kbps", value: "medium" },
    { label: "Standard · 128kbps", value: "standard" },
    { label: "Low · 96kbps", value: "low" },
];

function Dropdown({
    label,
    options,
    value,
    onChange,
    disabled,
    open,
    onToggle,
}: {
    label: string;
    options: OutputOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    open: boolean;
    onToggle: () => void;
}) {
    const id = useId();
    const selected = options.find((option) => option.value === value);

    return (
        <div className="relative">
            <label
                htmlFor={id}
                className="mb-1.5 block text-xs font-medium text-graphite-muted dark:text-mist-muted"
            >
                {label}
            </label>

            <button
                id={id}
                type="button"
                onClick={onToggle}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-paper-border bg-paper-surface px-3 py-2 text-sm font-semibold text-graphite outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-border dark:bg-ink-surface dark:text-mist"
            >
                <span className="truncate">{selected?.label ?? value}</span>

                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-orange-500 transition-transform ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute left-0 z-50 mt-1.5 w-full min-w-[7rem] overflow-hidden rounded-lg border border-paper-border bg-paper-surface shadow-lg dark:border-ink-border dark:bg-ink-surface"
                >
                    {options.map((option) => {
                        const isSelected = option.value === value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => onChange(option.value)}
                                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-semibold transition-colors ${isSelected
                                    ? "bg-orange-500 text-white"
                                    : "text-graphite hover:bg-orange-500/10 hover:text-orange-600 dark:text-mist dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
                                    }`}
                            >
                                {option.label}
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function OutputControls({
    formatOptions,
    format,
    onFormatChange,
    qualityOptions = QUALITY_OPTIONS,
    quality,
    onQualityChange,
    disabled = false,
    className = "",
}: {
    formatOptions: OutputOption[];
    format: string;
    onFormatChange: (value: string) => void;
    qualityOptions?: OutputOption[];
    quality: string;
    onQualityChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
}) {
    const [openMenu, setOpenMenu] = useState<"format" | "quality" | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Close on an outside click or Escape. A menu that survives either feels
    // stuck, and these sit inside a card with a download button right below.
    useEffect(() => {
        if (!openMenu) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpenMenu(null);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [openMenu]);

    return (
        <div ref={containerRef} className={`grid grid-cols-2 gap-3 ${className}`}>
            <Dropdown
                label="Format"
                options={formatOptions}
                value={format}
                onChange={(next) => {
                    onFormatChange(next);
                    setOpenMenu(null);
                }}
                disabled={disabled}
                open={openMenu === "format"}
                onToggle={() =>
                    setOpenMenu((current) => (current === "format" ? null : "format"))
                }
            />

            <Dropdown
                label="Quality"
                options={qualityOptions}
                value={quality}
                onChange={(next) => {
                    onQualityChange(next);
                    setOpenMenu(null);
                }}
                disabled={disabled}
                open={openMenu === "quality"}
                onToggle={() =>
                    setOpenMenu((current) => (current === "quality" ? null : "quality"))
                }
            />
        </div>
    );
}
