"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Film, Volume2, VolumeX, Maximize2, FileVideo, ChevronDown, RefreshCw } from "lucide-react";

export default function VideoPlayerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const speedDropdownRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Create object URL when file changes
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackRate(1);
      setIsMuted(false);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl(null);
    }
  }, [selectedFile]);

  // Close speed dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(event.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Toggle Mute / Unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    videoRef.current.muted = newMutedState;
  };

  // Toggle Fullscreen Mode
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Update time as video plays
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Set duration when metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;
    }
  };

  // Handle clicking on the scrub bar to seek
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !videoRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleAction = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/video/video-player", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Playback initialization failed");

      const data = await response.json();
      alert(data.message || "Video processed successfully!");
    } catch (error) {
      alert("An error occurred while processing the video.");
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
            <FileVideo className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
            Video Player
          </h1>
          <p className="text-stone-500 text-base max-w-md mx-auto">
            Play and preview your video files.
          </p>
        </div>

        {/* Outer Card Container */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-stone-200/80 space-y-8">
          
          {/* Upload Dropzone Box: Hidden once a file is uploaded */}
          {!selectedFile && (
            <div className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center hover:border-amber-500 transition-all bg-stone-50/40">
              <input
                type="file"
                id="video-upload"
                className="hidden"
                accept="video/*"
                onChange={handleFileChange}
              />
              <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center space-y-3">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-semibold text-stone-800 block">
                    Upload your video
                  </span>
                  <span className="text-sm text-stone-500 block">
                    Drag and drop your file here or click to browse
                  </span>
                  <span className="text-xs text-stone-400 block pt-1">
                    MP4, MOV, WEBM, AVI, MKV • Max 500 MB
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Conditional Preview Section & Action Button: Shown ONLY after a file is uploaded */}
          {selectedFile && videoUrl && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Optional header showing loaded file name with a reset/change button */}
              <div className="flex items-center justify-between bg-stone-50 border border-stone-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 flex-shrink-0">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs text-stone-400 block">Loaded File</span>
                    <span className="text-sm font-semibold text-stone-800 truncate block">{selectedFile.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex items-center space-x-1.5 text-xs font-medium text-stone-500 hover:text-amber-600 bg-white border border-stone-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Upload Different Video</span>
                </button>
              </div>

              <div ref={playerContainerRef} className="space-y-3 bg-stone-900 rounded-2xl overflow-hidden p-4 text-white shadow-inner">
                <div className="flex items-center justify-between text-xs text-stone-400 font-medium px-1">
                  <span>Video Preview Screen</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>

                {/* Controlled Smaller Video Screen Container with HTML5 Video Element */}
                <div className="max-w-xl mx-auto">
                  <div className="relative h-48 md:h-60 bg-stone-950 rounded-xl flex flex-col items-center justify-center border border-stone-800 overflow-hidden group shadow-md">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full h-full object-contain cursor-pointer"
                      onClick={togglePlay}
                    />
                    
                    {/* Play/Pause Overlay Button when paused */}
                    {!isPlaying && (
                      <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center pointer-events-none">
                        <button 
                          onClick={togglePlay}
                          className="w-14 h-14 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-full flex items-center justify-center pointer-events-auto transition-transform transform hover:scale-105 shadow-lg"
                        >
                          <Play className="w-6 h-6 fill-current ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Timeline Scrubber */}
                <div className="space-y-1 pt-1 max-w-xl mx-auto">
                  <div 
                    ref={scrubberRef}
                    onClick={handleScrubberClick}
                    className="relative h-3 bg-stone-800 rounded-full cursor-pointer overflow-hidden"
                  >
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-amber-500 rounded-full transition-all pointer-events-none"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Playback Controls Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs text-stone-400 max-w-xl mx-auto">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={togglePlay}
                      className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isPlaying ? "Pause" : "Play"}</span>
                    </button>
                    
                    {/* Workable Mute / Unmute Button */}
                    <button 
                      onClick={toggleMute}
                      type="button"
                      className="focus:outline-none transition-colors p-1"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-amber-500 hover:text-amber-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-stone-400 hover:text-white" />
                      )}
                    </button>
                  </div>
                  
                  {/* Right side controls: Custom Themed Speed Dropdown, Resolution, Workable Maximize */}
                  <div className="flex items-center space-x-3 relative">
                    <div className="relative" ref={speedDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsSpeedOpen(!isSpeedOpen)}
                        className="bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer flex items-center space-x-1 transition-colors"
                      >
                        <span>{playbackRate}x</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {isSpeedOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-24 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl overflow-hidden z-20">
                          {speedOptions.map((speed) => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => {
                                setPlaybackRate(speed);
                                if (videoRef.current) {
                                  videoRef.current.playbackRate = speed;
                                }
                                setIsSpeedOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                                playbackRate === speed
                                  ? "bg-amber-500/20 text-amber-400 font-bold"
                                  : "text-stone-300 hover:bg-stone-800 hover:text-white"
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span>1080p</span>
                    
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="focus:outline-none transition-colors p-1"
                      title="Toggle Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4 cursor-pointer hover:text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleAction}
                disabled={isProcessing}
                className={`w-full py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-sm ${
                  isProcessing
                    ? "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                    : "bg-amber-400 hover:bg-amber-500 text-stone-950 shadow-amber-400/20"
                }`}
              >
                {isProcessing ? (
                  <span>Processing Video...</span>
                ) : (
                  <>
                    <Film className="w-5 h-5" />
                    <span>Initialize Video Stream</span>
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