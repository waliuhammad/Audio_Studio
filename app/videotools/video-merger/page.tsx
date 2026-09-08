"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Combine,
  FileVideo,
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

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export default function VideoMergerPage() {
  const [videos, setVideos] = useState<QueuedVideo[]>([]);
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* Inline rename + download panel state (matches Video Trimmer) */
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatDropdownRef = useRef<HTMLDivElement>(null);

  const clearDownloadState = () => {
    setDownloadBlob(null);
    setDownloadFileName("");
  };

  /* Close dropdown on outside click */
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        formatDropdownRef.current &&
        !formatDropdownRef.current.contains(target)
      ) {
        setIsFormatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =========================================================
     FILE QUEUE HELPERS
  ========================================================= */

  const addFiles = (incoming: FileList | File[]) => {
    const incomingArray = Array.from(incoming);

    const videoFiles = incomingArray.filter((f) =>
      f.type.startsWith("video/")
    );

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

    setVideos((prev) => {
      const room = MAX_VIDEOS - prev.length;

      if (room <= 0) {
        setErrorMessage(`You can merge up to ${MAX_VIDEOS} videos at once.`);
        return prev;
      }

      const accepted = videoFiles.slice(0, room);

      if (videoFiles.length > accepted.length) {
        setErrorMessage(
          `Only added ${accepted.length} of ${videoFiles.length} files — ${MAX_VIDEOS} video max.`
        );
      } else {
        setErrorMessage(null);
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
      addFiles(e.target.files);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
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

  const resetAll = () => {
    setVideos([]);
    setOutputFormat("mp4");
    setIsFormatOpen(false);
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
                accept="video/*"
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

              {/* Video Queue List */}
              <div className="bg-background/60 border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <Combine className="w-4 h-4 text-orange-500" />
                    <span>Merge Order</span>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    Videos join in the order shown below
                  </span>
                </div>

                <div className="space-y-2">
                  {videos.map((queued, index) => (
                    <div
                      key={queued.id}
                      className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3 shadow-sm"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-500">
                        {index + 1}
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/30">
                        <FileVideo className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {queued.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(queued.file.size)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveVideo(index, -1)}
                          disabled={index === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveVideo(index, 1)}
                          disabled={index === videos.length - 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeVideo(queued.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add More */}
                {videos.length < MAX_VIDEOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another video ({MAX_VIDEOS - videos.length} left)
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
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

              {/* Output Format Panel */}
              <div className="bg-background/60 border border-border rounded-2xl p-5 space-y-5 shadow-sm">
                <div
                  className="space-y-2 relative"
                  ref={formatDropdownRef}
                >
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Output Format
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsFormatOpen(!isFormatOpen)}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold flex items-center justify-between focus:outline-none focus:border-orange-500 shadow-sm transition-all"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0">
                        {
                          formatOptions.find((f) => f.value === outputFormat)
                            ?.label
                        }
                      </span>
                      <span className="truncate text-xs font-normal text-muted-foreground">
                        {
                          formatOptions.find((f) => f.value === outputFormat)
                            ?.description
                        }
                      </span>
                    </span>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {isFormatOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {isFormatOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl overflow-hidden z-50 isolate animate-in fade-in slide-in-from-top-2 duration-150">
                      {formatOptions.map((opt) => {
                        const isSelected = outputFormat === opt.value;

                        return (
                          <div
                            key={opt.value}
                            onClick={() => {
                              setOutputFormat(opt.value);
                              setIsFormatOpen(false);
                              clearDownloadState();
                            }}
                            className={`px-4 py-3 text-xs md:text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected
                                ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border-l-4 border-orange-500"
                                : "hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-900 dark:text-stone-200"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span>{opt.label}</span>
                              <span className="truncate text-xs font-normal text-muted-foreground">
                                {opt.description}
                              </span>
                            </span>

                            {isSelected && (
                              <span className="text-orange-600 dark:text-orange-400 font-bold shrink-0 ml-3">
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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