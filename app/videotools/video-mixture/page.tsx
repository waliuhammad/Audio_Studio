"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  Pause,
  Play,
  Plus,
  Scissors,
  Shuffle,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { OutputControls } from "@/components/tools/OutputControls";
import { ClipTimeline, type TimelineClip } from "@/components/video-mixture/ClipTimeline";
import {
  clipLength,
  clipOffsets,
  formatClock,
  locateInSequence,
  moveItem,
  sequenceLength,
  splitSequenceAt,
} from "@/components/video-mixture/sequence";
import {
  UPLOAD_SOURCES_HINT,
  VIDEO_FILE_EXTENSIONS,
  allowFileDrop,
  droppedFiles,
  emptyDropMessage,
  isVideoFile,
  unreadableFileMessage,
} from "@/lib/client/media-files";

/* =========================================================
   TYPES & CONSTANTS
========================================================= */

/** An uploaded file. Clips point at it; it is never copied. */
interface Source {
  id: string;
  file: File;
  url: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  color: string;
}

/** One piece of the sequence: a window into a source. */
interface Clip {
  id: string;
  sourceId: string;
  start: number;
  end: number;
}

interface MixSettings {
  signature: string;
  format: string;
  resolution: string;
}

const MAX_SOURCES = 10;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MIN_CLIP = 0.1;

// Distinct per source, readable on light and dark backgrounds. No orange:
// that is the selection colour on the timeline.
const PALETTE = [
  "#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e", "#eab308",
  "#14b8a6", "#d946ef", "#84cc16", "#6366f1", "#64748b",
];

const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4" },
  { value: "webm", label: "WebM" },
  { value: "mov", label: "MOV" },
  { value: "mkv", label: "MKV" },
];

const round3 = (value: number) => Math.round(value * 1000) / 1000;

const clamp = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value));

const sequenceSignature = (clips: readonly Clip[]) =>
  JSON.stringify(clips.map((c) => [c.sourceId, round3(c.start), round3(c.end)]));

/**
 * Duration and size from the browser's own demuxer. Null when the browser
 * cannot open the file — without a duration there is nothing to put on the
 * timeline.
 */
function readVideoMeta(
  url: string
): Promise<{ duration: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;

    const finish = (
      value: { duration: number; width: number; height: number } | null
    ) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };

    const report = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish(
          video.videoWidth > 0
            ? { duration: video.duration, width: video.videoWidth, height: video.videoHeight }
            : null
        );
        return true;
      }

      return false;
    };

    const timer = setTimeout(() => finish(null), 15000);

    video.preload = "metadata";
    video.muted = true;
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      if (report()) return;

      // Recorded WebM often says "Infinity" until the end has been seen.
      video.ondurationchange = () => void report();
      video.currentTime = 1e7;
    };
    video.src = url;
  });
}

/* =========================================================
   PAGE
========================================================= */

/* What the Quality dropdown offers here: the finished video's size. */
const RESOLUTION_OPTIONS = [
  { label: "720p · HD", value: "720p" },
  { label: "480p", value: "480p" },
  { label: "360p", value: "360p" },
];

export default function VideoMixturePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [edgePreview, setEdgePreview] = useState<{ sourceId: string; time: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("mp4");
  /*
   * The mixed video's size, offered as "Quality". Changing it after a mix
   * only selects it; Download re-mixes at the new size (needsRemix).
   */
  const [resolution, setResolution] = useState("720p");
  const [mixedWith, setMixedWith] = useState<MixSettings | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Live copies for the playback loop, which outlives any one render.
  const sourcesRef = useRef<Source[]>([]);
  const clipsRef = useRef<Clip[]>([]);
  const playheadRef = useRef(0);
  const nextIdRef = useRef(1);

  const loadedSourceRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);
  const playingRef = useRef(false);
  const switchingRef = useRef(false);
  const playIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const resumeAfterScrubRef = useRef(false);

  useEffect(() => {
    sourcesRef.current = sources;
    clipsRef.current = clips;
  }, [sources, clips]);

  const newId = (prefix: string) => `${prefix}${nextIdRef.current++}`;

  const setHead = useCallback((time: number) => {
    playheadRef.current = time;
    setPlayhead(time);
  }, []);

  const total = sequenceLength(clips);
  const sourceById = (id: string) => sources.find((s) => s.id === id);

  /* =========================================================
     PREVIEW PLAYBACK
     One <video> element. Its source is swapped as the playhead crosses
     from a clip of one file into a clip of another, and each clip is
     played from its in-point to its out-point.
  ========================================================= */

  /** Put `sourceId` in the player at `time`. False if superseded. */
  const cueSource = useCallback(async (sourceId: string, time: number) => {
    const video = videoRef.current;
    const source = sourcesRef.current.find((s) => s.id === sourceId);

    if (!video || !source) return false;

    const token = ++loadTokenRef.current;

    if (loadedSourceRef.current !== sourceId) {
      loadedSourceRef.current = sourceId;
      video.src = source.url;

      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          video.removeEventListener("loadedmetadata", done);
          video.removeEventListener("error", done);
          resolve();
        };
        const timer = setTimeout(done, 10000);

        video.addEventListener("loadedmetadata", done);
        video.addEventListener("error", done);
      });

      if (token !== loadTokenRef.current) return false;
    }

    if (Math.abs(video.currentTime - time) > 0.04) video.currentTime = time;

    return token === loadTokenRef.current;
  }, []);

  const unloadPlayer = useCallback(() => {
    const video = videoRef.current;

    loadTokenRef.current++;
    loadedSourceRef.current = null;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    switchingRef.current = false;
    setIsPlaying(false);
    videoRef.current?.pause();

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const playVideo = useCallback(() => {
    videoRef.current?.play().catch((error: unknown) => {
      // AbortError just means the source changed under it; anything else
      // (autoplay policy, undecodable file) ends playback.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        stopPlayback();
      }
    });
  }, [stopPlayback]);

  /** Move playback to clip `index` (from its in-point). */
  const advanceTo = useCallback(
    async (index: number) => {
      const list = clipsRef.current;

      if (index >= list.length) {
        stopPlayback();
        setHead(sequenceLength(list));
        return;
      }

      switchingRef.current = true;
      playIndexRef.current = index;

      const clip = list[index];

      if (!clip) return;

      const ok = await cueSource(clip.sourceId, clip.start);

      if (!ok || !playingRef.current) return;

      switchingRef.current = false;

      if (videoRef.current?.paused) playVideo();
    },
    [cueSource, playVideo, setHead, stopPlayback]
  );

  /** Follow the video every frame: move the playhead, hop clips at out-points. */
  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return;

    const loop = () => {
      rafRef.current = null;

      if (!playingRef.current) return;

      const video = videoRef.current;
      const list = clipsRef.current;

      if (video && !switchingRef.current) {
        const index = playIndexRef.current;
        const clip = list[index];

        if (!clip) {
          stopPlayback();
          return;
        }

        const time = video.currentTime;

        setHead((clipOffsets(list)[index] ?? 0) + clamp(time - clip.start, 0, clipLength(clip)));

        if (time >= clip.end - 0.02 || video.ended) {
          void advanceTo(index + 1);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [advanceTo, setHead, stopPlayback]);

  const startPlayback = useCallback(async () => {
    const list = clipsRef.current;

    if (list.length === 0) return;

    let time = playheadRef.current;

    if (time >= sequenceLength(list) - 0.05) time = 0;

    const hit = locateInSequence(list, time);

    if (!hit) return;

    playingRef.current = true;
    switchingRef.current = true;
    playIndexRef.current = hit.index;
    setIsPlaying(true);
    setHead(time);
    startLoop();

    const clip = list[hit.index];

    if (!clip) return;

    const ok = await cueSource(clip.sourceId, clip.start + hit.offset);

    if (!ok || !playingRef.current) return;

    switchingRef.current = false;
    playVideo();
  }, [cueSource, playVideo, setHead, startLoop]);

  const togglePlay = () => {
    if (playingRef.current) stopPlayback();
    else void startPlayback();
  };

  const seek = (time: number) => {
    const clamped = clamp(time, 0, sequenceLength(clipsRef.current));

    setHead(clamped);

    if (!playingRef.current) return;

    const hit = locateInSequence(clipsRef.current, clamped);

    if (!hit) return;

    const clip = clipsRef.current[hit.index];

    if (!clip) return;

    switchingRef.current = true;
    playIndexRef.current = hit.index;

    void cueSource(clip.sourceId, clip.start + hit.offset).then((ok) => {
      if (!ok || !playingRef.current) return;
      switchingRef.current = false;
      if (videoRef.current?.paused) playVideo();
    });
  };

  // While paused, the player shows the frame under the playhead — or, during a
  // trim, the frame at the edge being dragged.
  useEffect(() => {
    if (playingRef.current) return;

    if (edgePreview) {
      void cueSource(edgePreview.sourceId, edgePreview.time);
      return;
    }

    const hit = locateInSequence(clips, playhead);

    if (!hit) {
      if (loadedSourceRef.current) unloadPlayer();
      return;
    }

    const clip = clips[hit.index];

    if (!clip) return;

    void cueSource(
      clip.sourceId,
      Math.max(clip.start, Math.min(clip.start + hit.offset, clip.end - 0.04))
    );
  }, [clips, playhead, edgePreview, sources, cueSource, unloadPlayer]);

  // Keep the playhead on the sequence when it gets shorter.
  useEffect(() => {
    if (playheadRef.current > total) setHead(total);
  }, [total, setHead]);

  // Release every object URL and the loop when leaving the page.
  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      sourcesRef.current.forEach((source) => URL.revokeObjectURL(source.url));
    };
  }, []);

  /* =========================================================
     UPLOADS
  ========================================================= */

  const acceptFiles = async (files: File[]) => {
    setErrorMessage(null);

    const room = MAX_SOURCES - sourcesRef.current.length;

    if (room <= 0) {
      setErrorMessage(`You can mix up to ${MAX_SOURCES} videos at once.`);
      return;
    }

    const problems: string[] = [];
    let list = files;

    if (list.length > room) {
      problems.push(
        `Only ${MAX_SOURCES} videos can be mixed at once, so ${list.length - room} ${
          list.length - room === 1 ? "file was" : "files were"
        } left out.`
      );
      list = list.slice(0, room);
    }

    setIsReading(true);

    for (const file of list) {
      if (!isVideoFile(file)) {
        problems.push(
          `"${file.name}" is not a supported video (MP4, MOV, WEBM, MKV, AVI, M4V or MPEG).`
        );
        continue;
      }

      if (file.size > MAX_VIDEO_BYTES) {
        problems.push(`"${file.name}" is larger than 500 MB.`);
        continue;
      }

      const unreadable = await unreadableFileMessage(file);

      if (unreadable) {
        problems.push(unreadable);
        continue;
      }

      const url = URL.createObjectURL(file);
      const meta = await readVideoMeta(url);

      if (!meta) {
        URL.revokeObjectURL(url);
        problems.push(
          `"${file.name}" can't be previewed in this browser. Convert it to MP4 with the Video Converter first.`
        );
        continue;
      }

      const used = new Set(sourcesRef.current.map((s) => s.color));
      const source: Source = {
        id: newId("s"),
        file,
        url,
        name: file.name,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        color:
          PALETTE.find((color) => !used.has(color)) ??
          PALETTE[sourcesRef.current.length % PALETTE.length] ??
          "#0ea5e9",
      };
      const clip: Clip = {
        id: newId("c"),
        sourceId: source.id,
        start: 0,
        end: meta.duration,
      };

      sourcesRef.current = [...sourcesRef.current, source];
      setSources((prev) => [...prev, source]);
      setClips((prev) => [...prev, clip]);
    }

    setIsReading(false);

    if (problems.length) setErrorMessage(problems.join(" "));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (files.length) void acceptFiles(files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    allowFileDrop(event);
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = droppedFiles(event.dataTransfer);

    if (files.length === 0) {
      setErrorMessage(emptyDropMessage(event.dataTransfer));
      return;
    }

    void acceptFiles(files);
  };

  /* =========================================================
     SEQUENCE EDITING
  ========================================================= */

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 3500);
  };

  const handleTrim = (id: string, start: number, end: number, edge: "start" | "end") => {
    stopPlayback();

    const clip = clipsRef.current.find((c) => c.id === id);

    if (!clip) return;

    const next = clipsRef.current.map((c) => (c.id === id ? { ...c, start, end } : c));

    clipsRef.current = next;
    setClips(next);
    setEdgePreview({
      sourceId: clip.sourceId,
      time: edge === "start" ? start : Math.max(start, end - 0.04),
    });
  };

  const handleTrimEnd = () => setEdgePreview(null);

  const handleReorder = (from: number, to: number) => {
    stopPlayback();

    const next = moveItem(clipsRef.current, from, to);

    clipsRef.current = next;
    setClips(next);
    setHead(clipOffsets(next)[to] ?? 0);
  };

  const splitAtPlayhead = () => {
    stopPlayback();

    const result = splitSequenceAt(clipsRef.current, playheadRef.current, newId("c"), MIN_CLIP);

    if (!result) {
      flash("Move the playhead inside a clip (at least 0.1 s from its edges) to split it.");
      return;
    }

    clipsRef.current = result.clips;
    setClips(result.clips);
    setSelectedId(result.clips[result.leftIndex + 1]?.id ?? null);
    flash("Clip split in two. Drag either piece to move it.");
  };

  const deleteSelected = () => {
    const list = clipsRef.current;
    const index = list.findIndex((c) => c.id === selectedId);

    if (index < 0) return;

    stopPlayback();

    const next = list.filter((_, i) => i !== index);

    clipsRef.current = next;
    setClips(next);
    setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
    setHead(Math.min(playheadRef.current, sequenceLength(next)));
  };

  const addToSequence = (sourceId: string) => {
    const source = sourceById(sourceId);

    if (!source) return;

    stopPlayback();

    const list = clipsRef.current;
    const selectedIndex = list.findIndex((c) => c.id === selectedId);
    const at = selectedIndex >= 0 ? selectedIndex + 1 : list.length;
    const clip: Clip = { id: newId("c"), sourceId, start: 0, end: source.duration };
    const next = [...list];

    next.splice(at, 0, clip);
    clipsRef.current = next;
    setClips(next);
    setSelectedId(clip.id);
    setHead(clipOffsets(next)[at] ?? 0);
  };

  const removeSource = (sourceId: string) => {
    const source = sourceById(sourceId);

    if (!source) return;

    stopPlayback();

    if (loadedSourceRef.current === sourceId) unloadPlayer();

    const next = clipsRef.current.filter((c) => c.sourceId !== sourceId);

    clipsRef.current = next;
    sourcesRef.current = sourcesRef.current.filter((s) => s.id !== sourceId);
    setClips(next);
    setSources((prev) => prev.filter((s) => s.id !== sourceId));

    if (!next.some((c) => c.id === selectedId)) setSelectedId(null);

    URL.revokeObjectURL(source.url);
  };

  const startOver = () => {
    stopPlayback();
    unloadPlayer();
    sourcesRef.current.forEach((source) => URL.revokeObjectURL(source.url));
    sourcesRef.current = [];
    clipsRef.current = [];
    setSources([]);
    setClips([]);
    setSelectedId(null);
    setHead(0);
    setEdgePreview(null);
    setErrorMessage(null);
    setNotice(null);
    setDownloadBlob(null);
    setDownloadFileName("");
    setMixedWith(null);
  };

  // S splits, Delete/Backspace removes the selected clip — unless typing.
  const splitRef = useRef(splitAtPlayhead);
  const deleteRef = useRef(deleteSelected);

  useEffect(() => {
    splitRef.current = splitAtPlayhead;
    deleteRef.current = deleteSelected;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (clipsRef.current.length === 0) return;

      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        splitRef.current();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteRef.current();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* =========================================================
     MIX & DOWNLOAD
  ========================================================= */

  const currentSignature = sequenceSignature(clips);

  const needsRemix =
    mixedWith !== null &&
    (mixedWith.signature !== currentSignature ||
      mixedWith.format !== downloadFormat ||
      mixedWith.resolution !== resolution);

  const runMix = async (): Promise<{ blob: Blob; format: string } | null> => {
    const list = clipsRef.current;

    if (list.length === 0) {
      setErrorMessage("Add at least one clip to the sequence.");
      return null;
    }

    stopPlayback();

    const settings: MixSettings = {
      signature: sequenceSignature(list),
      format: downloadFormat,
      resolution,
    };

    // Each file is sent once; segments point at it by index.
    const used: Source[] = [];
    const indexOf = new Map<string, number>();

    for (const clip of list) {
      if (indexOf.has(clip.sourceId)) continue;

      const source = sourcesRef.current.find((s) => s.id === clip.sourceId);

      if (!source) continue;

      indexOf.set(clip.sourceId, used.length);
      used.push(source);
    }

    const formData = new FormData();

    used.forEach((source) => formData.append("files", source.file));
    formData.append(
      "segments",
      JSON.stringify(
        list.map((clip) => ({
          source: indexOf.get(clip.sourceId),
          start: round3(clip.start),
          end: round3(clip.end),
        }))
      )
    );
    formData.append("format", settings.format);
    formData.append("resolution", settings.resolution);
    formData.append("quality", "high");

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/video/video-mixture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(body?.error || "Could not mix those videos. Please try again.");
      }

      const blob = await response.blob();

      setDownloadBlob(blob);
      setMixedWith(settings);
      setDownloadFileName((current) => {
        const stem = current.replace(/\.[^/.]+$/, "").trim() || "video-mixture";

        return `${stem}.${settings.format}`;
      });

      return { blob, format: settings.format };
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not mix those videos. Please try again."
      );
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMix = async () => {
    setDownloadBlob(null);
    setMixedWith(null);
    await runMix();
  };

  const handleDownload = async () => {
    let blob = downloadBlob;
    let format = mixedWith?.format ?? downloadFormat;

    if (!blob || needsRemix) {
      const result = await runMix();

      if (!result) return;

      blob = result.blob;
      format = result.format;
    }

    const stem = downloadFileName.replace(/\.[^/.]+$/, "").trim() || "video-mixture";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${stem}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadFileName(`${stem}.${format}`);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  const timelineClips: TimelineClip[] = clips.map((clip) => {
    const source = sourceById(clip.sourceId);

    return {
      id: clip.id,
      start: clip.start,
      end: clip.end,
      min: 0,
      max: source?.duration ?? clip.end,
      label: source?.name ?? "Video",
      color: source?.color ?? "#0ea5e9",
    };
  });

  const current = locateInSequence(clips, playhead);
  const currentClip = (current && clips[current.index]) || null;
  const currentSource = currentClip ? sourceById(currentClip.sourceId) : null;
  const selectedIndex = clips.findIndex((c) => c.id === selectedId);
  const selectedClip = selectedIndex >= 0 ? clips[selectedIndex] : null;
  const canSplit =
    current !== null &&
    currentClip !== null &&
    current.offset >= MIN_CLIP &&
    clipLength(currentClip) - current.offset >= MIN_CLIP;

  const toolButton =
    "inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold shadow-sm transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-inherit";

  return (
    <div className="min-h-screen bg-background px-4 py-12 font-sans text-foreground sm:px-6">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-sm">
            <Shuffle className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Video Mixture</h1>

          <p className="mx-auto max-w-md text-base text-muted-foreground">
            Upload several videos, trim and split them on the timeline, and arrange the pieces in any order — repeating clips if you like.
          </p>
        </div>

        {/* Outside the spaced card so it does not count as its first child. */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={`video/*,${VIDEO_FILE_EXTENSIONS.join(",")}`}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="space-y-8 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6 md:p-10">
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {sources.length === 0 ? (
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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                {isReading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
                ) : (
                  <Upload className="h-7 w-7 text-orange-500" />
                )}
              </div>

              <h2 className="text-lg font-semibold">Upload the videos to mix</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your files here or click to browse — pick several at once
              </p>

              <p className="mt-1 text-sm text-muted-foreground">{UPLOAD_SOURCES_HINT}</p>

              <p className="mt-3 text-xs text-muted-foreground">
                MP4, MOV, WEBM, MKV • Up to {MAX_SOURCES} videos • Max 500 MB each
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* ================= PREVIEW ================= */}
              <div className="space-y-4 rounded-2xl border border-border bg-background p-3 shadow-inner sm:p-5">
                <div className="flex items-center justify-between gap-3 px-1 text-xs font-medium text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {current && currentSource
                      ? `Clip ${current.index + 1} of ${clips.length} · ${currentSource.name}`
                      : "Sequence preview"}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatClock(playhead)} / {formatClock(total)}
                  </span>
                </div>

                <div className="mx-auto max-w-2xl">
                  <div className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-muted/40 shadow-md dark:bg-stone-950">
                    <video
                      ref={videoRef}
                      preload="metadata"
                      playsInline
                      onClick={togglePlay}
                      className="h-full w-full cursor-pointer object-contain"
                    />

                    {clips.length === 0 && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                        The sequence is empty. Use “Add to sequence” on a video below.
                      </div>
                    )}

                    {clips.length > 0 && (
                      <div
                        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity ${
                          isPlaying
                            ? "opacity-0 group-hover:opacity-100"
                            : "bg-background/20 dark:bg-stone-950/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={togglePlay}
                          aria-label={isPlaying ? "Pause preview" : "Play preview"}
                          className="pointer-events-auto flex h-14 w-14 transform items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-orange-600"
                        >
                          {isPlaying ? (
                            <Pause className="h-6 w-6 fill-current" />
                          ) : (
                            <Play className="ml-1 h-6 w-6 fill-current" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={clips.length === 0}
                    className={toolButton}
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {isPlaying ? "Pause" : "Play"}
                  </button>

                  <button
                    type="button"
                    onClick={splitAtPlayhead}
                    disabled={!canSplit}
                    title="Split the clip at the playhead (S)"
                    className={toolButton}
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    Split
                    <kbd className="hidden rounded border border-border px-1 text-[10px] font-medium text-muted-foreground sm:inline">
                      S
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={deleteSelected}
                    disabled={!selectedClip}
                    title="Remove the selected clip (Delete)"
                    className={toolButton}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete clip
                  </button>

                  {selectedClip && (
                    <span className="ml-auto min-w-0 truncate text-[11px] text-muted-foreground">
                      Selected: clip {selectedIndex + 1} ·{" "}
                      <span className="tabular-nums">
                        {formatClock(selectedClip.start)}–{formatClock(selectedClip.end)}
                      </span>{" "}
                      of {sourceById(selectedClip.sourceId)?.name}
                    </span>
                  )}
                </div>

                <ClipTimeline
                  clips={timelineClips}
                  playhead={playhead}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onSeek={seek}
                  onTrim={handleTrim}
                  onTrimEnd={handleTrimEnd}
                  onReorder={handleReorder}
                  onScrubChange={(active) => {
                    if (active) {
                      resumeAfterScrubRef.current = playingRef.current;
                      if (playingRef.current) stopPlayback();
                    } else if (resumeAfterScrubRef.current) {
                      resumeAfterScrubRef.current = false;
                      void startPlayback();
                    }
                  }}
                  minClipLength={MIN_CLIP}
                  emptyMessage="The sequence is empty. Add a video from the list below."
                />

                <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Drag a clip’s edges to trim it, drag the clip to move it, press the track to move the playhead. Split cuts the clip under the playhead in two.
                  </span>
                </p>

                {notice && (
                  <p role="status" className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-600 dark:text-orange-400">
                    {notice}
                  </p>
                )}
              </div>

              {/* ================= SOURCES ================= */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`space-y-3 rounded-2xl border bg-background/60 p-4 transition-colors sm:p-5 ${
                  isDragging ? "border-orange-500 bg-orange-500/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold">
                    Your videos{" "}
                    <span className="font-medium text-muted-foreground">
                      ({sources.length}/{MAX_SOURCES})
                    </span>
                  </h2>

                  <button
                    type="button"
                    onClick={startOver}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-orange-500"
                  >
                    Start over
                  </button>
                </div>

                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sources.map((source) => {
                    const uses = clips.filter((c) => c.sourceId === source.id).length;

                    return (
                      <li
                        key={source.id}
                        data-source={source.id}
                        className="flex min-w-0 gap-3 rounded-xl border border-border bg-card p-2.5"
                        style={{ borderLeft: `4px solid ${source.color}` }}
                      >
                        <video
                          src={`${source.url}#t=0.1`}
                          preload="metadata"
                          muted
                          playsInline
                          aria-hidden
                          className="h-14 w-24 shrink-0 rounded-lg bg-muted/60 object-cover dark:bg-stone-950"
                        />

                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold" title={source.name}>
                                {source.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatClock(source.duration)} · {source.width}×{source.height}
                                {uses > 0 && ` · in sequence ×${uses}`}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSource(source.id)}
                              aria-label={`Remove ${source.name}`}
                              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => addToSequence(source.id)}
                            className="inline-flex w-fit items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-600 transition-colors hover:bg-orange-500/20 dark:text-orange-400"
                          >
                            <Plus className="h-3 w-3" />
                            Add to sequence
                          </button>
                        </div>
                      </li>
                    );
                  })}

                  {sources.length < MAX_SOURCES && (
                    <li>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isReading}
                        className="flex h-full min-h-[78px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:opacity-60"
                      >
                        {isReading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {isReading ? "Reading video…" : "Add more videos"}
                      </button>
                    </li>
                  )}
                </ul>
              </div>

              {/* ================= MIX & RESULT ================= */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => void handleMix()}
                  disabled={isProcessing || clips.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mixing {clips.length} {clips.length === 1 ? "clip" : "clips"} ({formatClock(total, false)})…
                    </>
                  ) : (
                    <>
                      <Shuffle className="h-4 w-4" />
                      Mix Videos
                    </>
                  )}
                </button>

                {downloadBlob && (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                        <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Your file is ready</p>
                        <p className="text-xs text-muted-foreground">
                          Choose a name, format and quality for your download.
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

                    <OutputControls
                      formatOptions={FORMAT_OPTIONS}
                      format={downloadFormat}
                      onFormatChange={setDownloadFormat}
                      qualityLabel="Quality"
                      qualityOptions={RESOLUTION_OPTIONS}
                      quality={resolution}
                      onQualityChange={setResolution}
                      disabled={isProcessing}
                    />

                    {needsRemix && (
                      <p className="text-xs text-muted-foreground">
                        The sequence or settings changed. Download will mix again with them.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDownload()}
                      disabled={isProcessing || clips.length === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {needsRemix ? "Update & Download" : "Download"}
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
