"use client";

import React, { useEffect, useRef, useState } from "react";
import { SaveToLibrary } from "@/components/library/SaveToLibrary";
import {
  Upload,
  Play,
  Pause,
  Mic,
  Music2,
  Combine,
  RefreshCw,
  Volume2,
  ChevronDown,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Settings2,
} from "lucide-react";

// Must stay in sync with ALLOWED_OUTPUT_FORMATS in the API route.
type OutputFormat = "mp3" | "wav" | "m4a" | "aac" | "flac" | "ogg";

const FORMAT_OPTIONS: { label: string; value: OutputFormat }[] = [
  { label: "MP3 (Most Compatible)", value: "mp3" },
  { label: "WAV (Uncompressed)", value: "wav" },
  { label: "M4A (AAC in MP4)", value: "m4a" },
  { label: "AAC (Raw Stream)", value: "aac" },
  { label: "FLAC (Lossless)", value: "flac" },
  { label: "OGG (Vorbis)", value: "ogg" },
];

type SyncMode = "loop" | "trim";

interface TrackState {
  file: File | null;
  url: string | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number; // 0 - 2 (0% - 200%)
}

const makeEmptyTrack = (volume: number): TrackState => ({
  file: null,
  url: null,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume,
});

export default function AudioMergerPage() {
  const [voice, setVoice] = useState<TrackState>(() => makeEmptyTrack(1));
  const [music, setMusic] = useState<TrackState>(() => makeEmptyTrack(0.6));

  const [syncMode, setSyncMode] = useState<SyncMode>("loop");
  const [format, setFormat] = useState<OutputFormat>("mp3");
  const [isFormatOpen, setIsFormatOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Inline download state (same pattern as the other audio tools)
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<OutputFormat>("mp3");

  const voiceAudioRef = useRef<HTMLAudioElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const formatDropdownRef = useRef<HTMLDivElement>(null);

  // Close the format dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(event.target as Node)) {
        setIsFormatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      if (voice.url) URL.revokeObjectURL(voice.url);
      if (music.url) URL.revokeObjectURL(music.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const loadTrackFile = (
    file: File,
    setTrack: React.Dispatch<React.SetStateAction<TrackState>>,
    audioRef: React.RefObject<HTMLAudioElement>
  ) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setTrack((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return {
        file,
        url: URL.createObjectURL(file),
        isPlaying: false,
        duration: 0,
        currentTime: 0,
        volume: prev.volume,
      };
    });
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");
  };

  const handleVoiceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadTrackFile(file, setVoice, voiceAudioRef);
    e.target.value = "";
  };

  const handleMusicInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadTrackFile(file, setMusic, musicAudioRef);
    e.target.value = "";
  };

  const handleVoiceDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadTrackFile(file, setVoice, voiceAudioRef);
  };

  const handleMusicDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) loadTrackFile(file, setMusic, musicAudioRef);
  };

  const clearTrack = (
    setTrack: React.Dispatch<React.SetStateAction<TrackState>>,
    audioRef: React.RefObject<HTMLAudioElement>,
    defaultVolume: number
  ) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setTrack((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return makeEmptyTrack(defaultVolume);
    });
    setDownloadBlob(null);
    setDownloadFileName("");
  };

  const toggleVoicePlay = () => {
    if (!voiceAudioRef.current) return;
    // Only one preview plays at a time so you can A/B the two tracks.
    if (musicAudioRef.current && !musicAudioRef.current.paused) {
      musicAudioRef.current.pause();
      setMusic((prev) => ({ ...prev, isPlaying: false }));
    }
    if (voice.isPlaying) {
      voiceAudioRef.current.pause();
      setVoice((prev) => ({ ...prev, isPlaying: false }));
    } else {
      voiceAudioRef.current.play();
      setVoice((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const toggleMusicPlay = () => {
    if (!musicAudioRef.current) return;
    if (voiceAudioRef.current && !voiceAudioRef.current.paused) {
      voiceAudioRef.current.pause();
      setVoice((prev) => ({ ...prev, isPlaying: false }));
    }
    if (music.isPlaying) {
      musicAudioRef.current.pause();
      setMusic((prev) => ({ ...prev, isPlaying: false }));
    } else {
      musicAudioRef.current.play();
      setMusic((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const handleMerge = async () => {
    if (!voice.file || !music.file) return;

    setIsProcessing(true);
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");

    const formData = new FormData();
    formData.append("voiceFile", voice.file);
    formData.append("musicFile", music.file);
    formData.append("voiceVolume", voice.volume.toString());
    formData.append("musicVolume", music.volume.toString());
    formData.append("syncMode", syncMode);
    formData.append("format", format);

    try {
      const response = await fetch("/api/audio/audio-merger", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Merging failed. Please try again.");
      }

      const resultBlob = await response.blob();

      const baseName =
        voice.file.name.substring(0, voice.file.name.lastIndexOf(".")) || "audio";
      const defaultFileName = `${baseName}-mixed.${format}`;

      setDownloadBlob(resultBlob);
      setDownloadFileName(defaultFileName);
      setDownloadFormat(format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not merge that audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    clearTrack(setVoice, voiceAudioRef, 1);
    clearTrack(setMusic, musicAudioRef, 0.6);
    setSyncMode("loop");
    setFormat("mp3");
    setIsFormatOpen(false);
    setIsProcessing(false);
    setError("");
    setDownloadBlob(null);
    setDownloadFileName("");
    if (voiceInputRef.current) voiceInputRef.current.value = "";
    if (musicInputRef.current) musicInputRef.current.value = "";
  };

  const handleDownload = () => {
    if (!downloadBlob) return;

    const extension = `.${downloadFormat}`;
    const trimmedName = downloadFileName.trim() || `audio-mixed${extension}`;
    const finalName = trimmedName.toLowerCase().endsWith(extension)
      ? trimmedName
      : `${trimmedName}${extension}`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
    reset();
  };

  const bothFilesReady = Boolean(voice.file && music.file);

  return (
    <div className="min-h-screen bg-white dark:bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/30 shadow-sm">
            <Combine className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Background Audio Merger
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Blend a voice track with background music into one balanced mix, with independent volume for each.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">

          {/* Upload Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TrackUploadZone
              label="Voice Track"
              hint="The narration or vocal you want up front"
              icon={Mic}
              track={voice}
              inputRef={voiceInputRef}
              audioRef={voiceAudioRef}
              onFileChange={handleVoiceInputChange}
              onDrop={handleVoiceDrop}
              onTogglePlay={toggleVoicePlay}
              onClear={() => clearTrack(setVoice, voiceAudioRef, 1)}
              onTimeUpdate={() =>
                setVoice((prev) => ({
                  ...prev,
                  currentTime: voiceAudioRef.current?.currentTime ?? prev.currentTime,
                }))
              }
              onLoadedMetadata={() =>
                setVoice((prev) => ({
                  ...prev,
                  duration: voiceAudioRef.current?.duration ?? prev.duration,
                }))
              }
              onEnded={() => setVoice((prev) => ({ ...prev, isPlaying: false }))}
              onVolumeChange={(val) => {
                setVoice((prev) => ({ ...prev, volume: val }));
                if (voiceAudioRef.current) voiceAudioRef.current.volume = Math.min(1, val);
              }}
              formatTime={formatTime}
            />

            <TrackUploadZone
              label="Background Music"
              hint="The music bed that plays underneath"
              icon={Music2}
              track={music}
              inputRef={musicInputRef}
              audioRef={musicAudioRef}
              onFileChange={handleMusicInputChange}
              onDrop={handleMusicDrop}
              onTogglePlay={toggleMusicPlay}
              onClear={() => clearTrack(setMusic, musicAudioRef, 0.6)}
              onTimeUpdate={() =>
                setMusic((prev) => ({
                  ...prev,
                  currentTime: musicAudioRef.current?.currentTime ?? prev.currentTime,
                }))
              }
              onLoadedMetadata={() =>
                setMusic((prev) => ({
                  ...prev,
                  duration: musicAudioRef.current?.duration ?? prev.duration,
                }))
              }
              onEnded={() => setMusic((prev) => ({ ...prev, isPlaying: false }))}
              onVolumeChange={(val) => {
                setMusic((prev) => ({ ...prev, volume: val }));
                if (musicAudioRef.current) musicAudioRef.current.volume = Math.min(1, val);
              }}
              formatTime={formatTime}
            />
          </div>

          {bothFilesReady && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* Background Length / Sync Mode */}
              <div className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <Settings2 className="w-4 h-4 text-orange-500" />
                  <span>Background Length</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSyncMode("loop")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors ${
                      syncMode === "loop"
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white dark:bg-card border-border text-foreground hover:border-orange-500"
                    }`}
                  >
                    Loop music to match voice
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncMode("trim")}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold border transition-colors ${
                      syncMode === "trim"
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white dark:bg-card border-border text-foreground hover:border-orange-500"
                    }`}
                  >
                    Trim to shortest track
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {syncMode === "loop"
                    ? "If the music is shorter than the voice, it repeats until the voice ends."
                    : "The mix ends as soon as either track runs out."}
                </p>
              </div>

              {/* Output Format Dropdown */}
              <div
                className="bg-white dark:bg-background/60 border border-border rounded-2xl p-5 space-y-4 relative"
                ref={formatDropdownRef}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <Volume2 className="w-4 h-4 text-orange-500" />
                    <span>Output Format</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase">{format}</span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFormatOpen(!isFormatOpen)}
                    className="w-full bg-white dark:bg-card border border-border text-foreground text-sm rounded-xl px-3.5 py-2.5 flex items-center justify-between focus:outline-none focus:border-orange-500 cursor-pointer shadow-sm transition-all"
                  >
                    <span>{FORMAT_OPTIONS.find((opt) => opt.value === format)?.label || format.toUpperCase()}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isFormatOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isFormatOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-[#121214] border border-border rounded-xl shadow-2xl overflow-hidden py-1">
                      {FORMAT_OPTIONS.map((opt) => {
                        const isSelected = format === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setFormat(opt.value);
                              setIsFormatOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                              isSelected
                                ? "bg-orange-500 text-white font-semibold"
                                : "hover:bg-orange-500/10 hover:text-orange-600 text-foreground"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* MERGE & INLINE DOWNLOAD PANEL */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mixing Tracks...
                    </>
                  ) : (
                    <>
                      <Combine className="h-4 w-4" />
                      Merge Audio
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
                        <p className="text-sm font-semibold">Your mix is ready</p>
                        <p className="text-xs text-muted-foreground">
                          Choose a name for your {downloadFormat.toUpperCase()} download.
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
                        fileName={downloadFileName.trim() || `audio-mixed.${downloadFormat}`}
                        meta={`Merged Audio · ${downloadFormat.toUpperCase()}`}
                      />
                    </div>
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

/* ---------------------------------------------------------------------- */
/* TrackUploadZone — the upload dropzone + inline preview player + volume  */
/* slider, used once for the voice track and once for the music track.    */
/* ---------------------------------------------------------------------- */

function TrackUploadZone({
  label,
  hint,
  icon: Icon,
  track,
  inputRef,
  audioRef,
  onFileChange,
  onDrop,
  onTogglePlay,
  onClear,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onVolumeChange,
  formatTime,
}: {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  track: TrackState;
  inputRef: React.RefObject<HTMLInputElement>;
  audioRef: React.RefObject<HTMLAudioElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onTogglePlay: () => void;
  onClear: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
  onVolumeChange: (value: number) => void;
  formatTime: (secs: number) => string;
}) {
  if (!track.file || !track.url) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-orange-500 transition-all bg-white dark:bg-background/40 cursor-pointer flex flex-col items-center justify-center space-y-3 select-none min-h-[180px]"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="audio/*"
          onChange={onFileChange}
        />
        <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/30 shadow-sm pointer-events-none">
          <Icon className="w-6 h-6" />
        </div>
        <div className="space-y-1 pointer-events-none">
          <span className="text-sm font-semibold block">{label}</span>
          <span className="text-xs text-muted-foreground block">{hint}</span>
          <span className="text-xs text-orange-500 font-medium block pt-1 flex items-center justify-center gap-1">
            <Upload className="w-3 h-3" />
            Click or drop a file
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-background/60 border border-border rounded-2xl p-4 space-y-4">
      <audio
        ref={audioRef}
        src={track.url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center border border-orange-500/30 flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground block">{label}</span>
            <span className="text-sm font-semibold truncate block max-w-[140px] sm:max-w-[180px]">
              {track.file.name}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-secondary border border-border px-2.5 py-1.5 rounded-lg transition-colors shadow-sm flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-sm flex-shrink-0"
        >
          {track.isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>
        <span className="text-xs font-mono text-muted-foreground">
          {formatTime(track.currentTime)} / {formatTime(track.duration)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-semibold">
            <Volume2 className="w-3.5 h-3.5 text-orange-500" />
            <span>Volume</span>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            {Math.round(track.volume * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={track.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-full accent-orange-500 cursor-pointer"
        />
      </div>
    </div>
  );
}