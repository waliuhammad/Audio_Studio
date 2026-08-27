import { ImageResponse } from "next/og";
import {
    MARK_DOTS,
    MARK_HEIGHT,
    MARK_WIDTH,
    gradientColorAt,
} from "@/lib/brand";

/**
 * next/og renders on the EDGE runtime.
 *
 * Without this it is built for Node, where its font loader resolves an asset
 * path that does not exist and throws "TypeError: Invalid URL" — which fails
 * the whole production export, not just this route.
 */
export const runtime = "edge";

/**
 * The site favicon, generated from the same waveform mark as the navbar logo.
 *
 * public/ held nothing but a .gitkeep, so every tab and bookmark fell back to
 * the browser's default globe. Generating it here keeps the icon in step with
 * the logo instead of drifting from a checked-in PNG nobody re-exports.
 */

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// A tiny icon cannot show the fading tail legibly, so crop to the peaks.
const VISIBLE_FROM = 20;
const VISIBLE_TO = 70;
const VISIBLE_WIDTH = VISIBLE_TO - VISIBLE_FROM;

export default function Icon() {
    const scale = size.width / VISIBLE_WIDTH;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    position: "relative",
                    background: "#0B0E14",
                    borderRadius: 12,
                }}
            >
                {MARK_DOTS.filter(
                    (dot) => dot.x >= VISIBLE_FROM && dot.x <= VISIBLE_TO
                ).map((dot, index) => {
                    // Radius grows a little so the mark reads at 16px.
                    const diameter = dot.r * scale * 1.5;

                    return (
                        <div
                            key={index}
                            style={{
                                position: "absolute",
                                left: (dot.x - VISIBLE_FROM) * scale - diameter / 2,
                                top:
                                    (dot.y - MARK_HEIGHT / 2) * scale +
                                    size.height / 2 -
                                    diameter / 2,
                                width: diameter,
                                height: diameter,
                                borderRadius: diameter,
                                background: gradientColorAt(dot.x / MARK_WIDTH),
                            }}
                        />
                    );
                })}
            </div>
        ),
        size
    );
}