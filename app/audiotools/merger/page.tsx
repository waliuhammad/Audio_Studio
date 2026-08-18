


"use client";

import React, { useState, useRef, DragEvent, useEffect } from "react";
import Link from "next/link";
import { 
  Upload, 
  Layers, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  AlertCircle, 
  ArrowLeft,
  Loader2,
  Plus,
  Play,
  Square,
  Clock,
  Music
} from "lucide-react";
import { useToolResult } from "@/components/library/ToolResult";

type AudioFileItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  duration: number;
  startTimeStr: string;
  endTimeStr: string;
};

// Helper to format seconds into mm:ss
const formatTimeDisplay = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function AudioMergerPage() {
  const { setResult } = useToolResult();

  const [items, setItems] = useState<AudioFileItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "merging" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const waveformRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [draggingPlayheadId, setDraggingPlayheadId] = useState<string | null>(null);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(audioUrl);
      };
    });
  };

  const parseTimeString = (timeStr: string, maxDuration: number): number => {
    if (!timeStr) return 0;
    const trimmed = timeStr.trim();
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":");
      const mins = parseFloat(parts[0] || "0") || 0;
      const secs = parseFloat(parts[1] || "0") || 0;
      const total = mins * 60 + secs;
      return maxDuration > 0 ? Math.min(total, maxDuration) : total;
    }
    const val = parseFloat(trimmed) || 0;
    return maxDuration > 0 ? Math.min(val, maxDuration) : val;
  };

  const handleFilesSelected = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const newItems: AudioFileItem[] = [];
    
    for (const file of fileArray) {
      if (file.size > 100 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds the 100 MB limit.`);
        setStatus("error");
        continue;
      }
      const duration = await getAudioDuration(file);
      const defaultEnd = duration ? Number(duration.toFixed(1)) : 10;
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        duration: duration || 60,
        startTimeStr: "00:00",
        endTimeStr: formatTimeDisplay(defaultEnd),
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    if (playingId === id) {
      stopPreview();
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setStatus("idle");
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    
    const updated = [...items];
    const temp = updated[index]!;
    updated[index] = updated[targetIndex]!;
    updated[targetIndex] = temp;
    setItems(updated);
  };

  const updateTimeStringField = (id: string, field: "startTimeStr" | "endTimeStr", value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const getPreviewBounds = (item: AudioFileItem) => {
    const startSec = Math.max(
      0,
      Math.min(item.duration, parseTimeString(item.startTimeStr, item.duration))
    );

    const parsedEnd = parseTimeString(item.endTimeStr, item.duration);
    const endSec =
      parsedEnd > startSec
        ? Math.min(item.duration, parsedEnd)
        : item.duration;

    return {
      startSec,
      endSec,
      hasBoundarySelection:
        startSec > 0 || (endSec > 0 && endSec < item.duration),
    };
  };

  const getTimeFromWaveform = (
    item: AudioFileItem,
    clientX: number
  ): number | null => {
    const waveform = waveformRefs.current[item.id];

    if (!waveform || item.duration <= 0) {
      return null;
    }

    const rect = waveform.getBoundingClientRect();

    if (rect.width <= 0) {
      return null;
    }

    const percent = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );

    const rawTime = percent * item.duration;
    const { startSec, endSec } = getPreviewBounds(item);

    return Math.max(startSec, Math.min(endSec, rawTime));
  };

  const startPreviewAt = (item: AudioFileItem, requestedTime: number) => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }

    const audioUrl = URL.createObjectURL(item.file);
    const audio = new Audio(audioUrl);
    audioPreviewRef.current = audio;

    const { startSec, endSec, hasBoundarySelection } =
      getPreviewBounds(item);

    const safeTime = Math.max(
      startSec,
      Math.min(
        endSec,
        Number.isFinite(requestedTime) ? requestedTime : startSec
      )
    );

    audio.currentTime = safeTime;
    setCurrentPlaybackTime(safeTime);
    setPlayingId(item.id);

    const handleTimeUpdate = () => {
      const nextTime = audio.currentTime;
      setCurrentPlaybackTime(nextTime);

      if (hasBoundarySelection && nextTime >= endSec) {
        audio.pause();
        audio.currentTime = endSec;
        setCurrentPlaybackTime(endSec);
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
        return;
      }

      if (!hasBoundarySelection && nextTime >= item.duration) {
        audio.pause();
        audio.currentTime = item.duration;
        setCurrentPlaybackTime(item.duration);
        setPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    audio.onended = () => {
      const finalTime = hasBoundarySelection ? endSec : item.duration;
      setCurrentPlaybackTime(finalTime);
      setPlayingId(null);
      URL.revokeObjectURL(audioUrl);
    };

    void audio.play().catch(() => {
      setPlayingId(null);
      URL.revokeObjectURL(audioUrl);
    });
  };

  const togglePreview = (item: AudioFileItem) => {
    if (playingId === item.id) {
      stopPreview();
      return;
    }

    const { startSec } = getPreviewBounds(item);
    startPreviewAt(item, startSec);
  };

  const seekPreviewFromWaveform = (
    item: AudioFileItem,
    clientX: number,
    shouldPlay: boolean
  ) => {
    const targetTime = getTimeFromWaveform(item, clientX);

    if (targetTime === null) {
      return;
    }

    const currentAudio = audioPreviewRef.current;

    if (playingId === item.id && currentAudio) {
      currentAudio.currentTime = targetTime;
      setCurrentPlaybackTime(targetTime);

      if (shouldPlay && currentAudio.paused) {
        void currentAudio.play().catch(() => {});
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
    if (draggingPlayheadId !== item.id) {
      return;
    }

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

  const stopPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setPlayingId(null);
    setCurrentPlaybackTime(0);
    setDraggingPlayheadId(null);
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const handleReset = () => {
    stopPreview();
    setItems([]);
    setStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMergeAndDownload = async () => {
    if (items.length < 2) {
      setErrorMessage("Please select at least 2 audio files to merge.");
      setStatus("error");
      return;
    }

    stopPreview();
    setStatus("merging");
    setErrorMessage("");

    try {
      const formData = new FormData();
      items.forEach((item) => {
        const startSec = parseTimeString(item.startTimeStr, item.duration);
        const endSec = parseTimeString(item.endTimeStr, item.duration);

        formData.append("files", item.file);
        formData.append("startTimes", startSec.toString());
        formData.append("endTimes", endSec.toString());
      });

      const response = await fetch("/api/audio/merge", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to merge audio files.");
        } else {
          throw new Error("Audio merger API route was not found. Check app/api/audio/merge/route.ts.");
        }
      }

      if (contentType.includes("application/json")) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to merge audio files.");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "audio-merged.mp3";

      // Hand the finished file to the save-to-library bar in the layout.
      setResult({ blob, fileName: "audio-merged.mp3" });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during merging.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-semibold tracking-wide uppercase">
            <Layers className="w-3.5 h-3.5" /> Audio Tool
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Audio Merger</h1>
          <p className="text-muted-foreground">
            Visualize audio tracks, preview waveforms with timestamps, customize time ranges, and combine audio files seamlessly.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-8">

          {/* Error Banner */}
          {status === "error" && errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Processing Error</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {status === "success" && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
              <span className="font-medium">Audio files successfully trimmed, merged and downloaded as audio-merged.mp3!</span>
              <button 
                onClick={() => setStatus("idle")} 
                className="text-xs underline font-semibold hover:opacity-80"
              >
                Merge More
              </button>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging 
                ? "border-orange-500 bg-orange-500/10" 
                : "border-border hover:border-orange-500/50 bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mpeg"
              className="hidden"
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold mb-1">Click to upload or drag & drop audio files</h3>
            <p className="text-xs text-muted-foreground mb-3">
              MP3, WAV, M4A, OGG, AAC, FLAC, WEBM (Max 100 MB per file)
            </p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium shadow-sm hover:bg-orange-600 transition-colors">
              <Plus className="w-4 h-4" /> Add Audio Files
            </span>

          </div>

          {/* Selected Files List with Waveform Cards */}
          {items.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">
                  Selected Files & Timeline Control ({items.length})
                </h4>
                <span className="text-xs text-muted-foreground">
                  Format: mm:ss or seconds (e.g., 00:15 or 15)
                </span>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => {
                  const isPlayingThis = playingId === item.id;

                  const startSec = parseTimeString(item.startTimeStr, item.duration);
                  const endSec = parseTimeString(item.endTimeStr, item.duration);

                  const startPct = item.duration > 0 ? Math.max(0, Math.min(100, (startSec / item.duration) * 100)) : 0;
                  const endPct = item.duration > 0 ? Math.max(0, Math.min(100, (endSec / item.duration) * 100)) : 100;
                  const cursorTime = isPlayingThis
                    ? currentPlaybackTime
                    : startSec;

                  const playCursorPct =
                    item.duration > 0
                      ? Math.max(
                          0,
                          Math.min(100, (cursorTime / item.duration) * 100)
                        )
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-border bg-muted/20 space-y-4 transition-all"
                    >
                      {/* File Info Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-sm truncate">{item.name}</h5>
                            <p className="text-xs text-muted-foreground">
                              {(item.size / (1024 * 1024)).toFixed(2)} MB • {formatTimeDisplay(item.duration)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => moveItem(index, "up")}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(index, "down")}
                            disabled={index === items.length - 1}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors ml-1"
                            title="Remove File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Waveform Preview with Controllable Tracking Bar */}
                      <div
                        ref={(element) => {
                          waveformRefs.current[item.id] = element;
                        }}
                        onPointerDown={(event) =>
                          handleWaveformPointerDown(event, item)
                        }
                        onPointerMove={(event) =>
                          handleWaveformPointerMove(event, item)
                        }
                        onPointerUp={(event) =>
                          handleWaveformPointerUp(event, item)
                        }
                        onPointerCancel={handleWaveformPointerCancel}
                        className={`relative h-24 touch-none overflow-hidden rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 ${
                          item.duration > 0
                            ? "cursor-pointer"
                            : "cursor-default"
                        }`}
                      >
                        <div className="absolute inset-x-4 inset-y-2 flex items-center justify-between opacity-30 pointer-events-none">
                          {Array.from({ length: 45 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="w-1 rounded-full bg-orange-500"
                              style={{
                                height: `${Math.max(
                                  20,
                                  Math.sin(idx * 0.5) * 100
                                )}%`,
                              }}
                            />
                          ))}
                        </div>

                        <div
                          className="absolute inset-y-2 rounded-md border-x-2 border-orange-500 bg-orange-500/20 transition-all pointer-events-none flex items-center justify-between px-1"
                          style={{
                            left: `${startPct}%`,
                            right: `${100 - endPct}%`,
                          }}
                        >
                          <span className="rounded bg-background/80 px-1 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                            {formatTimeDisplay(startSec)}
                          </span>
                          <span className="rounded bg-background/80 px-1 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                            {formatTimeDisplay(endSec)}
                          </span>
                        </div>

                        {/* Controllable vertical tracking bar */}
                        <div
                          className={`absolute top-0 bottom-0 z-20 w-[3px] -translate-x-1/2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.55)] transition-[left] duration-75 dark:bg-orange-400 ${
                            draggingPlayheadId === item.id ? "w-1" : ""
                          }`}
                          style={{
                            left: `${playCursorPct}%`,
                          }}
                        />

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="rounded bg-background/50 px-1 text-xs font-medium uppercase tracking-wider text-orange-600/60 dark:text-orange-400/60">
                            {isPlayingThis
                              ? `Playing (${formatTimeDisplay(
                                  currentPlaybackTime
                                )})`
                              : "Waveform Preview"}
                          </span>
                        </div>
                      </div>

                      {/* Time Inputs & Preview Button Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-orange-500" /> Start (mm:ss or s)
                          </span>
                          <input
                            type="text"
                            value={item.startTimeStr}
                            onChange={(e) => updateTimeStringField(item.id, "startTimeStr", e.target.value)}
                            placeholder="00:00"
                            className="px-3 py-2 rounded-xl border border-border bg-background font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-orange-500" /> End (mm:ss or s)
                          </span>
                          <input
                            type="text"
                            value={item.endTimeStr}
                            onChange={(e) => updateTimeStringField(item.id, "endTimeStr", e.target.value)}
                            placeholder="00:10"
                            className="px-3 py-2 rounded-xl border border-border bg-background font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        <div className="flex items-center gap-2 col-span-1 sm:col-span-2 justify-end">
                          <button
                            type="button"
                            onClick={() => togglePreview(item)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                              isPlayingThis 
                                ? "bg-orange-500 text-white border-orange-500 shadow-sm" 
                                : "border-border bg-background hover:bg-muted"
                            }`}
                          >
                            {isPlayingThis ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            {isPlayingThis ? "Stop Preview" : "Preview Audio"}
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {items.length > 0 && (
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={handleReset}
                disabled={status === "merging"}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={handleMergeAndDownload}
                disabled={status === "merging" || items.length < 2}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {status === "merging" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Trimming & Merging...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Merge & Download
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}