import { NextResponse } from "next/server";
import { runFFmpeg } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check for the container orchestrator.
 *
 * Verifies FFmpeg is actually present — an app that boots but cannot run
 * FFmpeg is useless here, and failing loudly at deploy time is much better
 * than discovering it when a user uploads a file.
 */
export async function GET() {
    try {
        const output = await runFFmpeg(["-version"]);
        const firstLine = output.split("\n")[0] ?? "";

        return NextResponse.json({
            status: "ok",
            ffmpeg: firstLine.trim() || "available",
            timestamp: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json(
            {
                status: "degraded",
                ffmpeg: "unavailable",
                detail: "FFmpeg is not installed or not on PATH.",
            },
            { status: 503 }
        );
    }
}