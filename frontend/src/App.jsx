import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, CheckCircle, Video, Download, ArrowLeft, Loader2, 
  Sparkles, Wand2, Clock, Zap, Smartphone, Monitor, Sliders, Check, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '0s';
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const remSec = s % 60;
  if (mins < 60) return `${mins}m ${remSec > 0 ? `${remSec}s` : ''}`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function formatClock(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '00:00';
  const total = Math.round(sec);
  const mins = Math.floor(total / 60);
  const s = total % 60;
  if (mins < 60) {
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const hours = Math.floor(mins / 60);
  const remM = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(remM).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function App() {
  const [step, setStep] = useState('upload'); // upload | configure | processing | result
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [estimates, setEstimates] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Configuration options
  const [selectedQuality, setSelectedQuality] = useState('2k'); // '2k' | '4k'
  const [enableImax, setEnableImax] = useState(true);

  // Processing state
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isAiActive, setIsAiActive] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [frameData, setFrameData] = useState({ current: 0, total: 0 });
  const [timingData, setTimingData] = useState({ elapsed_seconds: 0, eta_seconds: 0, sec_per_frame: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [hasCleanedUp, setHasCleanedUp] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        alert("File too large! Maximum limit is 100MB.");
        return;
      }
      setFile(selectedFile);
      uploadAndAnalyze(selectedFile);
    }
  };

  const uploadAndAnalyze = async (fileToUpload) => {
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      setIsUploading(true);
      const response = await axios.post(`${API_BASE}/upload`, formData);
      const rawInfo = response.data.video_info;
      const info = {
        width: rawInfo?.width || 1080,
        height: rawInfo?.height || 1920,
        fps: rawInfo?.fps || 30,
        frames: rawInfo?.frames || 300,
        duration: rawInfo?.duration || 10,
        resolution_name: rawInfo?.resolution_name || "HD / Vertical",
        resolution: rawInfo?.resolution || "720x1280",
        aspect_ratio: rawInfo?.aspect_ratio || "9:16 (Shorts/Reels)",
        is_vertical: rawInfo?.is_vertical !== undefined ? rawInfo.is_vertical : true
      };

      const totalF = info.frames;
      const rawEstimates = response.data.estimates;
      const est = {
        "2k_fast": rawEstimates?.["2k_fast"] || totalF * 8,
        "2k_imax": rawEstimates?.["2k_imax"] || totalF * 12,
        "4k_fast": rawEstimates?.["4k_fast"] || totalF * 35,
        "4k_imax": rawEstimates?.["4k_imax"] || totalF * 50
      };

      setJobId(response.data.job_id);
      setVideoInfo(info);
      setEstimates(est);
      
      // Default to 2K for vertical videos (Shorts/Reels)
      if (info.is_vertical) {
        setSelectedQuality('2k');
      }
      
      setStep('configure');
    } catch (err) {
      alert("Error: Backend is not responding. Run start_backend.bat.");
      setStep('upload');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const startMastering = async () => {
    if (!jobId) return;
    try {
      setStep('processing');
      await axios.post(`${API_BASE}/process/${jobId}`, {
        quality: selectedQuality,
        enable_imax: enableImax
      });
      pollProgress(jobId);
    } catch (err) {
      console.error(err);
      alert("Failed to start processing.");
      setStep('configure');
    }
  };

  const pollProgress = (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE}/progress/${id}`);
        const data = response.data;
        setProgress(data.progress || 0);
        setStatus(data.status || '');
        setIsAiActive(data.ai_active || false);
        setAiError(data.ai_error || null);
        setFrameData({ 
          current: data.current_frame || 0, 
          total: data.total_frames || videoInfo?.frames || 0 
        });
        setTimingData({
          elapsed_seconds: data.elapsed_seconds || 0,
          eta_seconds: data.eta_seconds || 0,
          sec_per_frame: data.sec_per_frame || 0
        });

        if (data.status === 'completed') {
          clearInterval(interval);
          setStep('result');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          alert("Upscaling failed. Check backend logs.");
          setStep('upload');
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${API_BASE}/download/${jobId}`;
    link.setAttribute('download', `upscaled_${file.name}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsDownloading(true);
  };

  const handleCleanup = async (shouldClean) => {
    if (shouldClean) {
      try {
        await axios.delete(`${API_BASE}/cleanup/${jobId}`);
        setHasCleanedUp(true);
        setTimeout(() => {
          resetAll();
        }, 1500);
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
    } else {
      resetAll();
    }
  };

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setJobId(null);
    setVideoInfo(null);
    setEstimates(null);
    setProgress(0);
    setStatus('');
    setIsDownloading(false);
    setHasCleanedUp(false);
  };

  useEffect(() => {
    if (step === 'result' && jobId && file && !isDownloading) {
      handleDownload();
    }
  }, [step, jobId, file]);

  const currentEstimatedSec = estimates ? estimates[`${selectedQuality}_${enableImax ? 'imax' : 'fast'}`] : 0;

  return (
    <div className="min-h-screen w-full bg-[#030304] text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambiance */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <motion.div 
              key="upload" 
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-widest uppercase mb-2">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Video Mastering</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  Enhance & Upscale
                </h1>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                  Select 2K, 4K or IMAX mastering with precise time calculations.
                </p>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e); }}
                onClick={() => !isUploading && fileInputRef.current.click()}
                className={`relative cursor-pointer rounded-[32px] border-2 border-dashed p-14 text-center transition-all duration-300 group overflow-hidden ${
                  isDragging ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_40px_rgba(59,130,246,0.1)]' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 backdrop-blur-xl'
                }`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                
                {isUploading ? (
                  <div className="space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                    <p className="text-sm font-bold text-white">Analyzing video stream & frames...</p>
                    <p className="text-xs text-zinc-500">Detecting resolution, fps & estimating processing speeds</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300">
                      <Upload className="w-8 h-8 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-zinc-300 font-bold text-base">Drop your video here, or browse</p>
                      <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-black">MP4, MOV up to 100MB</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: CONFIGURE & ESTIMATE */}
          {step === 'configure' && (
            <motion.div 
              key="configure" 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={resetAll}
                  className="inline-flex items-center space-x-2 text-zinc-400 hover:text-white text-xs font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Choose Another Video</span>
                </button>
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Step 2 of 3: Mastering Setup</span>
              </div>

              {/* Uploaded Video Diagnostics Card */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-bold text-white truncate max-w-xs">{file?.name}</p>
                      <p className="text-xs text-zinc-400">{(file?.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-800 border border-zinc-700 text-zinc-300">
                      {videoInfo.resolution_name} ({videoInfo.resolution})
                    </span>
                  </div>
                </div>

                {/* Video Info Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-center">
                  <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-white/[0.03]">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Aspect Ratio</span>
                    <span className="text-xs font-black text-white">{videoInfo.aspect_ratio}</span>
                  </div>
                  <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-white/[0.03]">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Duration</span>
                    <span className="text-xs font-black text-white">{videoInfo.duration}s ({videoInfo.fps} FPS)</span>
                  </div>
                  <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-white/[0.03]">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Total Frames</span>
                    <span className="text-xs font-black text-blue-400">{videoInfo.frames} frames</span>
                  </div>
                </div>
              </div>

              {/* YouTube Shorts Recommendation Banner */}
              <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20 rounded-2xl p-4 flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-white flex items-center space-x-1.5">
                    <span>YouTube Shorts Recommendation</span>
                    <span className="px-1.5 py-0.2 bg-red-500/20 text-red-300 text-[9px] rounded font-black uppercase">2K Optimal</span>
                  </p>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    YouTube Shorts streams up to <strong className="text-zinc-200">1080p / 1440p (2K)</strong> on phones. 4K uploads are compressed down by YouTube, while <strong>2K Quad HD</strong> renders <strong>3x to 4x faster</strong> and gives full mobile clarity.
                  </p>
                </div>
              </div>

              {/* Quality Selection Options */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Select Target Quality:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Option 1: 2K */}
                  <div 
                    onClick={() => setSelectedQuality('2k')}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                      selectedQuality === '2k' 
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_25px_rgba(59,130,246,0.15)]' 
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm text-white flex items-center space-x-1.5">
                        <Smartphone className="w-4 h-4 text-blue-400" />
                        <span>2K Quad HD</span>
                      </span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] font-black rounded-full uppercase">
                        Shorts Choice
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                      Output: {videoInfo.is_vertical ? '1440 × 2560' : '2560 × 1440'}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold">Estimated Time:</span>
                      <span className="font-black text-blue-300">
                        ~{formatDuration(estimates?.[`2k_${enableImax ? 'imax' : 'fast'}`])}
                      </span>
                    </div>
                  </div>

                  {/* Option 2: 4K */}
                  <div 
                    onClick={() => setSelectedQuality('4k')}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                      selectedQuality === '4k' 
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.15)]' 
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm text-white flex items-center space-x-1.5">
                        <Monitor className="w-4 h-4 text-indigo-400" />
                        <span>4K Ultra HD</span>
                      </span>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] font-black rounded-full uppercase">
                        Heavy GPU
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">
                      Output: {videoInfo.is_vertical ? '2160 × 3840' : '3840 × 2160'}
                    </p>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold">Estimated Time:</span>
                      <span className="font-black text-indigo-300">
                        ~{formatDuration(estimates?.[`4k_${enableImax ? 'imax' : 'fast'}`])}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* IMAX Enhancement Toggle */}
              <div 
                onClick={() => setEnableImax(!enableImax)}
                className="cursor-pointer bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center justify-between transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white">IMAX Cinema Post-Processing</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Bilateral smoothing, CLAHE contrast, cinema unsharp sharpening & color vibrancy.
                  </p>
                </div>
                <div className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${enableImax ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${enableImax ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              {/* Summary & Start Button */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-2 text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Estimated Total Processing Time:</span>
                  </span>
                  <span className="font-black text-base text-white">
                    ~{formatDuration(currentEstimatedSec)}
                  </span>
                </div>

                <button 
                  onClick={startMastering}
                  className="group relative w-full py-5 bg-white text-black rounded-2xl font-black text-base overflow-hidden transition-all hover:scale-[1.01] active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center justify-center space-x-3"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 group-hover:text-white flex items-center">
                    START {selectedQuality.toUpperCase()} MASTERING <Wand2 className="ml-2 w-5 h-5" />
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === 'processing' && (
            <motion.div 
              key="processing" 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 rounded-[36px] p-10 md:p-14 space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[pan_2s_linear_infinite]" />
              
              <div className="text-center space-y-3">
                <div className="relative w-14 h-14 mx-auto mb-4">
                  <Loader2 className="w-full h-full text-blue-500 animate-spin opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">Mastering Asset</h2>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-wider">
                  <span>{selectedQuality.toUpperCase()} • {enableImax ? 'IMAX Active' : 'Pure AI'}</span>
                </div>
              </div>

              {/* Progress & Frame Numbers */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Compute Progress</span>
                    <span className="text-4xl font-black">{Math.round(progress)}<span className="text-zinc-600 text-xl ml-1">%</span></span>
                    {frameData.total > 0 && (
                      <span className="text-[11px] text-blue-400 font-black mt-1 uppercase tracking-wider">
                        Frame {frameData.current} / {frameData.total}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Active Task</span>
                    <p className="text-sm font-bold text-white">{status || 'Processing...'}</p>
                    <div className={`inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter ${
                      isAiActive ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      <div className={`w-1 h-1 rounded-full ${isAiActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                      <span>AI Model: {isAiActive ? 'Active' : (aiError === 'File Missing' ? 'Weights Missing (.pth)' : 'Library Missing')}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full bg-zinc-800/50 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  />
                </div>

                {/* Real-Time Timing Statistics */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-800 text-center">
                  <div className="bg-zinc-950/40 p-3 rounded-2xl border border-white/[0.04]">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-center space-x-1 mb-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>Elapsed</span>
                    </span>
                    <span className="text-xs font-black text-white">
                      {formatClock(timingData.elapsed_seconds)}
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 p-3 rounded-2xl border border-white/[0.04]">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-center space-x-1 mb-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span>Time Left (ETA)</span>
                    </span>
                    <span className="text-xs font-black text-blue-400">
                      {timingData.eta_seconds > 0 ? `~${formatDuration(timingData.eta_seconds)}` : 'Calculating...'}
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 p-3 rounded-2xl border border-white/[0.04]">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-center space-x-1 mb-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Speed</span>
                    </span>
                    <span className="text-xs font-black text-amber-300">
                      {timingData.sec_per_frame > 0 ? `${timingData.sec_per_frame}s / f` : 'Measuring...'}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* STEP 4: RESULT */}
          {step === 'result' && (
            <motion.div 
              key="result" 
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 rounded-[36px] p-12 space-y-8 shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <div className="space-y-2">
                   <h2 className="text-3xl font-black tracking-tight">{hasCleanedUp ? 'Storage Reclaimed' : 'Render Complete'}</h2>
                   <p className="text-zinc-500 max-w-xs mx-auto text-xs leading-relaxed">
                     {hasCleanedUp 
                       ? 'Files have been deleted from the server. Resetting session...' 
                       : `Your video has been mastered to ${selectedQuality.toUpperCase()} standards.`}
                   </p>
                </div>
                
                {!isDownloading ? (
                  <button 
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center space-x-3 w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:scale-[1.01] active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] group"
                  >
                    <Download className="w-5 h-5 group-hover:animate-bounce" />
                    <span>EXPORT MASTER VIDEO</span>
                  </button>
                ) : !hasCleanedUp && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Download Started!</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleCleanup(true)}
                        className="flex-1 py-3.5 bg-zinc-800 hover:bg-red-500/20 border border-white/5 hover:border-red-500/40 rounded-xl text-xs font-black transition-all"
                      >
                        CLEAN SERVER STORAGE
                      </button>
                      <button 
                        onClick={() => handleCleanup(false)}
                        className="flex-1 py-3.5 bg-white text-black rounded-xl text-xs font-black transition-all"
                      >
                        KEEP FILES
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!isDownloading && (
                <button 
                  onClick={resetAll}
                  className="inline-flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>New Project Session</span>
                </button>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
