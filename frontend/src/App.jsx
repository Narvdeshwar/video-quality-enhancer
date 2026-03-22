import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, Video, Download, ArrowLeft, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

function App() {
  const [step, setStep] = useState('upload'); // upload | processing | result
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const uploadFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      setStep('processing');
      const response = await axios.post(`${API_BASE}/upload`, formData);
      setJobId(response.data.job_id);
      startProcess(response.data.job_id);
    } catch (err) {
      alert("Error: Backend is not responding. Run start_backend.bat.");
      setStep('upload');
    }
  };

  const startProcess = async (id) => {
    try {
      await axios.post(`${API_BASE}/process/${id}`);
      pollProgress(id);
    } catch (err) {
      console.error(err);
    }
  };

  const pollProgress = (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE}/progress/${id}`);
        const { progress, status: jobStatus } = response.data;
        setProgress(progress);
        setStatus(jobStatus);
        if (jobStatus === 'completed') {
          clearInterval(interval);
          setStep('result');
        } else if (jobStatus === 'failed') {
          clearInterval(interval);
          alert("Upscaling failed. Check backend logs.");
          setStep('upload');
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full bg-[#030304] text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Background Ambiance */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div 
              key="upload" 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-10"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-widest uppercase mb-4">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Powered Mastering</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  Enhance to 4K
                </h1>
                <p className="text-zinc-500 max-w-sm mx-auto">Master your footage with Real-ESRGAN neural reconstruction.</p>
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e); }}
                onClick={() => fileInputRef.current.click()}
                className={`relative cursor-pointer rounded-[32px] border-2 border-dashed p-14 text-center transition-all duration-500 group overflow-hidden ${
                  isDragging || file ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_40px_rgba(59,130,246,0.1)]' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 backdrop-blur-xl'
                }`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="file-active" className="space-y-6">
                      <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto shadow-2xl relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse rounded-full" />
                        <Video className="w-8 h-8 text-blue-400 relative z-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-xl truncate max-w-xs mx-auto capitalize">{file.name}</p>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{(file.size / (1024 * 1024)).toFixed(1)} MB &bull; READY</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="upload-idle" className="space-y-6">
                      <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                        <Upload className="w-8 h-8 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-zinc-400 font-bold">Drop your footage here</p>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-[.2em] font-black">MP4, MOV up to 4GB</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {file && (
                <button 
                  onClick={uploadFile}
                  className="group relative w-full py-5 bg-white text-black rounded-2xl font-black text-lg overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 group-hover:text-white flex items-center justify-center">
                    START AI UPSCALING <Wand2 className="ml-3 w-5 h-5" />
                  </span>
                </button>
              )}
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div 
              key="processing" 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 rounded-[40px] p-16 space-y-12 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[pan_2s_linear_infinite]" />
              
              <div className="text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto mb-8">
                  <Loader2 className="w-full h-full text-blue-500 animate-spin opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  </div>
                </div>
                <h2 className="text-3xl font-black tracking-tight">Mastering Asset</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">{status || 'INITIALIZING...'}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Compute Progress</span>
                    <span className="text-4xl font-black">{Math.round(progress)}<span className="text-zinc-600 text-xl ml-1">%</span></span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Active Task</span>
                    <p className="text-sm font-bold text-white">X4 Neural Pass</p>
                  </div>
                </div>
                <div className="h-3 w-full bg-zinc-800/50 rounded-full overflow-hidden p-1 border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div 
              key="result" 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-10"
            >
              <div className="bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 rounded-[40px] p-16 space-y-10 shadow-2xl">
                <div className="w-24 h-24 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <div className="space-y-3">
                   <h2 className="text-4xl font-black tracking-tighter">Render Complete</h2>
                   <p className="text-zinc-500 max-w-xs mx-auto text-sm leading-relaxed">Your video has been successfully upscaled and optimized for 4K playback.</p>
                </div>
                
                <a 
                  href={`${API_BASE}/download/${jobId}`}
                  className="inline-flex items-center justify-center space-x-4 w-full py-6 bg-white text-black rounded-[24px] font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] group"
                  download
                >
                  <Download className="w-6 h-6 group-hover:animate-bounce" />
                  <span>EXPORT 4K MASTER</span>
                </a>
              </div>

              <button 
                onClick={() => { setStep('upload'); setFile(null); setJobId(null); setProgress(0); }}
                className="inline-flex items-center space-x-3 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.3em]"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>New Project Session</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;


