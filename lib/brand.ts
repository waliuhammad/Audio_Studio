/**
 * Brand mark geometry, shared by the navbar logo and the generated
 * icon / Open Graph images.
 *
 * The generated images are produced by Satori (next/og), which renders a
 * subset of CSS and does not support SVG filters or gradient fills. So the
 * mark is described here as plain data — position, radius, and a solid colour
 * sampled from the wordmark's gradient — and each surface draws it with
 * whatever primitives it has.
 */

export interface MarkDot {
    /** Centre, in the mark's own 108x100 coordinate space. */
    x: number;
    y: number;
    r: number;
}

/** The waveform mark: a dotted signal that rises, peaks twice, and fades out. */
export const MARK_DOTS: MarkDot[] = [
    // Left baseline
    { x: 3, y: 50, r: 1.5 },
    { x: 8, y: 50, r: 1.6 },
    { x: 13, y: 50, r: 1.7 },
    { x: 18, y: 50, r: 1.8 },

    // First rise
    { x: 24, y: 47, r: 1.9 },
    { x: 24, y: 53, r: 1.9 },
    { x: 30, y: 42, r: 2 },
    { x: 30, y: 47, r: 2 },
    { x: 30, y: 53, r: 2 },
    { x: 30, y: 58, r: 2 },

    // Main peak
    { x: 36, y: 35, r: 2.1 },
    { x: 36, y: 41, r: 2.1 },
    { x: 36, y: 47, r: 2.1 },
    { x: 36, y: 53, r: 2.1 },
    { x: 36, y: 59, r: 2.1 },
    { x: 36, y: 65, r: 2.1 },
    { x: 42, y: 23, r: 2.2 },
    { x: 42, y: 29, r: 2.2 },
    { x: 42, y: 35, r: 2.2 },
    { x: 42, y: 41, r: 2.2 },
    { x: 42, y: 47, r: 2.2 },
    { x: 42, y: 53, r: 2.2 },
    { x: 42, y: 59, r: 2.2 },
    { x: 42, y: 65, r: 2.2 },
    { x: 42, y: 71, r: 2.2 },

    // Centre dip
    { x: 48, y: 39, r: 2.2 },
    { x: 48, y: 45, r: 2.2 },
    { x: 48, y: 51, r: 2.2 },
    { x: 48, y: 57, r: 2.2 },
    { x: 48, y: 63, r: 2.2 },

    // Second peak
    { x: 54, y: 30, r: 2.2 },
    { x: 54, y: 36, r: 2.2 },
    { x: 54, y: 42, r: 2.2 },
    { x: 54, y: 48, r: 2.2 },
    { x: 54, y: 54, r: 2.2 },
    { x: 54, y: 60, r: 2.2 },
    { x: 54, y: 66, r: 2.2 },

    // Falling side
    { x: 60, y: 40, r: 2 },
    { x: 60, y: 45, r: 2 },
    { x: 60, y: 50, r: 2 },
    { x: 60, y: 55, r: 2 },
    { x: 60, y: 60, r: 2 },
    { x: 66, y: 45, r: 1.9 },
    { x: 66, y: 50, r: 1.9 },
    { x: 66, y: 55, r: 1.9 },

    // Fading line
    { x: 73, y: 48, r: 1.7 },
    { x: 79, y: 49, r: 1.6 },
    { x: 85, y: 50, r: 1.5 },
    { x: 91, y: 50, r: 1.4 },
    { x: 97, y: 50, r: 1.3 },
    { x: 103, y: 50, r: 1.2 },
];

/** The mark's intrinsic coordinate space. */
export const MARK_WIDTH = 108;
export const MARK_HEIGHT = 100;

/** The wordmark gradient, as [offset 0-1, #rrggbb] stops. */
const GRADIENT_STOPS: [number, string][] = [
    [0, "#f59e0b"],
    [0.27, "#f97316"],
    [0.52, "#ec4899"],
    [0.73, "#a855f7"],
    [1, "#38bdf8"],
];

function hexToRgb(hex: string): [number, number, number] {
    const value = parseInt(hex.slice(1), 16);

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Sample the brand gradient at a horizontal position.
 *
 * `position` is 0 at the left edge of the mark and 1 at the right.
 */
export function gradientColorAt(position: number): string {
    const clamped = Math.min(1, Math.max(0, position));

    let lower = GRADIENT_STOPS[0] as [number, string];
    let upper = GRADIENT_STOPS[GRADIENT_STOPS.length - 1] as [number, string];

    for (let index = 0; index < GRADIENT_STOPS.length - 1; index += 1) {
        const current = GRADIENT_STOPS[index] as [number, string];
        const next = GRADIENT_STOPS[index + 1] as [number, string];

        if (clamped >= current[0] && clamped <= next[0]) {
            lower = current;
            upper = next;
            break;
        }
    }

    const span = upper[0] - lower[0];
    const ratio = span === 0 ? 0 : (clamped - lower[0]) / span;

    const from = hexToRgb(lower[1]);
    const to = hexToRgb(upper[1]);

    const channel = (index: 0 | 1 | 2) =>
        Math.round(from[index] + (to[index] - from[index]) * ratio);

    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}