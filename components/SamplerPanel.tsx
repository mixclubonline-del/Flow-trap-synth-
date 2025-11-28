
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSynth } from '../contexts/SynthContext';
import { SamplePad } from '../types';
import KnobControl from './KnobControl';

const colors = [
    'from-red-500 to-pink-500', 'from-orange-500 to-red-500', 'from-amber-400 to-orange-400', 'from-yellow-400 to-amber-400',
    'from-lime-400 to-green-500', 'from-emerald-400 to-teal-500', 'from-cyan-400 to-blue-500', 'from-sky-400 to-indigo-500',
    'from-indigo-400 to-violet-500', 'from-purple-400 to-fuchsia-500', 'from-pink-400 to-rose-500', 'from-rose-400 to-red-500',
    'from-slate-400 to-gray-500', 'from-gray-400 to-zinc-500', 'from-zinc-400 to-neutral-500', 'from-stone-400 to-slate-500'
];

const SamplerPanel: React.FC = () => {
  const synth = useSynth();
  const [pads, setPads] = useState<SamplePad[]>(
      Array.from({ length: 16 }, (_, i) => ({
          id: i,
          name: `Pad ${i + 1}`,
          buffer: null,
          color: colors[i],
          volume: 0.8,
          pitch: 0,
          pan: 0,
          reverse: false,
          isLoaded: false
      }))
  );
  const [selectedPadId, setSelectedPadId] = useState<number>(0);
  const selectedPad = pads[selectedPadId];

  // --- Waveform Canvas ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    drawWaveform();
  }, [selectedPad?.buffer, selectedPad?.color]);

  const drawWaveform = () => {
      const canvas = canvasRef.current;
      if (!canvas || !selectedPad) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!selectedPad.buffer) {
          ctx.font = '12px monospace';
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'center';
          ctx.fillText('DRAG AUDIO FILE HERE', width / 2, centerY);
          return;
      }

      const data = selectedPad.buffer.getChannelData(0);
      const step = Math.ceil(data.length / width);
      const amp = height / 2;

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let i = 0; i < width; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
              const datum = data[i * step + j];
              if (datum < min) min = datum;
              if (datum > max) max = datum;
          }
          ctx.lineTo(i, centerY + (max * amp));
          ctx.lineTo(i, centerY + (min * amp));
      }

      ctx.strokeStyle = '#22d3ee'; // Cyan default
      if (selectedPad.color.includes('red')) ctx.strokeStyle = '#ef4444';
      if (selectedPad.color.includes('pink')) ctx.strokeStyle = '#ec4899';
      if (selectedPad.color.includes('orange')) ctx.strokeStyle = '#f97316';
      if (selectedPad.color.includes('green')) ctx.strokeStyle = '#22c55e';
      
      ctx.lineWidth = 1;
      ctx.stroke();
  };

  // --- Handlers ---
  const handleDrop = useCallback(async (e: React.DragEvent, padId: number) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
          const arrayBuffer = await file.arrayBuffer();
          if (synth) {
              const audioBuffer = await synth.loadSample(padId, arrayBuffer);
              setPads(prev => prev.map(p => p.id === padId ? { ...p, buffer: audioBuffer, name: file.name.substring(0, 12), isLoaded: true } : p));
              setSelectedPadId(padId);
          }
      }
  }, [synth]);

  const triggerPad = (id: number) => {
      setSelectedPadId(id);
      const pad = pads[id];
      if (pad.isLoaded && synth) {
          synth.triggerSample(id, {
              volume: pad.volume,
              pitch: pad.pitch,
              pan: pad.pan,
              reverse: pad.reverse
          });
      }
  };

  const updateSelectedPad = (updates: Partial<SamplePad>) => {
      setPads(prev => prev.map(p => p.id === selectedPadId ? { ...p, ...updates } : p));
  };

  return (
    <div className="flex flex-col flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
       <div className="flex items-center justify-between mb-4">
           <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
             Fire Sampler
           </h2>
           <div className="text-xs font-mono text-slate-500">
               DRAG & DROP SAMPLES ONTO PADS
           </div>
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[400px]">
           {/* Pad Grid */}
           <div className="lg:col-span-7 glass-panel rounded-2xl p-6">
               <div className="grid grid-cols-4 gap-4 h-full">
                   {pads.map((pad) => (
                       <div
                           key={pad.id}
                           onDragOver={(e) => e.preventDefault()}
                           onDrop={(e) => handleDrop(e, pad.id)}
                           onPointerDown={() => triggerPad(pad.id)}
                           className={`relative rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-100 select-none
                               ${pad.id === selectedPadId ? 'ring-2 ring-white/50' : 'hover:bg-white/5'}
                               ${pad.isLoaded 
                                   ? `bg-gradient-to-br ${pad.color} opacity-80 hover:opacity-100 shadow-lg` 
                                   : 'bg-slate-800/50 border border-slate-700 border-dashed'
                               }
                           `}
                       >
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${pad.isLoaded ? 'text-white drop-shadow-md' : 'text-slate-600'}`}>
                               {pad.name}
                           </span>
                           {!pad.isLoaded && <span className="text-[8px] text-slate-700 mt-1">EMPTY</span>}
                           
                           {/* Active hit flash logic would go here via state if needed, but simple active:scale works well */}
                           <div className="absolute inset-0 bg-white opacity-0 active:opacity-20 rounded-xl transition-opacity duration-75"></div>
                       </div>
                   ))}
               </div>
           </div>

           {/* Editor Panel */}
           <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col space-y-6">
               {/* Waveform View */}
               <div className="h-32 bg-black/40 rounded-xl border border-white/5 overflow-hidden relative">
                   <canvas ref={canvasRef} className="w-full h-full" />
                   <div className="absolute top-2 left-2 text-[9px] font-bold text-slate-500 uppercase">
                       {selectedPad.name}
                   </div>
               </div>

               {/* Controls */}
               <div className="flex-1 grid grid-cols-2 gap-6 place-items-center bg-slate-900/20 rounded-xl p-4">
                   <KnobControl 
                       label="Pitch" min={-12} max={12} step={1} 
                       initialValue={selectedPad.pitch} 
                       onChange={(v) => updateSelectedPad({ pitch: v })} 
                       accentColor="from-cyan-400 to-blue-500"
                   />
                   <KnobControl 
                       label="Volume" min={0} max={2} step={0.01} 
                       initialValue={selectedPad.volume} 
                       onChange={(v) => updateSelectedPad({ volume: v })} 
                       accentColor="from-green-400 to-emerald-500"
                   />
                   <KnobControl 
                       label="Pan" min={-1} max={1} step={0.1} 
                       initialValue={selectedPad.pan} 
                       onChange={(v) => updateSelectedPad({ pan: v })} 
                       accentColor="from-purple-400 to-pink-500"
                   />
                   
                   <div className="flex flex-col items-center justify-center space-y-2">
                       <label className="text-[10px] font-bold uppercase text-slate-500">Reverse</label>
                       <button 
                           onClick={() => updateSelectedPad({ reverse: !selectedPad.reverse })}
                           className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${selectedPad.reverse ? 'bg-orange-500 border-orange-400 text-white shadow-orange-glow' : 'bg-transparent border-slate-600 text-slate-500'}`}
                       >
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                       </button>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};

export default SamplerPanel;