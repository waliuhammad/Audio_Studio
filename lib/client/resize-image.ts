"use client";

/**
 * Shrink an image in the browser before uploading it.
 *
 * A phone photo is routinely 4–8 MB and 4000px wide; an avatar is displayed at
 * 56px. Sending the original would push a large upload over a mobile
 * connection, then store a file 99% of which is thrown away on every render.
 *
 * Doing it client-side also means the server never needs an image library —
 * the route only has to validate what arrives.
 */

/** Avatars are square and never displayed above ~128px, so 512 is generous. */
const DEFAULT_MAX_EDGE = 512;

/** JPEG at 0.85 is visually indistinguishable here and roughly a tenth the size. */
const DEFAULT_QUALITY = 0.85;

export interface ResizeOptions {
    maxEdge?: number;
    quality?: number;
}

export async function resizeImageToSquareJpeg(
    file: File,
    { maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY }: ResizeOptions = {}
): Promise<File> {
    const bitmap = await createImageBitmap(file).catch(() => null);

    if (!bitmap) {
        throw new Error("That image could not be read. Try a JPG, PNG or WebP.");
    }

    // Centre-crop to a square first, so the avatar is never squashed — the UI
    // renders it in a circle, and a stretched face is worse than a tight crop.
    const edge = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - edge) / 2;
    const sy = (bitmap.height - edge) / 2;
    const size = Math.min(edge, maxEdge);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");

    if (!context) {
        bitmap.close();
        throw new Error("Your browser could not process that image.");
    }

    context.drawImage(bitmap, sx, sy, edge, edge, 0, 0, size, size);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
        throw new Error("Your browser could not process that image.");
    }

    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}
