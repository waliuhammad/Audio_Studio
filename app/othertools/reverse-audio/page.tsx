"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, History, FileText, Play, Pause, Download, RefreshCw, Loader2, Sparkles, Volume2, Settings2, ChevronDown } from "lucide-react";

export default function ReverseAudioPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reversedAudioUrl, setReversedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioBufferObj, setAudioBufferObj] = useState<AudioBuffer | null>(null);
  const [exportFormat, setExportFormat] = useState<"wav" | "mp3" | "ogg">("wav");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (reversedAudioUrl) {
        URL.revokeObjectURL(reversedAudioUrl);
      }
    };
  }, [reversedAudioUrl]);

  // Close custom dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Redraw waveform whenever time updates or buffer changes
  useEffect(() => {
    if (audioBufferObj && canvasRef.current) {
      drawWaveform(canvasRef.current, audioBufferObj, duration > 0 ? currentTime / duration : 0);
    }
  }, [currentTime, duration, audioBufferObj]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      await processReverseAudio(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      await processReverseAudio(file);
    }
  };

  const processReverseAudio = async (file: File) => {
    setIsProcessing(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (reversedAudioUrl) {
      URL.revokeObjectURL(reversedAudioUrl);
      setReversedAudioUrl(null);
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Reverse PCM channels
      const numChannels = decodedBuffer.numberOfChannels;
      const length = decodedBuffer.length;
      const sampleRate = decodedBuffer.sampleRate;

      const reversedBuffer = audioCtx.createBuffer(numChannels, length, sampleRate);
      for (let c = 0; c < numChannels; c++) {
        const inputData = decodedBuffer.getChannelData(c);
        const outputData = reversedBuffer.getChannelData(c);
        for (let i = 0; i < length; i++) {
          outputData[i] = inputData[length - 1 - i] ?? 0;
        }
      }

      setAudioBufferObj(reversedBuffer);
      setDuration(reversedBuffer.duration);

      // Convert AudioBuffer to WAV Blob for audio element playback and download
      const wavBlob = audioBufferToWav(reversedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setReversedAudioUrl(url);
    } catch (error) {
      console.error("Error processing audio:", error);
      alert("Failed to decode or reverse this audio file. Please ensure it's a valid MP3, WAV, or AAC file.");
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        out.setUint8(pos++, str.charCodeAt(i));
      }
    };

    const setUint16 = (data: number) => {
      out.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      out.setUint32(pos, data, true);
      pos += 4;
    };

    writeString("RIFF");
    setUint32(length - 8);
    writeString("WAVE");
    writeString("fmt ");
    setUint32(16);
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * numOfChan * 2);
    setUint16(numOfChan * 2);
    setUint16(16); // 16-bit
    writeString("data");
    setUint32(length - pos - 4);

    const channels: Float32Array[] = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        const channelData = channels[i];
        const sampleValue = channelData ? (channelData[offset] ?? 0) : 0;
        let sample = Math.max(-1, Math.min(1, sampleValue));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: "audio/wav" });
  };

  const drawWaveform = (canvas: HTMLCanvasElement, buffer: AudioBuffer, progress: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const rawData = buffer.getChannelData(0);
    const barsCount = 60;
    const blockSize = Math.floor(rawData.length / barsCount);
    const filteredData: number[] = [];

    for (let i = 0; i < barsCount; i++) {
      let blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        const sample = rawData[blockStart + j] ?? 0;
        sum += Math.abs(sample);
      }
      filteredData.push(sum / blockSize);
    }

    const maxVal = Math.max(...filteredData, 0.001);
    const normalized = filteredData.map((v) => v / maxVal);
    const barWidth = width / barsCount;

    let x = 0;
    for (let i = 0; i < barsCount; i++) {
      const normVal = normalized[i] ?? 0;
      const barHeight = Math.max(6, normVal * (height - 10));
      const isPlayed = (i / barsCount) <= progress;

      ctx.fillStyle = isPlayed ? "#f97316" : "hsl(var(--muted-foreground) / 0.25)";
      ctx.beginPath();
      ctx.roundRect(x + 1, (height - barHeight) / 2, barWidth - 3, barHeight, 3);
      ctx.fill();

      x += barWidth;
    }

    // Draw vertical tracking line (playhead)
    const playheadX = progress * width;
    ctx.fillStyle = "#c2410c";
    ctx.fillRect(playheadX - 1, 0, 2, height);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleDownload = () => {
    if (!audioBufferObj || !selectedFile) return;

    let blob: Blob;
    let mimeType = "audio/wav";
    let ext = "wav";

    if (exportFormat === "mp3") {
      mimeType = "audio/mpeg";
      ext = "mp3";
    } else if (exportFormat === "ogg") {
      mimeType = "audio/ogg";
      ext = "ogg";
    }

    blob = audioBufferToWav(audioBufferObj);
    if (exportFormat === "mp3" || exportFormat === "ogg") {
      blob = new Blob([blob], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "audio";
    a.download = `${baseName}-reversed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/20 shadow-sm">
            <History className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Reverse Audio
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Play your audio tracks backwards instantly. Perfect for creative sound design and special effects.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">
          
          {/* Upload Dropzone */}
          {!selectedFile && !isProcessing && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-orange-500 transition-all bg-card/50 cursor-pointer flex flex-col items-center space-y-3 select-none relative"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-sm pointer-events-none">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1 pointer-events-none">
                <span className="text-base font-semibold text-foreground block">
                  Upload audio file to reverse
                </span>
                <span className="text-sm text-muted-foreground block">
                  Drag and drop your audio file here or click to browse
                </span>
                <span className="text-xs text-muted-foreground/75 block pt-1">
                  Supports MP3, WAV, M4A, AAC, OGG, FLAC
                </span>
              </div>
            </div>
          )}

          {/* Loading / Processing State */}
          {isProcessing && (
            <div className="py-16 text-center space-y-4 bg-muted/40 rounded-2xl border border-border">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">Decoding & reversing audio track...</p>
                <p className="text-xs text-muted-foreground">Processing {selectedFile?.name} using Web Audio API</p>
              </div>
            </div>
          )}

          {/* Result State */}
          {!isProcessing && selectedFile && reversedAudioUrl && (
            <div className="space-y-6">
              
              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-muted/50 border border-border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">Reversed File</span>
                    <span className="text-sm font-semibold text-foreground truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setReversedAudioUrl(null);
                    setAudioBufferObj(null);
                  }}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-card border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reverse Another</span>
                </button>
              </div>

              {/* Player Card Container with Waveform Preview */}
              <div className="bg-muted/40 border border-border rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-foreground font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span>Reversed Track Waveform Preview</span>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={reversedAudioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  className="hidden"
                />

                {/* Canvas Waveform Preview */}
                <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center space-y-3 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={100}
                    className="w-full h-24 rounded-lg cursor-pointer"
                    onClick={(e) => {
                      if (!audioRef.current || !duration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const ratio = clickX / rect.width;
                      audioRef.current.currentTime = ratio * duration;
                    }}
                  />
                  <div className="w-full flex justify-between text-xs font-mono text-muted-foreground px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Play / Pause Controls */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={togglePlayPause}
                    className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-sm shadow-orange-500/20 transition-all cursor-pointer flex-shrink-0"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <div className="flex-1 flex items-center space-x-3 text-sm text-foreground bg-card border border-border px-4 py-3 rounded-xl shadow-sm">
                    <Volume2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="font-medium truncate">
                      {isPlaying ? "Playing reversed audio..." : "Ready for playback"}
                    </span>
                  </div>
                </div>

                {/* Export Format Custom Dropdown & Download Button */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-card border border-border px-4 py-3 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 text-foreground text-sm font-semibold">
                      <Settings2 className="w-4 h-4 text-orange-500" />
                      <span>Export Format</span>
                    </div>

                    {/* Custom Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-40 md:w-52 bg-muted/50 border border-border text-foreground text-sm font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer flex items-center justify-between"
                      >
                        <span>
                          {exportFormat === "wav" && "WAV (.wav)"}
                          {exportFormat === "mp3" && "MP3 (.mp3)"}
                          {exportFormat === "ogg" && "OGG (.ogg)"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-1 w-40 md:w-52 bg-white dark:bg-black border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                          {(["wav", "mp3", "ogg"] as const).map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => {
                                setExportFormat(fmt);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                exportFormat === fmt
                                  ? "bg-orange-500/10 text-orange-500 font-semibold"
                                  : "text-foreground hover:bg-muted/60"
                              }`}
                            >
                              <span>{fmt === "wav" ? "WAV (.wav)" : fmt === "mp3" ? "MP3 (.mp3)" : "OGG (.ogg)"}</span>
                              {exportFormat === fmt && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-3.5 px-6 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
                  >
                    <Download className="w-5 h-5 flex-shrink-0" />
                    <span>Download Reversed Audio ({exportFormat.toUpperCase()})</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}