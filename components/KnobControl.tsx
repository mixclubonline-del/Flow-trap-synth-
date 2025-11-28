
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { KnobControlProps } from '../types';

const KnobControl: React.FC<KnobControlProps> = ({
  label,
  min,
  max,
  step,
  initialValue,
  onChange,
  accentColor = 'from-pink-500 to-purple-400',
}) => {
  const [value, setValue] = useState(initialValue);
  const [isInteracting, setIsInteracting] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startValue = useRef(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInteracting(true);
    startY.current = e.clientY;
    startValue.current = value;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'ns-resize';
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isInteracting) return;
    e.preventDefault();

    const deltaY = startY.current - e.clientY;
    const sensitivity = 0.8;
    const range = max - min;
    const change = (deltaY / 120) * range * sensitivity;

    let newValue = startValue.current + change;
    newValue = Math.max(min, Math.min(max, newValue));
    const snappedValue = Math.round(newValue / step) * step;

    if (snappedValue !== value) {
      setValue(snappedValue);
      onChange(snappedValue);
    }
  }, [isInteracting, min, max, step, onChange, value]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsInteracting(false);
    document.body.style.cursor = 'default';
  }, []);

  const handleDoubleClick = useCallback(() => {
      setValue(initialValue);
      onChange(initialValue);
  }, [initialValue, onChange]);

  // Calculations for the Arc
  const range = max - min;
  const normalizedValue = (value - min) / range; // 0 to 1
  // Use a 270 degree arc (starting at 135deg, ending at 405deg)
  const startAngle = 135;
  const endAngle = 405;
  const angleRange = endAngle - startAngle;
  const currentAngle = startAngle + (normalizedValue * angleRange);
  
  // SVG helper for arc path
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  }

  // Generate unique ID for gradient
  const gradientId = `grad-${label.replace(/\s+/g, '')}-${Math.random().toString(36).substr(2, 9)}`;

  // Extract Tailwind color classes for shadow construction
  const shadowColorClass = accentColor.includes('cyan') ? 'rgba(34,211,238,0.6)' : 
                           accentColor.includes('pink') ? 'rgba(244,114,182,0.6)' :
                           accentColor.includes('green') ? 'rgba(74,222,128,0.6)' :
                           accentColor.includes('yellow') ? 'rgba(250,204,21,0.6)' :
                           'rgba(148,163,184,0.6)';

  return (
    <div className="group flex flex-col items-center space-y-2 select-none touch-none">
      <div
        ref={knobRef}
        className="relative w-14 h-14 flex items-center justify-center cursor-ns-resize touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        role="slider"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
        title="Double-click to reset"
      >
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={`var(--color-from, #cbd5e1)`} className="stop-color-from" />
              <stop offset="100%" stopColor={`var(--color-to, #94a3b8)`} className="stop-color-to" />
            </linearGradient>
          </defs>
          
          {/* Background Track (Frosted Glass Groove) */}
          <path
            d={describeArc(50, 50, 40, 135, 405)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          <path
            d={describeArc(50, 50, 40, 135, currentAngle)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="6"
            strokeLinecap="round"
            className={`${accentColor} filter drop-shadow-[0_0_4px_${shadowColorClass}]`}
          />
        </svg>
        
        {/* Center Digital Readout */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className={`text-[10px] font-bold font-mono tracking-tighter transition-all duration-200 ${isInteracting ? 'text-white scale-110' : 'text-slate-400'}`}>
                {value.toFixed(0)}
             </span>
        </div>
      </div>
      
      <label className={`text-[10px] uppercase tracking-widest font-semibold transition-colors duration-200 ${isInteracting ? 'text-white' : 'text-slate-500'}`}>
        {label}
      </label>
    </div>
  );
};

export default KnobControl;
    