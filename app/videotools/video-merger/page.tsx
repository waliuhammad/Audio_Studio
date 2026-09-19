"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Combine,
  FileVideo,
  GripVertical,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
} from "lucide-react";
import { OutputControls } from "@/components/tools/OutputControls";
import { VideoPreview } from "@/components/video/VideoPreview";
import {
  UPLOAD_SOURCES_HINT,
  VIDEO_FILE_EXTENSIONS,
  allowFileDrop,
  droppedFiles,
  emptyDropMessage,
  isVideoFile,
  unreadableFileMessage,
} from "@/lib/client/media-files";

const ACCEPTED_VIDEO = `video/*,${VIDEO_FILE_EXTENSIONS.join(",")}`;

/* =========================================================
   CONSTANTS
========================================================= */

const MIN_VIDEOS = 2;
const MAX_VIDEOS = 5;
const MAX_FILE_SIZE_MB = 500;

interface QueuedVideo {
  id: string;
  file: File;
}

/*
 * What the Quality dropdown offers here: the finished video's size. The
 * route scales and pads every clip to it.
 */
const RESOLUTION_OPTIONS = [
  { label: "720p · HD", value: "720p" },
  { label: "480p", value: "480p" },
  { label: "360p", value: "360p" },
];

// How far a pointer must move before a press becomes a drag.
const DRAG_THRESHOLD = 6;

const formatOptions = [
  { value: "mp4", label: "MP4", description: "Best compatibility" },
  { value: "webm", label: "WebM", description: "Web optimized" },
  { value: "mov", label: "MOV", description: "Apple / editing" },
  { value: "mkv", label: "MKV", description: "Flexible container" },
  { value: "avi", label: "AVI", description: "Classic video format" },
  { value: "ts", label: "MPEG-TS", description: "Broadcast / streaming" },
];

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** A row being dragged by its handle (mouse, pen or touch). */
interface RowDrag {
  id: string;
  pointerId: number;
  fromIndex: number;
  overIndex: number;
  startY: number;
  offsetY: number;
  /** How far the other rows slide to open a gap: row height plus spacing. */
  shift: number;
  /** Vertical midpoints of every row when the drag began. */
  midpoints: number[];
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export default function VideoMergerPage() {
  const [videos, setVideos] = useState<QueuedVideo[]>([]);
  const [outputFormat, setOutputFormat] = useState("mp4");

  /*
   * The merged video's size. Clips are scaled and padded to it by the route,
   * so it is what "quality" means for this tool; the encode level stays at
   * its best setting.
   */
  const [resolution, setResolution] = useState("720p");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* Inline rename + download panel state (matches Video Trimmer) */
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* The clip shown in the big preview. Falls back to the first clip. */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* One object URL per clip, made when the clip arrives and revoked when it
     leaves (or the page unmounts). */
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const prev = previewUrlsRef.current;
    const next: Record<string, string> = {};

    for (const { id, file } of videos) {
      next[id] = prev[id] ?? URL.createObjectURL(file);
    }

    for (const [id, url] of Object.entries(prev)) {
      if (!next[id]) URL.revokeObjectURL(url);
    }

    const changed =
      Object.keys(next).length !== Object.keys(prev).length ||
      Object.keys(next).some((id) => prev[id] !== next[id]);

    previewUrlsRef.current = next;
    if (changed) setPreviewUrls(next);
  }, [videos]);

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url)
      );
      previewUrlsRef.current = {};
    };
  }, []);

  /* Drag-to-reorder. The ref is the truth for the pointer handlers; the state
     copy drives rendering. */
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<RowDrag | null>(null);

  /* A press waiting to become a drag, and whether one actually happened. */
  const pendingRef = useRef<{
    id: string;
    index: number;
    pointerId: number;
    startY: number;
  } | null>(null);
  const draggedRef = useRef(false);
  const [drag, setDrag] = useState<RowDrag | null>(null);

  const updateDrag = (next: RowDrag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const clearDownloadState = () => {
    setDownloadBlob(null);
    setDownloadFileName("");
  };


  /* =========================================================
     FILE QUEUE HELPERS
  ========================================================= */

  const addFiles = async (incoming: FileList | File[]) => {
    const incomingArray = Array.from(incoming);

    const videoFiles = incomingArray.filter(isVideoFile);

    if (videoFiles.length === 0) {
      setErrorMessage("Please add video files only.");
      return;
    }

    const tooLarge = videoFiles.find(
      (f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024
    );
    if (tooLarge) {
      setErrorMessage(
        `${tooLarge.name} is over the ${MAX_FILE_SIZE_MB} MB limit.`
      );
      return;
    }

    // Leave out any cloud file that can't be read, and say why.
    const readable: File[] = [];
    let unreadableNotice: string | null = null;

    for (const file of videoFiles) {
      const unreadable = await unreadableFileMessage(file);

      if (unreadable) {
        unreadableNotice ??= `${file.name}: ${unreadable}`;
      } else {
        readable.push(file);
      }
    }

    if (readable.length === 0) {
      setErrorMessage(unreadableNotice);
      return;
    }

    setVideos((prev) => {
      const room = MAX_VIDEOS - prev.length;

      if (room <= 0) {
        setErrorMessage(`You can merge up to ${MAX_VIDEOS} videos at once.`);
        return prev;
      }

      const accepted = readable.slice(0, room);

      if (readable.length > accepted.length) {
        setErrorMessage(
          `Only added ${accepted.length} of ${readable.length} files — ${MAX_VIDEOS} video max.`
        );
      } else {
        setErrorMessage(unreadableNotice);
      }

      clearDownloadState();

      return [
        ...prev,
        ...accepted.map((file) => ({ id: makeId(), file })),
      ];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Copy the list first: clearing the input's value empties a live FileList.
      void addFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    allowFileDrop(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = droppedFiles(e.dataTransfer);

    if (files.length === 0) {
      setErrorMessage(emptyDropMessage(e.dataTransfer));
      return;
    }

    void addFiles(files);
  };

  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    clearDownloadState();
    setErrorMessage(null);
  };

  const moveVideo = (index: number, direction: -1 | 1) => {
    setVideos((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      const current = next[index];
      const swapWith = next[target];
      if (!current || !swapWith) return prev;

      next[index] = swapWith;
      next[target] = current;
      return next;
    });
    clearDownloadState();
  };

  /*
   * A press anywhere on a row can start a drag — not just the grip.
   *
   * The press is only REMEMBERED at first: a drag begins once the pointer has
   * moved DRAG_THRESHOLD, so tapping a row still previews that clip and the
   * small buttons (up, down, remove, marked data-no-drag) keep working. The
   * click that follows a real drag is swallowed, or letting go over the name
   * would also change the preview.
   */
  const handleRowPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    id: string,
    index: number
  ) => {
    if (isProcessing || dragRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;

    /*
     * Clear it HERE, not only where the click is swallowed: a drag that ends
     * over a different row fires no click at all (mousedown and mouseup have
     * different targets), which left the flag set and made the next genuine
     * tap do nothing.
     */
    draggedRef.current = false;

    pendingRef.current = {
      id,
      index,
      pointerId: event.pointerId,
      startY: event.clientY,
    };
  };

  /** Turn a remembered press into a drag once the pointer has moved enough. */
  const beginDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    id: string,
    index: number
  ) => {

    const rects = videos.map(
      (v) => rowRefs.current.get(v.id)?.getBoundingClientRect() ?? null
    );
    const own = rects[index];
    if (!own || rects.some((r) => r === null)) return;

    const measured = rects as DOMRect[];
    const next = measured[index + 1];
    const prev = measured[index - 1];
    const gap = next
      ? next.top - own.bottom
      : prev
        ? own.top - prev.bottom
        : 0;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    updateDrag({
      id,
      pointerId: event.pointerId,
      fromIndex: index,
      overIndex: index,
      startY: event.clientY,
      offsetY: 0,
      shift: own.height + gap,
      midpoints: measured.map((r) => r.top + r.height / 2),
    });
  };

  const handleRowPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pendingDrag = pendingRef.current;

    if (pendingDrag && !dragRef.current) {
      if (event.pointerId !== pendingDrag.pointerId) return;
      if (Math.abs(event.clientY - pendingDrag.startY) < DRAG_THRESHOLD) return;

      pendingRef.current = null;
      draggedRef.current = true;
      beginDrag(event, pendingDrag.id, pendingDrag.index);
    }

    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId) return;

    const offsetY = event.clientY - current.startY;
    const draggedMid = (current.midpoints[current.fromIndex] ?? 0) + offsetY;

    // The drop slot is how many of the other rows sit above the dragged
    // row's centre.
    let overIndex = 0;
    current.midpoints.forEach((mid, i) => {
      if (i !== current.fromIndex && mid < draggedMid) overIndex += 1;
    });

    updateDrag({ ...current, offsetY, overIndex });
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    pendingRef.current = null;

    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId) return;

    updateDrag(null);

    if (current.overIndex === current.fromIndex) return;

    setVideos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(current.fromIndex, 1);
      if (!moved) return prev;
      next.splice(current.overIndex, 0, moved);
      return next;
    });
    clearDownloadState();
  };

  const cancelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    pendingRef.current = null;

    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId) return;
    updateDrag(null);
  };

  /* Escape puts the row back where it was. */
  useEffect(() => {
    if (!drag) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") updateDrag(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drag]);

  /* How far a row is drawn from its place while a drag is in progress. */
  const rowOffset = (index: number) => {
    if (!drag) return 0;
    if (index === drag.fromIndex) return drag.offsetY;
    if (
      drag.fromIndex < drag.overIndex &&
      index > drag.fromIndex &&
      index <= drag.overIndex
    ) {
      return -drag.shift;
    }
    if (
      drag.overIndex < drag.fromIndex &&
      index >= drag.overIndex &&
      index < drag.fromIndex
    ) {
      return drag.shift;
    }
    return 0;
  };

  const resetAll = () => {
    updateDrag(null);
    setSelectedId(null);
    setVideos([]);
    setOutputFormat("mp4");
    setIsDragging(false);
    setIsProcessing(false);
    setErrorMessage(null);
    clearDownloadState();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* =========================================================
     MERGE ACTION
  ========================================================= */

  const handleMergeAction = async () => {
    if (videos.length < MIN_VIDEOS) {
      setErrorMessage(`Add at least ${MIN_VIDEOS} videos to merge.`);
      return;
    }

    setErrorMessage(null);
    clearDownloadState();
    setIsProcessing(true);

    const formData = new FormData();
    videos.forEach(({ file }) => formData.append("videos", file));
    formData.append("format", outputFormat);
    formData.append("resolution", resolution);
    formData.append("quality", "high");

    try {
      const response = await fetch("/api/video/video-merger", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Merging failed");
      }

      const resultBlob = await response.blob();

      setDownloadBlob(resultBlob);
      setDownloadFileName(`merged-video.${outputFormat}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not merge those videos. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalDownload = () => {
    if (!downloadBlob) return;

    const trimmedName = downloadFileName.trim() || `merged-video.${outputFormat}`;
    const finalName = trimmedName.toLowerCase().endsWith(`.${outputFormat}`)
      ? trimmedName
      : `${trimmedName}.${outputFormat}`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
    resetAll();
  };

  const canMerge = videos.length >= MIN_VIDEOS && videos.length <= MAX_VIDEOS;
  const selectedIndex = Math.max(
    0,
    videos.findIndex((v) => v.id === selectedId)
  );
  const selectedVideo = videos[selectedIndex];
  const selectedUrl = selectedVideo ? previewUrls[selectedVideo.id] : undefined;
  const totalSize = videos.reduce((sum, v) => sum + v.file.size, 0);

  return (
    <div className="min-h-screen bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/30 shadow-sm">
            <Combine className="w-8 h-8" />
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Video Merger
          </h1>

          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Combine 2 to 5 video files into one seamless video, in whatever
            order you like.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {errorMessage && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {videos.length === 0 && (
            /* =========================================================
               UPLOAD DROPZONE
            ========================================================= */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
                isDragging
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_VIDEO}
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>

              <h2 className="text-lg font-semibold">
                Upload videos to merge
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your files here or click to browse
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {UPLOAD_SOURCES_HINT}
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                MP4, MOV, WEBM, MKV • 2–5 files • Max {MAX_FILE_SIZE_MB} MB each
              </p>
            </div>
          )}

          {videos.length > 0 && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Queue Header */}
              <div className="flex items-center justify-between bg-background/60 border border-border px-4 py-3 rounded-2xl">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground block">
                    Merge Queue
                  </span>
                  <span className="text-sm font-semibold block">
                    {videos.length} of {MAX_VIDEOS} videos •{" "}
                    {formatBytes(totalSize)} total
                  </span>
                </div>

                <button
                  onClick={resetAll}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-secondary border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Start Over</span>
                </button>
              </div>

              {/* Preview of the selected clip */}
              {selectedVideo && selectedUrl && (
                <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-3 sm:p-5">
                  <div className="flex items-center justify-between gap-3 px-1 text-xs font-medium text-muted-foreground">
                    <span className="shrink-0">
                      Preview · Clip {selectedIndex + 1}
                    </span>
                    <span className="truncate">{selectedVideo.file.name}</span>
                  </div>

                  <div className="mx-auto max-w-xl">
                    <VideoPreview
                      key={selectedVideo.id}
                      src={selectedUrl}
                      className="h-48 md:h-60"
                    />
                  </div>
                </div>
              )}

              {/* Video Queue List */}
              <div className="bg-background/60 border border-border rounded-2xl p-3 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 font-bold text-sm shrink-0">
                    <Combine className="w-4 h-4 text-orange-500" />
                    <span>Merge Order</span>
                  </div>

                  <span className="text-right text-xs text-muted-foreground">
                    Drag a row to reorder · tap a clip to preview
                  </span>
                </div>

                <div className="space-y-2">
                  {videos.map((queued, index) => {
                    const url = previewUrls[queued.id];
                    const isDragged = drag?.id === queued.id;
                    const isSelected = index === selectedIndex;
                    const offset = rowOffset(index);

                    return (
                      <div
                        key={queued.id}
                        ref={(el) => {
                          if (el) rowRefs.current.set(queued.id, el);
                          else rowRefs.current.delete(queued.id);
                        }}
                        style={
                          offset
                            ? { transform: `translateY(${offset}px)` }
                            : undefined
                        }
                        onPointerDown={(e) =>
                          handleRowPointerDown(e, queued.id, index)
                        }
                        onPointerMove={handleRowPointerMove}
                        onPointerUp={finishDrag}
                        onPointerCancel={cancelDrag}
                        onLostPointerCapture={cancelDrag}
                        className={`relative flex touch-none select-none items-center gap-2 rounded-xl border bg-card px-2 py-2 shadow-sm sm:gap-3 sm:px-3 ${
                          isProcessing ? "" : isDragged ? "cursor-grabbing" : "cursor-grab"
                        } ${
                          isDragged
                            ? "z-10 border-orange-500 shadow-lg ring-2 ring-orange-500/30"
                            : isSelected
                              ? "border-orange-500/60"
                              : "border-border"
                        } ${drag && !isDragged ? "transition-transform duration-150" : ""}`}
                      >
                        {/* Drag handle: mouse, pen and touch */}
                        <div
                          title="Drag anywhere on this row to reorder"
                          aria-hidden="true"
                          className={`flex h-10 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                            isProcessing
                              ? "cursor-not-allowed text-muted-foreground opacity-40"
                              : isDragged
                                ? "cursor-grabbing text-orange-500"
                                : "cursor-grab text-muted-foreground"
                          }`}
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Thumbnail + name: tap to preview */}
                        <button
                          type="button"
                          onClick={() => {
                            // A drag that ended over the name must not also
                            // change which clip is previewed.
                            if (draggedRef.current) {
                              draggedRef.current = false;
                              return;
                            }

                            setSelectedId(queued.id);
                          }}
                          aria-pressed={isSelected}
                          aria-label={`Preview clip ${index + 1}: ${queued.file.name}`}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left sm:gap-3"
                        >
                          <span className="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-500 sm:w-16">
                            {url ? (
                              <video
                                src={`${url}#t=0.1`}
                                preload="metadata"
                                muted
                                playsInline
                                tabIndex={-1}
                                className="pointer-events-none h-full w-full object-cover"
                              />
                            ) : (
                              <FileVideo className="w-4 h-4" />
                            )}
                            <span className="absolute left-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-orange-500 px-1 text-[10px] font-bold leading-none text-white">
                              {index + 1}
                            </span>
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {queued.file.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatBytes(queued.file.size)}
                            </span>
                          </span>
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-1">
                            <button
                              data-no-drag
                              type="button"
                              onClick={() => moveVideo(index, -1)}
                              disabled={index === 0 || isProcessing}
                              aria-label={`Move ${queued.file.name} up`}
                              className="flex h-6 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-30 sm:h-8 sm:w-8 sm:rounded-lg"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              data-no-drag
                              type="button"
                              onClick={() => moveVideo(index, 1)}
                              disabled={index === videos.length - 1 || isProcessing}
                              aria-label={`Move ${queued.file.name} down`}
                              className="flex h-6 w-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-30 sm:h-8 sm:w-8 sm:rounded-lg"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            data-no-drag
                            type="button"
                            onClick={() => removeVideo(queued.id)}
                            disabled={isProcessing}
                            aria-label={`Remove ${queued.file.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add More */}
                {videos.length < MAX_VIDEOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={allowFileDrop}
                    onDrop={handleDrop}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another video ({MAX_VIDEOS - videos.length} left)
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_VIDEO}
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {videos.length < MIN_VIDEOS && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Add at least {MIN_VIDEOS - videos.length} more video to merge.
                  </p>
                )}
              </div>

              {/* PROCESS & DOWNLOAD */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleMergeAction}
                  disabled={isProcessing || !canMerge}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {`Merging ${videos.length} Videos...`}
                    </>
                  ) : (
                    <>
                      <Combine className="h-4 w-4" />
                      Merge Videos Now
                    </>
                  )}
                </button>

                {/* INLINE RENAME + DOWNLOAD PANEL */}
                {downloadBlob && (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                        <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Your merged video is ready
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Choose a name for your download.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="download-filename"
                        className="mb-2 block text-xs font-medium text-muted-foreground"
                      >
                        Rename
                      </label>

                      <input
                        id="download-filename"
                        type="text"
                        value={downloadFileName}
                        onChange={(event) =>
                          setDownloadFileName(event.target.value)
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    {/* Format and quality beside the name, as in the other
                        tools. formatOptions carries a description field the
                        shared control does not use. */}
                    <OutputControls
                      formatOptions={formatOptions.map((opt) => ({
                        label: opt.label,
                        value: opt.value,
                      }))}
                      format={outputFormat}
                      // The merged file was made with the old settings; drop it
                      // so a download can't carry the wrong extension or quality.
                      onFormatChange={(value) => {
                        setOutputFormat(value);
                        clearDownloadState();
                      }}
                      qualityLabel="Quality"
                      qualityOptions={RESOLUTION_OPTIONS}
                      quality={resolution}
                      onQualityChange={(value) => {
                          setResolution(value);
                          clearDownloadState();
                        }}
                    />

                    <button
                      type="button"
                      onClick={handleFinalDownload}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}