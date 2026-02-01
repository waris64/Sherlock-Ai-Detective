
import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CameraHUD from './components/CameraHUD';
import { analyzeEvidence } from './services/geminiService';
import { SherlockAnalysis } from './types';

const App: React.FC = () => {
  const [sessionId] = useState(() => `SH-${uuidv4()}`);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<SherlockAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<string[]>([]);

  const handleCapture = useCallback(async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeEvidence(base64, sessionId, memory);
      setCurrentAnalysis(result);
      setMemory(prev => [...new Set([...prev, ...result.session_memory])].slice(-10));
    } catch (err: any) {
      setError(err.message || "Observation failed. Try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId, memory]);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-sky-900/30 pb-4">
        <div>
          <h1 className="text-3xl font-bold italic font-['Playfair_Display'] text-sky-400 hud-glow tracking-tight">
            Sherlock <span className="text-gray-400">AI</span> Detective
          </h1>
          <p className="text-xs text-sky-500/60 font-mono mt-1 tracking-widest uppercase">
            Visual Cognition & Behavioral Inference Engine
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[10px] font-mono text-emerald-500/80 bg-emerald-500/10 px-2 py-1 border border-emerald-500/20 rounded">
            STATUS: ENCRYPTED LINK ACTIVE
          </div>
          <span className="text-[10px] text-gray-500 mt-1 font-mono">{sessionId}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Camera View */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <CameraHUD 
            onCapture={handleCapture} 
            analysisResults={currentAnalysis} 
            isAnalyzing={isAnalyzing} 
          />
          
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm font-mono animate-pulse">
              [SYSTEM ERROR] {error}
            </div>
          )}

          {/* Assessment Overlay */}
          {currentAnalysis && (
            <div className="bg-sky-950/20 border border-sky-500/30 p-6 rounded-lg backdrop-blur-sm">
              <h2 className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-3 border-b border-sky-500/20 pb-2">
                The Final Assessment
              </h2>
              <p className="text-xl font-['Playfair_Display'] italic text-sky-100 leading-relaxed">
                "{currentAnalysis.final_assessment}"
              </p>
            </div>
          )}
        </div>

        {/* Right: Data Feed */}
        <div className="flex flex-col gap-6 h-full">
          {/* Scan Data */}
          <section className="bg-black/40 border border-sky-900/50 p-4 rounded flex flex-col gap-4">
            <h3 className="text-sky-400 text-xs font-bold uppercase tracking-widest">Initial Scan Data</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-l-2 border-sky-500/30 pl-3">
                <span className="text-[10px] text-gray-500 block">IDENTITY</span>
                <span className="text-sm font-bold text-sky-200">{currentAnalysis?.scan_data.gender || '---'}</span>
              </div>
              <div className="border-l-2 border-sky-500/30 pl-3">
                <span className="text-[10px] text-gray-500 block">AGE RANGE</span>
                <span className="text-sm font-bold text-sky-200">{currentAnalysis?.scan_data.age_range || '---'}</span>
              </div>
              <div className="border-l-2 border-sky-500/30 pl-3">
                <span className="text-[10px] text-gray-500 block">STANCE</span>
                <span className="text-sm font-bold text-sky-200 truncate">{currentAnalysis?.scan_data.stance || '---'}</span>
              </div>
              <div className="border-l-2 border-sky-500/30 pl-3">
                <span className="text-[10px] text-gray-500 block">BALANCE</span>
                <span className="text-sm font-bold text-sky-200 truncate">{currentAnalysis?.scan_data.balance || '---'}</span>
              </div>
              <div className="col-span-2 border-l-2 border-sky-500/30 pl-3">
                <span className="text-[10px] text-gray-500 block">ENVIRONMENT</span>
                <span className="text-sm font-bold text-sky-200">{currentAnalysis?.scan_data.environment || '---'}</span>
              </div>
            </div>
          </section>

          {/* Deductions Feed */}
          <section className="flex-1 overflow-y-auto space-y-4 max-h-[60vh] scrollbar-thin scrollbar-thumb-sky-900 pr-2">
            <h3 className="text-sky-400 text-xs font-bold uppercase tracking-widest sticky top-0 bg-[#050505] py-2 z-10">
              Deduction Stream
            </h3>
            
            {currentAnalysis?.deductions.map((d, i) => (
              <div 
                key={i} 
                className="group p-4 bg-sky-900/10 border border-sky-800/30 hover:border-sky-500/50 transition-all rounded"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sky-300 font-bold text-sm tracking-tight">{d.title}</h4>
                  <div className="flex items-center gap-2">
                     <span className={`text-[10px] px-1.5 py-0.5 rounded border ${d.confidence > 0.8 ? 'border-emerald-500/50 text-emerald-400' : 'border-amber-500/50 text-amber-400'}`}>
                      {Math.round(d.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  {d.detail}
                </p>
                {d.illustration_overlay && (
                  <div className="mt-3 p-2 bg-black/40 text-[9px] text-sky-400/60 font-mono border-t border-sky-900/30 italic">
                    OBSERVATION_HINT: {d.illustration_overlay}
                  </div>
                )}
              </div>
            ))}

            {!currentAnalysis && !isAnalyzing && (
              <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-sky-900/30 rounded text-sky-900 font-mono italic">
                <span>Awating visual input...</span>
                <span className="text-[10px] mt-2">Observe the obvious to find the obscure.</span>
              </div>
            )}

            {isAnalyzing && (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse p-4 bg-sky-900/5 border border-sky-900/20 rounded h-24" />
                ))}
              </div>
            )}
          </section>

          {/* Session Memory */}
          <section className="bg-sky-950/10 border-t border-sky-900/30 pt-4">
            <h3 className="text-sky-400 text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Memory Continuity</h3>
            <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
              {memory.length > 0 ? memory.map((m, i) => (
                <div key={i} className="text-[10px] text-gray-500 border-l border-sky-900 pl-2 py-1">
                  <span className="text-sky-800 font-bold mr-2">{'>'}</span> {m}
                </div>
              )) : (
                <div className="text-[10px] text-gray-700 italic">No persistent observations recorded.</div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-auto pt-8 border-t border-sky-900/30 text-[10px] font-mono text-gray-600 flex justify-between items-center">
        <span>&copy; 221B BAKER STREET AI // MULTIMODAL V3.1</span>
        <div className="flex gap-4">
          <span className="animate-pulse">LATENCY: {isAnalyzing ? 'FETCHING...' : 'OPTIMAL'}</span>
          <span>POWERED BY GEMINI 3 PRO</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
