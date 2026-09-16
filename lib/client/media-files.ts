/*
 * Reading the files a user drops or picks, wherever they came from.
 *
 * "From the computer" covers more than the local disk: Google Drive for
 * desktop, OneDrive, Dropbox and iCloud Drive all appear as ordinary folders,
 * and on iPhone/iPad/Mac the file picker's Browse view includes iCloud Drive.
 * Those files arrive as normal File objects, but with quirks every tool has to
 * tolerate:
 *
 * - `file.type` is often "" — Windows has no MIME mapping for .m4a, .flac,
 *   .opus or .mkv, and sync clients do not supply one. A check on the MIME
 *   type alone rejects perfectly good files, so extension OR type is enough.
 * - Names come in any case: an iPhone video is IMG_1234.MOV.
 * - A cloud "online-only" placeholder downloads when read. If that fails
 *   (offline, or the sync client refuses) the read throws NotReadableError.
 * - Dragging from a website — Google Drive or iCloud in a browser tab — hands
 *   over a LINK, not a file. There is nothing to read; say so plainly.
 *
 * Keep the extension lists in step with AUDIO_EXTENSIONS / VIDEO_EXTENSIONS
 * in lib/server/media.ts: accepting here what the server then rejects only
 * moves the error later.
 */

export const AUDIO_FILE_EXTENSIONS = [
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

export const VIDEO_FILE_EXTENSIONS = [
    ".mp4",
    ".mov",
    ".webm",
    ".mkv",
    ".avi",
    ".m4v",
    ".mpeg",
    ".mpg",
];

/** One line for dropzones, so every tool names the same sources. */
export const UPLOAD_SOURCES_HINT =
    "From your computer, iCloud Drive, Google Drive, Dropbox or OneDrive";

/** Lower-cased extension including the dot, or "" when there is none. */
export function fileExtension(name: string): string {
    const dot = name.lastIndexOf(".");

    return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

/**
 * Whether a file is one of `extensions` — or, for a name with no extension at
 * all, carries a MIME type starting with one of `mimePrefixes`.
 *
 * The MIME fallback is deliberately limited to extension-less names: a .wma
 * reports "audio/x-ms-wma", and letting that through only moves the rejection
 * to the server after a full upload.
 */
export function isAcceptedFile(
    file: File,
    extensions: readonly string[],
    mimePrefixes: readonly string[] = []
): boolean {
    const extension = fileExtension(file.name);

    if (extension) return extensions.includes(extension);

    const type = (file.type || "").toLowerCase();

    return type !== "" && mimePrefixes.some((prefix) => type.startsWith(prefix));
}

export function isAudioFile(file: File): boolean {
    return isAcceptedFile(file, AUDIO_FILE_EXTENSIONS, ["audio/"]);
}

export function isVideoFile(file: File): boolean {
    return isAcceptedFile(file, VIDEO_FILE_EXTENSIONS, ["video/"]);
}

/**
 * The files in a drop.
 *
 * `dataTransfer.files` is the normal source; some drag sources (certain sync
 * clients and file managers) only populate `items`, so fall back to those.
 */
export function droppedFiles(dataTransfer: DataTransfer | null): File[] {
    if (!dataTransfer) return [];

    if (dataTransfer.files && dataTransfer.files.length > 0) {
        return Array.from(dataTransfer.files);
    }

    const files: File[] = [];

    for (const item of Array.from(dataTransfer.items ?? [])) {
        if (item.kind !== "file") continue;

        const file = item.getAsFile();

        if (file) files.push(file);
    }

    return files;
}

/**
 * Why a drop produced no file, as a sentence for the user — or null when it
 * did contain one.
 */
export function emptyDropMessage(dataTransfer: DataTransfer | null): string | null {
    if (droppedFiles(dataTransfer).length > 0) return null;

    const types = Array.from(dataTransfer?.types ?? []);

    if (types.includes("text/uri-list") || types.includes("text/plain")) {
        return "That was a link from a website, not a file. Download it first, or drag it from your iCloud Drive, Google Drive, Dropbox or OneDrive folder.";
    }

    return "No file was dropped. Try dragging the file again, or click to browse.";
}

/**
 * Confirm the file's bytes can actually be read.
 *
 * An online-only cloud file (OneDrive / iCloud / Drive "Files On-Demand") is
 * fetched by the OS on first read. Reading one byte up front turns a failure
 * there into a clear message now, instead of a broken upload later. Returns
 * null when the file is readable.
 */
export async function unreadableFileMessage(file: File): Promise<string | null> {
    try {
        await file.slice(0, 1).arrayBuffer();

        return null;
    } catch {
        return "This file couldn't be read. If it's stored in iCloud Drive, OneDrive, Google Drive or Dropbox, make it available offline (or open it once) so it downloads to this device, then try again.";
    }
}

/**
 * dragover handler for dropzones.
 *
 * preventDefault is what makes the element a valid drop target; the explicit
 * "copy" effect stops some sources (Explorer from a synced folder) showing a
 * "move" or "not allowed" cursor.
 */
export function allowFileDrop(event: {
    preventDefault: () => void;
    dataTransfer: DataTransfer | null;
}): void {
    event.preventDefault();

    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
}
