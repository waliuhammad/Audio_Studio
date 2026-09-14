"use client";

// Route: /videotools/audio-video-merger
// Calls: POST /api/video/audio-video-merger  (see app/api/video/audio-video-merger/route.ts)
//
// NOTE: this file is a client component ("use client"), so it can't export
// `metadata` directly (that requires a server component). If you need SEO
// metadata for this route, add a sibling `app/videotools/audio-video-merger/
// layout.tsx` (server component) that exports `metadata`, or wrap this
// component from a server page that exports metadata and renders it.

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileAudio,
  FileVideo,
  Layers3,
  Loader2,
  Pause,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { OutputControls } from "@/components/tools/OutputControls";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type MergeMode = "replace" | "mix";

const MERGE_MODE_OPTIONS: { value: MergeMode; label: string }[] = [
  { value: "replace", label: "Replace original audio" },
  { value: "mix", label: "Mix with original audio" },
];

// Must stay in sync with ALLOWED_FORMATS in the API route.
const FORMAT_OPTIONS = ["MP4", "MOV", "MKV", "WEBM", "AVI", "FLV"] as const;
type OutputFormat = (typeof FORMAT_OPTIONS)[number];

const ACCEPTED_VIDEO = ".mp4,.mov,.mkv,.webm,.avi";
const ACCEPTED_AUDIO = ".mp3,.wav,.m4a,.aac,.flac,.ogg";

const MERGE_ENDPOINT = "/api/video/audio-video-merger";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function stripExtension(name: string) {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

function Dropdown<T extends string>({
  value,
  options,
  onChange,
  renderLabel,
  disabled,
  fullWidthOnMobile,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  renderLabel?: (value: T) => string;
  disabled?: boolean;
  fullWidthOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className={`relative ${fullWidthOnMobile ? "w-full sm:w-auto" : ""}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-base font-medium text-neutral-900 shadow-sm transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20 ${
          fullWidthOnMobile ? "w-full justify-between sm:w-auto" : ""
        }`}
      >
        {renderLabel ? renderLabel(value) : value}
        <ChevronDown
          className={`h-5 w-5 text-neutral-400 transition-transform dark:text-white/40 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-full min-w-[14rem] overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#1b1e29] sm:w-56">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-2.5 text-left text-base transition ${
                option === value
                  ? "bg-orange-50 font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                  : "text-neutral-700 hover:bg-neutral-50 dark:text-white/70 dark:hover:bg-white/5"
              }`}
            >
              {renderLabel ? renderLabel(option) : option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadSlot({
  label,
  hint,
  accept,
  icon: Icon,
  file,
  onSelect,
  onClear,
}: {
  label: string;
  hint: string;
  accept: string;
  icon: typeof FileVideo;
  file: File | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) onSelect(picked);
  }

  if (file) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-white/[0.03] sm:min-h-[300px] sm:p-8">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 sm:h-20 sm:w-20">
          <Icon className="h-7 w-7 sm:h-9 sm:w-9" />
        </div>
        <div className="min-w-0 w-full">
          <p className="truncate text-lg font-semibold text-neutral-900 dark:text-white sm:text-xl">
            {file.name}
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-white/40 sm:text-base">
            {formatBytes(file.size)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white/70"
          aria-label={`Remove ${label.toLowerCase()}`}
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition sm:min-h-[300px] sm:py-16 ${
        dragging
          ? "border-orange-400 bg-orange-50 dark:border-orange-500/60 dark:bg-orange-500/10"
          : "border-orange-300/70 bg-white hover:bg-orange-50/40 dark:border-orange-500/25 dark:bg-white/[0.02] dark:hover:bg-orange-500/[0.06]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 sm:h-20 sm:w-20">
        <Upload className="h-7 w-7 sm:h-9 sm:w-9" />
      </div>
      <p className="text-lg font-semibold text-neutral-900 dark:text-white sm:text-xl">
        {label}
      </p>
      <p className="mt-2 text-sm text-neutral-500 dark:text-white/40 sm:text-base">
        Drag and drop, or click to browse
      </p>
      <p className="mt-1 text-xs text-neutral-400 dark:text-white/30 sm:text-sm">
        {hint}
      </p>
    </div>
  );
}

function WaveformScrubber({
  currentTime,
  duration,
  onSeek,
  barCount = 56,
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  barCount?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeDuration = duration > 0 ? duration : 0;
  const playedRatio =
    safeDuration > 0 ? Math.min(1, Math.max(0, currentTime / safeDuration)) : 0;

  function seekFromClientX(clientX: number) {
    const el = trackRef.current;
    if (!el || safeDuration === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * safeDuration);
  }

  useEffect(() => {
    if (!isDragging) return;
    function onMove(e: PointerEvent) {
      seekFromClientX(e.clientX);
    }
    function onUp() {
      setIsDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, safeDuration]);

  const markers = [0, 0.25, 0.5, 0.75, 1].map((r) => formatDuration(r * safeDuration));

  return (
    <div>
      <div className="flex justify-between px-4 text-xs font-semibold text-orange-500 dark:text-orange-400 sm:text-sm">
        {markers.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      <div
        ref={trackRef}
        onPointerDown={(e) => {
          setIsDragging(true);
          seekFromClientX(e.clientX);
        }}
        className="relative mt-2 flex h-16 cursor-pointer items-center gap-[2px] rounded-2xl border border-orange-200 bg-orange-50 px-4 dark:border-orange-500/20 dark:bg-orange-500/10 sm:h-20 sm:gap-1"
      >
        {Array.from({ length: barCount }).map((_, i) => {
          const played = i / (barCount - 1) <= playedRatio;
          return (
            <span
              key={i}
              className={`h-full min-w-0 flex-1 rounded-full transition-colors ${
                played
                  ? "bg-orange-500 dark:bg-orange-400"
                  : "bg-orange-300/70 dark:bg-orange-500/40"
              }`}
              style={{
                height: `${20 + Math.abs(Math.sin(i * 1.3)) * 60}%`,
              }}
            />
          );
        })}

        {safeDuration > 0 && (
          <div
            className="pointer-events-none absolute top-0 flex h-full -translate-x-1/2 items-stretch"
            style={{ left: `${playedRatio * 100}%` }}
          >
            <div className="relative flex items-stretch">
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-black">
                {formatDuration(currentTime)}
              </span>
              <span className="w-1 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between text-xs text-orange-500 dark:text-orange-400 sm:text-sm">
        <span>00:00</span>
        <span>{formatDuration(safeDuration)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type Stage = "select" | "processing" | "done";

export default function AudioVideoMergerPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mergeMode, setMergeMode] = useState<MergeMode>("replace");
  const [stage, setStage] = useState<Stage>("select");

  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [outputName, setOutputName] = useState("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("MP4");

  /* Encode quality; the route maps it to a CRF and an audio bitrate. */
  const [quality, setQuality] = useState("high");
  // The format the current outputUrl was actually rendered in — if the user
  // changes the Format dropdown after merging, this will no longer match,
  // which tells handleDownload it needs to re-run the merge first.
  const [mergedFormat, setMergedFormat] = useState<OutputFormat | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset the scrubber whenever we get a freshly (re-)merged file.
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [outputUrl]);

  // Read the video's duration client-side once it's selected, purely for
  // display in the result summary card.
  useEffect(() => {
    if (!videoFile) {
      setVideoDuration(null);
      return;
    }
    const video = document.createElement("video");
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.onloadedmetadata = () => setVideoDuration(video.duration);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // Revoke the last blob URL whenever we replace it or unmount, so we don't
  // leak memory across repeated merges.
  useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const bothSelected = Boolean(videoFile && audioFile);

  const mergeModeLabel = useMemo(
    () => MERGE_MODE_OPTIONS.find((o) => o.value === mergeMode)?.label ?? "",
    [mergeMode],
  );

  async function runMerge(format: OutputFormat) {
    if (!videoFile || !audioFile) throw new Error("Select a video and an audio file first.");

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("audio", audioFile);
    formData.append("mode", mergeMode);
    formData.append("format", format.toLowerCase());
    formData.append("quality", quality);

    const res = await fetch(MERGE_ENDPOINT, { method: "POST", body: formData });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Merge failed. Please try again.");
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function handleMerge() {
    if (!videoFile || !audioFile) return;
    setErrorMessage(null);
    setStage("processing");

    try {
      const url = await runMerge(outputFormat);
      setOutputUrl(url);
      setMergedFormat(outputFormat);
      setOutputName(`${stripExtension(videoFile.name)}-merged`);
      setStage("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStage("select");
    }
  }

  function togglePlay() {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play();
    } else {
      media.pause();
    }
  }

  function handleSeek(time: number) {
    const media = mediaRef.current;
    if (media) media.currentTime = time;
    setCurrentTime(time);
  }

  function handleReset() {
    setVideoFile(null);
    setAudioFile(null);
    setStage("select");
    setOutputUrl(null);
    setMergedFormat(null);
    setOutputName("");
    setErrorMessage(null);
  }

  async function handleDownload() {
    if (!videoFile || !audioFile) return;
    setErrorMessage(null);

    try {
      let url = outputUrl;

      // Format was changed after the initial merge — re-encode to match
      // before downloading.
      if (!url || outputFormat !== mergedFormat) {
        setIsPreparing(true);
        url = await runMerge(outputFormat);
        setOutputUrl(url);
        setMergedFormat(outputFormat);
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = `${outputName || "audio-video-merged"}.${outputFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] px-4 py-8 dark:bg-[#0c0e14] sm:px-6 sm:py-12">
      {/* Widened from max-w-3xl -> max-w-4xl so the result header (filename +
          Play + delete) has room to sit on one line on larger screens before
          it wraps, instead of overflowing the card edge. */}
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-center text-center sm:mb-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 sm:h-20 sm:w-20 sm:rounded-3xl">
            <Layers3 className="h-7 w-7 sm:h-9 sm:w-9" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white sm:text-4xl">
            Audio Video Merger
          </h1>
          <p className="mt-2 text-base text-neutral-500 dark:text-white/40 sm:mt-3 sm:text-lg">
            Combine an audio track with a video file into one.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload step ------------------------------------------------ */}
        {stage === "select" && (
          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <UploadSlot
                label="Video File"
                hint="MP4, MOV, MKV, WEBM, AVI · Max 500 MB"
                accept={ACCEPTED_VIDEO}
                icon={FileVideo}
                file={videoFile}
                onSelect={setVideoFile}
                onClear={() => setVideoFile(null)}
              />
              <UploadSlot
                label="Audio File"
                hint="MP3, WAV, M4A, AAC, FLAC · Max 500 MB"
                accept={ACCEPTED_AUDIO}
                icon={FileAudio}
                file={audioFile}
                onSelect={setAudioFile}
                onClear={() => setAudioFile(null)}
              />
            </div>

            {bothSelected && (
              <>
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white">
                      Audio Mode
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-white/40">
                      How the audio track should be applied
                    </p>
                  </div>
                  <Dropdown
                    value={mergeMode}
                    options={MERGE_MODE_OPTIONS.map((o) => o.value)}
                    onChange={setMergeMode}
                    renderLabel={(v) =>
                      MERGE_MODE_OPTIONS.find((o) => o.value === v)!.label
                    }
                    fullWidthOnMobile
                  />
                </div>

                <button
                  type="button"
                  onClick={handleMerge}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-orange-600"
                >
                  <Layers3 className="h-5 w-5" />
                  Merge Audio &amp; Video
                </button>
              </>
            )}
          </div>
        )}

        {/* Processing step --------------------------------------------- */}
        {stage === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-black/5 bg-white p-12 shadow-sm dark:border-white/5 dark:bg-white/[0.02] sm:p-16">
            <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
            <p className="text-base font-medium text-neutral-600 dark:text-white/60">
              Merging your files…
            </p>
          </div>
        )}

        {/* Result step --------------------------------------------------- */}
        {stage === "done" && videoFile && (
          <div className="space-y-6">
            {/* min-w-0 + overflow-hidden keep the whole card (including its
                buttons) from ever pushing past the rounded border, no matter
                how long the filename or button labels get. */}
            <div className="min-w-0 overflow-hidden rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] sm:p-8">
              {/* Single row: filename truncates to make room, Play + delete
                  stay fixed-width on the right and never wrap or overflow. */}
              <div className="flex flex-nowrap items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 sm:h-14 sm:w-14">
                    <FileVideo className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-neutral-900 dark:text-white">
                      {outputName}.{(mergedFormat ?? outputFormat).toLowerCase()}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-white/40">
                      {formatBytes(videoFile.size)} ·{" "}
                      {formatDuration(videoDuration ?? NaN)}
                    </p>
                  </div>
                </div>

                {/* Fixed-width action group — shrink-0 keeps it from ever
                    being squeezed; the filename above absorbs the shrink. */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-orange-100 px-4 py-2.5 text-sm font-medium text-orange-600 transition hover:bg-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/25 sm:px-5 sm:text-base"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 shrink-0" />
                    ) : (
                      <Play className="h-4 w-4 shrink-0" />
                    )}
                    <span>{isPlaying ? "Pause" : "Play"}</span>
                    <span className="hidden sm:inline">({mergeModeLabel})</span>
                  </button>

                  {/* Reset / delete — boxed square button, always inline
                      with Play and never escaping the card's edge. */}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-neutral-200 bg-neutral-100 text-neutral-500 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-white/15 dark:bg-white/10 dark:text-white/60 dark:hover:border-red-500/40 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                    aria-label="Start over"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Hidden media element that actually plays the merged file —
                  the scrubber below just reads/drives its currentTime.
                  Kept out of layout flow via absolute positioning (instead
                  of display:none) so browser extensions that inject video
                  overlays don't anchor a stray badge at the page's 0,0
                  corner when the element's box collapses to nothing. */}
              {outputUrl && (
                <video
                  ref={mediaRef}
                  src={outputUrl}
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                  aria-hidden="true"
                  tabIndex={-1}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
              )}

              <div className="mt-6">
                <WaveformScrubber
                  currentTime={currentTime}
                  duration={videoDuration ?? 0}
                  onSeek={handleSeek}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-white/[0.02] sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-neutral-900 dark:text-white">
                    Your file is ready
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-white/40">
                    Choose a name and format for your download.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-500 dark:text-white/40">
                    Rename
                  </label>
                  <input
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-orange-500/60"
                  />
                </div>

                {/* Format moves under the name and gains quality beside it, so
                    this card matches the other tools. FORMAT_OPTIONS is a list
                    of plain strings, mapped to the {label, value} pairs the
                    shared control takes. */}
                <OutputControls
                  formatOptions={FORMAT_OPTIONS.map((value) => ({
                    label: value,
                    value,
                  }))}
                  format={outputFormat}
                  onFormatChange={(value) =>
                    setOutputFormat(value as OutputFormat)
                  }
                  quality={quality}
                  onQualityChange={setQuality}
                  disabled={isPreparing}
                />
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isPreparing}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
              >
                {isPreparing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Preparing {outputFormat}…
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}