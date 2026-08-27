import { ImageResponse } from "next/og";
import {
    MARK_DOTS,
    MARK_HEIGHT,
    MARK_WIDTH,
    gradientColorAt,
} from "@/lib/brand";
import { SITE } from "@/lib/seo";

/**
 * next/og renders on the EDGE runtime.
 *
 * Without this it is built for Node, where its font loader resolves an asset
 * path that does not exist and throws "TypeError: Invalid URL" — which fails
 * the whole production export, not just this route.
 */
export const runtime = "edge";

/**
 * The default Open Graph / social card.
 *
 * The root metadata already declared summary_large_image, but no image
 * existed anywhere in the project — so every link shared to a social app or
 * chat rendered a blank card. Generating it here means the card tracks the
 * brand mark and the site description automatically.
 *
 * Child routes can still export their own opengraph-image to override this.
 */

export const alt = `${SITE.name} — online audio and video tools`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK_SCALE = 2.5;

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#0B0E14",
                    padding: 64,
                    fontFamily: "sans-serif",
                }}
            >
                {/* Waveform mark */}
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        width: MARK_WIDTH * MARK_SCALE,
                        height: MARK_HEIGHT * MARK_SCALE,
                    }}
                >
                    {MARK_DOTS.map((dot, index) => {
                        const diameter = dot.r * MARK_SCALE * 2;

                        return (
                            <div
                                key={index}
                                style={{
                                    position: "absolute",
                                    left: dot.x * MARK_SCALE - diameter / 2,
                                    top: dot.y * MARK_SCALE - diameter / 2,
                                    width: diameter,
                                    height: diameter,
                                    borderRadius: diameter,
                                    background: gradientColorAt(
                                        dot.x / MARK_WIDTH
                                    ),
                                }}
                            />
                        );
                    })}
                </div>

                {/* Wordmark and description */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 18,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 68,
                                fontWeight: 700,
                                color: "#EDEFF3",
                                letterSpacing: "0.04em",
                            }}
                        >
                            AUDIO
                        </div>
                        <div
                            style={{
                                fontSize: 26,
                                fontWeight: 500,
                                color: "#8A93A6",
                                letterSpacing: "0.34em",
                            }}
                        >
                            STUDIO
                        </div>
                    </div>

                    <div
                        style={{
                            marginTop: 22,
                            fontSize: 30,
                            lineHeight: 1.35,
                            color: "#8A93A6",
                            maxWidth: 900,
                        }}
                    >
                        Trim, merge, convert and shape sound — free, in your
                        browser.
                    </div>

                    {/* Accent rule, echoing the gradient */}
                    <div style={{ display: "flex", marginTop: 34 }}>
                        {Array.from({ length: 60 }).map((_, index) => (
                            <div
                                key={index}
                                style={{
                                    width: 14,
                                    height: 6,
                                    borderRadius: 6,
                                    marginRight: 4,
                                    background: gradientColorAt(index / 59),
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        ),
        size
    );
}