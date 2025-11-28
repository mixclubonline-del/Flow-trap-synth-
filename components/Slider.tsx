
import React, { useState, useRef, useCallback } from 'react';
import { SliderProps } from '../types';

const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step,
  initialValue,
  onChange,
  accentColor = 'from-blue-500 to-cyan-400',
}) => {
  const [value, setValue] = useState(initialValue);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const handleValueChange = useCallback((clientY: number) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const offsetY = clientY - rect.top;
      const height = rect.height;
      let normalized = 1 - (offsetY / height);
      normalized = Math.max(0, Math.min(1, normalized));

      const range = max - min;
      const rawValue = min + normalized * range;
      const snappedValue = Math.round(rawValue / step) * step;

      if (snappedValue !== value) {
        setValue(snappedValue);
        onChange(snappedValue);
      }
    }
  }, [min, max, step, onChange, value]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handleValueChange(e.clientY);
  }, [handleValueChange]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isInteracting) {
      e.preventDefault();
      handleValueChange(e.clientY);
    }
  }, [isInteracting, handleValueChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsInteracting(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setValue(initialValue);
    onChange(initialValue);
  }, [initialValue, onChange]);

  const fillHeight = ((value - min) / (max - min)) * 100;
  const glowColor = accentColor.includes('cyan') ? 'rgba(34,211,238,0.5)' : 
                    accentColor.includes('pink') ? 'rgba(244,114,182,0.5)' : 
                    'rgba(255,255,255,0.3)';

  return (
    <div className="group flex flex-col items-center space-y-3 select-none h-full justify-end touch-none">
      <div
        ref={sliderRef}
        className="relative w-6 h-32 rounded-full cursor-ns-resize touch-none transition-all duration-200"
        style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-orientation="vertical"
        aria-label={label}
        title="Double-click to reset"
      >
        {/* Fill Beam */}
        <div
          className={`absolute bottom-0 left-1 right-1 rounded-full bg-gradient-to-t ${accentColor} opacity-80`}
          style={{ 
              height: `calc(${fillHeight}% - 4px)`,
              marginBottom: '2px',
              boxShadow: `0 0 15px ${glowColor}` 
          }}
        ></div>

        {/* Glass Cap Handle */}
        <div
          className={`absolute left-0 right-0 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-transform duration-100 ${isInteracting ? 'scale-x-125 bg-opacity-100' : 'bg-opacity-90'}`}
          style={{ bottom: `calc(${fillHeight}% - 3px)` }}
        ></div>
      </div>
      <label className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 group-hover:text-slate-300 transition-colors">
          {label}
      </label>
    </div>
  );
};

export default Slider;
    