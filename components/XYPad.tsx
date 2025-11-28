
import React, { useRef, useState, useCallback } from 'react';

interface XYPadProps {
  x: number;
  y: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  onChangeX: (val: number) => void;
  onChangeY: (val: number) => void;
  label?: string;
  className?: string;
}

const XYPad: React.FC<XYPadProps> = ({
  x, y, minX, maxX, minY, maxY, onChangeX, onChangeY, label, className = ''
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const updateValues = useCallback((clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    
    let normX = (clientX - rect.left) / rect.width;
    let normY = 1 - ((clientY - rect.top) / rect.height); 

    normX = Math.max(0, Math.min(1, normX));
    normY = Math.max(0, Math.min(1, normY));

    // Linear mapping
    const valX = minX + normX * (maxX - minX);
    const valY = minY + normY * (maxY - minY);

    onChangeX(valX);
    onChangeY(valY);
  }, [minX, maxX, minY, maxY, onChangeX, onChangeY]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsInteracting(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateValues(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isInteracting) {
      e.preventDefault();
      updateValues(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsInteracting(false);
  };

  const percentX = ((x - minX) / (maxX - minX)) * 100;
  const percentY = ((y - minY) / (maxY - minY)) * 100;
  
  const cssLeft = `${Math.max(0, Math.min(100, percentX))}%`;
  const cssTop = `${Math.max(0, Math.min(100, 100 - percentY))}%`;

  return (
    <div className={`flex flex-col h-full w-full select-none touch-none ${className}`}>
       {label && <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</div>}
       <div 
         ref={padRef}
         className="relative flex-1 bg-black/30 rounded-xl border border-white/10 overflow-hidden cursor-crosshair shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] group"
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onPointerCancel={handlePointerUp}
       >
         {/* Grid */}
         <div className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ 
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
              }} 
         />
         
         {/* Axis Labels */}
         <div className="absolute bottom-2 right-2 text-[9px] font-bold text-white/20 pointer-events-none select-none">CUTOFF</div>
         <div className="absolute top-2 left-2 text-[9px] font-bold text-white/20 pointer-events-none writing-mode-vertical rotate-180 select-none">RES</div>

         {/* Puck */}
         <div 
           className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] border-2 border-white transition-transform duration-75 ease-out pointer-events-none"
           style={{ left: cssLeft, top: cssTop, transform: isInteracting ? 'scale(1.2)' : 'scale(1)' }}
         />
         
         {/* Active Crosshairs */}
         {isInteracting && (
             <>
                <div className="absolute left-0 w-full h-px bg-cyan-400/30 pointer-events-none" style={{ top: cssTop }} />
                <div className="absolute top-0 h-full w-px bg-cyan-400/30 pointer-events-none" style={{ left: cssLeft }} />
             </>
         )}
       </div>
    </div>
  );
};

export default XYPad;
    