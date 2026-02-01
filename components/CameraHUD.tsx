
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SherlockAnalysis } from '../types';

interface CameraHUDProps {
  onCapture: (base64: string) => void;
  analysisResults: SherlockAnalysis | null;
  isAnalyzing: boolean;
  onReset: () => void;
}

const CameraHUD: React.FC<CameraHUDProps> = ({ onCapture, analysisResults, isAnalyzing, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [flash, setFlash] = useState(false);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const setupCamera = useCallback(async () => {
    setPermissionError(null);
    setIsInitializing(true);
    setPreviewUrl(null);
    onReset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsActive(true);
          setIsInitializing(false);
        };
      }
    } catch (err: any) {
      setIsInitializing(false);
      setPermissionError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Hardware Failure');
      setIsActive(false);
    }
  }, [onReset]);

  const handleScan = useCallback(() => {
    if (isAnalyzing) return;
    
    // Handle Live Video Scan
    if (isActive && videoRef.current && canvasRef.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const scale = Math.min(1, 1024 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreviewUrl(dataUrl);
        
        // Stop the camera immediately after capture to end resource consumption
        stopCamera();
        
        onCapture(dataUrl.split(',')[1]);
      }
    } 
    // Handle Static Preview Scan (Uploaded)
    else if (previewUrl && !analysisResults) {
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      const base64 = previewUrl.split(',')[1];
      onCapture(base64);
    }
  }, [onCapture, isActive, isAnalyzing, previewUrl, stopCamera, analysisResults]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    onReset();

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFullReset = () => {
    stopCamera();
    setPreviewUrl(null);
    onReset();
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg border border-sky-900/50 overflow-hidden shadow-2xl">
      {/* Visual Sources */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isActive ? 'opacity-80' : 'opacity-0'}`}
      />
      
      {previewUrl && (
        <img 
          src={previewUrl} 
          className="absolute inset-0 w-full h-full object-contain bg-black/40" 
          alt="Evidence Preview" 
        />
      )}

      {flash && <div className="absolute inset-0 bg-white z-50 animate-pulse opacity-40 pointer-events-none" />}

      {/* Initial Landing State */}
      {(!isActive && !previewUrl && !permissionError) && (
        <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-6 text-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-sky-400 font-bold tracking-[0.3em] uppercase text-xs">Awaiting Optical Input</h2>
            <p className="text-[9px] text-sky-700 font-mono italic">"The game is afoot. Select your method of observation."</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={setupCamera}
              disabled={isInitializing}
              className="px-8 py-3 bg-sky-500/5 border border-sky-500/30 text-sky-400 text-[10px] font-bold tracking-widest hover:bg-sky-500 hover:text-white transition-all rounded-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isInitializing ? 'INITIALIZING...' : 'START CAMERA FEED'}
            </button>
            <button 
              onClick={triggerFileUpload}
              className="px-8 py-3 bg-amber-500/5 border border-amber-500/30 text-amber-400 text-[10px] font-bold tracking-widest hover:bg-amber-500 hover:text-white transition-all rounded-sm flex items-center gap-2"
            >
              LOAD EVIDENCE (ASSET)
            </button>
          </div>
        </div>
      )}

      {permissionError && (
        <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-red-500 font-bold uppercase text-[10px] tracking-widest mb-2">[HARDWARE_FAILURE]</div>
          <p className="text-red-400/60 text-[9px] mb-4">{permissionError}</p>
          <button onClick={setupCamera} className="text-sky-500 text-[9px] underline uppercase tracking-widest">Retry Connection</button>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* HUD overlays */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {(isActive || isAnalyzing) && <div className="scanline" />}
        
        {/* Dynamic Frame Borders */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-sky-500/40" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-sky-500/40" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-sky-500/40" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-sky-500/40" />

        {/* Deduction Evidence Bounding Boxes */}
        {previewUrl && analysisResults?.deductions.map((d, i) => (
          d.evidence.map((ev, ei) => (
            <div 
              key={`${i}-${ei}`}
              className="absolute border border-sky-400/60 bg-sky-400/5 transition-all duration-1000 animate-fadeIn"
              style={{
                left: `${(ev.x / 1000) * 100}%`,
                top: `${(ev.y / 1000) * 100}%`,
                width: `${(ev.width / 1000) * 100}%`,
                height: `${(ev.height / 1000) * 100}%`,
              }}
            >
              <div className="absolute -top-5 left-0 text-[7px] text-sky-300 font-mono bg-black/80 px-2 py-0.5 border border-sky-500/20 whitespace-nowrap">
                EVIDENCE_{ev.description.toUpperCase().slice(0, 20)}
              </div>
            </div>
          ))
        ))}
      </div>

      {/* HUD Controls */}
      {(isActive || previewUrl) && (
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-3">
           {(previewUrl || analysisResults) && (
             <button
              onClick={handleFullReset}
              title="New Observation"
              className="px-4 h-10 rounded-full border border-red-500/30 bg-black/60 flex items-center justify-center hover:bg-red-500/20 transition-all gap-2"
            >
              <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Clear</span>
            </button>
           )}
           
           {!analysisResults && (
             <button
              onClick={isActive ? handleScan : setupCamera}
              disabled={isAnalyzing}
              className="w-14 h-14 rounded-full border-2 border-sky-500 bg-sky-500/10 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 disabled:opacity-30 group shadow-[0_0_20px_rgba(56,189,248,0.2)]"
            >
              <div className={`w-3 h-3 rounded-sm bg-sky-400 ${isAnalyzing ? 'animate-spin' : 'shadow-[0_0_12px_#38bdf8] group-hover:scale-110'} transition-all`} />
            </button>
           )}
        </div>
      )}

      {/* Watermark/Status */}
      {(isActive || previewUrl) && (
        <div className="absolute top-4 left-4 z-30 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[8px] font-mono text-white/50 tracking-widest uppercase">
              {isActive ? 'FEED_LIVE_DETERMINISTIC' : analysisResults ? 'POST_ANALYSIS_STATIC' : 'STATIC_ASSET_READY'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraHUD;
