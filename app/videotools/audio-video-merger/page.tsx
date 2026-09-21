"use client";

// Route: /videotools/audio-video-merger
// Calls: POST /api/video/audio-video-merger  (see app/api/video/audio-video-merger/route.ts)
//
// One video and one audio file on a shared timeline. Each has its own track of
// clips (trim, split, reorder, delete); the audio track can also start later
// than the video. The output is as long as the video track.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileAudio,
  FileVideo,
  Info,
  Layers3,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { OutputControls } from "@/components/tools/OutputControls";
import { VideoPreview } from "@/components/video/VideoPreview";
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
import { Waveform, decodePeaks, type Peaks } from "@/components/av-merger/waveform";
import {
  AUDIO_FILE_EXTENSIONS,
  UPLOAD_SOURCES_HINT,
  VIDEO_FILE_EXTENSIONS,
  allowFileDrop,
  droppedFiles,
  emptyDropMessage,
  isAudioFile,
  isVideoFile,
  unreadableFileMessage,
} from "@/lib/client/media-files";

/* =========================================================
   TYPES & CONSTANTS
========================================================= */

type TrackId = "video" | "audio";
type MergeMode = "replace" | "mix";

interface VideoInfo {
  file: File;
  url: string;
  duration: number;
  width: number;
  height: number;
}

interface AudioInfo {
  file: File;
  url: string;
  duration: number;
}

/** A window [start, end) into the track's file. */
interface Clip {
  id: string;
  start: number;
  end: number;
}

interface MergeSettings {
  signature: string;
  format: string;
  quality: string;
}

const MERGE_ENDPOINT = "/api/video/audio-video-merger";
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const MAX_CLIPS = 20;
const MIN_CLIP = 0.1;
const VIDEO_COLOR = "#0ea5e9";
const AUDIO_COLOR = "#10b981";

const MODE_OPTIONS: { value: MergeMode; label: string; hint: string }[] = [
  { value: "replace", label: "Replace", hint: "Only the new audio is heard." },
  { value: "mix", label: "Mix", hint: "The new audio plays over the video’s own sound." },
];

// Must stay in step with AV_MERGE_FORMATS in lib/server/av-merge.ts.
const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4" },
  { value: "mov", label: "MOV" },
  { value: "mkv", label: "MKV" },
  { value: "webm", label: "WebM" },
  { value: "avi", label: "AVI" },
  { value: "flv", label: "FLV" },
];

/** Formats a browser can play back in the result card. */
const PLAYABLE_RESULT = new Set(["mp4", "webm", "mov"]);

const round3 = (value: number) => Math.round(value * 1000) / 1000;

const clamp = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value));

const segmentsOf = (clips: readonly Clip[]) =>
  clips.map((clip) => ({ start: round3(clip.start), end: round3(clip.end) }));

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const stemOf = (name: string) => name.replace(/\.[^/.]+$/, "");

/**
 * Wait for a media element's duration (and, for video, its size). Null when
 * the browser cannot open the file.
 */
function readMediaMeta(
  kind: "video" | "audio",
  url: string
): Promise<{ duration: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const media = document.createElement(kind);
    let settled = false;

    const finish = (value: { duration: number; width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      media.removeAttribute("src");
      media.load();
      resolve(value);
    };

    const report = () => {
      if (!(Number.isFinite(media.duration) && media.duration > 0)) return false;

      if (media instanceof HTMLVideoElement) {
        finish(
          media.videoWidth > 0
            ? { duration: media.duration, width: media.videoWidth, height: media.videoHeight }
            : null
        );
      } else {
        finish({ duration: media.duration, width: 0, height: 0 });
      }

      return true;
    };

    const timer = setTimeout(() => finish(null), 15000);

    media.preload = "metadata";
    media.muted = true;
    media.onerror = () => finish(null);
    media.onloadedmetadata = () => {
      if (report()) return;

      // Recorded WebM often says "Infinity" until the end has been seen.
      media.ondurationchange = () => void report();
      media.currentTime = 1e7;
    };
    media.src = url;
  });
}

/* =========================================================
   UPLOAD SLOT
========================================================= */

function DropSlot({
  kind,
  busy,
  onFile,
  onError,
  children,
}: {
  kind: TrackId;
  busy: boolean;
  onFile: (file: File) => void;
  onError: (message: string) => void;
  /** The filled state; when absent the slot is a drop zone. */
  children?: (browse: () => void) => React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const isVideo = kind === "video";
  const browse = () => inputRef.current?.click();

  const dropProps = {
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
      allowFileDrop(event);
      setDragging(true);
    },
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);

      const [file] = droppedFiles(event.dataTransfer);

      if (file) onFile(file);
      else onError(emptyDropMessage(event.dataTransfer) ?? "Nothing was dropped.");
    },
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      data-input={kind}
      accept={
        isVideo
          ? `video/*,${VIDEO_FILE_EXTENSIONS.join(",")}`
          : `audio/*,${AUDIO_FILE_EXTENSIONS.join(",")}`
      }
      className="hidden"
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const file = event.target.files?.[0];

        event.target.value = "";
        if (file) onFile(file);
      }}
    />
  );

  if (children) {
    return (
      <div
        data-slot={kind}
        {...dropProps}
        className={`min-w-0 rounded-2xl border bg-background p-3 shadow-inner transition-colors sm:p-4 ${
          dragging ? "border-orange-500 bg-orange-500/5" : "border-border"
        }`}
      >
        {input}
        {children(browse)}
      </div>
    );
  }

  const Icon = isVideo ? FileVideo : FileAudio;

  return (
    <div
      data-slot={kind}
      role="button"
      tabIndex={0}
      onClick={browse}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          browse();
        }
      }}
      {...dropProps}
      className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
        dragging ? "border-orange-500 bg-orange-500/5" : "border-border hover:border-orange-500/50"
      }`}
    >
      {input}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
        {busy ? (
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
        ) : (
          <Icon className="h-7 w-7 text-orange-500" />
        )}
      </div>
      <h2 className="text-lg font-semibold">{isVideo ? "Upload a video" : "Upload an audio file"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Drag and drop, or click to browse</p>
      <p className="mt-1 text-xs text-muted-foreground">{UPLOAD_SOURCES_HINT}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        {isVideo ? "MP4, MOV, WEBM, MKV, AVI • Max 500 MB" : "MP3, WAV, M4A, AAC, FLAC, OGG, OPUS • Max 100 MB"}
      </p>
    </div>
  );
}

function FileHeader({
  kind,
  name,
  meta,
  onReplace,
  onRemove,
}: {
  kind: TrackId;
  name: string;
  meta: string;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const Icon = kind === "video" ? FileVideo : FileAudio;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: kind === "video" ? VIDEO_COLOR : AUDIO_COLOR }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={name}>
          {name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
      </div>
      <button
        type="button"
        onClick={onReplace}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-orange-500/10 hover:text-orange-500"
      >
        Replace
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove the ${kind} file`}
        className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AudioVideoMergerPage() {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [audio, setAudio] = useState<AudioInfo | null>(null);
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  const [waveState, setWaveState] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  const [videoClips, setVideoClips] = useState<Clip[]>([]);
  const [audioClips, setAudioClips] = useState<Clip[]>([]);
  const [audioOffset, setAudioOffset] = useState(0);
  const [activeTrack, setActiveTrack] = useState<TrackId>("video");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [mode, setMode] = useState<MergeMode>("replace");

  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [edgePreview, setEdgePreview] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [frozenSpan, setFrozenSpan] = useState<number | null>(null);

  const [reading, setReading] = useState<TrackId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("mp4");
  const [encodeQuality, setEncodeQuality] = useState("high");
  const [mergedWith, setMergedWith] = useState<MergeSettings | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Live copies for the playback loop, which outlives any one render.
  const videoRefInfo = useRef<VideoInfo | null>(null);
  const audioRefInfo = useRef<AudioInfo | null>(null);
  const videoClipsRef = useRef<Clip[]>([]);
  const audioClipsRef = useRef<Clip[]>([]);
  const offsetRef = useRef(0);
  const playheadRef = useRef(0);
  const nextIdRef = useRef(1);
  const peaksTokenRef = useRef(0);

  const playingRef = useRef(false);
  const playIndexRef = useRef(0);
  const audioIndexRef = useRef(-1);
  const rafRef = useRef<number | null>(null);
  const resumeAfterScrubRef = useRef(false);

  useEffect(() => {
    videoRefInfo.current = video;
    audioRefInfo.current = audio;
    videoClipsRef.current = videoClips;
    audioClipsRef.current = audioClips;
    offsetRef.current = audioOffset;
  }, [video, audio, videoClips, audioClips, audioOffset]);

  const newId = (prefix: string) => `${prefix}${nextIdRef.current++}`;

  const setHead = useCallback((time: number) => {
    playheadRef.current = time;
    setPlayhead(time);
  }, []);

  const videoTotal = sequenceLength(videoClips);
  const audioTotal = sequenceLength(audioClips);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 3500);
  };

  /* =========================================================
     PREVIEW PLAYBACK
     The <video> is the clock: it plays each video clip from its in-point to
     its out-point. A hidden <audio> follows it, placed by the audio track
     and the offset, and is re-seeked at audio clip boundaries or when it
     drifts more than 0.2 s.
  ========================================================= */

  const syncAudio = useCallback((outputTime: number, playing: boolean) => {
    const element = audioRef.current;

    if (!element || !audioRefInfo.current) return;

    const list = audioClipsRef.current;
    const local = outputTime - offsetRef.current;
    const hit =
      playing && local >= 0 && local < sequenceLength(list) - 0.01
        ? locateInSequence(list, local)
        : null;
    const clip = hit ? list[hit.index] : undefined;

    if (!hit || !clip) {
      if (!element.paused) element.pause();
      audioIndexRef.current = -1;
      return;
    }

    const target = clip.start + hit.offset;

    if (audioIndexRef.current !== hit.index || Math.abs(element.currentTime - target) > 0.2) {
      element.currentTime = target;
      audioIndexRef.current = hit.index;
    }

    const nearEnd = Number.isFinite(element.duration) && target >= element.duration - 0.05;

    if (element.paused && !nearEnd) {
      element.play().catch(() => undefined);
    }
  }, []);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    videoRef.current?.pause();
    audioRef.current?.pause();
    audioIndexRef.current = -1;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const playVideo = useCallback(() => {
    videoRef.current?.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) stopPlayback();
    });
  }, [stopPlayback]);

  /** Put the video at file time `time` unless it is already (nearly) there. */
  const cueVideo = useCallback((time: number) => {
    const element = videoRef.current;

    if (element && Math.abs(element.currentTime - time) > 0.04) element.currentTime = time;
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return;

    const loop = () => {
      rafRef.current = null;

      if (!playingRef.current) return;

      const element = videoRef.current;
      const list = videoClipsRef.current;
      const index = playIndexRef.current;
      const clip = list[index];

      if (!element || !clip) {
        stopPlayback();
        return;
      }

      const time = element.currentTime;
      const output = (clipOffsets(list)[index] ?? 0) + clamp(time - clip.start, 0, clipLength(clip));

      setHead(output);
      syncAudio(output, true);

      if (time >= clip.end - 0.02 || element.ended) {
        const next = list[index + 1];

        if (!next) {
          stopPlayback();
          setHead(sequenceLength(list));
          return;
        }

        playIndexRef.current = index + 1;
        cueVideo(next.start);
        if (element.paused) playVideo();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [cueVideo, playVideo, setHead, stopPlayback, syncAudio]);

  const startPlayback = useCallback(() => {
    const list = videoClipsRef.current;

    if (list.length === 0 || !videoRef.current) return;

    let time = playheadRef.current;

    if (time >= sequenceLength(list) - 0.05) time = 0;

    const hit = locateInSequence(list, time);
    const clip = hit ? list[hit.index] : undefined;

    if (!hit || !clip) return;

    playingRef.current = true;
    playIndexRef.current = hit.index;
    audioIndexRef.current = -1;
    setIsPlaying(true);
    setHead(time);
    cueVideo(clip.start + hit.offset);
    syncAudio(time, true);
    playVideo();
    startLoop();
  }, [cueVideo, playVideo, setHead, startLoop, syncAudio]);

  const togglePlay = () => {
    if (playingRef.current) stopPlayback();
    else startPlayback();
  };

  const seek = (time: number) => {
    const clamped = clamp(time, 0, sequenceLength(videoClipsRef.current));

    setHead(clamped);

    if (!playingRef.current) return;

    const hit = locateInSequence(videoClipsRef.current, clamped);
    const clip = hit ? videoClipsRef.current[hit.index] : undefined;

    if (!hit || !clip) return;

    playIndexRef.current = hit.index;
    cueVideo(clip.start + hit.offset);
    syncAudio(clamped, true);
  };

  // While paused, the player shows the frame under the playhead — or, during a
  // video trim, the frame at the edge being dragged.
  useEffect(() => {
    if (playingRef.current) return;

    if (edgePreview !== null) {
      cueVideo(edgePreview);
      return;
    }

    const hit = locateInSequence(videoClips, playhead);
    const clip = hit ? videoClips[hit.index] : undefined;

    if (!hit || !clip) return;

    cueVideo(Math.max(clip.start, Math.min(clip.start + hit.offset, clip.end - 0.04)));
  }, [videoClips, playhead, edgePreview, video, cueVideo]);

  // In "replace" the video's own sound is off; in "mix" (or with no audio
  // file yet) it plays.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = mode === "replace" && audio !== null;
  }, [mode, audio, video]);

  // Keep the playhead on the sequence when it gets shorter.
  useEffect(() => {
    if (playheadRef.current > videoTotal) setHead(videoTotal);
  }, [videoTotal, setHead]);

  // Release object URLs and the loop when leaving the page.
  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (videoRefInfo.current) URL.revokeObjectURL(videoRefInfo.current.url);
      if (audioRefInfo.current) URL.revokeObjectURL(audioRefInfo.current.url);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  /* =========================================================
     UPLOADS
  ========================================================= */

  const clearResult = () => {
    setResultBlob(null);
    setResultUrl(null);
    setMergedWith(null);
  };

  const acceptVideo = async (file: File) => {
    setErrorMessage(null);

    if (!isVideoFile(file)) {
      setErrorMessage(`"${file.name}" is not a supported video (MP4, MOV, WEBM, MKV, AVI, M4V or MPEG).`);
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setErrorMessage(`"${file.name}" is larger than 500 MB.`);
      return;
    }

    setReading("video");

    try {
      const unreadable = await unreadableFileMessage(file);

      if (unreadable) {
        setErrorMessage(unreadable);
        return;
      }

      const url = URL.createObjectURL(file);
      const meta = await readMediaMeta("video", url);

      if (!meta) {
        URL.revokeObjectURL(url);
        setErrorMessage(
          `"${file.name}" can't be previewed in this browser. Convert it to MP4 with the Video Converter first.`
        );
        return;
      }

      stopPlayback();

      if (videoRefInfo.current) URL.revokeObjectURL(videoRefInfo.current.url);

      const info: VideoInfo = { file, url, duration: meta.duration, width: meta.width, height: meta.height };
      const clips = [{ id: newId("v"), start: 0, end: meta.duration }];

      videoRefInfo.current = info;
      videoClipsRef.current = clips;
      setVideo(info);
      setVideoClips(clips);
      setSelectedVideoId(null);
      setActiveTrack("video");
      setHead(0);
      clearResult();
      setDownloadFileName(`${stemOf(file.name)}-merged`);
    } finally {
      setReading(null);
    }
  };

  const acceptAudio = async (file: File) => {
    setErrorMessage(null);

    if (!isAudioFile(file)) {
      setErrorMessage(`"${file.name}" is not a supported audio file (MP3, WAV, M4A, AAC, FLAC, OGG or OPUS).`);
      return;
    }

    if (file.size > MAX_AUDIO_BYTES) {
      setErrorMessage(`"${file.name}" is larger than 100 MB.`);
      return;
    }

    setReading("audio");

    let decoded: Peaks | null = null;
    let duration = 0;
    let url = "";

    try {
      const unreadable = await unreadableFileMessage(file);

      if (unreadable) {
        setErrorMessage(unreadable);
        return;
      }

      url = URL.createObjectURL(file);
      const meta = await readMediaMeta("audio", url);

      duration = meta?.duration ?? 0;

      if (!meta) {
        // The player can't open it; decoding may still give us its length.
        decoded = await decodePeaks(file).catch(() => null);
        duration = decoded?.duration ?? 0;
      }

      if (!(duration > 0)) {
        URL.revokeObjectURL(url);
        setErrorMessage(
          `"${file.name}" can't be read in this browser. Convert it to MP3 with the Audio Converter first.`
        );
        return;
      }
    } finally {
      setReading(null);
    }

    stopPlayback();

    if (audioRefInfo.current) URL.revokeObjectURL(audioRefInfo.current.url);

    const info: AudioInfo = { file, url, duration };
    const clips = [{ id: newId("a"), start: 0, end: duration }];

    audioRefInfo.current = info;
    audioClipsRef.current = clips;
    offsetRef.current = 0;
    setAudio(info);
    setAudioClips(clips);
    setAudioOffset(0);
    setSelectedAudioId(null);
    setActiveTrack("audio");
    clearResult();

    // Waveform, in the background.
    const token = ++peaksTokenRef.current;

    setPeaks(decoded);
    setWaveState(decoded ? "ready" : "loading");

    if (decoded) return;

    try {
      const result = await decodePeaks(file, duration);

      if (token !== peaksTokenRef.current) return;
      setPeaks(result);
      setWaveState("ready");
    } catch {
      if (token !== peaksTokenRef.current) return;
      setPeaks(null);
      setWaveState("failed");
    }
  };

  const removeVideo = () => {
    stopPlayback();
    if (video) URL.revokeObjectURL(video.url);
    videoRefInfo.current = null;
    videoClipsRef.current = [];
    setVideo(null);
    setVideoClips([]);
    setSelectedVideoId(null);
    setHead(0);
    clearResult();
  };

  const removeAudio = () => {
    stopPlayback();
    if (audio) URL.revokeObjectURL(audio.url);
    peaksTokenRef.current++;
    audioRefInfo.current = null;
    audioClipsRef.current = [];
    setAudio(null);
    setAudioClips([]);
    setAudioOffset(0);
    setSelectedAudioId(null);
    setPeaks(null);
    setWaveState("idle");
    setActiveTrack("video");
    clearResult();
  };

  /* =========================================================
     TRACK EDITING
  ========================================================= */

  const setTrack = (track: TrackId, next: Clip[]) => {
    if (track === "video") {
      videoClipsRef.current = next;
      setVideoClips(next);
    } else {
      audioClipsRef.current = next;
      setAudioClips(next);
    }
  };

  const clipsOf = (track: TrackId) =>
    track === "video" ? videoClipsRef.current : audioClipsRef.current;

  const handleTrim = (track: TrackId) => (id: string, start: number, end: number, edge: "start" | "end") => {
    stopPlayback();
    setActiveTrack(track);
    setTrack(
      track,
      clipsOf(track).map((c) => (c.id === id ? { ...c, start, end } : c))
    );

    if (track === "video") setEdgePreview(edge === "start" ? start : Math.max(start, end - 0.04));
  };

  const handleReorder = (track: TrackId) => (from: number, to: number) => {
    stopPlayback();

    const next = moveItem(clipsOf(track), from, to);

    setTrack(track, next);
    setHead(
      Math.min(
        (track === "audio" ? offsetRef.current : 0) + (clipOffsets(next)[to] ?? 0),
        sequenceLength(videoClipsRef.current)
      )
    );
  };

  const handleOffset = (seconds: number) => {
    stopPlayback();
    offsetRef.current = seconds;
    setAudioOffset(seconds);
    setActiveTrack("audio");
  };

  const splitAtPlayhead = () => {
    const track = activeTrack;
    const list = clipsOf(track);

    if (list.length === 0) return;

    if (list.length >= MAX_CLIPS) {
      flash(`A track can have at most ${MAX_CLIPS} clips.`);
      return;
    }

    stopPlayback();

    const local = playheadRef.current - (track === "audio" ? offsetRef.current : 0);
    const result =
      local > 0 && local < sequenceLength(list)
        ? splitSequenceAt(list, local, newId(track === "video" ? "v" : "a"), MIN_CLIP)
        : null;

    if (!result) {
      flash(
        `Move the playhead inside ${track === "video" ? "a video" : "an audio"} clip (at least 0.1 s from its edges) to split it.`
      );
      return;
    }

    setTrack(track, result.clips);

    const right = result.clips[result.leftIndex + 1]?.id ?? null;

    if (track === "video") setSelectedVideoId(right);
    else setSelectedAudioId(right);

    flash(`${track === "video" ? "Video" : "Audio"} clip split in two. Drag either piece to move it.`);
  };

  const deleteSelected = () => {
    const track = activeTrack;
    const list = clipsOf(track);
    const selectedId = track === "video" ? selectedVideoId : selectedAudioId;
    const index = list.findIndex((c) => c.id === selectedId);

    if (index < 0) {
      flash(`Click a clip on the ${track} track to select it first.`);
      return;
    }

    stopPlayback();

    const next = list.filter((_, i) => i !== index);
    const nextSelected = next[Math.min(index, next.length - 1)]?.id ?? null;

    setTrack(track, next);

    if (track === "video") {
      setSelectedVideoId(nextSelected);
      setHead(Math.min(playheadRef.current, sequenceLength(next)));
    } else {
      setSelectedAudioId(nextSelected);
    }
  };

  const resetTrack = () => {
    const track = activeTrack;
    const info = track === "video" ? video : audio;

    if (!info) return;

    stopPlayback();
    setTrack(track, [{ id: newId(track === "video" ? "v" : "a"), start: 0, end: info.duration }]);

    if (track === "video") {
      setSelectedVideoId(null);
    } else {
      setSelectedAudioId(null);
      handleOffset(0);
    }

    flash(`The ${track} track is back to the whole file.`);
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
      if (!videoRefInfo.current) return;

      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
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
     MERGE & DOWNLOAD
  ========================================================= */

  const signature = JSON.stringify([
    video?.url,
    audio?.url,
    mode,
    segmentsOf(videoClips),
    segmentsOf(audioClips),
    round3(audioOffset),
  ]);

  const needsRemerge =
    mergedWith !== null &&
    (mergedWith.signature !== signature ||
      mergedWith.format !== downloadFormat ||
      mergedWith.quality !== encodeQuality);

  const canMerge = Boolean(video && audio && videoClips.length > 0 && audioClips.length > 0);

  const runMerge = async (): Promise<{ blob: Blob; format: string } | null> => {
    if (!video || !audio) {
      setErrorMessage("Upload a video and an audio file first.");
      return null;
    }

    if (videoClipsRef.current.length === 0 || audioClipsRef.current.length === 0) {
      setErrorMessage("Keep at least one clip on each track.");
      return null;
    }

    stopPlayback();

    const settings: MergeSettings = { signature, format: downloadFormat, quality: encodeQuality };
    const formData = new FormData();

    formData.append("video", video.file);
    formData.append("audio", audio.file);
    formData.append("mode", mode);
    formData.append("format", settings.format);
    formData.append("quality", settings.quality);
    formData.append("videoSegments", JSON.stringify(segmentsOf(videoClipsRef.current)));
    formData.append("audioSegments", JSON.stringify(segmentsOf(audioClipsRef.current)));
    formData.append("audioOffset", String(round3(offsetRef.current)));

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const response = await fetch(MERGE_ENDPOINT, { method: "POST", body: formData });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;

        throw new Error(body?.error || "Could not merge those files. Please try again.");
      }

      const blob = await response.blob();

      setResultBlob(blob);
      setResultUrl(PLAYABLE_RESULT.has(settings.format) ? URL.createObjectURL(blob) : null);
      setMergedWith(settings);
      setDownloadFileName((current) => {
        const stem = stemOf(current).trim() || `${stemOf(video.file.name)}-merged`;

        return `${stem}.${settings.format}`;
      });

      return { blob, format: settings.format };
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not merge those files. Please try again."
      );
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    clearResult();
    await runMerge();
  };

  const handleDownload = async () => {
    let blob = resultBlob;
    let format = mergedWith?.format ?? downloadFormat;

    if (!blob || needsRemerge) {
      const result = await runMerge();

      if (!result) return;

      blob = result.blob;
      format = result.format;
    }

    const stem = stemOf(downloadFileName).trim() || "audio-video-merged";
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

  const liveSpan = Math.max(videoTotal, audio ? audioOffset + audioTotal : 0, 1);
  const span = frozenSpan !== null ? Math.max(frozenSpan, videoTotal) : liveSpan;

  const toTimeline = (clips: Clip[], info: { duration: number } | null, color: string, name: string) =>
    clips.map<TimelineClip>((clip) => ({
      id: clip.id,
      start: clip.start,
      end: clip.end,
      min: 0,
      max: info?.duration ?? clip.end,
      label: name,
      color,
    }));

  const videoTimeline = toTimeline(videoClips, video, VIDEO_COLOR, video?.file.name ?? "Video");
  const audioTimeline = toTimeline(audioClips, audio, AUDIO_COLOR, audio?.file.name ?? "Audio");

  const activeClips = activeTrack === "video" ? videoClips : audioClips;
  const activeLocal = playhead - (activeTrack === "audio" ? audioOffset : 0);
  const activeHit =
    activeLocal > 0 && activeLocal < sequenceLength(activeClips)
      ? locateInSequence(activeClips, activeLocal)
      : null;
  const activeHitClip = activeHit ? activeClips[activeHit.index] : undefined;
  const canSplit = Boolean(
    activeHit &&
      activeHitClip &&
      activeHit.offset >= MIN_CLIP &&
      clipLength(activeHitClip) - activeHit.offset >= MIN_CLIP &&
      activeClips.length < MAX_CLIPS
  );
  const activeSelectedId = activeTrack === "video" ? selectedVideoId : selectedAudioId;
  const activeSelectedIndex = activeClips.findIndex((c) => c.id === activeSelectedId);
  const activeSelected = activeSelectedIndex >= 0 ? activeClips[activeSelectedIndex] : undefined;

  const audioFrom = Math.min(audioOffset, videoTotal);
  const audioTo = Math.min(audioOffset + audioTotal, videoTotal);

  const toolButton =
    "inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold shadow-sm transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-inherit";

  const scrub = (active: boolean) => {
    if (active) {
      resumeAfterScrubRef.current = playingRef.current;
      if (playingRef.current) stopPlayback();
    } else if (resumeAfterScrubRef.current) {
      resumeAfterScrubRef.current = false;
      startPlayback();
    }
  };

  const trackShell = (track: TrackId) =>
    `rounded-xl p-2 transition-colors ${
      activeTrack === track
        ? "bg-orange-500/[0.06] ring-2 ring-orange-500/60"
        : "ring-1 ring-transparent hover:ring-border"
    }`;

  const trackTitle = (track: TrackId) => (
    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: track === "video" ? VIDEO_COLOR : AUDIO_COLOR }}
      />
      {track === "video" ? "Video track" : "Audio track"}
      {activeTrack === track && (
        <span className="rounded bg-orange-500 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white">
          Active
        </span>
      )}
    </span>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-12 font-sans text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-sm">
            <Layers3 className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Audio Video Merger</h1>

          <p className="mx-auto max-w-lg text-base text-muted-foreground">
            Put a new audio track under your video. Trim, split and rearrange both on the timeline, and choose when the audio starts.
          </p>
        </div>

        <div className="space-y-6 rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6 md:p-8">
          {errorMessage && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {/* ================= FILES ================= */}
          <div className="grid gap-4 md:grid-cols-2">
            <DropSlot
              kind="video"
              busy={reading === "video"}
              onFile={(file) => void acceptVideo(file)}
              onError={setErrorMessage}
            >
              {video
                ? (browse) => (
                    <div className="space-y-3">
                      <FileHeader
                        kind="video"
                        name={video.file.name}
                        meta={`${formatClock(video.duration)} · ${video.width}×${video.height} · ${formatBytes(video.file.size)}`}
                        onReplace={browse}
                        onRemove={removeVideo}
                      />

                      <div className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-muted/40 shadow-md dark:bg-stone-950">
                        <video
                          ref={videoRef}
                          data-preview
                          src={video.url}
                          preload="auto"
                          playsInline
                          onClick={togglePlay}
                          className="h-full w-full cursor-pointer object-contain"
                        />

                        <div
                          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity ${
                            isPlaying ? "opacity-0 group-hover:opacity-100" : "bg-background/20 dark:bg-stone-950/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={togglePlay}
                            disabled={videoClips.length === 0}
                            aria-label={isPlaying ? "Pause preview" : "Play preview"}
                            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-orange-600 disabled:opacity-50"
                          >
                            {isPlaying ? (
                              <Pause className="h-6 w-6 fill-current" />
                            ) : (
                              <Play className="ml-1 h-6 w-6 fill-current" />
                            )}
                          </button>
                        </div>

                        <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
                          {formatClock(playhead)} / {formatClock(videoTotal)}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {audio
                          ? mode === "replace"
                            ? "The preview plays your edit with the new audio instead of the video’s sound."
                            : "The preview plays your edit with the new audio over the video’s sound."
                          : "Add an audio file to hear it with the video."}
                      </p>
                    </div>
                  )
                : undefined}
            </DropSlot>

            <DropSlot
              kind="audio"
              busy={reading === "audio"}
              onFile={(file) => void acceptAudio(file)}
              onError={setErrorMessage}
            >
              {audio
                ? (browse) => (
                    <div className="flex h-full flex-col gap-3">
                      <FileHeader
                        kind="audio"
                        name={audio.file.name}
                        meta={`${formatClock(audio.duration)} · ${formatBytes(audio.file.size)}`}
                        onReplace={browse}
                        onRemove={removeAudio}
                      />

                      <div
                        data-audio-waveform
                        className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-emerald-500/[0.06] px-2 text-emerald-600 dark:text-emerald-400 sm:h-28"
                      >
                        {waveState === "ready" && peaks ? (
                          <Waveform peaks={peaks} bars={160} />
                        ) : waveState === "loading" ? (
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Drawing the waveform…
                          </span>
                        ) : (
                          <span className="px-3 text-center text-xs text-muted-foreground">
                            This browser couldn’t draw the waveform for this file. You can still edit and merge it.
                          </span>
                        )}
                      </div>

                      <div className="mt-auto space-y-1.5">
                        <p className="text-xs font-semibold">Video’s own sound</p>
                        <div role="radiogroup" aria-label="Audio mode" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1">
                          {MODE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={mode === option.value}
                              onClick={() => setMode(option.value)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                mode === option.value
                                  ? "bg-orange-500 text-white shadow-sm"
                                  : "text-muted-foreground hover:text-orange-500"
                              }`}
                            >
                              {option.value === "replace" ? "Replace it" : "Mix with it"}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {MODE_OPTIONS.find((option) => option.value === mode)?.hint}
                        </p>
                      </div>
                    </div>
                  )
                : undefined}
            </DropSlot>
          </div>

          {/* Hidden player for the new audio, driven by the timeline. */}
          {audio && (
            <audio ref={audioRef} data-audio-player src={audio.url} preload="auto" className="hidden" />
          )}

          {/* ================= TIMELINE ================= */}
          {video && (
            <div className="space-y-3 rounded-2xl border border-border bg-background p-3 shadow-inner sm:p-5">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={togglePlay} disabled={videoClips.length === 0} className={toolButton}>
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isPlaying ? "Pause" : "Play"}
                </button>

                <div role="radiogroup" aria-label="Track to edit" className="inline-flex rounded-xl border border-border bg-secondary p-0.5 text-xs font-semibold shadow-sm">
                  {(["video", "audio"] as const).map((track) => (
                    <button
                      key={track}
                      type="button"
                      role="radio"
                      aria-checked={activeTrack === track}
                      disabled={track === "audio" && !audio}
                      onClick={() => setActiveTrack(track)}
                      className={`rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40 ${
                        activeTrack === track ? "bg-orange-500 text-white" : "hover:text-orange-500"
                      }`}
                    >
                      {track === "video" ? "Video" : "Audio"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={splitAtPlayhead}
                  disabled={!canSplit}
                  title={`Split the ${activeTrack} clip at the playhead (S)`}
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
                  disabled={!activeSelected}
                  title={`Remove the selected ${activeTrack} clip (Delete)`}
                  className={toolButton}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete clip
                </button>

                <button
                  type="button"
                  onClick={resetTrack}
                  disabled={activeTrack === "audio" && !audio}
                  title={`Put the whole ${activeTrack} file back on its track`}
                  className={toolButton}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset track
                </button>

                <span className="ml-auto min-w-0 truncate text-[11px] tabular-nums text-muted-foreground">
                  {activeSelected
                    ? `Selected ${activeTrack} clip ${activeSelectedIndex + 1}: ${formatClock(activeSelected.start)}–${formatClock(activeSelected.end)}`
                    : `Editing the ${activeTrack} track`}
                </span>
              </div>

              <div
                data-track="video"
                className={trackShell("video")}
                onPointerDownCapture={() => setActiveTrack("video")}
                onFocusCapture={() => setActiveTrack("video")}
              >
                <ClipTimeline
                  title={trackTitle("video")}
                  clips={videoTimeline}
                  playhead={playhead}
                  selectedId={selectedVideoId}
                  onSelect={setSelectedVideoId}
                  onSeek={seek}
                  onTrim={handleTrim("video")}
                  onTrimEnd={() => setEdgePreview(null)}
                  onReorder={handleReorder("video")}
                  onScrubChange={scrub}
                  minClipLength={MIN_CLIP}
                  span={span}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  scrollLeft={scrollX}
                  onScrollLeftChange={setScrollX}
                  playheadMax={videoTotal}
                  emptyMessage="The video track is empty. Use “Reset track” to put the whole video back."
                />
              </div>

              <div
                data-track="audio"
                className={trackShell("audio")}
                onPointerDownCapture={() => audio && setActiveTrack("audio")}
                onFocusCapture={() => audio && setActiveTrack("audio")}
              >
                {audio ? (
                  <ClipTimeline
                    title={trackTitle("audio")}
                    clips={audioTimeline}
                    playhead={playhead}
                    selectedId={selectedAudioId}
                    onSelect={setSelectedAudioId}
                    onSeek={seek}
                    onTrim={handleTrim("audio")}
                    onReorder={handleReorder("audio")}
                    onScrubChange={scrub}
                    minClipLength={MIN_CLIP}
                    span={span}
                    zoom={zoom}
                    showZoom={false}
                    scrollLeft={scrollX}
                    onScrollLeftChange={setScrollX}
                    playheadMax={videoTotal}
                    outputEnd={videoTotal}
                    leadIn={audioOffset}
                    onLeadInChange={handleOffset}
                    maxLeadIn={Math.max(0, videoTotal - MIN_CLIP)}
                    onSlideChange={(active) => setFrozenSpan(active ? liveSpan : null)}
                    slideLabel="Drag to move the audio"
                    renderClipContent={(clip) =>
                      peaks ? (
                        <div className="h-full py-1.5 text-emerald-700/45 dark:text-emerald-300/40">
                          <Waveform
                            peaks={peaks}
                            start={clip.start}
                            end={clip.end}
                            bars={Math.max(8, Math.min(400, clipLength(clip) * 20))}
                          />
                        </div>
                      ) : null
                    }
                    emptyMessage="The audio track is empty. Use “Reset track” to put the whole audio back."
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="px-1 text-xs text-muted-foreground">{trackTitle("audio")}</div>
                    <div className="flex h-[88px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
                      Upload an audio file above to lay it under the video.
                    </div>
                  </div>
                )}
              </div>

              <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Click a track to edit it. Drag a clip’s edges to trim it, drag the clip to reorder it, press the ruler to move the playhead — Split cuts the active track’s clip there.{" "}
                  <strong className="font-semibold text-foreground">To start the audio later, drag the orange bar under the audio clips.</strong>
                </span>
              </p>

              {notice && (
                <p role="status" className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-600 dark:text-orange-400">
                  {notice}
                </p>
              )}

              {audio && (
                <p data-summary className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Output length{" "}
                  <strong className="tabular-nums text-foreground">{formatClock(videoTotal)}</strong> (the video track).{" "}
                  {audioOffset >= videoTotal || audioTotal === 0 ? (
                    <span className="font-semibold text-destructive">The audio doesn’t reach the video — the result will be silent.</span>
                  ) : (
                    <>
                      New audio plays{" "}
                      <strong className="tabular-nums text-foreground">
                        {formatClock(audioFrom)}–{formatClock(audioTo)}
                      </strong>
                      {audioFrom > 0.05 || audioTo < videoTotal - 0.05 ? ", silence elsewhere" : ""}
                      {audioOffset + audioTotal > videoTotal + 0.05 ? "; the part past the end is cut" : ""}.
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* ================= MERGE & RESULT ================= */}
          {video && audio && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleMerge()}
                disabled={isProcessing || !canMerge}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Merging ({formatClock(videoTotal, false)})…
                  </>
                ) : (
                  <>
                    <Layers3 className="h-4 w-4" />
                    Merge Audio &amp; Video
                  </>
                )}
              </button>

              {resultBlob && (
                <div data-result className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Your file is ready</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(resultBlob.size)} · Choose a name, format and quality for your download.
                      </p>
                    </div>
                  </div>

                  {resultUrl && (
                    <VideoPreview src={resultUrl} className="mx-auto aspect-video max-w-md" />
                  )}

                  <div>
                    <label htmlFor="download-filename" className="mb-2 block text-xs font-medium text-muted-foreground">
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
                    quality={encodeQuality}
                    onQualityChange={setEncodeQuality}
                    disabled={isProcessing}
                  />

                  {needsRemerge && (
                    <p className="text-xs text-muted-foreground">
                      The edit or settings changed. Download will merge again with them.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={isProcessing || !canMerge}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {needsRemerge ? "Update & Download" : "Download"}
                  </button>
                </div>
              )}
            </div>
          )}

          {!video && !audio && (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Upload className="h-3.5 w-3.5" />
              Add both files to start editing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
