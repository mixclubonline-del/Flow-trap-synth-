
import React, { useState, useEffect } from 'react';
import { SequenceTrack } from '../types';
import { useSynth } from '../contexts/SynthContext';

interface SequencerPanelProps {
    bpm: number;
    setBpm: (b: number) => void;
}

const SequencerPanel: React.FC<SequencerPanelProps> = ({ bpm, setBpm }) => {
  const synth = useSynth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [tracks, setTracks] = useState<SequenceTrack[]>([
    { name: '808', color: 'bg-red-500', steps: Array(16).fill({ active: false, velocity: 100 }) },
    { name: 'Clap', color: 'bg-pink-500', steps: Array(16).fill({ active: false, velocity: 100 }) },
    { name: 'Hi-Hat', color: 'bg-yellow-400', steps: Array(16).fill({ active: false, velocity: 100 }) },
    { name: 'Snare', color: 'bg-cyan-400', steps: Array(16).fill({ active: false, velocity: 100 }) },
    { name: 'Perc', color: 'bg-green-400', steps: Array(16).fill({ active: false, velocity: 100 }) },
    { name: 'Open Hat', color: 'bg-purple-500', steps: Array(16).fill({ active: false, velocity: 100 }) },
  ]);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      const stepTime = (60 / bpm) / 4 * 1000;
      interval = window.setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % 16;
          tracks.forEach(track => {
             if (track.steps[nextStep].active) {
                 synth?.triggerDrum(track.name);
             }
          });
          return nextStep;
        });
      }, stepTime);
    }
    return () => clearInterval(interval);
  }, [isPlaying, bpm, tracks, synth]);

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    const newTracks = [...tracks];
    const step = newTracks[trackIndex].steps[stepIndex];
    newTracks[trackIndex].steps[stepIndex] = { ...step, active: !step.active };
    setTracks(newTracks);
  };
  
  const clearPattern = () => {
      const newTracks = tracks.map(t => ({
          ...t,
          steps: Array(16).fill({ active: false, velocity: 100 })
      }));
      setTracks(newTracks);
  };

  const randomizePattern = () => {
       const newTracks = tracks.map(t => ({
          ...t,
          steps: t.steps.map(s => ({ ...s, active: Math.random() > 0.7 }))
      }));
      setTracks(newTracks);
  };

  return (
    <div className="flex flex-col flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
       {/* Header Controls */}
       <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${isPlaying ? 'bg-red-500 text-white shadow-red-glow' : 'bg-cyan-500 text-white shadow-cyan-glow hover:scale-105'}`}
            >
               {isPlaying ? (
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
               ) : (
                 <svg className="w-5 h-5 pl-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
               )}
            </button>
            
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">BPM</label>
              <input 
                type="number" 
                value={bpm} 
                onChange={(e) => setBpm(Number(e.target.value))}
                className="bg-transparent text-2xl font-mono font-bold text-white focus:outline-none w-20"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
             <button onClick={randomizePattern} className="glass-button px-4 py-2 rounded-lg text-xs font-bold text-purple-300 hover:text-white">
                RND PATTERN
             </button>
             <button onClick={clearPattern} className="glass-button px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white">
                CLEAR
             </button>
             <div className="text-slate-500 text-xs font-mono border-l border-white/10 pl-4">
                STEP {currentStep + 1} / 16
             </div>
          </div>
       </div>

       {/* Sequencer Grid */}
       <div className="glass-panel rounded-2xl p-6 flex-1 overflow-x-auto custom-scrollbar">
          <div className="min-w-[800px]">
            {/* Step Numbers */}
            <div className="flex mb-4 pl-24">
               {Array.from({ length: 16 }).map((_, i) => (
                 <div key={i} className={`flex-1 text-center text-[10px] font-bold ${i % 4 === 0 ? 'text-white' : 'text-slate-600'}`}>
                   {i + 1}
                 </div>
               ))}
            </div>

            {/* Tracks */}
            <div className="space-y-3">
              {tracks.map((track, trackIndex) => (
                <div key={track.name} className="flex items-center">
                   <div className="w-24 text-xs font-bold uppercase tracking-wider text-slate-300">{track.name}</div>
                   <div className="flex-1 flex space-x-1">
                      {track.steps.map((step, stepIndex) => {
                        const isCurrent = currentStep === stepIndex;
                        const isBeat = stepIndex % 4 === 0;
                        return (
                          <button
                            key={stepIndex}
                            onClick={() => toggleStep(trackIndex, stepIndex)}
                            className={`flex-1 h-10 rounded-md transition-all duration-150 relative
                               ${step.active 
                                  ? `${track.color} shadow-[0_0_10px_currentColor] scale-95` 
                                  : `bg-white/5 hover:bg-white/10 ${isBeat ? 'border-l border-white/10' : ''}`
                               }
                               ${isCurrent ? 'ring-1 ring-white/50 z-10' : ''}
                            `}
                          >
                             {isCurrent && <div className="absolute inset-0 bg-white/20 animate-pulse rounded-md"></div>}
                          </button>
                        );
                      })}
                   </div>
                </div>
              ))}
            </div>
          </div>
       </div>
    </div>
  );
};

export default SequencerPanel;
