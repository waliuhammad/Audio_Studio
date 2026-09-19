"use client";

import React, {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Combine,
  Download,
  GripVertical,
  Loader2,
  Music,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Upload,
} from "lucide-react";

import { RangeHandleLayer } from "@/components/audio/RangeHandleLayer";
import { OutputControls } from "@/components/tools/OutputControls";
import {
  AUDIO_FILE_EXTENSIONS,
  UPLOAD_SOURCES_HINT,
  allowFileDrop,
  droppedFiles,
  emptyDropMessage,
  isAudioFile,
  unreadableFileMessage,
} from "@/lib/client/media-files";

/* =========================================================
   CONFIG
========================================================= */

const AUDIO_MERGE_ENDPOINT = "/api/audio/merge";

const ACCEPTED_AUDIO = ["audio/*", ...AUDIO_FILE_EXTENSIONS].join(",");

/** Matches MIN_FILES / MAX_FILES in app/api/audio/merge/route.ts. */
const MIN_FILES = 2;
const MAX_FILES = 10;

/** Matches MAX_AUDIO_BYTES on the server. */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/* =========================================================
   OUTPUT FORMATS
   Mirrors the server route's AUDIO_FORMATS map — keep the
   `value`s in sync with app/api/audio/merge/route.ts.
========================================================= */

const FORMAT_OPTIONS = [
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "m4a", label: "M4A" },
  { value: "ogg", label: "OGG" },
  { value: "flac", label: "FLAC" },
  { value: "opus", label: "OPUS" },
] as const;

type AudioFormatValue = (typeof FORMAT_OPTIONS)[number]["value"];

/** The four shared levels; the server maps them in lib/server/quality.ts. */
const QUALITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "standard", label: "Standard" },
  { value: "low", label: "Low" },
] as const;

type AudioQualityValue = (typeof QUALITY_OPTIONS)[number]["value"];

const WAVEFORM_BARS = [
  12, 24, 40, 18, 32, 54, 20, 14, 22, 38, 48, 16, 28,
  60, 34, 18, 42, 24, 16, 44, 52, 20, 36, 14, 26, 48,
  30, 18, 42, 56, 22, 12, 38, 24, 46, 16, 32, 50, 20,
  14, 28, 44, 34, 18, 52, 22, 12, 40, 26, 36, 14, 24,
];

/* =========================================================
   TYPES
========================================================= */

type AudioFileItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  duration: number;
  startTimeStr: string;
  endTimeStr: string;
};

/* =========================================================
   HELPERS
========================================================= */

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatTimeDisplay = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getTimelineMarkers = (duration: number): number[] => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [0];
  }

  const step =
    duration <= 10 ? 1 :
      duration <= 30 ? 5 :
        duration <= 60 ? 10 :
          duration <= 180 ? 30 :
            duration <= 600 ? 60 : 120;

  const markers: number[] = [];
  for (let time = 0; time <= duration; time += step) {
    markers.push(Math.min(time, duration));
  }

  if (markers[markers.length - 1] !== duration) {
    markers.push(duration);
  }

  return markers;
};

/** mm:ss or plain seconds, clamped to the file's own length. */
const parseTimeString = (timeStr: string, maxDuration: number): number => {
  const trimmed = (timeStr ?? "").trim();
  if (!trimmed) return 0;

  let total: number;

  if (trimmed.includes(":")) {
    const pieces = trimmed.split(":");
    const mins = Number(pieces[0] ?? "0");
    const secs = Number(pieces[1] ?? "0");
    total =
      Number.isFinite(mins) && Number.isFinite(secs) ? mins * 60 + secs : 0;
  } else {
    const value = Number(trimmed);
    total = Number.isFinite(value) ? value : 0;
  }

  if (total < 0) return 0;

  return maxDuration > 0 ? Math.min(total, maxDuration) : total;
};

const getAudioDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);

    audio.onloadedmetadata = () => {
      const value = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(audioUrl);
      resolve(value);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      resolve(0);
    };
  });

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function AudioMergerPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const waveformRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [items, setItems] = useState<AudioFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [draggingPlayheadId, setDraggingPlayheadId] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  /* =========================================================
     OUTPUT FORMAT + QUALITY
     These sit with the settings, ABOVE the Merge button, because
     they are inputs to the merge and not to the download: the
     server encodes to whatever was sent. Changing either after a
     merge therefore CLEARS the result rather than leaving a file
     on screen that no longer matches the dropdowns.
  ========================================================= */

  const [outputFormat, setOutputFormat] = useState<AudioFormatValue>("mp3");
  const [quality, setQuality] = useState<AudioQualityValue>("high");

  /* =========================================================
     RESULT
     `resultFormat` is the format the blob on screen was actually
     produced with, so the download extension can never drift from
     the bytes — even if the dropdown were to change first.
  ========================================================= */

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFormat, setResultFormat] = useState<AudioFormatValue>("mp3");
  const [downloadFileName, setDownloadFileName] = useState("");

  const clearResult = () => {
    setResultBlob(null);
    setDownloadFileName("");
  };

  /* =========================================================
     PREVIEW PLAYBACK
  ========================================================= */

  const stopPreview = () => {
    const audio = audioPreviewRef.current;

    if (audio) {
      audio.pause();
      audioPreviewRef.current = null;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setPlayingId(null);
    setCurrentPlaybackTime(0);
    setDraggingPlayheadId(null);
  };

  useEffect(() => stopPreview, []);

  const getPreviewBounds = (item: AudioFileItem) => {
    const startSec = Math.max(
      0,
      Math.min(item.duration, parseTimeString(item.startTimeStr, item.duration))
    );

    const parsedEnd = parseTimeString(item.endTimeStr, item.duration);
    const endSec =
      parsedEnd > startSec ? Math.min(item.duration, parsedEnd) : item.duration;

    return {
      startSec,
      endSec,
      hasBoundarySelection: startSec > 0 || (endSec > 0 && endSec < item.duration),
    };
  };

  const startPreviewAt = (item: AudioFileItem, requestedTime: number) => {
    stopPreview();

    const audioUrl = URL.createObjectURL(item.file);
    const audio = new Audio(audioUrl);

    audioPreviewRef.current = audio;
    previewUrlRef.current = audioUrl;

    const { startSec, endSec, hasBoundarySelection } = getPreviewBounds(item);
    const safeTime = Math.max(
      startSec,
      Math.min(endSec, Number.isFinite(requestedTime) ? requestedTime : startSec)
    );

    audio.currentTime = safeTime;
    setCurrentPlaybackTime(safeTime);
    setPlayingId(item.id);

    audio.addEventListener("timeupdate", () => {
      if (audioPreviewRef.current !== audio) return;

      const nextTime = audio.currentTime;
      setCurrentPlaybackTime(nextTime);

      const limit = hasBoundarySelection ? endSec : item.duration;

      if (limit > 0 && nextTime >= limit) {
        audio.pause();
        setCurrentPlaybackTime(limit);
        setPlayingId(null);
      }
    });

    audio.addEventListener("ended", () => {
      if (audioPreviewRef.current !== audio) return;
      setPlayingId(null);
    });

    void audio.play().catch(() => {
      setPlayingId(null);
    });
  };

  const togglePreview = (item: AudioFileItem) => {
    if (playingId === item.id) {
      stopPreview();
      return;
    }

    startPreviewAt(item, getPreviewBounds(item).startSec);
  };

  const seekItemFromTimeline = (item: AudioFileItem, time: number) => {
    const { startSec, endSec } = getPreviewBounds(item);
    const safeTime = Math.max(startSec, Math.min(endSec, time));
    const audio = audioPreviewRef.current;

    if (playingId === item.id && audio) {
      audio.currentTime = safeTime;
    }

    setCurrentPlaybackTime(safeTime);
  };

  const getTimeFromWaveform = (
    item: AudioFileItem,
    clientX: number
  ): number | null => {
    const waveform = waveformRefs.current[item.id];
    if (!waveform || item.duration <= 0) return null;

    const rect = waveform.getBoundingClientRect();
    if (rect.width <= 0) return null;

    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const { startSec, endSec } = getPreviewBounds(item);

    return Math.max(startSec, Math.min(endSec, percent * item.duration));
  };

  const seekPreviewFromWaveform = (
    item: AudioFileItem,
    clientX: number,
    shouldPlay: boolean
  ) => {
    const targetTime = getTimeFromWaveform(item, clientX);
    if (targetTime === null) return;

    const audio = audioPreviewRef.current;

    if (playingId === item.id && audio) {
      audio.currentTime = targetTime;
      setCurrentPlaybackTime(targetTime);

      if (shouldPlay && audio.paused) {
        void audio.play().catch(() => { });
      }

      return;
    }

    if (shouldPlay) {
      startPreviewAt(item, targetTime);
    } else {
      setCurrentPlaybackTime(targetTime);
    }
  };

  const handleWaveformPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    item: AudioFileItem
  ) => {
    event.preventDefault();
    setDraggingPlayheadId(item.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekPreviewFromWaveform(item, event.clientX, true);
  };

  const handleWaveformPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    item: AudioFileItem
  ) => {
    if (draggingPlayheadId !== item.id) return;
    seekPreviewFromWaveform(item, event.clientX, false);
  };

  const handleWaveformPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
    item: AudioFileItem
  ) => {
    if (draggingPlayheadId === item.id) {
      seekPreviewFromWaveform(item, event.clientX, false);
    }

    setDraggingPlayheadId(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWaveformPointerCancel = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    setDraggingPlayheadId(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /* =========================================================
     FILE QUEUE
     Accepts drops and picks from anywhere the OS presents as a
     folder — iCloud Drive, Google Drive, Dropbox, OneDrive —
     and reports why a file was left out instead of ignoring it.
  ========================================================= */

  const addFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;

    setIsAdding(true);

    try {
      const audioFiles = incoming.filter(isAudioFile);

      if (audioFiles.length === 0) {
        setErrorMessage(
          "Please upload MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG, MPGA or OPUS audio."
        );
        return;
      }

      let notice: string | null =
        audioFiles.length < incoming.length
          ? `${incoming.length - audioFiles.length} file(s) were skipped because they are not audio.`
          : null;

      const readable: File[] = [];

      for (const file of audioFiles) {
        if (file.size > MAX_FILE_SIZE) {
          notice ??= `"${file.name}" is over the 100 MB limit.`;
          continue;
        }

        // An online-only cloud file downloads on first read; failing here
        // beats a broken upload later.
        const unreadable = await unreadableFileMessage(file);

        if (unreadable) {
          notice ??= `${file.name}: ${unreadable}`;
          continue;
        }

        readable.push(file);
      }

      if (readable.length === 0) {
        setErrorMessage(notice ?? "None of those files could be added.");
        return;
      }

      const room = MAX_FILES - items.length;

      if (room <= 0) {
        setErrorMessage(`You can merge up to ${MAX_FILES} audio files at once.`);
        return;
      }

      const accepted = readable.slice(0, room);

      if (readable.length > accepted.length) {
        notice ??= `Only added ${accepted.length} of ${readable.length} files — ${MAX_FILES} file maximum.`;
      }

      const newItems: AudioFileItem[] = [];

      for (const file of accepted) {
        const duration = await getAudioDuration(file);

        newItems.push({
          id: makeId(),
          file,
          name: file.name,
          size: file.size,
          duration,
          startTimeStr: "00:00",
          endTimeStr: formatTimeDisplay(duration),
        });
      }

      // A different set of inputs means the finished file is stale.
      clearResult();
      setItems((previous) => [...previous, ...newItems]);
      setErrorMessage(notice);
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Copy first: clearing the input's value empties a live FileList.
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selected.length === 0) return;

    void addFiles(selected);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = droppedFiles(event.dataTransfer);

    if (files.length === 0) {
      setErrorMessage(emptyDropMessage(event.dataTransfer));
      return;
    }

    void addFiles(files);
  };

  const removeItem = (id: string) => {
    if (playingId === id) stopPreview();

    delete waveformRefs.current[id];
    setItems((previous) => previous.filter((item) => item.id !== id));
    clearResult();
    setErrorMessage(null);
  };

  /* Drag-to-reorder of the queue cards. */
  const handleCardDragStart = (index: number) => setDraggedItemIndex(index);

  const handleCardDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    setItems((previous) => {
      const next = [...previous];
      const dragged = next[draggedItemIndex];
      if (!dragged) return previous;

      next.splice(draggedItemIndex, 1);
      next.splice(index, 0, dragged);
      return next;
    });

    setDraggedItemIndex(index);
    clearResult();
  };

  const handleCardDragEnd = () => setDraggedItemIndex(null);

  const updateTimeStringField = (
    id: string,
    field: "startTimeStr" | "endTimeStr",
    value: string
  ) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

    clearResult();
  };

  const updateRangeFromHandle = (
    id: string,
    field: "startTimeStr" | "endTimeStr",
    time: number
  ) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;

        const start = parseTimeString(item.startTimeStr, item.duration);
        const end = parseTimeString(item.endTimeStr, item.duration);

        const nextTime =
          field === "startTimeStr"
            ? Math.max(0, Math.min(time, end - 0.1))
            : Math.min(item.duration, Math.max(time, start + 0.1));

        return { ...item, [field]: formatTimeDisplay(nextTime) };
      })
    );

    clearResult();
  };

  const resetAll = () => {
    stopPreview();
    waveformRefs.current = {};
    setItems([]);
    setIsDragging(false);
    setIsAdding(false);
    setIsMerging(false);
    setErrorMessage(null);
    setOutputFormat("mp3");
    setQuality("high");
    setResultFormat("mp3");
    clearResult();

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* =========================================================
     FORMAT / QUALITY
     Both are sent with the merge, so a change invalidates any
     result already on screen: the user re-runs and gets a file
     that genuinely matches the dropdown.
  ========================================================= */

  const handleFormatChange = (value: string) => {
    const next = value as AudioFormatValue;
    if (next === outputFormat) return;

    setOutputFormat(next);
    clearResult();
  };

  const handleQualityChange = (value: string) => {
    const next = value as AudioQualityValue;
    if (next === quality) return;

    setQuality(next);
    clearResult();
  };

  /* =========================================================
     VALIDATION + MERGE
  ========================================================= */

  const validateItems = (): string | null => {
    if (items.length < MIN_FILES) {
      return `Add at least ${MIN_FILES} audio files to merge.`;
    }

    if (items.length > MAX_FILES) {
      return `You can merge up to ${MAX_FILES} audio files at once.`;
    }

    for (const item of items) {
      const start = parseTimeString(item.startTimeStr, item.duration);
      const end = parseTimeString(item.endTimeStr, item.duration);

      if (end > 0 && end <= start) {
        return `"${item.name}" must end after it starts.`;
      }
    }

    return null;
  };

  const handleMerge = async () => {
    const problem = validateItems();

    if (problem) {
      setErrorMessage(problem);
      return;
    }

    stopPreview();
    setErrorMessage(null);
    clearResult();
    setIsMerging(true);

    // The format the request is made with, captured now so the result and
    // its download extension describe the same bytes.
    const formatToUse = outputFormat;

    try {
      const formData = new FormData();

      items.forEach((item) => {
        const startSec = parseTimeString(item.startTimeStr, item.duration);
        const endSec = parseTimeString(item.endTimeStr, item.duration);

        formData.append("files", item.file);
        formData.append("startTimes", String(startSec));
        formData.append("endTimes", String(endSec));
      });

      formData.append("format", formatToUse);
      formData.append("quality", quality);

      const response = await fetch(AUDIO_MERGE_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to merge those audio files.");
      }

      setResultBlob(await response.blob());
      setResultFormat(formatToUse);
      setDownloadFileName(`audio-merged.${formatToUse}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to merge those audio files. Please try again."
      );
    } finally {
      setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;

    // Always the extension of the format that was actually produced.
    const extension = `.${resultFormat}`;
    const typed = downloadFileName.trim() || `audio-merged${extension}`;
    const finalName = typed.toLowerCase().endsWith(extension)
      ? typed
      : `${typed}${extension}`;

    const url = URL.createObjectURL(resultBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
    resetAll();
  };

  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  const canMerge = items.length >= MIN_FILES && items.length <= MAX_FILES;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <Combine className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Audio Merger</h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Join up to {MAX_FILES} audio files into one seamless track. Trim each
            piece, drag to reorder, then merge.
          </p>
        </div>

        {/* MAIN CARD */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
          {/* UPLOAD */}
          {items.length === 0 && (
            <div
              onDragOver={(event) => {
                allowFileDrop(event);
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${isDragging
                ? "border-orange-500 bg-orange-500/5"
                : "border-border hover:border-orange-500/50"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_AUDIO}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                {isAdding ? (
                  <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
                ) : (
                  <Upload className="h-7 w-7 text-orange-500" />
                )}
              </div>

              <h2 className="text-lg font-semibold">Upload audio to merge</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your files here or click to browse
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {UPLOAD_SOURCES_HINT}
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG, OPUS • {MIN_FILES}–
                {MAX_FILES} files • Max 100 MB each
              </p>
            </div>
          )}

          {/* ERROR — rendered here too, so a rejected upload is visible on the
              upload screen and not only once a file has loaded. */}
          {errorMessage && (
            <div
              className={`flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive ${items.length === 0 ? "mt-4" : "mb-6"
                }`}
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* QUEUE */}
          {items.length > 0 && (
            <div className="space-y-6">
              {/* QUEUE HEADER */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="block text-xs text-muted-foreground">
                    Merge queue
                  </span>
                  <span className="block text-sm font-semibold">
                    {items.length} of {MAX_FILES} files • {formatBytes(totalSize)} total
                  </span>
                </div>

                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isMerging}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Start over
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Merge order & timings
                </h2>
                <span className="text-xs text-muted-foreground">
                  Drag a card to reorder • Times as mm:ss or seconds
                </span>
              </div>

              {/* FILE CARDS */}
              <div className="space-y-4">
                {items.map((item, index) => {
                  const isPlayingThis = playingId === item.id;
                  const startSec = parseTimeString(item.startTimeStr, item.duration);
                  const endSec = parseTimeString(item.endTimeStr, item.duration);
                  const cursorTime = isPlayingThis ? currentPlaybackTime : startSec;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleCardDragStart(index)}
                      onDragOver={(event) => handleCardDragOver(event, index)}
                      onDragEnd={handleCardDragEnd}
                      className="space-y-4 rounded-2xl border border-border bg-background/40 p-4 shadow-sm transition-colors sm:p-5"
                    >
                      {/* FILE HEADER */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="cursor-grab text-muted-foreground active:cursor-grabbing">
                            <GripVertical className="h-5 w-5" />
                          </span>

                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-sm font-semibold text-orange-500">
                            {index + 1}
                          </span>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                            <Music className="h-4 w-4 text-orange-500" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(item.size)} • {formatTimeDisplay(item.duration)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          title="Remove file"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* WAVEFORM */}
                      <div
                        ref={(element) => {
                          waveformRefs.current[item.id] = element;
                        }}
                        onPointerDown={(event) => handleWaveformPointerDown(event, item)}
                        onPointerMove={(event) => handleWaveformPointerMove(event, item)}
                        onPointerUp={(event) => handleWaveformPointerUp(event, item)}
                        onPointerCancel={handleWaveformPointerCancel}
                        className={`relative h-[150px] touch-none select-none overflow-hidden rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-4 shadow-inner sm:h-[170px] sm:px-5 ${item.duration > 0 ? "cursor-pointer" : "cursor-default"
                          }`}
                      >
                        {/* TIME MARKERS */}
                        <div className="absolute inset-x-3 top-2 flex h-5 items-start justify-between sm:inset-x-5">
                          {getTimelineMarkers(item.duration).map((time, markerIndex) => (
                            <span
                              key={`${time}-${markerIndex}`}
                              className="absolute -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold leading-none text-orange-600 dark:text-orange-400 sm:text-[9px]"
                              style={{
                                left:
                                  item.duration > 0
                                    ? `${(time / item.duration) * 100}%`
                                    : "0%",
                              }}
                            >
                              {formatTimeDisplay(time)}
                            </span>
                          ))}
                        </div>

                        {/* BARS + RANGE HANDLES */}
                        <div className="absolute inset-x-3 top-8 bottom-7 overflow-hidden rounded-lg sm:inset-x-5">
                          <div className="absolute inset-0 flex items-center justify-between gap-[3px]">
                            {WAVEFORM_BARS.map((heightPx, barIndex) => (
                              <div
                                key={barIndex}
                                className="w-1 shrink-0 rounded-full bg-orange-500 transition-colors duration-150"
                                style={{ height: `${heightPx}px` }}
                              />
                            ))}
                          </div>

                          <RangeHandleLayer
                            duration={item.duration}
                            startTime={startSec}
                            endTime={endSec}
                            currentTime={cursorTime}
                            onStartChange={(time) =>
                              updateRangeFromHandle(item.id, "startTimeStr", time)
                            }
                            onEndChange={(time) =>
                              updateRangeFromHandle(item.id, "endTimeStr", time)
                            }
                            onSeek={(time) => seekItemFromTimeline(item, time)}
                          />
                        </div>

                        {/* BOTTOM LABELS */}
                        <div className="absolute inset-x-3 bottom-2 flex items-center justify-between sm:inset-x-5">
                          <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:text-[9px]">
                            00:00
                          </span>
                          <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:text-[9px]">
                            {formatTimeDisplay(cursorTime)}
                          </span>
                          <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400 sm:text-[9px]">
                            {formatTimeDisplay(item.duration)}
                          </span>
                        </div>
                      </div>

                      {/* TIME INPUTS + PREVIEW */}
                      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label
                            htmlFor={`start-${item.id}`}
                            className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"
                          >
                            <Clock className="h-3 w-3 text-orange-500" />
                            Start (mm:ss or s)
                          </label>

                          <input
                            id={`start-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            value={item.startTimeStr}
                            placeholder="00:00"
                            onChange={(event) =>
                              updateTimeStringField(item.id, "startTimeStr", event.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`end-${item.id}`}
                            className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground"
                          >
                            <Clock className="h-3 w-3 text-orange-500" />
                            End (mm:ss or s)
                          </label>

                          <input
                            id={`end-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            value={item.endTimeStr}
                            placeholder={formatTimeDisplay(item.duration)}
                            onChange={(event) =>
                              updateTimeStringField(item.id, "endTimeStr", event.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:border-orange-500"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:col-span-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeDisplay(startSec)} → {formatTimeDisplay(endSec)}
                          </span>

                          <button
                            type="button"
                            onClick={() => togglePreview(item)}
                            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${isPlayingThis
                              ? "border-orange-500 bg-orange-500 text-white"
                              : "border-orange-500/30 bg-orange-500/10 text-orange-500 hover:bg-orange-500/15"
                              }`}
                          >
                            {isPlayingThis ? (
                              <>
                                <Square className="h-3.5 w-3.5 fill-current" />
                                Stop preview
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Preview audio
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ADD MORE */}
              {items.length < MAX_FILES && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={allowFileDrop}
                    onDrop={handleDrop}
                    disabled={isAdding}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAdding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add another file ({MAX_FILES - items.length} left)
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_AUDIO}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}

              {items.length < MIN_FILES && (
                <p className="text-center text-xs text-muted-foreground">
                  Add at least {MIN_FILES - items.length} more file to merge.
                </p>
              )}

              {/* OUTPUT SETTINGS — with the settings, before the action, because
                  they are what the merge is run WITH. */}
              <div className="space-y-4 rounded-2xl border border-border bg-background/40 p-4 sm:p-5">
                <div>
                  <h2 className="font-semibold">Output</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The merged track is encoded with these. Changing either clears
                    a finished file so you always download what is selected.
                  </p>
                </div>

                <OutputControls
                  formatOptions={FORMAT_OPTIONS}
                  format={outputFormat}
                  onFormatChange={handleFormatChange}
                  qualityOptions={QUALITY_OPTIONS}
                  quality={quality}
                  onQualityChange={handleQualityChange}
                  disabled={isMerging}
                />
              </div>

              {/* MERGE + DOWNLOAD */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void handleMerge()}
                  disabled={isMerging || !canMerge}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Merging your files...
                    </>
                  ) : (
                    <>
                      <Combine className="h-4 w-4" />
                      {`Merge Audio (${items.length} files)`}
                    </>
                  )}
                </button>

                {/* RESULT */}
                {resultBlob && (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                        <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Your merged track is ready
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resultFormat.toUpperCase()} • {formatBytes(resultBlob.size)}
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
                        onChange={(event) => setDownloadFileName(event.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Download {resultFormat.toUpperCase()}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
