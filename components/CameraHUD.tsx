
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SherlockAnalysis, Evidence } from '../types';

interface CameraHUDProps {
  onCapture: (base64: string) => void;
  analysisResults: SherlockAnalysis | null;
  isAnalyzing: boolean;
}

const CameraHUD: React.FC<CameraHUDProps> = ({ onCapture, analysisResults, isAnalyzing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsActive(true);
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
    setupCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleScan = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(dataUrl.split(',')[1]);
    }
  }, [onCapture]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-sky-900/50 shadow-2xl shadow-sky-500/10">
      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover opacity-80"
      />

      {/* Static Canvas for Capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* HUD Layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="scanline" />
        
        {/* Corners */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-sky-400 opacity-50" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-sky-400 opacity-50" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-sky-400 opacity-50" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-sky-400 opacity-50" />

        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 opacity-20">
          <div className="absolute top-1/2 left-0 w-full h-px bg-sky-400" />
          <div className="absolute left-1/2 top-0 w-px h-full bg-sky-400" />
        </div>

        {/* Analysis Overlays */}
        {analysisResults?.deductions.map((d, i) => (
          d.evidence.map((ev, ei) => (
            <div 
              key={`${i}-${ei}`}
              className="absolute border border-sky-400 bg-sky-400/10 transition-all duration-700 animate-pulse"
              style={{
                left: `${(ev.x / 1000) * 100}%`,
                top: `${(ev.y / 1000) * 100}%`,
                width: `${(ev.width / 1000) * 100}%`,
                height: `${(ev.height / 1000) * 100}%`,
                boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
              }}
            >
              <div className="absolute -top-6 left-0 whitespace-nowrap bg-sky-900/80 px-2 py-0.5 text-[10px] text-sky-200 border border-sky-400/50">
                DETECTED: {ev.description}
              </div>
            </div>
          ))
        ))}

        {/* Scan Status */}
        <div className="absolute bottom-6 left-6 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
              {isAnalyzing ? 'Analyzing Pattern...' : 'System Ready'}
            </span>
          </div>
          {analysisResults && (
            <div className="text-[10px] text-sky-400/70 font-mono">
              SESSION_ID: {analysisResults.session_id.substring(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Capture Button */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
        <button
          onClick={handleScan}
          disabled={!isActive || isAnalyzing}
          className={`
            group relative flex items-center justify-center p-4 rounded-full border-2 transition-all
            ${isAnalyzing ? 'border-amber-500/50 cursor-not-allowed' : 'border-sky-500 hover:scale-110 active:scale-95 bg-sky-500/10 hover:bg-sky-500/20'}
          `}
        >
          <div className={`w-8 h-8 rounded-full border-2 ${isAnalyzing ? 'border-amber-500 border-t-transparent animate-spin' : 'border-sky-400'}`}>
            {!isAnalyzing && <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-sky-400" />}
          </div>
          <span className="absolute -top-10 right-0 whitespace-nowrap text-[10px] font-bold text-sky-400 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
            INITIATE SCAN
          </span>
        </button>
      </div>
    </div>
  );
};

export default CameraHUD;
