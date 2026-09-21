"use client";

import React, {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileAudio,
  Info,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Scissors,
  Square,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 12;
const MAX_SEGMENTS = 40;

// Timeline visual constants.
const BASE_PX_PER_SEC = 60;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;
const LANE_HEIGHT = 72;
const RULER_HEIGHT = 28;
const MIN_CLIP_SECONDS = 0.2;

// Colors cycled across source files so clips from different files are
// visually distinct on the timeline (matches the reference UI, which
// color-codes clips by their source).
const CLIP_PALETTE = [
  "#38bdf8", // sky
  "#34d399", // emerald
  "#f97316", // orange
  "#a78bfa", // violet
  "#f472b6", // pink
  "#facc15", // yellow
  "#fb7185", // rose
  "#2dd4bf", // teal
];

function colorForFileId(fileId: string, files: AudioFile[]): string {
  const idx = files.findIndex((f) => f.id === fileId);
  if (idx === -1) return CLIP_PALETTE[0]!;
  return CLIP_PALETTE[idx % CLIP_PALETTE.length]!;
}

type Option = { label: string; value: string };

/** Must stay in sync with BITRATES on the backend. */
const QUALITY_OPTIONS: Option[] = [
  { label: "Highest Quality (320 kbps)", value: "320" },
  { label: "Very High Quality (256 kbps)", value: "256" },
  { label: "High Quality (192 kbps)", value: "192" },
  { label: "Good Quality (160 kbps)", value: "160" },
  { label: "Standard (128 kbps)", value: "128" },
  { label: "Compressed (96 kbps)", value: "96" },
];
const DEFAULT_QUALITY = "128";

/** The backend still accepts a compression level; we always send its default. */
const DEFAULT_COMPRESSION = "low";

type FormatOption = { label: string; value: string; ext: string; lossy: boolean };

/** Must stay in sync with FORMATS on the backend. */
const FORMAT_OPTIONS: FormatOption[] = [
  { label: "MP3 (.mp3)", value: "mp3", ext: "mp3", lossy: true },
  { label: "M4A / AAC (.m4a)", value: "m4a", ext: "m4a", lossy: true },
  { label: "AAC (.aac)", value: "aac", ext: "aac", lossy: true },
  { label: "OGG Vorbis (.ogg)", value: "ogg", ext: "ogg", lossy: true },
  { label: "WAV (.wav)", value: "wav", ext: "wav", lossy: false },
  { label: "FLAC (.flac)", value: "flac", ext: "flac", lossy: false },
];
const DEFAULT_FORMAT_OPTION: FormatOption = FORMAT_OPTIONS[0]!;

function getFormatOption(value: string): FormatOption {
  return FORMAT_OPTIONS.find((f) => f.value === value) ?? DEFAULT_FORMAT_OPTION;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type AudioFile = {
  id: string;
  file: File;
  url: string;
  duration: number;
};

type Selection = { start: number; end: number };

/*
 * `position` is the clip's absolute start time (in seconds) on the shared
 * mix timeline. Clips are placed by dragging them directly, so there is no
 * hidden "relative to the previous clip" math for the user to reason about
 * — what you see on the timeline is exactly where the clip plays.
 */
type SequenceItem = {
  id: string;
  fileId: string;
  start: number;
  end: number;
  position: number;
};

type TimelineEntry = SequenceItem & { timelineStart: number; timelineEnd: number };
type LanedEntry = TimelineEntry & { lane: number };

function computeTimeline(items: SequenceItem[]): TimelineEntry[] {
  return items.map((item) => ({
    ...item,
    timelineStart: item.position,
    timelineEnd: item.position + (item.end - item.start),
  }));
}

/*
 * Packs overlapping clips into separate visual rows ("lanes") so two clips
 * that blend together don't just draw on top of each other and become
 * unreadable. Purely visual — playback and export use the absolute times,
 * not the lane.
 */
function assignLanes(entries: TimelineEntry[]): LanedEntry[] {
  const sorted = [...entries].sort((a, b) => a.timelineStart - b.timelineStart);
  const laneEnds: number[] = [];
  return sorted.map((entry) => {
    let lane = laneEnds.findIndex((end) => end <= entry.timelineStart + 0.001);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.timelineEnd);
    } else {
      laneEnds[lane] = entry.timelineEnd;
    }
    return { ...entry, lane };
  });
}

/*
 * Inlined dropdown: owns its own open/close state and its own click-outside
 * listener (scoped to its own ref), so multiple dropdowns on the page never
 * interfere with each other.
 */
function Dropdown({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape so an open menu can never be left hanging over the page.
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSelect = (nextValue: string) => {
    setOpen(false);
    if (nextValue !== value) onChange(nextValue);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="mb-2 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors hover:border-orange-500/50 focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-500/10 ${
                  option.value === value
                    ? "font-semibold text-orange-500"
                    : "text-foreground"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const WAVEFORM_POINTS = 600;
const WAVEFORM_HEIGHT = 64;

/**
 * Downsamples one audio file into a fixed-length amplitude envelope so it
 * can be drawn as a waveform. Bounded to WAVEFORM_POINTS * 200 samples
 * inspected regardless of file length, so a long file can't freeze the tab.
 */
function computePeaks(buffer: AudioBuffer, numPoints: number): number[] {
  const length = buffer.length;
  const channelCount = buffer.numberOfChannels;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  const blockSize = Math.max(1, Math.floor(length / numPoints));
  const strideSamples = Math.max(1, Math.floor(blockSize / 200));

  const peaks = new Array(numPoints).fill(0);
  for (let i = 0; i < numPoints; i++) {
    const start = i * blockSize;
    const end = Math.min(length, start + blockSize);
    let peak = 0;
    for (let j = start; j < end; j += strideSamples) {
      for (let c = 0; c < channelCount; c++) {
        const abs = Math.abs(channelData[c]?.[j] ?? 0);
        if (abs > peak) peak = abs;
      }
    }
    peaks[i] = peak;
  }

  const maxPeak = peaks.reduce((m, p) => Math.max(m, p), 0.0001);
  return peaks.map((p) => Math.min(1, p / maxPeak));
}

/*
 * Per-source-file waveform with a draggable trim selection, Audacity-style:
 * drag anywhere to draw a new selection, drag near either edge to resize it.
 * The selected range is what "Add to Timeline" will use.
 */
function TrimSelector({
  audioFile,
  peaks,
  selection,
  onChange,
}: {
  audioFile: AudioFile;
  peaks: number[] | undefined;
  selection: Selection;
  onChange: (sel: Selection) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [draft, setDraft] = useState<Selection>(selection);
  const dragRef = useRef<{ mode: "new" | "start" | "end"; anchor: number } | null>(
    null
  );

  useEffect(() => setDraft(selection), [selection.start, selection.end]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const duration = audioFile.duration || 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = WAVEFORM_HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${WAVEFORM_HEIGHT}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, WAVEFORM_HEIGHT);

    const selStartX = (draft.start / duration) * width;
    const selEndX = (draft.end / duration) * width;

    const barW = 2;
    const gap = 1;
    const step = barW + gap;
    const count = Math.ceil(width / step);
    for (let i = 0; i < count; i++) {
      const x = i * step;
      let amp = 0.05;
      if (peaks && peaks.length) {
        const idx = Math.min(peaks.length - 1, Math.floor((i / count) * peaks.length));
        amp = Math.max(0.05, peaks[idx] ?? 0.05);
      }
      const inSelection = x >= selStartX && x <= selEndX;
      const h = amp * (WAVEFORM_HEIGHT - 8);
      ctx.fillStyle = inSelection ? "#f97316" : "rgba(148,163,184,0.35)";
      ctx.fillRect(x, WAVEFORM_HEIGHT / 2 - h / 2, barW, h);
    }

    ctx.fillStyle = "rgba(249,115,22,0.8)";
    ctx.fillRect(Math.max(0, selStartX - 1), 0, 2, WAVEFORM_HEIGHT);
    ctx.fillRect(Math.max(0, selEndX - 1), 0, 2, WAVEFORM_HEIGHT);
  }, [peaks, width, duration, draft]);

  const timeFromX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return fraction * duration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = timeFromX(e.clientX);
    const pxPerSecLocal = width / duration;
    const nearStart = Math.abs(t - draft.start) * pxPerSecLocal < 10;
    const nearEnd = Math.abs(t - draft.end) * pxPerSecLocal < 10;
    if (nearStart && !nearEnd) {
      dragRef.current = { mode: "start", anchor: draft.end };
    } else if (nearEnd) {
      dragRef.current = { mode: "end", anchor: draft.start };
    } else {
      dragRef.current = { mode: "new", anchor: t };
      setDraft({ start: t, end: t });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const t = timeFromX(e.clientX);
    if (drag.mode === "new") {
      setDraft({ start: Math.min(drag.anchor, t), end: Math.max(drag.anchor, t) });
    } else if (drag.mode === "start") {
      setDraft({ start: Math.min(t, drag.anchor - 0.1), end: drag.anchor });
    } else {
      setDraft({ start: drag.anchor, end: Math.max(t, drag.anchor + 0.1) });
    }
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    let { start, end } = draft;
    if (end - start < 0.15) {
      start = 0;
      end = duration;
    }
    const final = { start: Math.max(0, start), end: Math.min(duration, end) };
    setDraft(final);
    onChange(final);
  };

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full cursor-text rounded-lg bg-background/60"
        style={{ height: WAVEFORM_HEIGHT, touchAction: "none" }}
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatTime(draft.start)}</span>
        <span className="font-semibold text-orange-500">
          {formatTime(draft.end - draft.start)} selected
        </span>
        <span>{formatTime(draft.end)}</span>
      </div>
    </div>
  );
}

/*
 * One draggable, resizable block on the Mix Timeline. Drag the body to move
 * the clip; drag either edge to trim it. All math is done in seconds and
 * converted to/from pixels via pxPerSec, so it stays correct at any zoom.
 * Clicking the clip (without dragging) selects it, which is what drives the
 * Play / Split / Delete toolbar above the timeline.
 */
function TimelineClip({
  entry,
  lane,
  label,
  peaks,
  sourceDuration,
  pxPerSec,
  color,
  selected,
  onSelect,
  onMove,
  onResizeStart,
  onResizeEnd,
  onRemove,
  onDuplicate,
  onDragEnd,
}: {
  entry: TimelineEntry;
  lane: number;
  label: string;
  peaks: number[] | undefined;
  sourceDuration: number;
  pxPerSec: number;
  color: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, position: number) => void;
  onResizeStart: (id: string, start: number, position: number) => void;
  onResizeEnd: (id: string, end: number) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragEnd: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    mode: "move" | "resize-start" | "resize-end";
    startX: number;
    origPosition: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const clipDuration = entry.end - entry.start;
  const width = Math.max(28, clipDuration * pxPerSec);
  const left = entry.timelineStart * pxPerSec;
  const top = lane * LANE_HEIGHT;
  const bodyHeight = LANE_HEIGHT - 10;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = bodyHeight * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${bodyHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, bodyHeight);

    if (!peaks || sourceDuration <= 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(0, bodyHeight / 2);
      ctx.lineTo(width, bodyHeight / 2);
      ctx.stroke();
      return;
    }

    const startIdx = Math.max(
      0,
      Math.floor((entry.start / sourceDuration) * peaks.length)
    );
    const endIdx = Math.min(
      peaks.length,
      Math.ceil((entry.end / sourceDuration) * peaks.length)
    );
    const slice = peaks.slice(startIdx, Math.max(startIdx + 1, endIdx));

    const barW = 2;
    const gap = 1;
    const step = barW + gap;
    const count = Math.max(1, Math.floor(width / step));
    for (let i = 0; i < count; i++) {
      const sliceIdx = Math.floor((i / count) * slice.length);
      const amp = Math.max(0.08, slice[sliceIdx] ?? 0.08);
      const barH = amp * (bodyHeight - 6);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(i * step, bodyHeight / 2 - barH / 2, barW, barH);
    }
  }, [peaks, sourceDuration, entry.start, entry.end, width, bodyHeight]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaSec = (e.clientX - drag.startX) / pxPerSec;
    if (drag.mode === "move") {
      onMove(entry.id, Math.max(0, drag.origPosition + deltaSec));
    } else if (drag.mode === "resize-start") {
      const newStart = Math.min(
        Math.max(0, drag.origStart + deltaSec),
        drag.origEnd - MIN_CLIP_SECONDS
      );
      const actualDelta = newStart - drag.origStart;
      onResizeStart(entry.id, newStart, Math.max(0, drag.origPosition + actualDelta));
    } else {
      const cap = sourceDuration > 0 ? sourceDuration : drag.origEnd + 999;
      const newEnd = Math.max(
        drag.origStart + MIN_CLIP_SECONDS,
        Math.min(cap, drag.origEnd + deltaSec)
      );
      onResizeEnd(entry.id, newEnd);
    }
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onDragEnd();
  };

  const startDrag = (mode: "move" | "resize-start" | "resize-end") => (
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      origPosition: entry.position,
      origStart: entry.start,
      origEnd: entry.end,
    };
  };

  return (
    <div
      className={`group absolute select-none overflow-hidden rounded-lg border shadow-sm ${
        selected ? "ring-2 ring-white ring-offset-1 ring-offset-background" : ""
      }`}
      style={{
        left,
        top,
        width,
        height: bodyHeight,
        backgroundColor: color,
        borderColor: selected ? "#ffffff" : "rgba(255,255,255,0.45)",
      }}
      onClick={() => onSelect(entry.id)}
    >
      <div
        onPointerDown={startDrag("resize-start")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute left-0 top-0 z-10 h-full w-2.5 cursor-ew-resize bg-white/20 hover:bg-white/40"
        style={{ touchAction: "none" }}
      />
      <div
        onPointerDown={startDrag("move")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 truncate bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white">
          {label}
        </div>
        <canvas ref={canvasRef} className="pointer-events-none absolute bottom-0" />
      </div>
      <div
        onPointerDown={startDrag("resize-end")}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute right-0 top-0 z-10 h-full w-2.5 cursor-ew-resize bg-white/20 hover:bg-white/40"
        style={{ touchAction: "none" }}
      />

      <div className="absolute -top-2 right-1 z-20 hidden gap-1 group-hover:flex">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(entry.id);
          }}
          title="Repeat this clip"
          className="flex h-5 w-5 items-center justify-center rounded bg-background text-foreground shadow"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(entry.id);
          }}
          title="Remove"
          className="flex h-5 w-5 items-center justify-center rounded bg-background text-destructive shadow"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function AudioMixturePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const renderButtonRef = useRef<HTMLButtonElement | null>(null);

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [selections, setSelections] = useState<Record<string, Selection>>({});

  const [playingId, setPlayingId] = useState<string | null>(null);

  const [format, setFormat] = useState("mp3");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockedBy, setBlockedBy] = useState("");

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // Which clip on the Mix Timeline is currently selected. Drives the
  // Play / Split / Delete toolbar and the "Selected: clip N" readout.
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Timeline zoom (multiplier on BASE_PX_PER_SEC).
  const [zoom, setZoom] = useState(1);

  // Live, in-browser preview of the mix timeline — plays instantly via the
  // Web Audio API, no server round trip and no render required first.
  type PreviewState = "idle" | "loading" | "playing" | "paused";
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewElapsed, setPreviewElapsed] = useState(0);
  const [previewError, setPreviewError] = useState("");
  // Bumped whenever a file's waveform finishes decoding, to force waveform
  // canvases to redraw (the cache itself is a ref, so writing to it doesn't
  // trigger React on its own).
  const [waveformTick, setWaveformTick] = useState(0);

  // Mirrors of state that async work needs to read without going stale.
  const audioFilesRef = useRef<AudioFile[]>([]);
  const sequenceRef = useRef<SequenceItem[]>([]);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  // Live preview internals.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const peaksCacheRef = useRef<Map<string, number[]>>(new Map());
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const previewStartCtxTimeRef = useRef(0);
  const previewRafRef = useRef<number | null>(null);
  // Bumped whenever the timeline changes mid-decode, so a stale decode can't
  // schedule audio for a mix that no longer exists.
  const previewGenerationRef = useRef(0);

  useEffect(() => {
    audioFilesRef.current = audioFiles;
  }, [audioFiles]);

  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);

  useEffect(() => {
    resultUrlRef.current = resultUrl;
  }, [resultUrl]);

  // Single unmount cleanup that reads the latest values via refs, so object
  // URLs are actually revoked instead of leaking.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioFilesRef.current.forEach((f) => URL.revokeObjectURL(f.url));
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

      if (previewRafRef.current !== null) {
        cancelAnimationFrame(previewRafRef.current);
      }
      activeSourcesRef.current.forEach((node) => {
        try {
          node.onended = null;
          node.stop();
        } catch {
          // Already stopped — nothing to do.
        }
      });
      void audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => setPlayingId(null);
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, []);

  /*
   * Diagnostic: if the Render button is present but something is sitting on
   * top of it, or an ancestor <fieldset disabled> / [inert] has switched it
   * off, clicks silently go nowhere. Rather than let that look like a dead
   * button, surface it in the UI with the element that is responsible.
   */
  useEffect(() => {
    const button = renderButtonRef.current;
    if (!button) {
      setBlockedBy("");
      return;
    }

    const check = () => {
      const reasons: string[] = [];

      const gate = button.closest("fieldset[disabled], [inert]");
      if (gate) {
        reasons.push(
          `an ancestor <${gate.tagName.toLowerCase()}> is disabled or inert`
        );
      }

      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const onScreen =
        rect.width > 0 &&
        rect.height > 0 &&
        y > 0 &&
        y < window.innerHeight &&
        x > 0 &&
        x < window.innerWidth;

      if (onScreen) {
        const topmost = document.elementFromPoint(x, y);
        if (topmost && topmost !== button && !button.contains(topmost)) {
          const cls =
            typeof topmost.className === "string" && topmost.className.trim()
              ? `.${topmost.className.trim().split(/\s+/).slice(0, 3).join(".")}`
              : "";
          reasons.push(
            `<${topmost.tagName.toLowerCase()}>${cls} is covering it`
          );
        }
      }

      setBlockedBy(reasons.join(" and "));
    };

    const timer = window.setTimeout(check, 250);
    window.addEventListener("resize", check);
    window.addEventListener("scroll", check, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", check);
      window.removeEventListener("scroll", check, true);
    };
  }, [sequence.length, loading, resultBlob]);

  const ensureAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new Ctor();
    }
    return audioCtxRef.current;
  };

  const decodeBuffer = async (af: AudioFile): Promise<AudioBuffer> => {
    const cached = bufferCacheRef.current.get(af.id);
    if (cached) return cached;
    const ctx = ensureAudioContext();
    const arrayBuffer = await af.file.arrayBuffer();
    // decodeAudioData can detach the buffer it's given, so hand it a copy.
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    bufferCacheRef.current.set(af.id, buffer);
    return buffer;
  };

  // Decodes a file and builds its waveform envelope in the background, as
  // soon as it's added — so waveforms are already there the first time the
  // person looks at the page, no Play click required.
  const decodeAndCachePeaks = useCallback(async (af: AudioFile) => {
    if (peaksCacheRef.current.has(af.id)) return;
    try {
      const buffer = await decodeBuffer(af);
      const peaks = computePeaks(buffer, WAVEFORM_POINTS);
      peaksCacheRef.current.set(af.id, peaks);
      setWaveformTick((t) => t + 1);
    } catch {
      // No waveform for this file — the timeline still works, it just won't
      // show its shape. Not worth surfacing as an error.
    }
  }, []);

  // Full stop: silences every scheduled node and resets the playhead to 0.
  const stopPreview = useCallback(() => {
    previewGenerationRef.current += 1;
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    activeSourcesRef.current.forEach((node) => {
      try {
        node.onended = null;
        node.stop();
      } catch {
        // Already stopped — nothing to do.
      }
      try {
        node.disconnect();
      } catch {
        // Already disconnected — nothing to do.
      }
    });
    activeSourcesRef.current = [];
    setPreviewState("idle");
    setPreviewElapsed(0);
  }, []);

  const previewTick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const elapsed = ctx.currentTime - previewStartCtxTimeRef.current;
    const total = computeTimeline(sequenceRef.current).reduce(
      (max, t) => Math.max(max, t.timelineEnd),
      0
    );
    if (elapsed >= total) {
      setPreviewElapsed(total);
      stopPreview();
      return;
    }
    setPreviewElapsed(Math.max(0, elapsed));
    previewRafRef.current = requestAnimationFrame(previewTick);
  }, [stopPreview]);

  /*
   * Builds the mix graph and starts playback from any point on the
   * timeline — 0 for a fresh Play, or wherever the person clicked. Clips
   * that finish before the seek point are skipped entirely; a clip that the
   * seek point lands inside starts partway through instead of at its own
   * beginning.
   */
  const playFrom = useCallback(
    async (seekSeconds: number) => {
      const items = sequenceRef.current;
      const files = audioFilesRef.current;
      if (items.length === 0) {
        setPreviewError("Add at least one clip to the mix timeline.");
        return;
      }

      setPreviewError("");
      const generation = ++previewGenerationRef.current;

      // Stop whatever is currently scheduled before building the new graph.
      if (previewRafRef.current !== null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
      activeSourcesRef.current.forEach((node) => {
        try {
          node.onended = null;
          node.stop();
        } catch {
          // Already stopped — nothing to do.
        }
        try {
          node.disconnect();
        } catch {
          // Already disconnected — nothing to do.
        }
      });
      activeSourcesRef.current = [];

      setPreviewState("loading");

      try {
        const ctx = ensureAudioContext();
        await ctx.resume();
        if (generation !== previewGenerationRef.current) return;

        const fileById = new Map(files.map((f) => [f.id, f]));
        const timelineNow = computeTimeline(items);
        const total = timelineNow.reduce(
          (max, t) => Math.max(max, t.timelineEnd),
          0
        );
        const clampedSeek = Math.min(Math.max(0, seekSeconds), total);
        setPreviewElapsed(clampedSeek);

        // Only clips that haven't finished by the seek point matter.
        const relevant = timelineNow.filter(
          (item) => item.timelineEnd > clampedSeek
        );

        const buffers = await Promise.all(
          relevant.map((item) => {
            const af = fileById.get(item.fileId);
            if (!af) {
              return Promise.reject(
                new Error("A clip's source file was removed.")
              );
            }
            return decodeBuffer(af);
          })
        );

        // The timeline changed while we were decoding — this attempt is stale.
        if (generation !== previewGenerationRef.current) return;

        // Small lead-in so a scheduled start time can never land in the past.
        const startAt = ctx.currentTime + 0.05;
        previewStartCtxTimeRef.current = startAt - clampedSeek;

        const nodes: AudioBufferSourceNode[] = [];
        relevant.forEach((item, i) => {
          const buffer = buffers[i];
          if (!buffer) return;
          // How far into this clip the seek point already falls.
          const clipElapsed = Math.max(0, clampedSeek - item.timelineStart);
          const sourceStart = item.start + clipElapsed;
          const remaining = item.end - item.start - clipElapsed;
          if (remaining <= 0 || sourceStart >= buffer.duration) return;
          const trimmedDuration = Math.min(remaining, buffer.duration - sourceStart);
          const whenToStart =
            startAt + Math.max(0, item.timelineStart - clampedSeek);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(whenToStart, sourceStart, trimmedDuration);
          nodes.push(source);
        });

        activeSourcesRef.current = nodes;
        setPreviewState("playing");
        previewRafRef.current = requestAnimationFrame(previewTick);
      } catch (err) {
        if (generation !== previewGenerationRef.current) return;
        console.error("Preview error:", err);
        setPreviewError(
          err instanceof Error
            ? err.message
            : "Couldn't preview this mix in your browser."
        );
        setPreviewState("idle");
      }
    },
    [previewTick]
  );

  const pausePreview = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    void ctx.suspend();
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    setPreviewState("paused");
  }, []);

  const resumePreview = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      void playFrom(0);
      return;
    }
    // Suspending an AudioContext also pauses its clock, so every node's
    // scheduled start/stop time is still correct once it resumes — no
    // rescheduling needed.
    void ctx.resume().then(() => {
      setPreviewState("playing");
      previewRafRef.current = requestAnimationFrame(previewTick);
    });
  }, [playFrom, previewTick]);

  const handlePreviewToggle = () => {
    if (previewState === "playing") {
      pausePreview();
    } else if (previewState === "paused") {
      resumePreview();
    } else {
      void playFrom(0);
    }
  };

  const handleTimelineSeek = (time: number) => {
    void playFrom(time);
  };

  const clearResult = useCallback(() => {
    stopPreview();
    setResultBlob(null);
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileName("");
  }, [stopPreview]);

  const validExtensionFor = (name: string) => {
    const lower = name.toLowerCase();
    return [
      ".mp3",
      ".wav",
      ".m4a",
      ".ogg",
      ".aac",
      ".flac",
      ".webm",
      ".mpeg",
    ].some((ext) => lower.endsWith(ext));
  };

  const addFiles = (fileList: FileList) => {
    setError("");
    clearResult();

    const incoming = Array.from(fileList);
    if (audioFiles.length + incoming.length > MAX_FILES) {
      setError(`You can add up to ${MAX_FILES} files.`);
      return;
    }

    for (const f of incoming) {
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" is larger than the 100 MB limit.`);
        return;
      }
      if (!validExtensionFor(f.name)) {
        setError(
          "Please upload valid audio files (MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG)."
        );
        return;
      }
    }

    incoming.forEach((f) => {
      const id = makeId();
      const url = URL.createObjectURL(f);
      const audioFile: AudioFile = { id, file: f, url, duration: 0 };

      setAudioFiles((prev) => [...prev, audioFile]);
      setSelections((prev) => ({ ...prev, [id]: { start: 0, end: 0 } }));

      // Kick off waveform decoding right away so the file already has a
      // shape to show once it's added, not just once the person hits Play.
      void decodeAndCachePeaks(audioFile);

      const probe = new Audio();
      const onLoaded = () => {
        if (Number.isFinite(probe.duration) && probe.duration > 0) {
          setAudioFiles((prev) =>
            prev.map((af) =>
              af.id === id ? { ...af, duration: probe.duration } : af
            )
          );
          setSelections((prev) => ({
            ...prev,
            [id]: { start: 0, end: probe.duration },
          }));
        }
        probe.removeEventListener("loadedmetadata", onLoaded);
        probe.src = "";
      };
      probe.addEventListener("loadedmetadata", onLoaded);
      probe.src = url;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      addFiles(event.target.files);
    }
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    const target = audioFiles.find((f) => f.id === id);
    if (target) URL.revokeObjectURL(target.url);
    bufferCacheRef.current.delete(id);
    peaksCacheRef.current.delete(id);

    setAudioFiles((prev) => prev.filter((f) => f.id !== id));
    setSequence((prev) => prev.filter((s) => s.fileId !== id));
    setSelections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedClipId(null);

    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    setError("");
    clearResult();
  };

  const togglePlay = (audioFile: AudioFile) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === audioFile.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.src = audioFile.url;
    audio
      .play()
      .then(() => setPlayingId(audioFile.id))
      .catch((err) => {
        console.error("Playback error:", err);
        setPlayingId(null);
      });
  };

  const addSegment = (audioFile: AudioFile) => {
    setError("");
    const sel = selections[audioFile.id] ?? { start: 0, end: audioFile.duration || 0 };
    const { start, end } = sel;

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      setError("Drag on the waveform to select the part you want, then try again.");
      return;
    }
    if (sequence.length >= MAX_SEGMENTS) {
      setError(`You can add up to ${MAX_SEGMENTS} segments.`);
      return;
    }

    const id = makeId();
    // New clips append right after the current end of the timeline, so
    // adding several clips in a row plays them back-to-back by default —
    // drag them afterward to overlap or add gaps.
    const position = sequence.reduce(
      (max, item) => Math.max(max, item.position + (item.end - item.start)),
      0
    );
    setSequence((prev) => [...prev, { id, fileId: audioFile.id, start, end, position }]);
    setSelectedClipId(id);
    clearResult();
  };

  const duplicateSegment = (id: string) => {
    const current = sequenceRef.current;
    if (current.length >= MAX_SEGMENTS) return;
    const item = current.find((s) => s.id === id);
    if (!item) return;
    const newId = makeId();
    const position = item.position + (item.end - item.start);
    setSequence((prev) => [...prev, { ...item, id: newId, position }]);
    setSelectedClipId(newId);
    clearResult();
  };

  const removeSegment = (id: string) => {
    setSequence((prev) => prev.filter((s) => s.id !== id));
    setSelectedClipId((prev) => (prev === id ? null : prev));
    clearResult();
  };

  const updateItemPosition = useCallback((id: string, position: number) => {
    setSequence((prev) =>
      prev.map((it) => (it.id === id ? { ...it, position } : it))
    );
  }, []);

  const updateItemResizeStart = useCallback(
    (id: string, start: number, position: number) => {
      setSequence((prev) =>
        prev.map((it) => (it.id === id ? { ...it, start, position } : it))
      );
    },
    []
  );

  const updateItemResizeEnd = useCallback((id: string, end: number) => {
    setSequence((prev) => prev.map((it) => (it.id === id ? { ...it, end } : it)));
  }, []);

  // Splits the selected clip into two clips at the current playhead
  // position. Disabled (see canSplit below) unless the playhead is
  // actually inside the selected clip.
  const handleSplitSelected = useCallback(() => {
    if (!selectedClipId) return;
    const item = sequenceRef.current.find((s) => s.id === selectedClipId);
    if (!item) return;

    const clipStart = item.position;
    const clipEnd = item.position + (item.end - item.start);
    const splitAt = previewElapsed;
    if (splitAt <= clipStart + 0.05 || splitAt >= clipEnd - 0.05) return;

    const splitOffset = splitAt - clipStart;
    const firstEnd = item.start + splitOffset;
    const newId = makeId();

    setSequence((prev) =>
      prev.flatMap((s) => {
        if (s.id !== selectedClipId) return [s];
        return [
          { ...s, end: firstEnd },
          { ...s, id: newId, start: firstEnd, position: s.position + splitOffset },
        ];
      })
    );
    setSelectedClipId(newId);
    clearResult();
  }, [selectedClipId, previewElapsed, clearResult]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedClipId) return;
    removeSegment(selectedClipId);
  }, [selectedClipId]);

  // Keyboard shortcuts for the toolbar: S to split, Delete/Backspace to
  // remove the selected clip. Ignored while typing in a text field.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSplitSelected();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSplitSelected, handleDeleteSelected, selectedClipId]);

  const pxPerSec = BASE_PX_PER_SEC * zoom;

  const timeline = computeTimeline(sequence);
  const totalDuration = timeline.reduce(
    (max, t) => Math.max(max, t.timelineEnd),
    0
  );
  const lanesAssigned = assignLanes(timeline);
  const maxLane = lanesAssigned.reduce((max, e) => Math.max(max, e.lane), 0);
  const tickInterval = totalDuration > 180 ? 30 : totalDuration > 60 ? 15 : 5;
  const rulerTicks: number[] = [];
  for (let t = 0; t <= totalDuration + tickInterval; t += tickInterval) {
    rulerTicks.push(t);
  }
  const timelineWidth = Math.max(360, (totalDuration + 3) * pxPerSec);
  const timelineHeight = RULER_HEIGHT + (maxLane + 1) * LANE_HEIGHT;

  // Selection details used by the toolbar / readout.
  const orderedSequence = [...sequence].sort((a, b) => a.position - b.position);
  const selectedNumber = selectedClipId
    ? orderedSequence.findIndex((s) => s.id === selectedClipId) + 1
    : null;
  const selectedEntry = timeline.find((t) => t.id === selectedClipId);
  const selectedSourceName =
    (selectedEntry &&
      audioFiles.find((f) => f.id === selectedEntry.fileId)?.file.name) ??
    "a removed file";
  const canSplit =
    !!selectedEntry &&
    previewElapsed > selectedEntry.timelineStart + 0.1 &&
    previewElapsed < selectedEntry.timelineEnd - 0.1;

  /*
   * One render path for everything: the Render button and the three output
   * dropdowns all call this. `overrides` lets a dropdown render with its new
   * value without waiting for state to commit. Concurrent runs are guarded by
   * a request id + AbortController, so rapidly changing two dropdowns can
   * never let an older response overwrite a newer one.
   */
  const runRender = useCallback(
    async (overrides?: { format?: string; quality?: string }) => {
      if (loadingRef.current) {
        abortRef.current?.abort();
      }

      setError("");

      const files = audioFilesRef.current;
      const items = sequenceRef.current;

      if (files.length === 0) {
        setError("Add at least one audio file.");
        return;
      }
      if (items.length === 0) {
        setError("Add at least one clip to the mix timeline.");
        return;
      }

      const activeFormat = overrides?.format ?? format;
      const activeQuality = overrides?.quality ?? quality;

      const requestId = ++requestIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      loadingRef.current = true;
      setLoading(true);
      clearResult();

      try {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f.file));

        const fileIdToIndex = new Map(files.map((f, idx) => [f.id, idx]));

        // Convert absolute timeline positions into the backend's
        // relative-to-previous-clip "offset" model: sort by where each
        // clip actually starts, then chain the offsets so the rendered
        // mix lands on exactly the same timeline the person built here.
        const sorted = [...items].sort((a, b) => a.position - b.position);
        let prevEnd = 0;
        const sequencePayload = sorted.map((item) => {
          const offset = item.position - prevEnd;
          prevEnd = item.position + (item.end - item.start);
          return {
            fileIndex: fileIdToIndex.get(item.fileId) ?? 0,
            start: item.start,
            end: item.end,
            offset,
          };
        });

        formData.append("sequence", JSON.stringify(sequencePayload));
        formData.append("format", activeFormat);
        formData.append("bitrate", activeQuality);
        // Compression is no longer user-facing — always send the backend's
        // own default (44.1 kHz, stereo) so output quality stays consistent.
        formData.append("compression", DEFAULT_COMPRESSION);

        const response = await fetch("/api/audio/audio-mixture", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Render failed with status ${response.status}`
          );
        }

        const blob = await response.blob();

        // A newer render started while this one was in flight — drop it.
        if (requestId !== requestIdRef.current) return;

        const url = URL.createObjectURL(blob);
        const selectedFormat = getFormatOption(activeFormat);

        setResultBlob(blob);
        setResultUrl(url);
        setFileName(`audio-mixture.${selectedFormat.ext}`);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        console.error("Render error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "The render failed. Try again, or adjust your clips."
        );
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [format, quality, clearResult]
  );

  const handleFormatChange = (v: string) => {
    setFormat(v);
    if (resultBlob) void runRender({ format: v });
  };
  const handleQualityChange = (v: string) => {
    setQuality(v);
    if (resultBlob) void runRender({ quality: v });
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const selectedFormat = getFormatOption(format);
    const trimmedName = fileName.trim();
    const finalName = trimmedName || `audio-mixture.${selectedFormat.ext}`;

    const anchor = document.createElement("a");
    anchor.href = resultUrl;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const selectedFormat = getFormatOption(format);
  const isLossless = !selectedFormat.lossy;
  const hasFiles = audioFiles.length > 0;

  return (
    <main className="relative isolate min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <ListMusic className="h-7 w-7 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Audio Mixture
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Combine clips from multiple audio files into one track. Drag on a
            waveform to pick the part you want, then drag it around on the
            timeline to arrange it.
          </p>
        </div>

        <audio ref={audioRef} className="hidden" />

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
          {audioFiles.length === 0 && (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { step: "1", title: "Add files", body: "Upload the audio clips you want to combine." },
                { step: "2", title: "Select & add", body: "Drag on each waveform to pick a part, then add it to the timeline." },
                { step: "3", title: "Arrange & export", body: "Drag clips to arrange or overlap them, preview, then render." },
              ].map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-500">
                    {s.step}
                  </div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* UPLOAD */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mpeg,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!hasFiles ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
                dragActive
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                <Upload className="h-6 w-6 text-orange-500" />
              </div>
              <h2 className="text-base font-semibold">Add audio files</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag and drop, or click to browse
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG • Max 100 MB each •
                Up to {MAX_FILES} files
              </p>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors sm:flex-row ${
                dragActive
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <Upload className="h-4 w-4 shrink-0" />
                <span>
                  {audioFiles.length}/{MAX_FILES} files added — drop more here,
                  or
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={audioFiles.length >= MAX_FILES}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add more files
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SOURCE FILES */}
          {audioFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Source Files ({audioFiles.length})
              </h2>

              {audioFiles.map((af) => {
                const selection = selections[af.id] ?? { start: 0, end: af.duration || 0 };
                return (
                  <div
                    key={af.id}
                    className="rounded-2xl border border-border bg-background/40 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${colorForFileId(af.id, audioFiles)}22` }}
                        >
                          <FileAudio
                            className="h-5 w-5"
                            style={{ color: colorForFileId(af.id, audioFiles) }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {af.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(af.file.size)} •{" "}
                            {af.duration > 0
                              ? formatTime(af.duration)
                              : "loading..."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => togglePlay(af)}
                          className="flex items-center gap-2 rounded-xl bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-500 transition-colors hover:bg-orange-500/20"
                        >
                          {playingId === af.id ? (
                            <>
                              <Pause className="h-3 w-3" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" /> Play
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(af.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <TrimSelector
                        audioFile={af}
                        peaks={peaksCacheRef.current.get(af.id)}
                        selection={selection}
                        onChange={(sel) =>
                          setSelections((prev) => ({ ...prev, [af.id]: sel }))
                        }
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelections((prev) => ({
                            ...prev,
                            [af.id]: { start: 0, end: af.duration || 0 },
                          }))
                        }
                        className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500"
                      >
                        Select whole clip
                      </button>
                      <button
                        type="button"
                        onClick={() => addSegment(af)}
                        className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add to Timeline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MIX TIMELINE */}
          {sequence.length > 0 && (
            <div className="mt-8 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Your Timeline
                </h2>
                <span className="text-xs text-muted-foreground">
                  {sequence.length} {sequence.length === 1 ? "clip" : "clips"} ·{" "}
                  {formatTime(totalDuration)}
                </span>
              </div>

              {/* Toolbar: Play / Split / Delete clip, matching the reference UI */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewToggle}
                  disabled={previewState === "loading"}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {previewState === "loading" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : previewState === "playing" ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </>
                  ) : previewState === "paused" ? (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Play
                    </>
                  )}
                </button>

                {(previewState === "playing" || previewState === "paused") && (
                  <button
                    type="button"
                    onClick={stopPreview}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500"
                  >
                    <Square className="h-3 w-3" />
                    Stop
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSplitSelected}
                  disabled={!canSplit}
                  title="Split the selected clip at the playhead"
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  Split
                  <kbd className="ml-1 rounded border border-border px-1 text-[10px] font-normal text-muted-foreground">
                    S
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={!selectedClipId}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:border-destructive/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete clip
                </button>

                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatTime(previewElapsed)} / {formatTime(totalDuration)}
                </span>

                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.2).toFixed(2)))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-orange-500"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="range"
                    min={ZOOM_MIN}
                    max={ZOOM_MAX}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="h-1 w-20 accent-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.2).toFixed(2)))
                    }
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-orange-500"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {selectedEntry
                  ? `Selected: clip ${selectedNumber} · ${formatTime(
                      selectedEntry.start
                    )}–${formatTime(selectedEntry.end)} of ${selectedSourceName}`
                  : "Click a clip on the timeline to select it."}
              </p>

              {previewError && (
                <p className="text-xs text-destructive">{previewError}</p>
              )}

              <div className="overflow-x-auto rounded-xl border border-border bg-background/40 p-3">
                <div
                  className="relative"
                  style={{ width: timelineWidth, height: timelineHeight }}
                  onPointerDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const t = Math.max(0, (e.clientX - rect.left) / pxPerSec);
                    setSelectedClipId(null);
                    handleTimelineSeek(t);
                  }}
                >
                  {/* ruler */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 border-b border-border" style={{ height: RULER_HEIGHT }}>
                    {rulerTicks.map((t) => (
                      <div
                        key={t}
                        className="absolute top-0 flex h-full flex-col items-start"
                        style={{ left: t * pxPerSec }}
                      >
                        <div className="h-2 w-px bg-border" />
                        <span className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatTime(t)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* clips */}
                  <div className="absolute inset-x-0" style={{ top: RULER_HEIGHT }}>
                    {lanesAssigned.map((entry) => {
                      const source = audioFiles.find((f) => f.id === entry.fileId);
                      return (
                        <TimelineClip
                          key={entry.id}
                          entry={entry}
                          lane={entry.lane}
                          label={source?.file.name ?? "Removed file"}
                          peaks={source ? peaksCacheRef.current.get(source.id) : undefined}
                          sourceDuration={source?.duration ?? 0}
                          pxPerSec={pxPerSec}
                          color={colorForFileId(entry.fileId, audioFiles)}
                          selected={entry.id === selectedClipId}
                          onSelect={setSelectedClipId}
                          onMove={updateItemPosition}
                          onResizeStart={updateItemResizeStart}
                          onResizeEnd={updateItemResizeEnd}
                          onRemove={removeSegment}
                          onDuplicate={duplicateSegment}
                          onDragEnd={clearResult}
                        />
                      );
                    })}
                  </div>

                  {/* playhead */}
                  {totalDuration > 0 && (
                    <div
                      className="pointer-events-none absolute top-0 z-20 w-px bg-orange-500"
                      style={{ left: previewElapsed * pxPerSec, height: timelineHeight }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                <p>
                  Drag a clip&apos;s edges to trim it, drag the clip to move it,
                  click the track to move the playhead. Select a clip and press
                  Split to cut it in two at the playhead.
                </p>
              </div>
            </div>
          )}

          {/* OUTPUT SETTINGS + RENDER */}
          {sequence.length > 0 && (
            <div className="mt-8 space-y-6">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Export Settings
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Dropdown
                  label="Format"
                  options={FORMAT_OPTIONS}
                  value={format}
                  onChange={handleFormatChange}
                  disabled={loading}
                />
                <Dropdown
                  label="Quality"
                  options={QUALITY_OPTIONS}
                  value={quality}
                  onChange={handleQualityChange}
                  disabled={loading}
                />
              </div>

              {isLossless && (
                <p className="-mt-3 text-xs text-muted-foreground">
                  {selectedFormat.label} is lossless — the Quality (bitrate)
                  preset above is ignored for this format.
                </p>
              )}

              {blockedBy && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    The render button can&apos;t receive clicks because{" "}
                    {blockedBy}. That element comes from a wrapper around this
                    page, not from the mixer itself.
                  </span>
                </div>
              )}

              {/*
                Always mounted, never conditionally swapped out, and raised
                above anything painted by a sibling so a stray decorative
                layer can't swallow the click.
              */}
              <button
                ref={renderButtonRef}
                type="button"
                onClick={() => void runRender()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
                aria-busy={loading}
                className="relative z-10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rendering mixture...
                  </>
                ) : resultBlob ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Render again
                  </>
                ) : (
                  <>
                    <ListMusic className="h-4 w-4" />
                    Render mixture
                  </>
                )}
              </button>

              {resultBlob && resultUrl && (
                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        Your mixture is ready
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Choose a name for your download.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="resultFileName"
                      className="mb-2 block text-xs font-medium text-muted-foreground"
                    >
                      Rename
                    </label>
                    <input
                      id="resultFileName"
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:ring-1 focus:ring-orange-500"
                      spellCheck={false}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="mt-1 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}