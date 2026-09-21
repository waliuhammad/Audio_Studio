"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SaveToLibrary } from "@/components/library/SaveToLibrary";
import { OutputControls } from "@/components/tools/OutputControls";
import {
  Upload,
  Play,
  Pause,
  Scissors,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Music2,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Volume2,
  Info,
  Combine,
  Ear,
} from "lucide-react";

/* ====================================================================== */
/* Constants — keep in sync with the API route                            */
/* ====================================================================== */

const MAX_FILES = 12;
const MAX_CLIPS = 40;
const MAX_TIMELINE_SECONDS = 2 * 60 * 60;
const MAX_CLIP_VOLUME = 2;

type OutputFormat = "mp3" | "wav" | "m4a" | "aac" | "flac" | "ogg";

const FORMAT_OPTIONS: { label: string; value: OutputFormat }[] = [
  { label: "MP3 (Most Compatible)", value: "mp3" },
  { label: "WAV (Uncompressed)", value: "wav" },
  { label: "M4A (AAC in MP4)", value: "m4a" },
  { label: "AAC (Raw Stream)", value: "aac" },
  { label: "FLAC (Lossless)", value: "flac" },
  { label: "OGG (Vorbis)", value: "ogg" },
];

type Bitrate = "96" | "128" | "160" | "192" | "256" | "320";

const QUALITY_OPTIONS: { label: string; value: Bitrate }[] = [
  { label: "Best · 320kbps", value: "320" },
  { label: "High · 256kbps", value: "256" },
  { label: "Good · 192kbps", value: "192" },
  { label: "Balanced · 160kbps", value: "160" },
  { label: "Standard · 128kbps", value: "128" },
  { label: "Small · 96kbps", value: "96" },
];

type Compression = "low" | "medium" | "high" | "max";

const COMPRESSION_OPTIONS: { label: string; hint: string; value: Compression }[] = [
  { label: "Low", hint: "44.1 kHz stereo", value: "low" },
  { label: "Medium", hint: "32 kHz stereo", value: "medium" },
  { label: "High", hint: "22 kHz mono", value: "high" },
  { label: "Max", hint: "16 kHz mono", value: "max" },
];

/* ====================================================================== */
/* Timeline layout — a single track, like a tape. No lanes to manage.      */
/*                                                                        */
/* Vertical layout (top → bottom):                                        */
/*   ruler  →  action strip (duplicate / delete buttons)  →  track        */
/* The action strip is its own reserved band, so the buttons are never    */
/* half-hidden by the scroll container or covered by a clip. They are     */
/* also pinned inside the *visible* part of the timeline, so scrolling    */
/* sideways can never push them out of view.                              */
/* ====================================================================== */

const TRACK_H = 68;
const RULER_H = 28;
const ACTIONS_H = 48; // reserved band above the track for the clip action buttons
const ACTION_BTN = 36; // size of each action button (px)
const ACTION_GAP = 8; // gap between action buttons (px)
const ACTIONS_EDGE = 6; // minimum breathing room from the edge of the visible area (px)
const ACTIONS_W = ACTION_BTN * 2 + ACTION_GAP;
const TRACK_TOP = RULER_H + ACTIONS_H;
const SCROLL_PAD_X = 12; // matches `px-3` on the scroll container
const MIN_CLIP = 0.1;
const MIN_PPS = 10;
const MAX_PPS = 300;
const EPS = 1e-6;
const PEAKS_PER_SEC = 40;

const PALETTE = [
  { fill: "rgba(249,115,22,0.22)", border: "#f97316" },
  { fill: "rgba(14,165,233,0.22)", border: "#0ea5e9" },
  { fill: "rgba(16,185,129,0.22)", border: "#10b981" },
  { fill: "rgba(139,92,246,0.22)", border: "#8b5cf6" },
  { fill: "rgba(244,63,94,0.22)", border: "#f43f5e" },
  { fill: "rgba(234,179,8,0.22)", border: "#ca8a04" },
  { fill: "rgba(20,184,166,0.22)", border: "#14b8a6" },
  { fill: "rgba(99,102,241,0.22)", border: "#6366f1" },
];

const FALLBACK_COLOR = { fill: "rgba(249,115,22,0.22)", border: "#f97316" };
const colorFor = (index: number) => PALETTE[index % PALETTE.length] ?? FALLBACK_COLOR;

/* ====================================================================== */
/* Types & helpers                                                        */
/* ====================================================================== */

interface SourceFile {
  id: string;
  file: File;
  name: string;
  duration: number;
  buffer: AudioBuffer;
  peaks: number[];
  colorIndex: number;
}

/**
 * A piece of a source file placed on the single shared timeline.
 * srcStart/srcEnd = which part of the file plays (trim).
 * timelineStart   = where it sits on the timeline (absolute, seconds).
 * Clips never overlap — this is a sequence, not a mixer.
 */
interface Clip {
  id: string;
  fileId: string;
  srcStart: number;
  srcEnd: number;
  timelineStart: number;
  volume: number; // 0 – 2
}

type DragMode = "move" | "trimL" | "trimR";

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clipDur = (c: Clip) => c.srcEnd - c.srcStart;
const clipEnd = (c: Clip) => c.timelineStart + clipDur(c);

function formatTime(secs: number, decimals = 0) {
  if (!Number.isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = secs - m * 60;
  if (decimals === 0) return `${m}:${String(Math.floor(s)).padStart(2, "0")}`;
  const fixed = s.toFixed(decimals);
  return `${m}:${Number(fixed) < 10 ? "0" : ""}${fixed}`;
}

function computePeaks(buffer: AudioBuffer): number[] {
  const data = buffer.getChannelData(0);
  const bucket = Math.max(1, Math.floor(buffer.sampleRate / PEAKS_PER_SEC));
  const stride = Math.max(1, Math.floor(bucket / 40));
  const count = Math.ceil(data.length / bucket);
  const peaks = new Array<number>(count);
  let globalMax = 0;
  for (let i = 0; i < count; i++) {
    let max = 0;
    const end = Math.min(data.length, (i + 1) * bucket);
    for (let j = i * bucket; j < end; j += stride) {
      const v = Math.abs(data[j] ?? 0);
      if (v > max) max = v;
    }
    peaks[i] = max;
    if (max > globalMax) globalMax = max;
  }
  const scale = globalMax > 0 ? 1 / globalMax : 1;
  return peaks.map((p) => p * scale);
}

/** Whether placing `clip` at its current position would overlap any other clip on the track. */
function overlapsAny(clips: Clip[], clip: Clip): boolean {
  const s = clip.timelineStart;
  const e = clipEnd(clip);
  return clips.some((o) => o.id !== clip.id && o.timelineStart < e - EPS && clipEnd(o) > s + EPS);
}

/* ====================================================================== */
/* Waveform                                                               */
/* ====================================================================== */

const Waveform = React.memo(function Waveform({
  peaks,
  start,
  end,
  volume,
  color,
}: {
  peaks: number[];
  start: number;
  end: number;
  volume: number;
  color: string;
}) {
  const { d, width } = useMemo(() => {
    const from = Math.floor(start * PEAKS_PER_SEC);
    const to = Math.min(peaks.length, Math.ceil(end * PEAKS_PER_SEC));
    const n = Math.max(1, to - from);
    const step = Math.max(1, Math.ceil(n / 1500));
    const bars = Math.ceil(n / step);
    const parts: string[] = [];
    for (let b = 0; b < bars; b++) {
      let max = 0;
      for (let k = 0; k < step; k++) {
        const v = peaks[from + b * step + k] ?? 0;
        if (v > max) max = v;
      }
      const h = Math.max(0.03, Math.min(1, max * volume)) * 42;
      parts.push(`M${b + 0.5} ${50 - h}V${50 + h}`);
    }
    return { d: parts.join(""), width: bars };
  }, [peaks, start, end, volume]);

  return (
    <svg
      viewBox={`0 0 ${width} 100`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <path d={d} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />
    </svg>
  );
});

/* ====================================================================== */
/* Page                                                                   */
/* ====================================================================== */

export default function AudioMixturePage() {
  /* ---------------- project state ---------------- */
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pps, setPps] = useState(50);
  const [loadingCount, setLoadingCount] = useState(0);
  const [error, setError] = useState("");

  /* ---------------- range picker (select part of a file before adding) ---------------- */
  const [pickerFileId, setPickerFileId] = useState<string | null>(null);
  const [pickerClipId, setPickerClipId] = useState<string | null>(null);
  const [pickerRange, setPickerRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [pickerBoxW, setPickerBoxW] = useState(600);
  const pickerBoxRef = useRef<HTMLDivElement>(null);

  /* ---------------- playback (live preview) ---------------- */
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  /* ---------------- export ---------------- */
  const [format, setFormat] = useState<OutputFormat>("mp3");
  const [bitrate, setBitrate] = useState<Bitrate>("192");
  const [compression, setCompression] = useState<Compression>("low");
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<OutputFormat>("mp3");

  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const mergedUrlRef = useRef<string | null>(null);
  const [mergedIsPlaying, setMergedIsPlaying] = useState(false);
  const [mergedDuration, setMergedDuration] = useState(0);
  const [mergedCurrentTime, setMergedCurrentTime] = useState(0);
  const mergedAudioRef = useRef<HTMLAudioElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  /* ---------------- refs (mirrors + engine) ---------------- */
  const filesRef = useRef<SourceFile[]>([]);
  const clipsRef = useRef<Clip[]>([]);
  const playheadRef = useRef(0);
  const ppsRef = useRef(pps);
  const isPlayingRef = useRef(false);
  const draggingRef = useRef(false);
  const totalRef = useRef(0);
  const colorCounter = useRef(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<DynamicsCompressorNode | null>(null);
  const sourcesRef = useRef<{ clipId: string; src: AudioBufferSourceNode; gain: GainNode }[]>([]);
  const playStartRef = useRef({ t0: 0, from: 0 });
  const rafRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewW, setViewW] = useState(800);
  // Horizontal scroll position of the timeline — used to keep the clip action buttons inside the visible area.
  const [scrollLeft, setScrollLeft] = useState(0);

  filesRef.current = files;
  clipsRef.current = clips;
  ppsRef.current = pps;

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const total = useMemo(() => clips.reduce((m, c) => Math.max(m, clipEnd(c)), 0), [clips]);
  totalRef.current = total;

  /* ====================================================================== */
  /* Audio engine                                                           */
  /* ====================================================================== */

  const getCtx = () => {
    if (!ctxRef.current) {
      const AC: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  };

  const stopSources = useCallback(() => {
    sourcesRef.current.forEach(({ src, gain }) => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
      gain.disconnect();
    });
    sourcesRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const pausePlayback = useCallback(() => {
    stopSources();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [stopSources]);

  const startPlayback = useCallback(
    async (from: number) => {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();
      stopSources();

      if (mergedAudioRef.current && !mergedAudioRef.current.paused) {
        mergedAudioRef.current.pause();
        setMergedIsPlaying(false);
      }

      if (!masterRef.current) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -2;
        comp.knee.value = 0;
        comp.ratio.value = 20;
        comp.attack.value = 0.003;
        comp.release.value = 0.1;
        comp.connect(ctx.destination);
        masterRef.current = comp;
      }

      const t0 = ctx.currentTime + 0.06;
      const scheduled: typeof sourcesRef.current = [];

      for (const c of clipsRef.current) {
        const file = filesRef.current.find((f) => f.id === c.fileId);
        if (!file) continue;
        const end = clipEnd(c);
        if (end <= from + EPS) continue;

        const intoClip = Math.max(0, from - c.timelineStart);
        const offset = c.srcStart + intoClip;
        const duration = c.srcEnd - offset;
        if (duration <= 0) continue;

        const src = ctx.createBufferSource();
        src.buffer = file.buffer;
        const gain = ctx.createGain();
        gain.gain.value = c.volume;
        src.connect(gain);
        gain.connect(masterRef.current);
        src.start(t0 + Math.max(0, c.timelineStart - from), offset, duration);
        scheduled.push({ clipId: c.id, src, gain });
      }

      sourcesRef.current = scheduled;
      playStartRef.current = { t0, from };
      isPlayingRef.current = true;
      setIsPlaying(true);

      const tick = () => {
        const { t0: start, from: origin } = playStartRef.current;
        const head = origin + Math.max(0, ctx.currentTime - start);
        if (head >= totalRef.current) {
          playheadRef.current = totalRef.current;
          setPlayhead(totalRef.current);
          pausePlayback();
          return;
        }
        playheadRef.current = head;
        setPlayhead(head);

        const sc = scrollRef.current;
        if (sc) {
          const px = head * ppsRef.current;
          if (px > sc.scrollLeft + sc.clientWidth - 40 || px < sc.scrollLeft) {
            sc.scrollLeft = Math.max(0, px - 120);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopSources, pausePlayback]
  );

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pausePlayback();
      return;
    }
    if (clipsRef.current.length === 0) return;
    let from = playheadRef.current;
    if (from >= totalRef.current - 0.05) from = 0;
    playheadRef.current = from;
    setPlayhead(from);
    void startPlayback(from);
  }, [pausePlayback, startPlayback]);

  const seek = useCallback((t: number) => {
    playheadRef.current = t;
    setPlayhead(t);
  }, []);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    sourcesRef.current.forEach(({ clipId, gain }) => {
      const c = clips.find((x) => x.id === clipId);
      if (c) gain.gain.setTargetAtTime(c.volume, ctx.currentTime, 0.01);
    });
  }, [clips]);

  const structureKey = useMemo(
    () => clips.map((c) => `${c.id}:${c.fileId}:${c.srcStart}:${c.srcEnd}:${c.timelineStart}`).join("|"),
    [clips]
  );
  useEffect(() => {
    if (!isPlayingRef.current || draggingRef.current) return;
    if (clipsRef.current.length === 0) {
      pausePlayback();
      return;
    }
    void startPlayback(playheadRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  useEffect(() => {
    clearResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips, format, bitrate, compression]);

  useEffect(() => {
    return () => {
      stopSources();
      if (mergedUrlRef.current) URL.revokeObjectURL(mergedUrlRef.current);
      ctxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewW(el.clientWidth);
      setScrollLeft(el.scrollLeft);
    });
    ro.observe(el);
    setViewW(el.clientWidth);
    setScrollLeft(el.scrollLeft);
    return () => ro.disconnect();
  }, [files.length > 0]);

  useEffect(() => {
    if (!pickerFileId) return;
    const el = pickerBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPickerBoxW(el.clientWidth));
    ro.observe(el);
    setPickerBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [pickerFileId]);

  /* ====================================================================== */
  /* Merged result helpers                                                  */
  /* ====================================================================== */

  const setMergedBlob = (blob: Blob | null) => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
    }
    setMergedIsPlaying(false);
    setMergedDuration(0);
    setMergedCurrentTime(0);
    if (!blob) {
      setMergedUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    mergedUrlRef.current = url;
    setMergedUrl(url);
  };

  function clearResult() {
    setDownloadBlob(null);
    setDownloadFileName("");
    setMergedBlob(null);
  }

  const toggleMergedPlay = () => {
    const a = mergedAudioRef.current;
    if (!a) return;
    if (a.paused) {
      pausePlayback();
      void a.play();
      setMergedIsPlaying(true);
    } else {
      a.pause();
      setMergedIsPlaying(false);
    }
  };

  /* ====================================================================== */
  /* Files & clips                                                          */
  /* ====================================================================== */

  /** Always appends after the last clip on the track. Cannot silently fail to place. */
  const addClip = (file: { id: string; duration: number }) => {
    const cur = clipsRef.current;
    if (cur.length >= MAX_CLIPS) {
      setError(`A sequence can hold up to ${MAX_CLIPS} clips.`);
      return;
    }
    const end = cur.reduce((m, c) => Math.max(m, clipEnd(c)), 0);
    if (end + file.duration > MAX_TIMELINE_SECONDS) {
      setError("The sequence can be at most 2 hours long.");
      return;
    }
    const clip: Clip = {
      id: uid(),
      fileId: file.id,
      srcStart: 0,
      srcEnd: file.duration,
      timelineStart: end,
      volume: 1,
    };
    const next = [...cur, clip];
    clipsRef.current = next;
    setClips(next);
    setSelectedId(clip.id);
    setError("");
  };

  /** Adds only the chosen [start, end) range of a file, used by the range picker below. Returns the new clip's id, or null if it couldn't be added. */
  const addClipRange = (file: SourceFile, rawStart: number, rawEnd: number): string | null => {
    const cur = clipsRef.current;
    if (cur.length >= MAX_CLIPS) {
      setError(`A sequence can hold up to ${MAX_CLIPS} clips.`);
      return null;
    }
    const start = clamp(rawStart, 0, file.duration - MIN_CLIP);
    const end = clamp(rawEnd, start + MIN_CLIP, file.duration);
    const dur = end - start;
    const timelineStart = cur.reduce((m, c) => Math.max(m, clipEnd(c)), 0);
    if (timelineStart + dur > MAX_TIMELINE_SECONDS) {
      setError("The sequence can be at most 2 hours long.");
      return null;
    }
    const clip: Clip = { id: uid(), fileId: file.id, srcStart: start, srcEnd: end, timelineStart, volume: 1 };
    const next = [...cur, clip];
    clipsRef.current = next;
    setClips(next);
    setSelectedId(clip.id);
    setError("");
    return clip.id;
  };

  /**
   * Opens the range picker for a file — adding the whole clip to the timeline
   * right away. Dragging the selection below then reshapes that same clip
   * live, so there's no separate "confirm" step.
   */
  const openPicker = (file: SourceFile) => {
    if (pickerFileId === file.id) return; // already open for this file
    const id = addClipRange(file, 0, file.duration);
    if (!id) return;
    setPickerFileId(file.id);
    setPickerClipId(id);
    setPickerRange({ start: 0, end: file.duration });
  };
  const closePicker = () => {
    setPickerFileId(null);
    setPickerClipId(null);
  };

  const pickerFile = files.find((f) => f.id === pickerFileId) ?? null;

  // Keep the auto-added clip's trim in sync with the picker selection as the user drags.
  useEffect(() => {
    if (!pickerClipId) return;
    setClips((prev) =>
      prev.map((c) => (c.id === pickerClipId ? { ...c, srcStart: pickerRange.start, srcEnd: pickerRange.end } : c))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerClipId, pickerRange.start, pickerRange.end]);

  /** Drag the left or right edge of the selection to resize it. */
  const beginPickerEdgeDrag = (e: React.PointerEvent, edge: "start" | "end") => {
    e.stopPropagation();
    e.preventDefault();
    const file = pickerFile;
    if (!file || pickerBoxW <= 0) return;
    const startX = e.clientX;
    const orig = pickerRange;
    const scale = pickerBoxW / file.duration;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      setPickerRange((prev) =>
        edge === "start"
          ? { ...prev, start: clamp(orig.start + dx, 0, prev.end - MIN_CLIP) }
          : { ...prev, end: clamp(orig.end + dx, prev.start + MIN_CLIP, file.duration) }
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /** Drag the selected region itself to slide it, keeping its length fixed. */
  const beginPickerRegionDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const file = pickerFile;
    if (!file || pickerBoxW <= 0) return;
    const startX = e.clientX;
    const orig = pickerRange;
    const scale = pickerBoxW / file.duration;
    const dur = orig.end - orig.start;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const s = clamp(orig.start + dx, 0, file.duration - dur);
      setPickerRange({ start: s, end: s + dur });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /**
   * Click-drag anywhere on the empty waveform to draw a brand new selection,
   * instead of only being able to nudge the existing handles. Handles and the
   * selected region stop this from firing on themselves via stopPropagation.
   */
  const beginPickerCreateSelection = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const file = pickerFile;
    const el = pickerBoxRef.current;
    if (!file || !el || pickerBoxW <= 0) return;
    const rect = el.getBoundingClientRect();
    const scale = pickerBoxW / file.duration;
    const anchor = clamp((e.clientX - rect.left) / scale, 0, file.duration);
    setPickerRange({ start: anchor, end: anchor });

    const onMove = (ev: PointerEvent) => {
      const cur = clamp((ev.clientX - rect.left) / scale, 0, file.duration);
      setPickerRange({ start: Math.min(anchor, cur), end: Math.max(anchor, cur) });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      // A click with no drag leaves a zero-length range — give it a sensible minimum.
      setPickerRange((prev) =>
        prev.end - prev.start < MIN_CLIP
          ? { start: prev.start, end: clamp(prev.start + MIN_CLIP, MIN_CLIP, file.duration) }
          : prev
      );
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const addFiles = async (list: FileList | File[]) => {
    const incoming = Array.from(list).filter(
      (f) => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|flac|ogg|opus|wma|aiff?)$/i.test(f.name)
    );
    if (incoming.length === 0) {
      setError("Please choose audio files (MP3, WAV, M4A, FLAC, OGG…).");
      return;
    }
    const room = MAX_FILES - filesRef.current.length;
    if (room <= 0) {
      setError(`You can use up to ${MAX_FILES} audio files. Remove one to add another.`);
      return;
    }
    const accepted = incoming.slice(0, room);
    setError(
      incoming.length > room
        ? `Only ${room} more file${room === 1 ? "" : "s"} fit (limit is ${MAX_FILES}). The rest were skipped.`
        : ""
    );

    setLoadingCount((n) => n + accepted.length);
    const ctx = getCtx();

    for (const file of accepted) {
      try {
        const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
        const sf: SourceFile = {
          id: uid(),
          file,
          name: file.name,
          duration: buffer.duration,
          buffer,
          peaks: computePeaks(buffer),
          colorIndex: colorCounter.current++ % PALETTE.length,
        };
        filesRef.current = [...filesRef.current, sf];
        setFiles(filesRef.current);
        addClip(sf);
      } catch {
        setError(`Couldn't read "${file.name}". It may be corrupted or in an unsupported format.`);
      } finally {
        setLoadingCount((n) => n - 1);
      }
    }
  };

  const removeFile = (id: string) => {
    const nextFiles = filesRef.current.filter((f) => f.id !== id);
    const removedEnds = clipsRef.current.filter((c) => c.fileId === id);
    // Close the gap left by any removed clips, same as a manual delete would.
    let nextClips = clipsRef.current.filter((c) => c.fileId !== id);
    for (const removed of removedEnds.sort((a, b) => a.timelineStart - b.timelineStart)) {
      const dur = clipDur(removed);
      nextClips = nextClips.map((c) =>
        c.timelineStart >= clipEnd(removed) - EPS ? { ...c, timelineStart: Math.max(0, c.timelineStart - dur) } : c
      );
    }
    filesRef.current = nextFiles;
    clipsRef.current = nextClips;
    setFiles(nextFiles);
    setClips(nextClips);
    if (selectedId && !nextClips.some((c) => c.id === selectedId)) setSelectedId(null);
    if (pickerFileId === id) closePicker();
    if (nextClips.length === 0) {
      pausePlayback();
      seek(0);
    }
  };

  const startOver = () => {
    pausePlayback();
    filesRef.current = [];
    clipsRef.current = [];
    setFiles([]);
    setClips([]);
    setSelectedId(null);
    seek(0);
    setError("");
    clearResult();
  };

  /* ====================================================================== */
  /* Editing: split / duplicate / delete / volume                           */
  /* ====================================================================== */

  const splitTarget = useMemo(() => {
    const margin = 0.05;
    const contains = (c: Clip) => playhead > c.timelineStart + margin && playhead < clipEnd(c) - margin;
    const sel = clips.find((c) => c.id === selectedId);
    if (sel && contains(sel)) return sel;
    return clips.find(contains) ?? null;
  }, [clips, selectedId, playhead]);

  const splitClip = useCallback(() => {
    const head = playheadRef.current;
    const margin = 0.05;
    const cur = clipsRef.current;
    const sel = cur.find((c) => c.id === selectedIdRef.current);
    const contains = (c: Clip) => head > c.timelineStart + margin && head < clipEnd(c) - margin;
    const target = sel && contains(sel) ? sel : cur.find(contains);
    if (!target) return;
    if (cur.length >= MAX_CLIPS) {
      setError(`A sequence can hold up to ${MAX_CLIPS} clips.`);
      return;
    }
    const cut = target.srcStart + (head - target.timelineStart);
    const left: Clip = { ...target, srcEnd: cut };
    const right: Clip = { ...target, id: uid(), srcStart: cut, timelineStart: head };
    setClips(cur.flatMap((c) => (c.id === target.id ? [left, right] : [c])));
    setSelectedId(right.id);
    setError("");
  }, []);

  /**
   * Duplicates the selected clip, placing the copy right after it.
   * Any clips after the original are pushed right by the copy's length so
   * nothing ever overlaps.
   */
  const duplicateClip = useCallback(() => {
    const cur = clipsRef.current;
    const target = cur.find((c) => c.id === selectedIdRef.current);
    if (!target) return;
    if (cur.length >= MAX_CLIPS) {
      setError(`A sequence can hold up to ${MAX_CLIPS} clips.`);
      return;
    }
    const dur = clipDur(target);
    const end = clipEnd(target);
    const currentTotal = cur.reduce((m, c) => Math.max(m, clipEnd(c)), 0);
    if (currentTotal + dur > MAX_TIMELINE_SECONDS) {
      setError("The sequence can be at most 2 hours long.");
      return;
    }
    const copy: Clip = { ...target, id: uid(), timelineStart: end };
    const shifted = cur.map((c) =>
      c.id !== target.id && c.timelineStart >= end - EPS ? { ...c, timelineStart: c.timelineStart + dur } : c
    );
    setClips([...shifted, copy]);
    setSelectedId(copy.id);
    setError("");
  }, []);

  /** Deleting always closes the gap — the sequence never develops silent holes by accident. */
  const deleteClip = useCallback(() => {
    const id = selectedIdRef.current;
    const cur = clipsRef.current;
    const target = cur.find((c) => c.id === id);
    if (!target) return;
    const removedDur = clipDur(target);
    const removedEnd = clipEnd(target);
    const next = cur
      .filter((c) => c.id !== id)
      .map((c) =>
        c.timelineStart >= removedEnd - EPS ? { ...c, timelineStart: Math.max(0, c.timelineStart - removedDur) } : c
      );
    setClips(next);
    setSelectedId(null);
    if (next.length === 0) {
      pausePlayback();
      seek(0);
    }
  }, [pausePlayback, seek]);

  const setClipVolume = (id: string, volume: number) =>
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, volume } : c)));

  // Keyboard shortcuts: Space = play/pause, S = split, D = duplicate, Delete/Backspace = remove clip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        splitClip();
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        duplicateClip();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteClip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, splitClip, duplicateClip, deleteClip]);

  /* ====================================================================== */
  /* Pointer interactions: move / trim / scrub                              */
  /* Single track only — no vertical drag, so a clip's position never       */
  /* depends on a lane calculation that can silently fail.                  */
  /* ====================================================================== */

  const beginDrag = (e: React.PointerEvent, clip: Clip, mode: DragMode) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    setSelectedId(clip.id);
    if (isPlayingRef.current) pausePlayback();

    const orig = { ...clip };
    const scale = ppsRef.current;
    const startX = e.clientX;
    const fileDur = filesRef.current.find((f) => f.id === clip.fileId)?.duration ?? clip.srcEnd;
    const others = clipsRef.current.filter((c) => c.id !== clip.id);
    draggingRef.current = true;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;

      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== orig.id) return c;

          if (mode === "move") {
            const dur = clipDur(orig);
            let start = Math.max(0, orig.timelineStart + dx);

            // Snap to the playhead, time 0 and other clips' edges (hold Alt to disable).
            if (!ev.altKey) {
              const points = [0, playheadRef.current, ...others.flatMap((o) => [o.timelineStart, clipEnd(o)])];
              const threshold = 8 / scale;
              let best: { d: number; shift: number } | null = null;
              for (const p of points) {
                for (const edge of [start, start + dur]) {
                  const d = Math.abs(edge - p);
                  if (d < threshold && (!best || d < best.d)) best = { d, shift: p - edge };
                }
              }
              if (best) start = Math.max(0, start + best.shift);
            }
            return { ...c, timelineStart: start };
          }

          if (mode === "trimL") {
            const prevEnd = Math.max(0, ...others.filter((o) => clipEnd(o) <= orig.timelineStart + EPS).map(clipEnd));
            let delta = dx;
            delta = Math.max(delta, -orig.srcStart);
            delta = Math.max(delta, prevEnd - orig.timelineStart);
            delta = Math.min(delta, clipDur(orig) - MIN_CLIP);
            return { ...c, srcStart: orig.srcStart + delta, timelineStart: orig.timelineStart + delta };
          }

          // trimR
          const nextStart = Math.min(
            Infinity,
            ...others.filter((o) => o.timelineStart >= clipEnd(orig) - EPS).map((o) => o.timelineStart)
          );
          let newEnd = orig.srcEnd + dx;
          newEnd = Math.min(newEnd, fileDur);
          newEnd = Math.min(newEnd, orig.srcEnd + (nextStart - clipEnd(orig)));
          newEnd = Math.max(newEnd, orig.srcStart + MIN_CLIP);
          return { ...c, srcEnd: newEnd };
        })
      );
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      draggingRef.current = false;

      if (mode === "move") {
        // If the drop position overlaps another clip, snap back — this always
        // resolves to a visible, valid position, never a silent no-op.
        setClips((prev) => {
          const moved = prev.find((c) => c.id === orig.id);
          if (!moved) return prev;
          if (overlapsAny(prev, moved)) {
            return prev.map((c) => (c.id === orig.id ? { ...c, timelineStart: orig.timelineStart } : c));
          }
          return prev;
        });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const startScrub = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = innerRef.current;
    if (!el) return;
    const wasPlaying = isPlayingRef.current;
    if (wasPlaying) pausePlayback();

    const rect = el.getBoundingClientRect();
    if (e.clientY - rect.top > RULER_H) setSelectedId(null);

    const move = (clientX: number) => {
      const r = el.getBoundingClientRect();
      seek(clamp((clientX - r.left) / ppsRef.current, 0, MAX_TIMELINE_SECONDS));
    };
    move(e.clientX);

    const onMove = (ev: PointerEvent) => move(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (wasPlaying) void startPlayback(playheadRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  /** Grabbing the playhead handle itself scrubs, same as clicking the ruler — but doesn't touch clip selection. */
  const beginPlayheadDrag = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const el = innerRef.current;
    if (!el) return;
    const wasPlaying = isPlayingRef.current;
    if (wasPlaying) pausePlayback();

    const move = (clientX: number) => {
      const r = el.getBoundingClientRect();
      seek(clamp((clientX - r.left) / ppsRef.current, 0, MAX_TIMELINE_SECONDS));
    };

    const onMove = (ev: PointerEvent) => move(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (wasPlaying) void startPlayback(playheadRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  /* ====================================================================== */
  /* Export                                                                 */
  /* ====================================================================== */

  const handleMerge = async () => {
    if (clips.length === 0) return;
    pausePlayback();
    if (mergedAudioRef.current) mergedAudioRef.current.pause();

    if (total > MAX_TIMELINE_SECONDS) {
      setError("The sequence can be at most 2 hours long.");
      return;
    }

    setIsProcessing(true);
    setError("");
    clearResult();

    try {
      const sorted = [...clips].sort((a, b) => a.timelineStart - b.timelineStart);
      const usedIds = Array.from(new Set(sorted.map((c) => c.fileId)));
      const indexOf = new Map(usedIds.map((id, i) => [id, i]));

      const formData = new FormData();
      for (const id of usedIds) {
        const f = files.find((x) => x.id === id);
        if (f) formData.append("files", f.file);
      }

      let prevEnd = 0;
      const sequence = sorted.map((c) => {
        const offset = c.timelineStart - prevEnd;
        prevEnd = c.timelineStart + clipDur(c);
        return {
          fileIndex: indexOf.get(c.fileId)!,
          start: c.srcStart,
          end: c.srcEnd,
          offset,
          volume: clamp(c.volume, 0, MAX_CLIP_VOLUME),
        };
      });

      formData.append("sequence", JSON.stringify(sequence));
      formData.append("format", format);
      formData.append("bitrate", bitrate);
      formData.append("compression", compression);

      const response = await fetch("/api/audio/audio-mixture", { method: "POST", body: formData });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Mixing failed. Please try again.");
      }

      const blob = await response.blob();
      setDownloadBlob(blob);
      setDownloadFileName(`audio-mixture.${format}`);
      setDownloadFormat(format);
      setMergedBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that sequence. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (mergedUrl) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mergedUrl]);

  const handleDownload = () => {
    if (!downloadBlob) return;
    const extension = `.${downloadFormat}`;
    const trimmed = downloadFileName.trim() || `audio-mixture${extension}`;
    const finalName = trimmed.toLowerCase().endsWith(extension) ? trimmed : `${trimmed}${extension}`;

    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ====================================================================== */
  /* Derived render values                                                  */
  /* ====================================================================== */

  const selected = clips.find((c) => c.id === selectedId) ?? null;
  const clipNumber = useMemo(() => {
    const sorted = [...clips].sort((a, b) => a.timelineStart - b.timelineStart);
    return new Map(sorted.map((c, i) => [c.id, i + 1]));
  }, [clips]);

  // The scroll container has horizontal padding, so the usable width is a bit smaller than clientWidth.
  const usableW = Math.max(0, viewW - SCROLL_PAD_X * 2);
  const secondsVisible = Math.max(total + 6, usableW / pps);
  const timelineW = secondsVisible * pps;
  const tickStep = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600].find((s) => s * pps >= 80) ?? 600;
  const ticks: number[] = [];
  for (let t = 0; t <= secondsVisible && ticks.length < 500; t += tickStep) ticks.push(t);

  /**
   * Where the copy / delete buttons sit (x, in timeline pixels).
   *  1. They prefer to hug the right edge of the selected clip.
   *  2. They are then pinned inside the part of the timeline you can currently SEE,
   *     so a long clip that runs off-screen, or scrolling sideways, never hides them.
   *  3. Finally they're kept inside the timeline itself.
   */
  const visibleLeft = Math.max(0, scrollLeft - SCROLL_PAD_X);
  const visibleRight = Math.min(timelineW, scrollLeft - SCROLL_PAD_X + viewW);
  let actionsLeft = 0;
  if (selected) {
    const startPx = selected.timelineStart * pps;
    const endPx = clipEnd(selected) * pps;
    let left = Math.max(startPx, endPx - ACTIONS_W);
    left = Math.min(left, visibleRight - ACTIONS_W - ACTIONS_EDGE);
    left = Math.max(left, visibleLeft + ACTIONS_EDGE);
    actionsLeft = clamp(left, 0, Math.max(0, timelineW - ACTIONS_W));
  }

  const fitToView = () => {
    const w = (scrollRef.current?.clientWidth ?? viewW) - SCROLL_PAD_X * 2;
    setPps(clamp((w - 12) / Math.max(total, 5), MIN_PPS, MAX_PPS));
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    setScrollLeft(0);
  };

  const hasFiles = files.length > 0;

  /* ====================================================================== */
  /* Render                                                                 */
  /* ====================================================================== */

  return (
    <div className="min-h-screen bg-white dark:bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/30 shadow-sm">
            <Combine className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Audio Mixture</h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Add your audio files to a sequence, trim and split them, then export the finished track.
          </p>
        </div>

        <div className="bg-white dark:bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">
          {/* ---------------- empty state ---------------- */}
          {!hasFiles && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void addFiles(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-orange-500 transition-all bg-white dark:bg-background/40 cursor-pointer flex flex-col items-center justify-center space-y-3 select-none min-h-[240px]"
            >
              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/30 shadow-sm pointer-events-none">
                {loadingCount > 0 ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
              </div>
              <div className="space-y-1 pointer-events-none">
                <span className="text-base font-semibold block">
                  {loadingCount > 0 ? "Reading your audio…" : "Add your audio files"}
                </span>
                <span className="text-sm text-muted-foreground block">
                  Click or drop up to {MAX_FILES} files. They&apos;ll line up in a sequence, ready to edit.
                </span>
              </div>
            </div>
          )}

          {/* ---------------- timeline editor ---------------- */}
          {hasFiles && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Toolbar — kept to the essentials: Play, Split, Delete clip */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={clips.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                  {isPlaying ? "Pause" : "Play"}
                </button>

                <button
                  type="button"
                  onClick={splitClip}
                  disabled={!splitTarget}
                  title="Cut the clip under the playhead in two (S)"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2 text-sm font-semibold transition-colors hover:border-orange-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Scissors className="h-4 w-4" />
                  Split
                  <kbd className="rounded border border-border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">S</kbd>
                </button>

                <button
                  type="button"
                  onClick={deleteClip}
                  disabled={!selected}
                  title="Delete the selected clip (Delete)"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3.5 py-2 text-sm font-semibold transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete clip
                </button>

                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {formatTime(playhead, 1)} / {formatTime(total, 1)}
                  </span>
                </div>
              </div>

              {/* Selected clip info + volume */}
              <div className="flex min-h-[44px] flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-xs">
                {selected ? (
                  <>
                    <span className="text-muted-foreground">
                      Selected: clip {clipNumber.get(selected.id)} · {formatTime(selected.timelineStart, 1)}–
                      {formatTime(clipEnd(selected), 1)} of{" "}
                      <span className="font-semibold text-foreground">
                        {files.find((f) => f.id === selected.fileId)?.name}
                      </span>
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 text-orange-500" />
                      <span className="font-semibold">Clip volume</span>
                      <input
                        type="range"
                        min="0"
                        max={MAX_CLIP_VOLUME}
                        step="0.05"
                        value={selected.volume}
                        onChange={(e) => setClipVolume(selected.id, parseFloat(e.target.value))}
                        className="w-32 cursor-pointer accent-orange-500"
                      />
                      <span className="w-10 text-right font-semibold text-muted-foreground">
                        {Math.round(selected.volume * 100)}%
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Click a clip to select it, then trim, split, move or change its volume.
                  </span>
                )}
              </div>

              {/* Summary + zoom */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {clips.length} clip{clips.length === 1 ? "" : "s"} ·{" "}
                  <span className="font-bold text-foreground">{formatTime(total, 1)}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fitToView}
                    className="rounded-lg border border-border bg-secondary px-2 py-1 font-medium text-muted-foreground transition-colors hover:text-orange-500"
                  >
                    Fit
                  </button>
                  <ZoomOut className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="range"
                    min={MIN_PPS}
                    max={MAX_PPS}
                    step="1"
                    value={pps}
                    onChange={(e) => setPps(parseFloat(e.target.value))}
                    aria-label="Zoom"
                    className="w-32 cursor-pointer accent-orange-500"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/*
                Timeline — a single track.
                The scroll container has horizontal padding (px-3) so things sitting at
                time 0 (the playhead knob, the first clip) are never cut off by its left edge.
                onScroll keeps `scrollLeft` in state so the clip action buttons can stay
                pinned inside the visible area.
              */}
              <div
                ref={scrollRef}
                onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
                className="overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-muted/20 px-3"
              >
                <div
                  ref={innerRef}
                  className="relative select-none"
                  style={{ width: timelineW, height: TRACK_TOP + TRACK_H + 8 }}
                  onPointerDown={startScrub}
                >
                  {/* Ruler */}
                  <div
                    className="absolute inset-x-0 top-0 cursor-pointer border-b border-border bg-background/60"
                    style={{ height: RULER_H, touchAction: "none" }}
                  >
                    {ticks.map((t) => (
                      <div
                        key={t}
                        className="absolute top-0 bottom-0 border-l border-border pl-1 pt-1 text-[10px] font-mono text-muted-foreground"
                        style={{ left: t * pps }}
                      >
                        {formatTime(t, tickStep < 1 ? 1 : 0)}
                      </div>
                    ))}
                  </div>

                  {/* Action band — reserved space above the track, only used by the clip buttons */}
                  <div
                    className="absolute inset-x-0"
                    style={{ top: RULER_H, height: ACTIONS_H, background: "rgba(128,128,128,0.04)" }}
                  />

                  {/* Track */}
                  <div
                    className="absolute inset-x-0"
                    style={{ top: TRACK_TOP, height: TRACK_H, background: "rgba(128,128,128,0.06)" }}
                  />

                  {/* Clips */}
                  {clips.map((c) => {
                    const file = files.find((f) => f.id === c.fileId);
                    if (!file) return null;
                    const color = colorFor(file.colorIndex);
                    const dur = clipDur(c);
                    const isSel = c.id === selectedId;
                    return (
                      <div
                        key={c.id}
                        onPointerDown={(e) => beginDrag(e, c, "move")}
                        className={`absolute cursor-grab overflow-hidden rounded-lg active:cursor-grabbing ${
                          isSel ? "z-20 ring-2 ring-orange-500" : "z-10"
                        }`}
                        style={{
                          left: c.timelineStart * pps,
                          width: Math.max(6, dur * pps),
                          top: TRACK_TOP + 4,
                          height: TRACK_H - 8,
                          background: color.fill,
                          border: `1px solid ${color.border}`,
                          touchAction: "none",
                        }}
                      >
                        <Waveform peaks={file.peaks} start={c.srcStart} end={c.srcEnd} volume={c.volume} color={color.border} />
                        <div className="pointer-events-none relative px-4 pt-1 leading-tight">
                          <div className="truncate text-[11px] font-semibold">{file.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {formatTime(dur, 1)}
                            {c.volume !== 1 ? ` · ${Math.round(c.volume * 100)}%` : ""}
                          </div>
                        </div>
                        {/* Trim handles */}
                        <div
                          onPointerDown={(e) => beginDrag(e, c, "trimL")}
                          className="absolute inset-y-0 left-0 flex w-3 cursor-ew-resize items-center justify-center"
                          style={{ background: color.border, touchAction: "none" }}
                        >
                          <span className="h-4 w-0.5 rounded bg-white/90" />
                        </div>
                        <div
                          onPointerDown={(e) => beginDrag(e, c, "trimR")}
                          className="absolute inset-y-0 right-0 flex w-3 cursor-ew-resize items-center justify-center"
                          style={{ background: color.border, touchAction: "none" }}
                        >
                          <span className="h-4 w-0.5 rounded bg-white/90" />
                        </div>
                      </div>
                    );
                  })}

                  {/*
                    Clip actions (duplicate / delete).
                    Rendered in their own reserved band between the ruler and the track,
                    so they can never be covered by a clip or cut off by the container.
                    Their x position is clamped to the visible part of the timeline (see
                    `actionsLeft`), so scrolling never hides them.
                    pointerdown is stopped so clicking a button doesn't scrub the timeline
                    (which would deselect the clip and make the buttons vanish mid-click).
                  */}
                  {selected && (
                    <div
                      role="toolbar"
                      aria-label="Clip actions"
                      className="absolute z-40 flex items-center"
                      style={{
                        left: actionsLeft,
                        top: RULER_H + (ACTIONS_H - ACTION_BTN) / 2,
                        width: ACTIONS_W,
                        height: ACTION_BTN,
                        gap: ACTION_GAP,
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={duplicateClip}
                        title="Duplicate clip (D)"
                        aria-label="Duplicate clip"
                        className="flex shrink-0 items-center justify-center rounded-lg border border-white/30 bg-slate-800 text-white shadow-md transition-colors hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-slate-700"
                        style={{ width: ACTION_BTN, height: ACTION_BTN }}
                      >
                        <Copy className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={deleteClip}
                        title="Delete clip (Delete)"
                        aria-label="Delete clip"
                        className="flex shrink-0 items-center justify-center rounded-lg border border-red-300/40 bg-red-500 text-white shadow-md transition-colors hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        style={{ width: ACTION_BTN, height: ACTION_BTN }}
                      >
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  )}

                  {/* Playhead — the knob is a real drag handle, not just decoration */}
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-orange-500"
                    style={{ left: playhead * pps }}
                  >
                    <div
                      onPointerDown={beginPlayheadDrag}
                      className="pointer-events-auto absolute -left-2.5 top-1 flex h-5 w-5 cursor-ew-resize items-center justify-center touch-none"
                      title="Drag to move the playhead"
                    >
                      <div className="h-3 w-3 rounded-full bg-orange-500 shadow ring-2 ring-white dark:ring-background" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Drag a clip&apos;s edges to trim it, drag the clip to move it, press the track or drag the orange
                  handle to move the playhead. Split cuts the clip under the playhead in two. With a clip selected, use
                  the copy button (or D) to duplicate it and the bin button to delete it.
                </span>
              </p>
            </div>
          )}

          {/* ---------------- range picker: choose part of a file before adding it ---------------- */}
          {pickerFile && (
            <div className="space-y-4 rounded-2xl border border-orange-500/40 bg-orange-500/5 p-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold">Adjust the clip</div>
                  <div className="truncate text-xs text-muted-foreground">
                    Already on your timeline · {pickerFile.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePicker}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-destructive"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>00:00</span>
                <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-semibold text-orange-600 dark:text-orange-400">
                  {formatTime(pickerRange.start, 1)} – {formatTime(pickerRange.end, 1)}
                </span>
                <span>{formatTime(pickerFile.duration, 1)}</span>
              </div>

              <div
                ref={pickerBoxRef}
                onPointerDown={beginPickerCreateSelection}
                className="relative h-24 cursor-crosshair select-none overflow-hidden rounded-xl border border-border bg-white dark:bg-background/60"
                style={{ touchAction: "none" }}
              >
                <Waveform
                  peaks={pickerFile.peaks}
                  start={0}
                  end={pickerFile.duration}
                  volume={1}
                  color="rgba(120,120,120,0.9)"
                />
                {/* Dim everything outside the selected range */}
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-background/80"
                  style={{ width: Math.max(0, pickerRange.start * (pickerBoxW / pickerFile.duration)) }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 bg-background/80"
                  style={{
                    left: Math.min(pickerBoxW, pickerRange.end * (pickerBoxW / pickerFile.duration)),
                  }}
                />
                {/* Selected region — drag to slide it */}
                <div
                  onPointerDown={beginPickerRegionDrag}
                  className="absolute inset-y-0 cursor-grab rounded-md border-2 border-orange-500 bg-orange-500/10 active:cursor-grabbing"
                  style={{
                    left: pickerRange.start * (pickerBoxW / pickerFile.duration),
                    width: Math.max(4, (pickerRange.end - pickerRange.start) * (pickerBoxW / pickerFile.duration)),
                  }}
                />
                {/* Trim handles */}
                <div
                  onPointerDown={(e) => beginPickerEdgeDrag(e, "start")}
                  className="absolute inset-y-0 flex w-3 cursor-ew-resize items-center justify-center rounded-l-md bg-orange-500"
                  style={{ left: pickerRange.start * (pickerBoxW / pickerFile.duration) - 6 }}
                >
                  <span className="h-4 w-0.5 rounded bg-white/90" />
                </div>
                <div
                  onPointerDown={(e) => beginPickerEdgeDrag(e, "end")}
                  className="absolute inset-y-0 flex w-3 cursor-ew-resize items-center justify-center rounded-r-md bg-orange-500"
                  style={{ left: pickerRange.end * (pickerBoxW / pickerFile.duration) - 6 }}
                >
                  <span className="h-4 w-0.5 rounded bg-white/90" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  Start
                  <input
                    type="number"
                    min={0}
                    max={Math.max(0, pickerRange.end - MIN_CLIP)}
                    step={0.05}
                    value={pickerRange.start.toFixed(2)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isFinite(v)) return;
                      setPickerRange((prev) => ({ ...prev, start: clamp(v, 0, prev.end - MIN_CLIP) }));
                    }}
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1 font-mono text-foreground outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  End
                  <input
                    type="number"
                    min={pickerRange.start + MIN_CLIP}
                    max={pickerFile.duration}
                    step={0.05}
                    value={pickerRange.end.toFixed(2)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isFinite(v)) return;
                      setPickerRange((prev) => ({ ...prev, end: clamp(v, prev.start + MIN_CLIP, pickerFile.duration) }));
                    }}
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1 font-mono text-foreground outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </label>
                <span className="ml-auto font-semibold text-foreground">
                  {formatTime(pickerRange.end - pickerRange.start, 2)} selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerRange({ start: 0, end: pickerFile.duration })}
                  className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-orange-500 hover:text-orange-500"
                >
                  Select whole clip
                </button>
                <button
                  type="button"
                  onClick={closePicker}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </button>
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  This clip is already on your timeline — drag across the waveform to draw a new selection, drag the
                  handles to trim it, drag the middle to slide it, or type exact times above. Changes apply instantly.
                </span>
              </p>
            </div>
          )}

          {/* ---------------- your audio ---------------- */}
          {hasFiles && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">
                  Your audio <span className="font-normal text-muted-foreground">({files.length}/{MAX_FILES})</span>
                </h2>
                <button
                  type="button"
                  onClick={startOver}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-orange-500"
                >
                  Start over
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {files.map((f) => {
                  const uses = clips.filter((c) => c.fileId === f.id).length;
                  return (
                    <div
                      key={f.id}
                      className="flex items-start gap-3 rounded-xl border border-border bg-white p-3 dark:bg-background/60"
                      style={{ borderLeft: `4px solid ${colorFor(f.colorIndex).border}` }}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="truncate text-sm font-bold">{f.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(f.duration, 1)} · in sequence ×{uses}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addClip(f)}
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-500/20 dark:text-orange-400"
                          >
                            <Plus className="h-3 w-3" />
                            Add to sequence
                          </button>
                          <button
                            type="button"
                            onClick={() => openPicker(f)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-orange-500 hover:text-orange-500"
                          >
                            <Scissors className="h-3 w-3" />
                            Trim &amp; add
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        title="Remove this file and its clips"
                        className="rounded-lg p-1 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {files.length < MAX_FILES && (
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void addFiles(e.dataTransfer.files);
                    }}
                    className="flex min-h-[92px] cursor-pointer select-none items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground transition-all hover:border-orange-500 hover:text-orange-500"
                  >
                    {loadingCount > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {loadingCount > 0 ? "Reading audio…" : "Add more audio"}
                  </div>
                )}
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {/* ---------------- export ---------------- */}
          {hasFiles && clips.length > 0 && (
            <div className="space-y-6 border-t border-border pt-8">
              <div className="space-y-1">
                <h2 className="text-base font-bold">Export</h2>
                <p className="text-xs text-muted-foreground">
                  The preview above plays your edits instantly. Exporting renders the final file, and you can listen to it
                  before you download.
                </p>
              </div>

              <OutputControls
                formatOptions={FORMAT_OPTIONS}
                format={format}
                onFormatChange={(value) => setFormat(value as OutputFormat)}
                qualityOptions={QUALITY_OPTIONS}
                quality={bitrate}
                onQualityChange={(value) => setBitrate(value as Bitrate)}
                disabled={isProcessing}
              />

              {/* Compression */}
              <div className="space-y-3 rounded-2xl border border-border bg-white p-5 dark:bg-background/60">
                <div className="text-sm font-bold">File size</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {COMPRESSION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setCompression(opt.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                        compression === opt.value
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-border bg-white hover:border-orange-500 dark:bg-card"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className={`block text-[11px] ${compression === opt.value ? "text-white/80" : "text-muted-foreground"}`}>
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Low keeps full quality. Higher levels make smaller files by lowering the sample rate and mixing down to mono.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleMerge()}
                disabled={isProcessing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rendering…
                  </>
                ) : (
                  <>
                    <Combine className="h-4 w-4" />
                    Export
                  </>
                )}
              </button>

              {/* Result: listen, rename, download */}
              {downloadBlob && mergedUrl && (
                <div
                  ref={resultRef}
                  className="space-y-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5 animate-in fade-in duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Your file is ready. Listen before you download.</p>
                      <p className="text-xs text-muted-foreground">
                        This is exactly how the {downloadFormat.toUpperCase()} file will sound. Changing anything above
                        clears it, so you can tweak and export again.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-orange-500/40 bg-white px-4 py-3 dark:bg-background/60">
                    <audio
                      ref={mergedAudioRef}
                      src={mergedUrl}
                      preload="metadata"
                      onTimeUpdate={() => setMergedCurrentTime(mergedAudioRef.current?.currentTime ?? 0)}
                      onLoadedMetadata={() => {
                        const d = mergedAudioRef.current?.duration ?? 0;
                        setMergedDuration(Number.isFinite(d) ? d : total);
                      }}
                      onEnded={() => setMergedIsPlaying(false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={toggleMergedPlay}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-transform hover:scale-105 hover:bg-orange-600"
                    >
                      {mergedIsPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Ear className="h-3.5 w-3.5 text-orange-500" />
                        <span>Final preview</span>
                        <span className="ml-auto font-mono font-normal text-muted-foreground">
                          {formatTime(mergedCurrentTime)} / {formatTime(mergedDuration || total)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={mergedDuration || total || 1}
                        step="0.05"
                        value={Math.min(mergedCurrentTime, mergedDuration || total || 1)}
                        onChange={(e) => {
                          const t = parseFloat(e.target.value);
                          if (mergedAudioRef.current) mergedAudioRef.current.currentTime = t;
                          setMergedCurrentTime(t);
                        }}
                        aria-label="Seek final preview"
                        className="w-full cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="download-filename" className="mb-2 block text-xs font-medium text-muted-foreground">
                      File name
                    </label>
                    <input
                      id="download-filename"
                      type="text"
                      value={downloadFileName}
                      onChange={(e) => setDownloadFileName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 sm:w-auto"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>

                    <SaveToLibrary
                      getBlob={() => downloadBlob}
                      fileName={downloadFileName.trim() || `audio-mixture.${downloadFormat}`}
                      meta={`Audio Mixture · ${downloadFormat.toUpperCase()}`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && !(hasFiles && clips.length > 0) && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!hasFiles && (
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Music2 className="h-3.5 w-3.5" />
              MP3, WAV, M4A, FLAC, OGG and more
            </p>
          )}
        </div>
      </div>
    </div>
  );
}