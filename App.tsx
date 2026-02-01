
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CameraHUD from './components/CameraHUD';
import { analyzeEvidence } from './services/geminiService';
import { SherlockAnalysis } from './types';

const App: React.FC = () => {
  const sessionId = useMemo(() => `SH-${uuidv4().substring(0, 8)}`, []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<SherlockAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<string[]>([]);
  const [activeDeduction, setActiveDeduction] = useState<number | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Identifying behavioral patterns...",
    "Correlating clothing minutiae...",
    "Accessing historical grounding...",
    "Synchronizing logic with Mind Palace...",
    "Finalizing Conclusive Assessment..."
  ];

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleCapture = useCallback(async (base64: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setCurrentAnalysis(null); 
    try {
      const result = await analyzeEvidence(base64, sessionId, memory);
      setCurrentAnalysis(result);
      if (result.session_memory) {
        setMemory(prev => [...new Set([...prev, ...result.session_memory])].slice(-10));
      }
    } catch (err: any) {
      if (err.message?.includes('QUOTA_EXHAUSTED')) {
        setError("The Mind Palace is at maximum capacity (Quota Reached). Please wait a few moments for the case files to clear.");
      } else {
        setError("Deductive link failed. The complexity of the subject overwhelmed the reasoning engine.");
      }
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId, memory, isAnalyzing]);

  const handleReset = useCallback(() => {
    setCurrentAnalysis(null);
    setError(null);
    setActiveDeduction(null);
    setIsAnalyzing(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 flex flex-col font-mono selection:bg-sky-500/30">
      {/* Optimized Header */}
      <header className="px-6 py-4 border-b border-sky-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-black/80 sticky top-0 z-50 backdrop-blur-md">
        <div>
          <h1 className="text-xl md:text-2xl font-bold italic font-['Playfair_Display'] text-sky-400 hud-glow tracking-tight">
            Sherlock <span className="text-gray-500 font-normal">AI</span>
          </h1>
          <p className="text-[7px] text-sky-500/40 tracking-[0.4em] uppercase font-mono">Behavioral Reasoning Engine // v3.1</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-[8px] border border-sky-900/30 px-3 py-1 rounded-sm text-sky-700 font-mono">SESSION::{sessionId}</div>
          <div className={`text-[9px] px-4 py-1.5 border rounded-full flex items-center gap-2 transition-all ${
            isAnalyzing ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' : 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className="font-bold tracking-widest">{isAnalyzing ? 'REASONING...' : 'READY'}</span>
          </div>
        </div>
      </header>

      {/* Full-width Responsive Grid */}
      <main className="flex-1 p-4 md:p-6 lg:p-10 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Visual Feed Section */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-sky-500/10 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <CameraHUD 
              onCapture={handleCapture} 
              analysisResults={currentAnalysis} 
              isAnalyzing={isAnalyzing} 
              onReset={handleReset}
            />
          </div>
          
          <div className="space-y-6">
            {isAnalyzing && (
              <div className="p-8 border border-sky-500/20 bg-sky-500/5 rounded-sm flex flex-col items-center gap-6 animate-fadeIn relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/5 to-transparent -translate-x-full animate-[loading-bar_3s_infinite]" />
                <div className="text-sky-400 text-[11px] font-bold uppercase tracking-[0.4em] text-center z-10">
                  {loadingMessages[loadingStep]}
                </div>
                <div className="w-full max-w-md h-[1px] bg-sky-900/20 overflow-hidden relative z-10">
                  <div className="absolute h-full bg-sky-500 w-1/3 animate-[loading-bar_1.5s_infinite_linear]" />
                </div>
                <p className="text-[9px] text-sky-600 italic animate-pulse">"The little things are infinitely the most important."</p>
              </div>
            )}

            {currentAnalysis && !isAnalyzing && (
              <div className="bg-sky-950/5 border border-sky-500/20 p-8 rounded-sm relative overflow-hidden animate-fadeIn shadow-[0_0_30px_rgba(56,189,248,0.05)]">
                <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/60" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 bg-sky-500 rounded-full" />
                  <h3 className="text-sky-500 text-[9px] font-bold uppercase tracking-[0.4em]">Final Deduction</h3>
                </div>
                <p className="text-xl md:text-2xl lg:text-3xl font-['Playfair_Display'] italic text-sky-50 leading-relaxed font-bold">
                  "{currentAnalysis.final_assessment}"
                </p>
              </div>
            )}

            {error && (
              <div className="p-6 border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] uppercase tracking-[0.3em] rounded-sm flex items-center gap-4">
                <div className="w-2 h-2 bg-red-500 animate-ping rounded-full" />
                <span>[CRITICAL_ERROR] {error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Analytical Panels Section */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <MetricBox label="STANCE" value={currentAnalysis?.scan_data?.stance} />
            <MetricBox label="BALANCE" value={currentAnalysis?.scan_data?.balance} />
            <MetricBox label="ATTENTION" value={currentAnalysis?.scan_data?.attention_score ? `${Math.round(currentAnalysis.scan_data.attention_score * 100)}%` : undefined} />
            <MetricBox label="POSTURE" value={currentAnalysis?.scan_data?.posture_score ? `${Math.round(currentAnalysis.scan_data.posture_score * 100)}%` : undefined} />
          </div>

          {/* Inference Stream - Independently Scrollable */}
          <div className="flex-1 flex flex-col border border-sky-900/20 rounded-sm overflow-hidden bg-black/40 backdrop-blur-sm">
            <div className="px-5 py-3 border-b border-sky-900/20 bg-black/60 flex justify-between items-center">
              <span className="text-[10px] text-sky-400 font-bold uppercase tracking-[0.3em]">Inference Stream</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-sky-900 rounded-full" />
                <div className="w-1 h-1 bg-sky-500 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-sky-900 rounded-full" />
              </div>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto max-h-[500px] lg:max-h-none custom-scrollbar">
              {currentAnalysis?.deductions.map((d, i) => (
                <div 
                  key={i}
                  onClick={() => setActiveDeduction(activeDeduction === i ? null : i)}
                  className={`p-5 border rounded-sm transition-all cursor-pointer group relative overflow-hidden ${
                    activeDeduction === i ? 'bg-sky-500/10 border-sky-500/50 shadow-[inset_0_0_15px_rgba(56,189,248,0.1)]' : 'bg-transparent border-sky-900/10 hover:border-sky-500/30'
                  }`}
                >
                  {activeDeduction === i && <div className="absolute top-0 left-0 w-full h-0.5 bg-sky-500/40" />}
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sky-400 font-bold text-[11px] uppercase tracking-wider">{d.title}</span>
                    <span className="text-[9px] text-sky-500/40 font-mono tracking-widest">{Math.round(d.confidence * 100)}% CONFIDENCE</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
                    {d.detail}
                  </p>
                  
                  {activeDeduction === i && (
                    <div className="mt-5 pt-5 border-t border-sky-900/20 space-y-5 animate-fadeIn">
                      <div>
                        <div className="text-[9px] text-sky-300/40 uppercase font-bold mb-3 tracking-[0.2em]">Logical Inference Path:</div>
                        <ul className="space-y-3">
                          {d.logic_steps.map((step, si) => (
                            <li key={si} className="text-[10px] text-sky-200/60 border-l-2 border-sky-500/20 pl-4 py-0.5 leading-snug">
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {d.grounding && d.grounding.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[9px] text-amber-500/40 uppercase font-bold mb-3 tracking-[0.2em]">Factual Verification:</div>
                          <div className="flex flex-col gap-2">
                            {d.grounding.map((g, gi) => (
                              <a 
                                key={gi} 
                                href={g.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-amber-500/60 hover:text-amber-400 transition-colors border border-amber-500/10 px-3 py-2 rounded-sm bg-amber-500/5 truncate block"
                              >
                                {g.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeDeduction !== i && (
                    <div className="absolute bottom-2 right-2 text-[8px] text-sky-500/0 group-hover:text-sky-500/40 transition-all font-bold tracking-widest uppercase">
                      Expand Logic +
                    </div>
                  )}
                </div>
              ))}
              
              {!currentAnalysis && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-24 opacity-20 text-center gap-4">
                  <div className="w-12 h-[1px] bg-sky-500" />
                  <p className="text-[10px] font-mono uppercase tracking-[0.5em]">Awaiting Evidence</p>
                  <div className="w-12 h-[1px] bg-sky-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center opacity-10 text-[9px] tracking-[1.5em] uppercase border-t border-sky-900/10 bg-black/40">
        Observation is an art. Deduction is a science.
      </footer>
    </div>
  );
};

const MetricBox = ({ label, value }: { label: string; value?: string | number }) => (
  <div className="bg-black/60 border border-sky-900/20 px-5 py-4 rounded-sm flex flex-col justify-center min-h-[70px] transition-all hover:border-sky-500/20 group">
    <span className="text-[8px] text-sky-700 block font-bold tracking-[0.2em] mb-1.5 group-hover:text-sky-500 transition-colors uppercase">{label}</span>
    <span className="text-xs font-bold text-gray-500 uppercase truncate block font-mono group-hover:text-gray-300 transition-colors tracking-widest">
      {value || '---'}
    </span>
  </div>
);

export default App;
