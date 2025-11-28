
import React, { useRef, useEffect, useState } from 'react';
import { useSynth } from '../contexts/SynthContext';
import { AnalysisMode } from '../types';

interface WaveVisualizerProps {
  width?: number;
  height?: number;
  // Props for Synthetic Mode fallback
  osc1Shape?: 'sine' | 'square' | 'sawtooth' | 'triangle';
  osc2Shape?: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  width,
  height,
  osc1Shape = 'sine',
  osc2Shape = 'square',
}) => {
  const synth = useSynth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  
  const [mode, setMode] = useState<AnalysisMode>('synthetic');
  const [layers, setLayers] = useState({
    osc1: true,
    osc2: true,
    output: true
  });
  
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (synth && (mode === 'scope' || mode === 'spectrum')) {
        const count = mode === 'spectrum' ? synth.analyser.frequencyBinCount : 2048;
        setDataArray(new Uint8Array(count));
    }
  }, [synth, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = width || rect.width;
    const displayHeight = height || rect.height;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);
    
    let time = 0;

    const getWaveY = (shape: string, t: number) => {
        let val = 0;
        // Adjust phases for cleaner overlapping visuals
        switch(shape) {
            case 'sine': val = Math.sin(t); break;
            case 'square': val = Math.sin(t) >= 0 ? 0.8 : -0.8; break;
            case 'sawtooth': val = (2 * (t / (Math.PI * 2) - Math.floor(t / (Math.PI * 2) + 0.5))) * 0.8; break; 
            case 'triangle': val = (2 * Math.abs(2 * (t / (Math.PI * 2) - Math.floor(t / (Math.PI * 2) + 0.5))) - 1) * 0.8; break;
            default: val = Math.sin(t);
        }
        return val;
    };

    const draw = () => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      
      const centerY = displayHeight / 2;

      // --- SYNTHETIC MODE (Fallback/Low CPU) ---
      if (mode === 'synthetic' || !synth) {
          time += 0.08;
          const amplitude = 0.35;
          const maxAmp = displayHeight / 2.5;

          // 1. Output Layer (Fire Gradient Background)
          if (layers.output) {
            const frequency = 2;
            const gradient = ctx.createLinearGradient(0, 0, 0, displayHeight);
            gradient.addColorStop(0, 'rgba(0,0,0,0)'); 
            gradient.addColorStop(0.4, 'rgba(220, 38, 38, 0.4)'); // Red
            gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.8)'); // Amber
            gradient.addColorStop(0.6, 'rgba(220, 38, 38, 0.4)'); // Red
            gradient.addColorStop(1, 'rgba(0,0,0,0)'); 
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, centerY);

            for (let x = 0; x < displayWidth; x += 4) {
                // Combine shapes roughly
                const t1 = (x / displayWidth) * Math.PI * 2 * frequency + time;
                const t2 = (x / displayWidth) * Math.PI * 2 * (frequency * 1.01) + time; // slight detune visual
                const val1 = getWaveY(osc1Shape, t1);
                const val2 = getWaveY(osc2Shape, t2);
                const combined = (val1 + val2) / 2;
                const y = combined * maxAmp * amplitude;
                ctx.lineTo(x, centerY - y);
            }
            // Mirror
            for (let x = displayWidth; x >= 0; x -= 4) {
                 const t1 = (x / displayWidth) * Math.PI * 2 * frequency + time;
                 const t2 = (x / displayWidth) * Math.PI * 2 * (frequency * 1.01) + time;
                 const val1 = getWaveY(osc1Shape, t1);
                 const val2 = getWaveY(osc2Shape, t2);
                 const combined = (val1 + val2) / 2;
                 const y = combined * maxAmp * amplitude;
                 ctx.lineTo(x, centerY + y);
            }
            ctx.fill();
            
            // Center line
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(displayWidth, centerY);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // 2. Oscillator 1 Layer (Amber/Yellow)
          if (layers.osc1) {
             const frequency = 2;
             ctx.beginPath();
             ctx.strokeStyle = '#fbbf24'; // Amber 400
             ctx.lineWidth = 2;
             
             for (let x = 0; x < displayWidth; x += 2) {
                 const t = (x / displayWidth) * Math.PI * 2 * frequency + time;
                 const y = getWaveY(osc1Shape, t) * maxAmp * amplitude;
                 ctx.lineTo(x, centerY - y);
             }
             ctx.stroke();
          }

          // 3. Oscillator 2 Layer (Cyan)
          if (layers.osc2) {
             const frequency = 2.02; // Slight detune visual
             ctx.beginPath();
             ctx.strokeStyle = '#22d3ee'; // Cyan 400
             ctx.lineWidth = 2;
             
             for (let x = 0; x < displayWidth; x += 2) {
                 const t = (x / displayWidth) * Math.PI * 2 * frequency + time;
                 const y = getWaveY(osc2Shape, t) * maxAmp * amplitude;
                 ctx.lineTo(x, centerY - y);
             }
             ctx.stroke();
          }
      }

      // --- SCOPE MODE (Time Domain) ---
      else if (mode === 'scope' && synth && dataArray) {
          if (layers.output) {
              synth.analyser.getByteTimeDomainData(dataArray);
              
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#22d3ee'; // Cyan
              ctx.shadowBlur = 4;
              ctx.shadowColor = '#22d3ee';
              
              ctx.beginPath();
              const sliceWidth = displayWidth / dataArray.length;
              let x = 0;
              
              for (let i = 0; i < dataArray.length; i++) {
                  const v = dataArray[i] / 128.0;
                  const y = v * (displayHeight / 2);
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                  x += sliceWidth;
              }
              ctx.stroke();
              ctx.shadowBlur = 0;
          } else {
             ctx.fillStyle = 'rgba(255,255,255,0.1)';
             ctx.textAlign = 'center';
             ctx.fillText('OUTPUT MUTED', displayWidth/2, centerY);
          }
      }

      // --- SPECTRUM MODE (Frequency Domain) ---
      else if (mode === 'spectrum' && synth && dataArray) {
          if (layers.output) {
              synth.analyser.getByteFrequencyData(dataArray);
              
              const barWidth = (displayWidth / dataArray.length) * 2.5;
              let x = 0;
              
              for (let i = 0; i < dataArray.length; i++) {
                  const barHeight = (dataArray[i] / 255) * displayHeight;
                  
                  // Gradient Color based on height/intensity
                  const hue = (i / dataArray.length) * 30 + 10; // Orange/Red range
                  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                  
                  // Mirror effect for cool look
                  ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
                  
                  x += barWidth + 1;
                  if (x > displayWidth) break;
              }
          }
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [width, height, mode, synth, dataArray, layers, osc1Shape, osc2Shape]);

  const toggleLayer = (key: keyof typeof layers) => {
      setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative w-full h-full group">
      <canvas
        ref={canvasRef}
        className="block w-full h-full opacity-90"
      />
      
      {/* Mode Switchers */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setMode('synthetic')} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border transition-all ${mode === 'synthetic' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'}`}>Synth</button>
        <button onClick={() => setMode('scope')} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border transition-all ${mode === 'scope' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'}`}>Scope</button>
        <button onClick={() => setMode('spectrum')} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border transition-all ${mode === 'spectrum' ? 'bg-orange-500/20 text-orange-400 border-orange-500' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'}`}>FFT</button>
      </div>

      {/* Layer Toggles */}
      <div className="absolute bottom-4 left-4 flex gap-2">
          {mode === 'synthetic' && (
              <>
                <button 
                    onClick={() => toggleLayer('osc1')} 
                    className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded border transition-all 
                    ${layers.osc1 ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-black/40 text-slate-600 border-white/5 hover:border-white/20'}`}
                >
                    OSC 1
                </button>
                <button 
                    onClick={() => toggleLayer('osc2')} 
                    className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded border transition-all 
                    ${layers.osc2 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-black/40 text-slate-600 border-white/5 hover:border-white/20'}`}
                >
                    OSC 2
                </button>
              </>
          )}
          <button 
            onClick={() => toggleLayer('output')} 
            className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded border transition-all 
            ${layers.output ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-black/40 text-slate-600 border-white/5 hover:border-white/20'}`}
          >
            OUTPUT
          </button>
      </div>
    </div>
  );
};

export default WaveVisualizer;
