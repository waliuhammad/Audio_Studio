"use client";

import { useEffect } from "react";

/**
 * Stops a file dropped OUTSIDE a dropzone from replacing the page.
 *
 * A browser's default for a file dropped anywhere else is to open it, which
 * navigates away from the tool and throws away whatever the user had set up.
 * Dropzones handle their own events first (React listens below window), so
 * cancelling the default here only affects drops that missed them.
 *
 * Mounted in the tool and editor layouts only: those pages keep their file
 * inputs hidden, so no visible native input depends on the default action.
 */
export function DropGuard() {
    useEffect(() => {
        const hasFiles = (event: DragEvent) =>
            Array.from(event.dataTransfer?.types ?? []).includes("Files");

        const onDragOver = (event: DragEvent) => {
            if (!hasFiles(event)) return;

            // A dropzone underneath has already called preventDefault.
            const acceptedByDropzone = event.defaultPrevented;

            event.preventDefault();

            // Show "not allowed" only where no dropzone accepted the drag.
            if (event.dataTransfer && !acceptedByDropzone) {
                event.dataTransfer.dropEffect = "none";
            }
        };

        const onDrop = (event: DragEvent) => {
            if (hasFiles(event)) event.preventDefault();
        };

        window.addEventListener("dragover", onDragOver);
        window.addEventListener("drop", onDrop);

        return () => {
            window.removeEventListener("dragover", onDragOver);
            window.removeEventListener("drop", onDrop);
        };
    }, []);

    return null;
}
