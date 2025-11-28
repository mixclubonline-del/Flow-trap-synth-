
import React, { useRef, useEffect } from 'react';

interface FilterGraphProps {
  cutoff: number;     // 20 - 20000 Hz
  resonance: number;  // 0 - 100
  strokeColor?: string;
  fillColor?: string;
}

const FilterGraph: React.FC<FilterGraphProps> = ({
  cutoff,
  resonance,
  strokeColor = '#c084fc',
  fillColor = 'rgba(192, 132, 252, 0.1)'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Logarithmic mapping for frequency x-axis
    // minFreq = 20, maxFreq = 20000
    // x = log(freq / min) / log(max / min) * width
    const minLog = Math.log(20);
    const maxLog = Math.log(20000);
    const scale = (maxLog - minLog);

    const getX = (freq: number) => {
      return ((Math.log(Math.max(20, freq)) - minLog) / scale) * width;
    };

    // Calculate cutoff X position
    const cutoffX = getX(cutoff);

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    
    // Start at low freq, high gain (Low Pass)
    const startY = height * 0.4; // Base level
    ctx.moveTo(0, startY);

    // Draw curve
    // For a simple visualization of LPF with Resonance:
    // It stays flat until near cutoff.
    // At cutoff, it peaks (resonance).
    // After cutoff, it drops off.

    const resPeakHeight = (resonance / 100) * (height * 0.35);
    
    // Control point 1: Before cutoff
    ctx.lineTo(cutoffX - (width * 0.1), startY);
    
    // Peak at Cutoff
    // Bezier to create the resonant bump
    // Control point for the rise
    ctx.quadraticCurveTo(cutoffX, startY - resPeakHeight * 2, cutoffX, startY - resPeakHeight);
    
    // Drop off
    // Slope down to bottom right
    ctx.bezierCurveTo(
      cutoffX + (width * 0.05), startY, 
      cutoffX + (width * 0.1), height, 
      width, height
    );

    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = strokeColor;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.shadowBlur = 0;
    ctx.fill();

  }, [cutoff, resonance, strokeColor, fillColor]);

  return (
    <canvas ref={canvasRef} className="w-full h-full block" />
  );
};

export default FilterGraph;
