import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, CheckCircle, Loader2, Sparkles, Wand2, 
  ArrowRight, Play, Settings, Monitor, ShieldCheck, 
  Zap, Info, Github, HelpCircle, LayoutGrid, Layers,
  Video, Maximize, Share2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

const Sidebar = () => (
  <div className="w-20 h-full border-r border-white/5 bg-black/40 flex flex-col items-center py-10 space-y-8 backdrop-blur-3xl shrink-0">
    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
       <Sparkles className="w-6 h-6 text-white" />
    </div>
    <div className="h-px w-8 bg-white/10" />
    {[LayoutGrid, Video, Layers, Settings].map((Icon, i) => (
      <div key={i} className={`p-4 rounded-xl cursor-pointer transition-all ${i === 1 ? 'bg-white/5 text-blue-400 border border-white/5 shadow-inner' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'}`}>
        <Icon className="w-6 h-6" />
      </div>
    ))}
    <div className="flex-1" />
    <div className="p-4 rounded-xl text-white/30 hover:text-white/60 cursor-pointer">
       <HelpCircle className="w-6 h-6" />
    </div>
  </div>
);

function App() {
  const [step, setStep] = useState('upload'); // upload | processing | result
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileDetails, setFileDetails] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (selectedFile) prepareFile(selectedFile);
  };

  const prepareFile = (selectedFile) => {
    setFile(selectedFile);
    setFileDetails({
      name: selectedFile.name,
      size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: selectedFile.type || 'video/mp4'
    });
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
      alert("Backend connection failed. Please ensure start_backend.bat is running.");
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
        const { progress, status } = response.data;
        setProgress(progress);
        setStatus(status);
        if (status === 'completed') {
          clearInterval(interval);
          setStep('result');
        } else if (status === 'failed') {
          clearInterval(interval);
          alert("Processing failed. Please check FFmpeg installation.");
          setStep('upload');
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 1500);
  };

  return (
    <div className="h-screen w-screen bg-[#020202] text-[#eef1f5] font-['Outfit'] overflow-hidden flex selection:bg-blue-500/30">
      <Sidebar />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-16 px-10 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl">
           <div className="flex items-center space-x-4">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Workspace &nbsp;/&nbsp;</span>
              <span className="text-sm font-bold tracking-tight">ENHANCER_V2_PRO</span>
           </div>
           <div className="flex items-center space-x-6">
              <div className="flex -space-x-2">
                 {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-[#020202] bg-white/10" />)}
                 <div className="w-8 h-8 rounded-full border-2 border-[#020202] bg-blue-600 text-[10px] font-black flex items-center justify-center">+4</div>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <button className="bg-white text-black text-xs font-black py-2.5 px-6 rounded-full hover:scale-105 transition-transform flex items-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                MASTER QUALITY <ArrowRight className="ml-2 w-3 h-3" />
              </button>
           </div>
        </header>

        {/* Global Background Particles */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-[180px] animate-pulse" />
           <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[180px] animate-pulse" />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-10 relative z-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div 
                key="upload" 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full h-full flex flex-col md:flex-row gap-10"
              >
                {/* File Drop Section */}
                <div className="flex-1 flex flex-col">
                  <div className="flex flex-col mb-10">
                     <h1 className="text-7xl font-black tracking-tighter leading-[0.9] mb-4 drop-shadow-2xl">
                       ENHANCE YOUR <br />
                       <span className="text-blue-500">VIDEO TO 4K</span>
                     </h1>
                     <p className="text-white/40 text-xl font-light max-w-xl">
                       Cinematic upscaling using Real-ESRGAN Tensor Engine and FFmpeg. 
                       Optimized for high-fidelity 10-bit color reproduction.
                     </p>
                  </div>

                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange(e); }}
                    onClick={() => fileInputRef.current.click()}
                    className={`relative flex-1 rounded-[40px] border-2 border-dashed transition-all duration-500 group flex flex-col items-center justify-center p-10 ${
                      isDragging || file ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.01]'
                    }`}
                  >
                    <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                    {file ? (
                      <div className="flex flex-col items-center text-center">
                         <div className="w-24 h-24 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(59,130,246,0.2)] animate-float">
                            <Video className="w-10 h-10 text-blue-500" />
                         </div>
                         <h3 className="text-3xl font-black mb-1 truncate max-w-md uppercase">{fileDetails.name}</h3>
                         <div className="text-white/30 font-bold tracking-widest text-xs">{fileDetails.size} &bull; {fileDetails.type}</div>
                         <button 
                          onClick={(e) => { e.stopPropagation(); uploadFile(); }}
                          className="mt-10 px-12 py-5 bg-blue-600 rounded-3xl font-black text-xl hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(59,130,246,0.3)]"
                         >
                           PROCESS VIDEO
                         </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center pointer-events-none">
                         <div className="mb-10 p-10 rounded-[40px] bg-white/[0.02] border border-white/5 transition-transform group-hover:scale-110 group-hover:rotate-6">
                            <Upload className="w-20 h-20 text-white/20 group-hover:text-blue-500 transition-colors" />
                         </div>
                         <h3 className="text-4xl font-black mb-3 tracking-tight">Drop video files here</h3>
                         <p className="text-white/40 uppercase tracking-[0.2em] font-black text-xs">MP4, MOV, AV1 &bull; UP TO 4GB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Sidebar */}
                <div className="w-full md:w-[360px] flex flex-col space-y-6 shrink-0">
                  <div className="p-8 rounded-[36px] bg-white/[0.02] border border-white/5 backdrop-blur-3xl">
                     <h4 className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase mb-8 flex items-center">
                       System Status <div className="ml-3 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)] animate-ping" />
                     </h4>
                     <div className="space-y-6">
                        {[
                          { label: "AI Backend", value: "Online", sub: "Connected @ Localhub" },
                          { label: "Upscale Model", value: "Real-ESRGAN x4+", sub: "Neural Weights Loaded" },
                          { label: "Processing Mode", value: "GPU Acceleration", sub: "CUDA Core v12.4" }
                        ].map((stat, i) => (
                          <div key={i} className="flex flex-col">
                             <div className="flex justify-between items-center mb-1">
                               <span className="text-xs font-bold text-white/40">{stat.label}</span>
                               <span className="text-xs font-black text-white">{stat.value}</span>
                             </div>
                             <div className="text-[10px] text-white/20 italic">{stat.sub}</div>
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="p-8 rounded-[36px] bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 shadow-2xl">
                     <Maximize className="w-10 h-10 text-blue-500 mb-6" />
                     <h4 className="text-2xl font-black mb-2 leading-tight">Upscale to 4K Master</h4>
                     <p className="text-white/40 text-sm leading-relaxed mb-8">
                       Increase resolution by 400% with AI-generated details. Optimized for low-noise output.
                     </p>
                     <div className="flex items-center space-x-2 text-[10px] font-black tracking-widest text-blue-500 uppercase">
                        <span>Learn More</span> <ArrowRight className="w-3 h-3" />
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div 
                key="processing" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="w-full h-full flex items-center justify-center p-10"
              >
                <div className="w-full max-w-4xl rounded-[50px] bg-white/[0.02] border border-white/5 p-16 relative overflow-hidden flex flex-col items-center">
                   <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan" />
                   
                   <div className="relative mb-20 pointer-events-none">
                      <div className="w-48 h-48 rounded-full border border-blue-500/10 flex items-center justify-center animate-[spin_20s_linear_infinite]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="relative">
                            <motion.div 
                               animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                               transition={{ duration: 2, repeat: Infinity }}
                               className="absolute inset-0 bg-blue-500 blur-[40px] rounded-full"
                            />
                            <Wand2 className="w-20 h-20 text-blue-500 relative z-10" />
                         </div>
                      </div>
                   </div>

                   <div className="w-full max-w-xl space-y-12">
                      <div className="flex justify-between items-end">
                         <div className="flex flex-col">
                            <span className="text-xs font-black tracking-[0.4em] text-blue-500 mb-2 uppercase">{status || 'INITIALIZING ENGINE...'}</span>
                            <span className="text-4xl font-black text-white">{Math.round(progress)}<span className="text-white/20 ml-2">%</span></span>
                         </div>
                         <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] font-black tracking-widest text-white/30 uppercase mb-2">Throughput</span>
                            <span className="text-lg font-mono font-black text-white">32.4 FPS</span>
                         </div>
                      </div>

                      <div className="h-4 w-full bg-white/5 rounded-full border border-white/5 overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400 rounded-full shadow-[0_0_25px_rgba(59,130,246,0.6)]"
                         />
                      </div>

                      <div className="flex items-center justify-center space-x-12">
                         {[
                           { label: "Frames Extraction", done: progress > 10 },
                           { label: "Neural Upscaling", done: progress > 30 },
                           { label: "HDR Mastering", done: progress > 90 }
                         ].map((item, i) => (
                           <div key={i} className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${item.done ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]' : 'bg-white/10'}`} />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${item.done ? 'text-white' : 'text-white/20'}`}>{item.label}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {step === 'result' && (
              <motion.div 
                key="result" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full flex flex-col"
              >
                <div className="flex-1 rounded-[50px] bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col md:flex-row relative group">
                   <div className="flex-1 bg-black flex items-center justify-center p-20 relative">
                     <div className="absolute inset-0 bg-blue-600/5 mix-blend-overlay" />
                     <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center text-center relative z-10"
                      >
                         <div className="w-32 h-32 rounded-[40px] bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(34,197,94,0.3)] animate-pulse">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                         </div>
                         <h2 className="text-5xl font-black mb-4 tracking-tighter">SUCCESSFULLY <br /> MASTERED 4K</h2>
                         <div className="p-4 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold tracking-widest uppercase flex items-center">
                            <Zap className="mr-2 w-3 h-3 text-blue-500" /> Real-ESRGAN &nbsp;&bull;&nbsp; Neural v2.1
                         </div>
                      </motion.div>
                   </div>

                   <div className="w-full md:w-[450px] bg-black/40 backdrop-blur-3xl p-16 flex flex-col justify-center border-l border-white/5">
                      <div className="mb-12">
                         <h4 className="text-[10px] font-black tracking-[0.4em] text-white/30 uppercase mb-8">Generated Asset</h4>
                         <div className="text-4xl font-black tracking-tighter mb-4 leading-[0.9]">MASTER_OUT_{jobId?.slice(0, 6)} <span className="text-blue-500">.MP4</span></div>
                         <div className="space-y-2">
                           <div className="text-sm font-bold text-white/60 flex items-center"><Maximize className="w-4 h-4 mr-2" /> 3840 x 2160 (Native 4K)</div>
                           <div className="text-sm font-bold text-white/60 flex items-center"><Play className="w-4 h-4 mr-2" /> 24.00 fps / High Prof. 4.1</div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <a 
                          href={`${API_BASE}/download/${jobId}`}
                          className="w-full bg-white text-black h-24 rounded-[32px] flex items-center justify-center text-2xl font-black hover:scale-[1.02] hover:-translate-y-1 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.2)]"
                          download
                        >
                          DOWNLOAD <span className="text-blue-600 mx-2">&bull;</span> MASTER <ArrowRight className="ml-4 w-7 h-7" />
                        </a>
                        <div className="flex gap-4">
                           <button onClick={() => setStep('upload')} className="flex-1 h-20 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-bold text-xs uppercase tracking-widest">
                             NEW PROJECT
                           </button>
                           <button className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center">
                             <Share2 className="w-5 h-5 text-white/40" />
                           </button>
                        </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
