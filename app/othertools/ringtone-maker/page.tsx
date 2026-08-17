"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Music, RefreshCw, Scissors, Clock, Download, ChevronDown } from "lucide-react";

export default function RingtoneMakerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [startTimeInput, setStartTimeInput] = useState("0");
  const [endTimeInput, setEndTimeInput] = useState("30");
  const [format, setFormat] = useState("mp3");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [audioBufferRef, setAudioBufferRef] = useState<AudioBuffer | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const startTime = Math.max(0, parseFloat(startTimeInput) || 0);
  const endTime = Math.max(startTime + 0.1, parseFloat(endTimeInput) || (startTime + 5));

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          
          setAudioBufferRef(decodedBuffer);
          const audioDur = decodedBuffer.duration;
          setDuration(audioDur);
          const initialEnd = Math.min(30, audioDur);
          setEndTimeInput(initialEnd.toFixed(2));
          setStartTimeInput("0.00");

          const rawData = decodedBuffer.getChannelData(0);
          const samples = 80;
          const blockSize = Math.floor(rawData.length / samples);
          const filteredData = [];
          
          for (let i = 0; i < samples; i++) {
            let blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(rawData[blockStart + j] || 0);
            }
            filteredData.push(sum / blockSize);
          }

          const multiplier = 80 / Math.max(...filteredData, 0.01);
          const normalized = filteredData.map((val) => Math.max(15, Math.min(95, Math.round(val * multiplier))));
          setWaveformPeaks(normalized);
        } catch (err) {
          console.error("Error decoding audio buffer", err);
        }
      };
      reader.readAsArrayBuffer(selectedFile);

      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
      setAudioBufferRef(null);
      setWaveformPeaks([]);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime < startTime || audioRef.current.currentTime >= endTime) {
        audioRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleCreateRingtone = async () => {
    if (!selectedFile || !audioBufferRef) return;
    setIsProcessing(true);

    try {
      const sampleRate = audioBufferRef.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(Math.min(endTime, duration) * sampleRate);
      const frameCount = Math.max(0, endSample - startSample);

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const trimmedBuffer = audioCtx.createBuffer(
        audioBufferRef.numberOfChannels,
        frameCount,
        sampleRate
      );

      for (let channel = 0; channel < audioBufferRef.numberOfChannels; channel++) {
        const channelData = audioBufferRef.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);
        trimmedData.set(channelData.subarray(startSample, endSample));
      }

      const wavBlob = audioBufferToWavBlob(trimmedBuffer);
      const downloadUrl = URL.createObjectURL(wavBlob);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("startTime", startTime.toString());
      formData.append("endTime", endTime.toString());
      formData.append("format", format);

      await fetch("/api/other/ringtone-maker", {
        method: "POST",
        body: formData,
      });

      const a = document.createElement("a");
      a.href = downloadUrl;
      const cleanName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "ringtone";
      a.download = `${cleanName}-ringtone.${format === "m4r" ? "m4r" : "wav"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error generating ringtone", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const audioBufferToWavBlob = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    let channels: Float32Array[] = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    function writeString(str: string) {
      for (let i = 0; i < str.length; i++) {
        out.setUint8(pos++, str.charCodeAt(i));
      }
    }

    writeString("RIFF");
    out.setUint32(pos, length - 8, true); pos += 4;
    writeString("WAVE");
    writeString("fmt ");
    out.setUint32(pos, 16, true); pos += 4;
    out.setUint16(pos, 1, true); pos += 2;
    out.setUint16(pos, numOfChan, true); pos += 2;
    out.setUint32(pos, sampleRate, true); pos += 4;
    out.setUint32(pos, sampleRate * 2 * numOfChan, true); pos += 4;
    out.setUint16(pos, numOfChan * 2, true); pos += 2;
    out.setUint16(pos, 16, true); pos += 2;
    writeString("data");
    out.setUint32(pos, length - pos - 4, true); pos += 4;

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i]?.[offset] ?? 0));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out.buffer], { type: "audio/wav" });
  };

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatOptions = [
    { value: "mp3", label: "MP3 Audio (.mp3)" },
    { value: "m4r", label: "iPhone Ringtone (.m4r)" },
    { value: "wav", label: "WAV Audio (.wav)" },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-6 font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl items-center justify-center border border-orange-500/20 shadow-sm">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            Ringtone Maker
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Create custom ringtones from your favorite audio with precision trimming and instant export.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-card rounded-3xl p-6 md:p-10 shadow-sm border border-border space-y-8">
          
          {!selectedFile && (
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
                accept=".mp3,.wav,.m4r,.aac,.ogg,.flac"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-sm pointer-events-none">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1 pointer-events-none">
                <span className="text-base font-semibold text-foreground block">
                  Upload audio to create ringtone
                </span>
                <span className="text-sm text-muted-foreground block">
                  Drag and drop your audio file here or click to browse
                </span>
                <span className="text-xs text-muted-foreground/75 block pt-1">
                  MP3, WAV, M4R, AAC, OGG, FLAC
                </span>
              </div>
            </div>
          )}

          {selectedFile && audioUrl && (
            <div className="space-y-6">
              
              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-muted/50 border border-border px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">Target Audio Track</span>
                    <span className="text-sm font-semibold text-foreground truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground hover:text-orange-500 bg-card border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>
              </div>

              {/* Audio Player & Trim Visualizer Screen */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden p-6 text-foreground shadow-inner space-y-6">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      const current = audioRef.current.currentTime;
                      setCurrentTime(current);
                      if (current >= endTime && isPlaying) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                      }
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                  }}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <button 
                      onClick={togglePlay}
                      className="w-12 h-12 md:w-14 md:h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-lg cursor-pointer flex-shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 md:w-6 md:h-6 fill-current ml-1" />
                      )}
                    </button>
                    <div>
                      <span className="text-[11px] md:text-xs text-muted-foreground block font-medium">Trimming Window</span>
                      <span className="text-xs md:text-sm font-bold text-foreground whitespace-nowrap">
                        {formatTime(startTime)} – {formatTime(endTime)} ({Math.max(0, Math.round(endTime - startTime))}s)
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[11px] md:text-xs text-muted-foreground block font-medium">Current Playhead</span>
                    <span className="text-[11px] md:text-sm font-mono font-bold text-orange-500 whitespace-nowrap block">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Waveform Trimming Visualizer */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Select Ringtone Segment</span>
                    </span>
                    <span>Max recommended: 30s</span>
                  </div>
                  <div className="relative h-32 bg-orange-500/5 dark:bg-stone-950 rounded-xl border border-orange-500/20 dark:border-border px-4 flex items-center overflow-hidden select-none">
                    <div className="absolute inset-x-4 inset-y-0 flex items-center justify-between pointer-events-none">
                      {waveformPeaks.length > 0 ? (
                        waveformPeaks.map((height, idx) => {
                          const barProg = (idx / waveformPeaks.length) * 100;
                          const isInRange = barProg >= startPercent && barProg <= endPercent;
                          return (
                            <div
                              key={idx}
                              className={`w-1 rounded-full transition-all duration-150 ${
                                isInRange 
                                  ? "bg-orange-500 shadow-md shadow-orange-500/40" 
                                  : "bg-orange-500/20 dark:bg-white/30"
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          );
                        })
                      ) : (
                        <div className="w-full text-center text-xs text-muted-foreground">Generating waveform peaks...</div>
                      )}

                      {/* Selection Box Highlight */}
                      <div 
                        className="absolute inset-y-0 bg-orange-500/15 border-x-2 border-orange-500 pointer-events-none transition-all"
                        style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
                      />

                      {/* Moving Vertical Playhead Bar */}
                      {duration > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] z-10 transition-all duration-75 pointer-events-none"
                          style={{ left: `${playheadPercent}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Trimming Input Fields Control */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block truncate">
                      Start Time (s)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={startTimeInput}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(valStr) || valStr === "") {
                          setStartTimeInput(valStr);
                          const val = parseFloat(valStr);
                          if (!isNaN(val) && val >= 0 && val < endTime) {
                            if (audioRef.current) audioRef.current.currentTime = val;
                            setCurrentTime(val);
                          }
                        }
                      }}
                      onBlur={() => {
                        const val = parseFloat(startTimeInput);
                        if (isNaN(val)) {
                          setStartTimeInput("0.00");
                        } else {
                          setStartTimeInput(Math.max(0, Math.min(val, endTime - 0.1)).toFixed(2));
                        }
                      }}
                      className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-500 text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block truncate">
                      End Time (s)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={endTimeInput}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        if (/^\d*\.?\d{0,2}$/.test(valStr) || valStr === "") {
                          setEndTimeInput(valStr);
                        }
                      }}
                      onBlur={() => {
                        const val = parseFloat(endTimeInput);
                        if (isNaN(val)) {
                          setEndTimeInput((startTime + 5).toFixed(2));
                        } else {
                          setEndTimeInput(Math.max(startTime + 0.1, Math.min(val, duration || 30)).toFixed(2));
                        }
                      }}
                      className="w-full bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-orange-500 text-center"
                    />
                  </div>
                </div>

              </div>

              {/* Format Dropdown & Estimated Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Custom Themed Dropdown Component with Solid White/Black Background */}
                <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-2 relative z-50" ref={dropdownRef}>
                  <label className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                    Output Format
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-card border border-border text-foreground px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 cursor-pointer shadow-sm relative z-10"
                  >
                    <span>{formatOptions.find((o) => o.value === format)?.label}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Solid White (light) and Solid Black (dark) dropdown menu */}
                  {isDropdownOpen && (
                    <div className="absolute left-4 right-4 top-full mt-1.5 bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-[9999] py-1">
                      {formatOptions.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setFormat(opt.value);
                            setIsDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                            format === opt.value
                              ? "bg-orange-500/15 text-orange-500 font-semibold"
                              : "text-zinc-900 dark:text-zinc-100 hover:bg-orange-500/10 hover:text-orange-500 dark:hover:text-orange-400"
                          }`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">Estimated Duration</span>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">{Math.max(0, Math.round(endTime - startTime))} Seconds</span>
                    <span className="text-xs text-muted-foreground font-mono">Segment: {formatTime(startTime)} - {formatTime(endTime)}</span>
                  </div>
                </div>
              </div>

              {/* Generate Ringtone Button */}
              <div className="pt-2">
                <button
                  onClick={handleCreateRingtone}
                  disabled={isProcessing}
                  className="w-full py-3.5 px-6 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50 relative z-0"
                >
                  <Download className="w-5 h-5 flex-shrink-0" />
                  <span>{isProcessing ? "Processing Ringtone..." : "Export & Download Ringtone"}</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}