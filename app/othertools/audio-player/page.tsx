"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Music, RefreshCw, Check, ArrowRight, Download, Sliders, Volume2, Gauge } from "lucide-react";

export default function AudioPlayerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Decorative waveform amplitude bars
  const waveformBars = Array.from({ length: 48 }, (_, i) => {
    return Math.sin(i * 0.4) * 25 + Math.cos(i * 0.2) * 15 + 45;
  });

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setProcessedFileUrl(null);
      setProcessedFileName(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setSpeed(1);
      setVolume(1);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [selectedFile]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      audioRef.current.playbackRate = speed;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const togglePlay = () => {
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

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioRef.current || !duration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleAudioAction = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("volume", volume.toString());
    formData.append("speed", speed.toString());

    try {
      const response = await fetch("/api/other/audio-player", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Audio processing failed");

      const resultBlob = await response.blob();
      const blobUrl = URL.createObjectURL(resultBlob);
      setProcessedFileUrl(blobUrl);

      const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "audio";
      setProcessedFileName(`${baseName}-processed.mp3`);
    } catch (error) {
      alert("An error occurred during audio processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-6 font-sans text-stone-800">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl items-center justify-center border border-amber-100 shadow-sm">
            <Music className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            Audio Player & Studio
          </h1>
          <p className="text-stone-500 text-base max-w-md mx-auto">
            Play your audio with focused playback controls, visual wave scrubbing, and real-time speed adjustments.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-stone-200/80 space-y-8">
          
          {!selectedFile && (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center hover:border-amber-500 transition-all bg-stone-50/40">
              <input
                type="file"
                id="audio-upload"
                className="hidden"
                accept="audio/*"
                onChange={handleFileChange}
              />
              <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-semibold text-stone-800 block">
                    Upload your audio file
                  </span>
                  <span className="text-sm text-stone-500 block">
                    Drag and drop your file here or click to browse
                  </span>
                  <span className="text-xs text-stone-400 block pt-1">
                    MP3, WAV, AAC, OGG • Max 200 MB
                  </span>
                </div>
              </label>
            </div>
          )}

          {selectedFile && audioUrl && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Loaded File Bar */}
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 flex-shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-stone-400 block">Source Audio</span>
                    <span className="text-sm font-semibold text-stone-800 truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-stone-500 hover:text-amber-600 bg-white border border-stone-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0 ml-3"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Audio</span>
                </button>
              </div>

              {/* Audio Player & Waveform Panel */}
              <div className="bg-stone-900 rounded-2xl overflow-hidden p-6 text-white shadow-inner space-y-6">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={togglePlay}
                      className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-full flex items-center justify-center transition-transform transform hover:scale-105 shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-1" />
                      )}
                    </button>
                    <div>
                      <span className="text-xs text-stone-400 block font-medium">Playback Status</span>
                      <span className="text-sm font-bold text-white">{isPlaying ? "Playing Audio" : "Paused"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-400 block font-medium">Time Elapsed</span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Interactive Waveform Scrubber */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>Interactive Waveform</span>
                    <span>Click to jump</span>
                  </div>
                  <div 
                    ref={waveformRef}
                    onClick={handleWaveformClick}
                    className="relative h-20 bg-stone-950/80 rounded-xl border border-stone-800 px-3 flex items-center justify-between cursor-pointer overflow-hidden group"
                  >
                    {waveformBars.map((height, idx) => {
                      const barProgress = (idx / waveformBars.length) * 100;
                      const isPassed = barProgress <= progressPercentage;
                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-full transition-colors pointer-events-none ${
                            isPassed ? "bg-amber-400 shadow-sm shadow-amber-400/50" : "bg-stone-700 group-hover:bg-stone-600"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      );
                    })}

                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-glow pointer-events-none transition-all z-10"
                      style={{ left: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Volume & Speed Settings Panels Stacked in Full-Width Rows */}
              <div className="space-y-4">
                {/* Volume Slider Row */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
                      <Volume2 className="w-4 h-4 text-amber-600" />
                      <span>Volume Level</span>
                    </div>
                    <span className="text-xs text-stone-500 font-semibold">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (audioRef.current) audioRef.current.volume = val;
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Playback Speed Dropdown Row */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-stone-800 font-bold text-sm">
                      <Gauge className="w-4 h-4 text-amber-600" />
                      <span>Playback Speed</span>
                    </div>
                    <span className="text-xs text-stone-500 font-semibold">{speed}x</span>
                  </div>
                  <select
                    value={speed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSpeed(val);
                      if (audioRef.current) audioRef.current.playbackRate = val;
                    }}
                    className="w-full bg-white border border-stone-200 text-stone-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="0.5">0.5x (Half Speed)</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x (Normal)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x (Double Speed)</option>
                  </select>
                </div>
              </div>

              {/* Action Button & Download Banner */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleAudioAction}
                  disabled={isProcessing}
                  className={`w-full py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-sm ${
                    isProcessing
                      ? "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                      : "bg-amber-400 hover:bg-amber-500 text-stone-950 shadow-amber-400/20"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Processing Audio File...</span>
                    </span>
                  ) : (
                    <>
                      <Sliders className="w-5 h-5" />
                      <span>Process & Export Audio</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                {/* Success Download Banner */}
                {processedFileUrl && processedFileName && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-amber-500 text-stone-950 rounded-xl flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-amber-900 block truncate">Ready for Download</span>
                        <span className="text-sm font-bold text-stone-900 truncate block">{processedFileName}</span>
                      </div>
                    </div>
                    <a
                      href={processedFileUrl}
                      download={processedFileName}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold px-3.5 py-2.5 rounded-xl text-xs transition-colors shadow-sm flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </a>
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