


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
  Download,
  FileAudio,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import JSZip from "jszip";

type AudioPart = {
  id: number;
  start: number;
  end: number;
  previewUrl: string | null;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function secondsToInput(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function parseTime(value: string): number {
  const trimmed = value.trim();

  if (!trimmed) {
    return NaN;
  }

  if (trimmed.includes(":")) {
    const pieces = trimmed.split(":");

    if (pieces.length === 2) {
      const minutes = Number(pieces[0]);
      const seconds = Number(pieces[1]);

      if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
        return NaN;
      }

      return minutes * 60 + seconds;
    }

    if (pieces.length === 3) {
      const hours = Number(pieces[0]);
      const minutes = Number(pieces[1]);
      const seconds = Number(pieces[2]);

      if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        !Number.isFinite(seconds)
      ) {
        return NaN;
      }

      return hours * 3600 + minutes * 60 + seconds;
    }

    return NaN;
  }

  const numberValue = Number(trimmed);

  return Number.isFinite(numberValue) ? numberValue : NaN;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .trim()
      .slice(0, 100) || "audio"
  );
}

function createParts(count: number, duration: number): AudioPart[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const safeCount = Math.max(2, Math.min(5, Math.floor(count)));
  const partDuration = duration / safeCount;

  return Array.from({ length: safeCount }, (_, index) => {
    const start = index * partDuration;
    const end =
      index === safeCount - 1 ? duration : (index + 1) * partDuration;

    return {
      id: Date.now() + index,
      start,
      end,
      previewUrl: null,
    };
  });
}

function audioBufferToWavBlob(
  audioBuffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number
): Blob {
  const sampleRate = audioBuffer.sampleRate;

  const startSample = Math.max(0, Math.floor(startSeconds * sampleRate));

  const endSample = Math.min(
    audioBuffer.length,
    Math.floor(endSeconds * sampleRate)
  );

  const frameCount = Math.max(0, endSample - startSample);
  const channelCount = audioBuffer.numberOfChannels;

  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);

  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);

  const byteRate = sampleRate * channelCount * bytesPerSample;

  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;

  for (let sample = 0; sample < frameCount; sample++) {
    const sourceIndex = startSample + sample;

    for (let channel = 0; channel < channelCount; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      let sampleValue = channelData[sourceIndex] ?? 0;

      sampleValue = Math.max(-1, Math.min(1, sampleValue));

      const pcmValue =
        sampleValue < 0 ? sampleValue * 0x8000 : sampleValue * 0x7fff;

      view.setInt16(offset, pcmValue, true);

      offset += 2;
    }
  }

  return new Blob([buffer], {
    type: "audio/wav",
  });
}

export default function AudioSplitterPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [numberOfParts, setNumberOfParts] = useState(2);
  const [parts, setParts] = useState<AudioPart[]>([]);

  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingPart, setLoadingPart] = useState<number | null>(null);

  const [playingPart, setPlayingPart] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [decodedAudio, setDecodedAudio] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      parts.forEach((part) => {
        if (part.previewUrl) {
          URL.revokeObjectURL(part.previewUrl);
        }
      });
    };
  }, [audioUrl, parts]);

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    parts.forEach((part) => {
      if (part.previewUrl) {
        URL.revokeObjectURL(part.previewUrl);
      }
    });

    setFile(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setNumberOfParts(2);
    setParts([]);
    setDecodedAudio(null);
    setLoading(false);
    setLoadingPart(null);
    setPlayingPart(null);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = (selectedFile: File) => {
    setError("");
    setSuccess("");

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File is larger than the 100 MB limit.");
      return;
    }

    const fileName = selectedFile.name.toLowerCase();

    const validExtension =
      fileName.endsWith(".mp3") ||
      fileName.endsWith(".wav") ||
      fileName.endsWith(".m4a") ||
      fileName.endsWith(".ogg") ||
      fileName.endsWith(".aac") ||
      fileName.endsWith(".flac") ||
      fileName.endsWith(".webm") ||
      fileName.endsWith(".mpeg");

    if (!validExtension) {
      setError(
        "Please upload MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, or MPEG audio."
      );
      return;
    }

    setFile(selectedFile);

    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);

    setDuration(0);
    setCurrentTime(0);
    setParts([]);
    setDecodedAudio(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    processFile(selectedFile);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) {
      return;
    }

    processFile(droppedFile);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      setError(
        "The browser could not read the duration of this audio file."
      );
      return;
    }

    const loadedDuration = audio.duration;

    setDuration(loadedDuration);

    const initialParts = createParts(numberOfParts, loadedDuration);

    setParts(initialParts);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setCurrentTime(audio.currentTime);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seekFromWaveform = (clientX: number) => {
    const waveform = waveformRef.current;
    const audio = audioRef.current;

    if (!waveform || !audio || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const rect = waveform.getBoundingClientRect();

    if (rect.width <= 0) {
      return;
    }

    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );

    const newTime = ratio * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!audioRef.current || duration <= 0) {
      return;
    }

    setIsDraggingPlayhead(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromWaveform(event.clientX);
  };

  const handleWaveformPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!isDraggingPlayhead) {
      return;
    }

    seekFromWaveform(event.clientX);
  };

  const handleWaveformPointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    setIsDraggingPlayhead(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWaveformPointerCancel = () => {
    setIsDraggingPlayhead(false);
  };

  const toggleMainAudio = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handlePartsCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;

    if (rawValue === "") {
      setNumberOfParts(2);
      return;
    }

    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const safeValue = Math.max(2, Math.min(5, Math.floor(parsed)));

    setNumberOfParts(safeValue);

    if (duration > 0) {
      setParts(createParts(safeValue, duration));
    }
  };

  const updatePartStart = (index: number, value: string) => {
    setParts((previous) =>
      previous.map((part, partIndex) => {
        if (partIndex !== index) {
          return part;
        }

        const parsed = parseTime(value);

        return {
          ...part,
          start: Number.isFinite(parsed) ? parsed : part.start,
          previewUrl: null,
        };
      })
    );

    setError("");
    setSuccess("");
  };

  const updatePartEnd = (index: number, value: string) => {
    setParts((previous) =>
      previous.map((part, partIndex) => {
        if (partIndex !== index) {
          return part;
        }

        const parsed = parseTime(value);

        return {
          ...part,
          end: Number.isFinite(parsed) ? parsed : part.end,
          previewUrl: null,
        };
      })
    );

    setError("");
    setSuccess("");
  };

  const addPart = () => {
    if (parts.length >= 5) {
      setError("You can create a maximum of 5 parts.");
      return;
    }

    if (duration <= 0) {
      setError("Please wait until the audio duration is loaded.");
      return;
    }

    const nextCount = parts.length + 1;

    setNumberOfParts(nextCount);
    setParts(createParts(nextCount, duration));
    setSuccess("");
    setError("");
  };

  const removePart = (index: number) => {
    if (parts.length <= 2) {
      setError("You must keep at least 2 parts.");
      return;
    }

    const nextCount = parts.length - 1;

    setNumberOfParts(nextCount);

    if (duration > 0) {
      setParts(createParts(nextCount, duration));
    }

    setPlayingPart(null);
    setSuccess("");
    setError("");
  };

  const validateParts = (): boolean => {
    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Audio duration is not available.");
      return false;
    }

    if (parts.length < 2 || parts.length > 5) {
      setError("Please choose between 2 and 5 parts.");
      return false;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (!part) {
        setError(`Part ${i + 1} is missing.`);
        return false;
      }

      const start = Number(part.start);
      const end = Number(part.end);

      if (!Number.isFinite(start)) {
        setError(`Part ${i + 1} has an invalid start time.`);
        return false;
      }

      if (!Number.isFinite(end)) {
        setError(`Part ${i + 1} has an invalid end time.`);
        return false;
      }

      if (start < 0) {
        setError(`Part ${i + 1} cannot start before 00:00.`);
        return false;
      }

      if (end <= start) {
        setError(
          `Part ${i + 1} end time must be greater than its start time.`
        );
        return false;
      }

      if (start > duration) {
        setError(`Part ${i + 1} cannot start after the audio duration.`);
        return false;
      }

      if (end > duration + 0.01) {
        setError(`Part ${i + 1} cannot end after ${formatTime(duration)}.`);
        return false;
      }
    }

    return true;
  };

  const decodeOriginalAudio = async (): Promise<AudioBuffer> => {
    if (decodedAudio) {
      return decodedAudio;
    }

    if (!file) {
      throw new Error("No audio file selected.");
    }

    const arrayBuffer = await file.arrayBuffer();

    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("Your browser does not support Web Audio processing.");
    }

    const context = new AudioContextClass();

    try {
      const decoded = await context.decodeAudioData(arrayBuffer.slice(0));

      setDecodedAudio(decoded);

      return decoded;
    } finally {
      await context.close();
    }
  };

  const createPartBlob = async (part: AudioPart): Promise<Blob> => {
    const buffer = await decodeOriginalAudio();

    return audioBufferToWavBlob(buffer, part.start, part.end);
  };

  const previewPart = async (index: number) => {
    setError("");
    setSuccess("");

    const part = parts[index];

    if (!part) {
      setError("Selected part does not exist.");
      return;
    }

    if (!validateParts()) {
      return;
    }

    setLoadingPart(index);

    try {
      const blob = await createPartBlob(part);
      const url = URL.createObjectURL(blob);

      setParts((previous) =>
        previous.map((item, itemIndex) => {
          if (itemIndex !== index) {
            return item;
          }

          if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
          }

          return {
            ...item,
            previewUrl: url,
          };
        })
      );

      setPlayingPart(index);

      setTimeout(() => {
        if (previewAudioRef.current) {
          void previewAudioRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to create the preview. Your browser may not support this audio format."
      );
    } finally {
      setLoadingPart(null);
    }
  };

  const splitAudio = async () => {
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please upload an audio file first.");
      return;
    }

    if (!validateParts()) {
      return;
    }

    setLoading(true);

    try {
      const buffer = await decodeOriginalAudio();

      const zip = new JSZip();

      const baseName = sanitizeFileName(file.name);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (!part) {
          throw new Error(`Part ${i + 1} is missing.`);
        }

        const blob = audioBufferToWavBlob(buffer, part.start, part.end);

        zip.file(
          `${baseName}-part-${String(i + 1).padStart(2, "0")}.wav`,
          blob
        );
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      const downloadUrl = URL.createObjectURL(zipBlob);

      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${baseName}-split.zip`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 2000);

      setSuccess(
        `Successfully created ${parts.length} audio parts. Your ZIP download has started.`
      );
    } catch (err) {
      console.error("Audio splitting error:", err);

      const message =
        err instanceof Error ? err.message : "Unknown audio processing error.";

      setError(`Unable to split the audio. ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <FileAudio className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Audio Splitter
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Split your audio into 2 to 5 custom pieces using
            precise start and end times.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
          {!file && (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => {
                setDragActive(false);
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
                dragActive
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-border hover:border-orange-500/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mpeg,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
                <Upload className="h-7 w-7 text-orange-500" />
              </div>

              <h2 className="text-lg font-semibold">Upload your audio</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your file here or click to browse
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG • Max 100 MB
              </p>
            </div>
          )}

          {file && audioUrl && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Selected Files & Timeline Control (1)
                </h2>
                <span className="text-xs text-muted-foreground">
                  Format: mm:ss or seconds (e.g., 00:15 or 15)
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <FileAudio className="h-5 w-5 text-orange-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm sm:text-base">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {formatTime(duration)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={toggleMainAudio}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={reset}
                      disabled={loading}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={audioUrl}
                  preload="metadata"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleAudioEnded}
                  className="hidden"
                />

                <div
                  ref={waveformRef}
                  onPointerDown={handleWaveformPointerDown}
                  onPointerMove={handleWaveformPointerMove}
                  onPointerUp={handleWaveformPointerUp}
                  onPointerCancel={handleWaveformPointerCancel}
                  className={`relative mt-4 touch-none rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 shadow-inner sm:p-5 ${
                    duration > 0 ? "cursor-pointer" : "cursor-default"
                  }`}
                  aria-label="Audio waveform. Click or drag to seek."
                >
                  <div className="relative h-[68px] py-1">
                    <div className="relative z-10 flex h-full items-center justify-between gap-1 px-1 opacity-90">
                      {[
                        12, 24, 40, 18, 32, 54, 20, 14, 22, 38, 48, 16, 28,
                        60, 34, 18, 42, 24, 16, 44, 52, 20, 36, 14, 26, 48,
                        30, 18, 42, 56, 22, 12, 38, 24, 46, 16, 32, 50, 20,
                        14, 28, 44, 34, 18, 52, 22, 12, 40, 26, 36, 14, 24,
                      ].map((height, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-orange-500 transition-all"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>

                    {duration > 0 && (
                      <div
                        className="pointer-events-none absolute inset-y-0 z-20"
                        style={{
                          left: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div
                          className={`h-full rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.45)] transition-[width] ${
                            isDraggingPlayhead ? "w-[3px]" : "w-[2px]"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between px-1 text-xs font-semibold tracking-wider text-orange-600/70 dark:text-orange-400/70">
                    <span>{formatTime(currentTime)}</span>
                    <span className="tracking-[0.2em]">WAVEFORM PREVIEW</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-semibold">Number of pieces</h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose between 2 and 5 pieces.
                    </p>
                  </div>

                  <div className="w-full sm:w-40">
                    <label
                      htmlFor="parts"
                      className="mb-2 block text-xs font-medium text-muted-foreground"
                    >
                      Split into
                    </label>

                    <input
                      id="parts"
                      type="number"
                      min={2}
                      max={5}
                      value={numberOfParts}
                      onChange={handlePartsCountChange}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-500"
                    />

                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter a number from 2 to 5
                    </p>
                  </div>
                </div>
              </div>

              {parts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">Split timings</h2>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Customize the start and end time of every
                        piece.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addPart}
                      disabled={parts.length >= 5}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm font-medium text-orange-500 transition-colors hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add part
                    </button>
                  </div>

                  <div className="space-y-3">
                    {parts.map((part, index) => (
                      <div
                        key={part.id}
                        className="rounded-xl border border-border bg-background/40 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-sm font-semibold text-orange-500">
                              {index + 1}
                            </span>

                            <div>
                              <p className="font-medium">Part {index + 1}</p>

                              <p className="text-xs text-muted-foreground">
                                {formatTime(
                                  Math.max(0, part.end - part.start)
                                )}
                              </p>
                            </div>
                          </div>

                          {parts.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removePart(index)}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`start-${part.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              Start (mm:ss or s)
                            </label>

                            <input
                              id={`start-${part.id}`}
                              type="text"
                              inputMode="decimal"
                              value={secondsToInput(part.start)}
                              onChange={(event) =>
                                updatePartStart(index, event.target.value)
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-500"
                            />

                            <p className="mt-1 text-xs text-muted-foreground">
                              Example: 00:30 or 30
                            </p>
                          </div>

                          <div>
                            <label
                              htmlFor={`end-${part.id}`}
                              className="mb-2 block text-xs font-medium text-muted-foreground"
                            >
                              End (mm:ss or s)
                            </label>

                            <input
                              id={`end-${part.id}`}
                              type="text"
                              inputMode="decimal"
                              value={secondsToInput(part.end)}
                              onChange={(event) =>
                                updatePartEnd(index, event.target.value)
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-500"
                            />

                            <p className="mt-1 text-xs text-muted-foreground">
                              Max: {formatTime(duration)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-xs text-muted-foreground">
                            {formatTime(part.start)} → {formatTime(part.end)}
                          </div>

                          <button
                            type="button"
                            disabled={loadingPart === index}
                            onClick={() => previewPart(index)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-500 transition-colors hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loadingPart === index ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                Preview Part
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={loading || parts.length === 0}
                  onClick={splitAudio}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Splitting & Zipping...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Split & Download ZIP ({parts.length} parts)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <audio
        ref={previewAudioRef}
        src={
          playingPart !== null
            ? parts[playingPart]?.previewUrl || undefined
            : undefined
        }
        onEnded={() => setPlayingPart(null)}
        className="hidden"
      />
    </main>
  );
}