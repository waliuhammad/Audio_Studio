"use client";

import React, {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
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
} from "lucide-react";

import { decodeAudioFile } from "@/lib/audio/audio-utils";
import { useAudioEngine } from "@/components/editor/useAudioEngine";

/* =========================================================
   CONFIG
   Point this at the actual path of your server route
   (the ffmpeg-based split-and-zip API handler).
========================================================= */

const AUDIO_SPLIT_ENDPOINT = "/api/audio/split";

/* =========================================================
   TYPES
========================================================= */

type AudioPart = {
  id: number;
  start: number;
  end: number;
  previewUrl: string | null;
};

type OrangeWaveformProps = {
  buffer: AudioBuffer;
  duration: number;
  parts: AudioPart[];
  onMarkerChange: (boundaryIndex: number, requestedTime: number) => void;
  onSeek: (time: number) => void;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MIN_PART_LENGTH = 0.05;
const TIME_TOLERANCE = 0.02;

/* =========================================================
   TIME HELPERS
========================================================= */

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function secondsToInput(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
      if (
        !Number.isFinite(minutes) ||
        !Number.isFinite(seconds) ||
        minutes < 0 ||
        seconds < 0
      ) {
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
        !Number.isFinite(seconds) ||
        hours < 0 ||
        minutes < 0 ||
        seconds < 0
      ) {
        return NaN;
      }
      return hours * 3600 + minutes * 60 + seconds;
    }

    return NaN;
  }

  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : NaN;
}

/* =========================================================
   FILE SIZE
========================================================= */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* =========================================================
   FILE NAME
========================================================= */

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .trim()
      .slice(0, 100) || "audio"
  );
}

function extractFileNameFromDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const rawName = match?.[1];
  if (!rawName) {
    return null;
  }
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

/* =========================================================
   CREATE PARTS
========================================================= */

function createParts(count: number, duration: number): AudioPart[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const safeCount = Math.max(2, Math.min(5, Math.floor(count)));
  const partDuration = duration / safeCount;

  return Array.from({ length: safeCount }, (_, index) => {
    const start = index * partDuration;
    const end = index === safeCount - 1 ? duration : (index + 1) * partDuration;

    return {
      id: Date.now() + index,
      start,
      end,
      previewUrl: null,
    };
  });
}

/* =========================================================
   REVOKE PREVIEW URLS
========================================================= */

function revokePreviewUrls(items: AudioPart[]) {
  items.forEach((part) => {
    if (part.previewUrl) {
      URL.revokeObjectURL(part.previewUrl);
    }
  });
}

/* =========================================================
   AUDIO BUFFER -> WAV
   (used for instant client-side "Preview Part" only —
   the real export goes through the ffmpeg API route)
========================================================= */

function audioBufferToWavBlob(
  audioBuffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number
): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startSeconds * sampleRate));
  const endSample = Math.min(audioBuffer.length, Math.floor(endSeconds * sampleRate));
  const frameCount = Math.max(0, endSample - startSample);

  const channelCount = audioBuffer.numberOfChannels;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frameCount * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

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

      const pcmValue = sampleValue < 0 ? sampleValue * 0x8000 : sampleValue * 0x7fff;
      view.setInt16(offset, pcmValue, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/* =========================================================
   ORANGE WAVEFORM
   Restyled to match the shared waveform theme used across
   every audio tool: orange-500/10 tinted card, orange-500/40
   border, shadow-inner, rounded-full orange-500 bars, and
   text-orange-600 / dark:text-orange-400 time labels.
   Real RMS amplitude analysis + draggable split markers are
   preserved exactly as before — only colors/sizing changed.
========================================================= */

function OrangeWaveform({
  buffer,
  duration,
  parts,
  onMarkerChange,
  onSeek,
}: OrangeWaveformProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingMarkerRef = useRef<number | null>(null);
  const [barCount, setBarCount] = useState<number>(120);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateBarCount = () => {
      const width = element.getBoundingClientRect().width;
      const count = Math.max(90, Math.min(180, Math.floor(width / 8)));
      setBarCount(count);
    };

    updateBarCount();

    const resizeObserver = new ResizeObserver(updateBarCount);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const waveformBars = useMemo(() => {
    if (!buffer || buffer.length === 0) {
      return [];
    }

    const channelData = buffer.getChannelData(0);
    const rawValues: number[] = [];
    const sampleCount = Math.max(1, barCount);
    const samplesPerBar = Math.max(1, Math.floor(channelData.length / sampleCount));

    for (let i = 0; i < sampleCount; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(channelData.length, start + samplesPerBar);

      let sum = 0;
      for (let j = start; j < end; j++) {
        const value = channelData[j] ?? 0;
        sum += value * value;
      }

      const rms = Math.sqrt(sum / Math.max(1, end - start));
      rawValues.push(rms);
    }

    const maxValue = Math.max(...rawValues, 0.0001);

    return rawValues.map((value) => {
      const normalized = value / maxValue;
      const shaped = Math.pow(normalized, 0.68);
      return Math.max(0.14, Math.min(1, shaped));
    });
  }, [buffer, barCount]);

  const getTimeFromPointer = (clientX: number) => {
    const element = containerRef.current;
    if (!element || duration <= 0) {
      return 0;
    }

    const rect = element.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percentage * duration;
  };

  const handleWaveformClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (draggingMarkerRef.current !== null) {
      return;
    }
    const time = getTimeFromPointer(event.clientX);
    onSeek(time);
  };

  const handleMarkerPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    markerIndex: number
  ) => {
    event.preventDefault();
    event.stopPropagation();
    draggingMarkerRef.current = markerIndex;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMarkerPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    markerIndex: number
  ) => {
    if (draggingMarkerRef.current !== markerIndex) {
      return;
    }
    const time = getTimeFromPointer(event.clientX);
    onMarkerChange(markerIndex, time);
  };

  const handleMarkerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingMarkerRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer already released.
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleWaveformClick}
      className="relative h-[190px] w-full cursor-pointer select-none touch-none overflow-hidden rounded-xl border border-orange-500/40 bg-orange-500/10 shadow-inner"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-5 bottom-10 overflow-hidden"
      >
        <div className="flex h-full w-full items-center justify-center" style={{ gap: "4px" }}>
          {waveformBars.length > 0 ? (
            waveformBars.map((amplitude, index) => {
              const heightPercent = Math.max(
                24,
                Math.min(92, Math.round(amplitude * 92))
              );

              return (
                <div
                  key={index}
                  className="shrink-0 rounded-full bg-orange-500 transition-all"
                  style={{
                    width: "4px",
                    height: `${heightPercent}%`,
                    minHeight: "14px",
                    flexShrink: 0,
                  }}
                />
              );
            })
          ) : (
            <div className="w-full text-center text-xs text-muted-foreground">
              Generating waveform...
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-5 z-20">
        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
          00:00
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-5 z-20">
        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
          {formatTime(duration)}
        </span>
      </div>

      {parts.slice(0, -1).map((part, index) => {
        const percentage = duration > 0 ? (part.end / duration) * 100 : 0;

        return (
          <div
            key={part.id}
            className="absolute bottom-0 top-0 z-30"
            style={{ left: `${percentage}%`, transform: "translateX(-50%)" }}
          >
            <div
              className="absolute bottom-0 left-1/2 top-0 w-[2px] -translate-x-1/2 bg-orange-600"
              style={{ boxShadow: "0 0 8px rgba(234, 88, 12, 0.45)" }}
            />

            <div
              role="slider"
              aria-label={`Move split point ${index + 1}`}
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={part.end}
              aria-valuetext={formatTime(part.end)}
              tabIndex={0}
              onPointerDown={(event) => handleMarkerPointerDown(event, index)}
              onPointerMove={(event) => handleMarkerPointerMove(event, index)}
              onPointerUp={handleMarkerPointerUp}
              onClick={(event) => event.stopPropagation()}
              className="absolute left-1/2 top-1/2 flex h-10 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-500/20"
            >
              <span className="h-5 w-[2px] rounded-full bg-white/90" />
            </div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[30px] whitespace-nowrap">
              <span className="rounded-md border border-orange-500/30 bg-background px-2 py-1 text-[10px] font-semibold text-orange-600 shadow-sm dark:text-orange-400">
                {formatTime(part.end)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function AudioSplitterPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);

  const decodedAudioRef = useRef<AudioBuffer | null>(null);
  const decodePromiseRef = useRef<Promise<AudioBuffer> | null>(null);
  const partsRef = useRef<AudioPart[]>([]);
  const numberOfPartsRef = useRef(2);

  const [numberOfParts, setNumberOfParts] = useState(2);
  const [parts, setParts] = useState<AudioPart[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPart, setLoadingPart] = useState<number | null>(null);
  const [playingPart, setPlayingPart] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [decodedAudio, setDecodedAudio] = useState<AudioBuffer | null>(null);

  /* =========================================================
     INLINE DOWNLOAD STATE
     (replaces the separate popup card — filled in once
     the server route returns the finished zip)
  ========================================================= */

  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState("");

  const clearDownloadState = () => {
    setDownloadBlob(null);
    setDownloadFileName("");
  };

  /* =========================================================
     AUDIO ENGINE
  ========================================================= */

  const audioEngine = useAudioEngine(decodedAudio, null);
  const { isPlaying } = audioEngine;

  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(partsRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    decodedAudioRef.current = null;
    decodePromiseRef.current = null;

    if (!file) {
      return;
    }

    const decodePromise = decodeAudioFile(file);
    decodePromiseRef.current = decodePromise;

    void decodePromise
      .then((decoded) => {
        if (cancelled) {
          return;
        }

        decodedAudioRef.current = decoded;
        setDecodedAudio(decoded);
        setDuration(decoded.duration);

        const newParts = createParts(numberOfPartsRef.current, decoded.duration);
        setParts(newParts);
      })
      .catch((decodeError) => {
        if (!cancelled) {
          console.error("Waveform decode failed:", decodeError);
          setError("Unable to decode the waveform for this audio file.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const reset = () => {
    audioEngine.stop();

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    revokePreviewUrls(parts);

    setFile(null);
    setDuration(0);
    setNumberOfParts(2);
    numberOfPartsRef.current = 2;
    setParts([]);
    setDecodedAudio(null);
    decodedAudioRef.current = null;
    decodePromiseRef.current = null;
    setLoading(false);
    setLoadingPart(null);
    setPlayingPart(null);
    setError("");
    setSuccess("");
    clearDownloadState();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFile = (selectedFile: File) => {
    setError("");
    setSuccess("");
    clearDownloadState();

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
      fileName.endsWith(".mpeg") ||
      fileName.endsWith(".mpga");

    if (!validExtension) {
      setError("Please upload MP3, WAV, M4A, OGG, AAC, FLAC, WEBM, MPEG, or MPGA audio.");
      return;
    }

    revokePreviewUrls(parts);
    audioEngine.stop();

    setFile(selectedFile);
    setDuration(0);
    setParts([]);
    setDecodedAudio(null);
    decodedAudioRef.current = null;
    decodePromiseRef.current = null;
    setPlayingPart(null);
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

  const toggleMainAudio = audioEngine.toggle;

  const handleBoundaryChange = (boundaryIndex: number, requestedTime: number) => {
    const previousPart = parts[boundaryIndex];
    const nextPart = parts[boundaryIndex + 1];

    if (!previousPart || !nextPart) {
      return;
    }

    const minimumBoundary = previousPart.start + MIN_PART_LENGTH;
    const maximumBoundary = nextPart.end - MIN_PART_LENGTH;
    const boundaryTime = Math.max(minimumBoundary, Math.min(maximumBoundary, requestedTime));

    setParts((previous) =>
      previous.map((part, index) => {
        if (index === boundaryIndex) {
          if (part.previewUrl) {
            URL.revokeObjectURL(part.previewUrl);
          }
          return { ...part, end: boundaryTime, previewUrl: null };
        }

        if (index === boundaryIndex + 1) {
          if (part.previewUrl) {
            URL.revokeObjectURL(part.previewUrl);
          }
          return { ...part, start: boundaryTime, previewUrl: null };
        }

        return part;
      })
    );

    setError("");
    setSuccess("");
    clearDownloadState();
  };

  const handlePartsCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;

    if (rawValue === "") {
      setNumberOfParts(2);
      numberOfPartsRef.current = 2;
      return;
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const safeValue = Math.max(2, Math.min(5, Math.floor(parsed)));
    setNumberOfParts(safeValue);
    numberOfPartsRef.current = safeValue;

    if (duration > 0) {
      revokePreviewUrls(parts);
      setPlayingPart(null);
      setParts(createParts(safeValue, duration));
    }

    setError("");
    setSuccess("");
    clearDownloadState();
  };

  const updatePartStart = (index: number, value: string) => {
    const parsed = parseTime(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const currentPart = parts[index];
    if (!currentPart) {
      return;
    }

    const previousEnd = index > 0 ? parts[index - 1]?.end ?? 0 : 0;
    const maxStart = currentPart.end - MIN_PART_LENGTH;
    const safeStart = Math.max(previousEnd, Math.min(maxStart, parsed));

    setParts((previous) =>
      previous.map((part, partIndex) => {
        if (partIndex !== index) {
          return part;
        }
        if (part.previewUrl) {
          URL.revokeObjectURL(part.previewUrl);
        }
        return { ...part, start: safeStart, previewUrl: null };
      })
    );

    setError("");
    setSuccess("");
    clearDownloadState();
  };

  const updatePartEnd = (index: number, value: string) => {
    const parsed = parseTime(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const currentPart = parts[index];
    if (!currentPart) {
      return;
    }

    const nextStart = index < parts.length - 1 ? parts[index + 1]?.start ?? duration : duration;
    const minEnd = currentPart.start + MIN_PART_LENGTH;
    const safeEnd = Math.min(nextStart, Math.max(minEnd, parsed));

    setParts((previous) =>
      previous.map((part, partIndex) => {
        if (partIndex !== index) {
          return part;
        }
        if (part.previewUrl) {
          URL.revokeObjectURL(part.previewUrl);
        }
        return { ...part, end: safeEnd, previewUrl: null };
      })
    );

    setError("");
    setSuccess("");
    clearDownloadState();
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
    numberOfPartsRef.current = nextCount;

    revokePreviewUrls(parts);
    setParts(createParts(nextCount, duration));
    setPlayingPart(null);

    setError("");
    setSuccess("");
    clearDownloadState();
  };

  const removePart = (index: number) => {
    if (parts.length <= 2) {
      setError("You must keep at least 2 parts.");
      return;
    }

    if (index < 0 || index >= parts.length) {
      return;
    }

    const nextCount = parts.length - 1;
    setNumberOfParts(nextCount);
    numberOfPartsRef.current = nextCount;

    revokePreviewUrls(parts);
    setParts(createParts(nextCount, duration));
    setPlayingPart(null);

    setError("");
    setSuccess("");
    clearDownloadState();
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

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        setError(`Part ${i + 1} has an invalid time.`);
        return false;
      }

      if (start < 0 || start > duration) {
        setError(`Part ${i + 1} has an invalid start time.`);
        return false;
      }

      if (end > duration + TIME_TOLERANCE) {
        setError(`Part ${i + 1} cannot end after ${formatTime(duration)}.`);
        return false;
      }

      if (end <= start) {
        setError(`Part ${i + 1} end time must be greater than its start time.`);
        return false;
      }

      if (end - start < MIN_PART_LENGTH) {
        setError(`Part ${i + 1} is too short.`);
        return false;
      }

      if (i > 0) {
        const previous = parts[i - 1];
        if (!previous) {
          return false;
        }

        const difference = start - previous.end;

        if (Math.abs(difference) > TIME_TOLERANCE) {
          setError(
            difference > 0
              ? `There is a gap between Part ${i} and Part ${i + 1}.`
              : `Part ${i} and Part ${i + 1} overlap.`
          );
          return false;
        }
      }
    }

    const firstPart = parts[0];
    if (!firstPart || Math.abs(firstPart.start) > TIME_TOLERANCE) {
      setError("The first part must start at 00:00.");
      return false;
    }

    const lastPart = parts[parts.length - 1];
    if (!lastPart || Math.abs(lastPart.end - duration) > TIME_TOLERANCE) {
      setError(`The last part must end at ${formatTime(duration)}.`);
      return false;
    }

    setError("");
    return true;
  };

  const decodeOriginalAudio = async (): Promise<AudioBuffer> => {
    if (decodedAudioRef.current) {
      return decodedAudioRef.current;
    }

    if (decodePromiseRef.current) {
      const decoded = await decodePromiseRef.current;
      decodedAudioRef.current = decoded;
      setDecodedAudio(decoded);
      return decoded;
    }

    if (!file) {
      throw new Error("No audio file selected.");
    }

    const promise = decodeAudioFile(file);
    decodePromiseRef.current = promise;

    const decoded = await promise;
    decodedAudioRef.current = decoded;
    setDecodedAudio(decoded);

    return decoded;
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
          return { ...item, previewUrl: url };
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
      setError("Unable to create the preview.");
    } finally {
      setLoadingPart(null);
    }
  };

  /* =========================================================
     SPLIT AUDIO
     Sends the file + segment times to the server route,
     which runs ffmpeg and streams back a real ZIP.
  ========================================================= */

  const splitAudio = async () => {
    setError("");
    setSuccess("");
    clearDownloadState();

    if (!file) {
      setError("Please upload an audio file first.");
      return;
    }

    if (!validateParts()) {
      return;
    }

    setLoading(true);

    try {
      const segments = parts.map((part) => ({
        start: part.start,
        end: part.end,
      }));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("segments", JSON.stringify(segments));

      const response = await fetch(AUDIO_SPLIT_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Unable to split the audio.";

        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // Response wasn't JSON — keep the default message.
        }

        throw new Error(message);
      }

      const zipBlob = await response.blob();

      const suggestedName =
        extractFileNameFromDisposition(response.headers.get("Content-Disposition")) ??
        `${sanitizeFileName(file.name)}-segments.zip`;

      setDownloadBlob(zipBlob);
      setDownloadFileName(suggestedName);
      setSuccess(`Successfully created ${parts.length} audio parts.`);
    } catch (err) {
      console.error("Audio splitting error:", err);
      setError(err instanceof Error ? err.message : "Unable to split the audio.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     DOWNLOAD HANDLER
     Triggers the browser download for the returned zip
     blob, using whatever name the user typed.
  ========================================================= */

  const handleDownload = () => {
    if (!downloadBlob) {
      return;
    }

    const trimmedName = downloadFileName.trim() || "audio-split.zip";
    const finalName = trimmedName.toLowerCase().endsWith(".zip")
      ? trimmedName
      : `${trimmedName}.zip`;

    const url = URL.createObjectURL(downloadBlob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = finalName;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <FileAudio className="h-7 w-7 text-orange-500" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Audio Splitter</h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Split your audio into 2 to 5 custom pieces using precise start and end times.
          </p>
        </div>

        {/* MAIN CARD */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
          {/* UPLOAD */}
          {!file && (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
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
                accept=".mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mpeg,.mpga,audio/*"
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

          {/* EDITOR */}
          {file && decodedAudio && (
            <div className="space-y-6">
              {/* SECTION HEADER */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Selected File & Timeline
                </h2>
                <span className="text-xs text-muted-foreground">Format: mm:ss or seconds</span>
              </div>

              {/* FILE CARD */}
              <div className="rounded-2xl border border-border bg-background/40 p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <FileAudio className="h-5 w-5 text-orange-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold sm:text-base">{file.name}</p>
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

                {/* WAVEFORM */}
                <div className="mt-5">
                  <OrangeWaveform
                    buffer={decodedAudio}
                    duration={duration}
                    parts={parts}
                    onMarkerChange={handleBoundaryChange}
                    onSeek={audioEngine.seek}
                  />
                </div>
              </div>

              {/* NUMBER OF PARTS */}
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
                  </div>
                </div>
              </div>

              {/* PARTS */}
              {parts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">Split timings</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Customize the start and end time of every piece.
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
                        {/* PART HEADER */}
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-sm font-semibold text-orange-500">
                              {index + 1}
                            </span>

                            <div>
                              <p className="font-medium">Part {index + 1}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(Math.max(0, part.end - part.start))}
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

                        {/* TIME INPUTS */}
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
                              onChange={(event) => updatePartStart(index, event.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-500"
                            />
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
                              onChange={(event) => updatePartEnd(index, event.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-500"
                            />
                          </div>
                        </div>

                        {/* PART ACTION */}
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

              {/* ERROR */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && !downloadBlob ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{success}</span>
                </div>
              ) : null}

              {/* SPLIT & DOWNLOAD */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={splitAudio}
                  disabled={loading || parts.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Splitting Your Audio....
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {`Split Audio (${parts.length} parts)`}
                    </>
                  )}
                </button>

                {/* INLINE RENAME + DOWNLOAD PANEL — neutral theme matching the other tools */}
                {downloadBlob && (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                        <CheckCircle2 className="h-5 w-5 text-orange-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Your file is ready</p>
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
                      Download ZIP
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HIDDEN PREVIEW AUDIO */}
      <audio
        ref={previewAudioRef}
        src={playingPart !== null ? parts[playingPart]?.previewUrl || undefined : undefined}
        onEnded={() => setPlayingPart(null)}
        onError={() => setPlayingPart(null)}
        className="hidden"
      />
    </main>
  );
}