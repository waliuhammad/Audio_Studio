import { NextResponse } from "next/server";
import fsSync from "fs";
import { ffmpegBinaryPath, runFFmpeg } from "@/lib/server/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check for the container orchestrator.
 *
 * Verifies FFmpeg is actually present — an app that boots but cannot run
 * FFmpeg is useless here, and failing loudly at deploy time is much better
 * than discovering it when a user uploads a file.
 *
 * When it fails it now reports WHICH path was tried and why, because
 * "FFmpeg is not installed or not on PATH" was the same message whether the
 * bundled binary had failed to download, an override pointed somewhere wrong,
 * or the host genuinely had no ffmpeg — three problems with three different
 * fixes.
 */
export async function GET() {
    const binary = ffmpegBinaryPath();

    // "ffmpeg" (no separator) means nothing bundled was usable and we are
    // relying on a system install found via PATH.
    const usingPath = !binary.includes("/") && !binary.includes("\\");

    try {
        const output = await runFFmpeg(["-version"]);
        const firstLine = output.split("\n")[0] ?? "";

        return NextResponse.json({
            status: "ok",
            ffmpeg: firstLine.trim() || "available",
            resolvedFrom: usingPath ? "PATH" : "bundled (ffmpeg-static)",
            binaryPath: binary,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            {
                status: "degraded",
                ffmpeg: "unavailable",
                binaryPath: binary,
                resolvedFrom: usingPath ? "PATH" : "bundled (ffmpeg-static)",
                binaryExists: usingPath ? null : fsSync.existsSync(binary),
                detail: error instanceof Error ? error.message : String(error),
                hint: usingPath
                    ? "No bundled binary was usable and PATH has no ffmpeg. Check that the build image installs it (nixpacks.toml), or set FFMPEG_PATH."
                    : "The bundled ffmpeg-static binary could not be run. Its install script downloads the executable; if that was skipped or failed, reinstall without --ignore-scripts.",
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}