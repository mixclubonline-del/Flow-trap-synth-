
import React, { useRef, useEffect } from 'react';

interface EnvelopeGraphProps {
  attack: number;  // 0-1000 ms
  decay: number;   // 0-1000 ms
  sustain: number; // 0-100 %
  release: number; // 0-2000 ms
  strokeColor?: string;
  fillColor?: string;
}

const EnvelopeGraph: React.FC<EnvelopeGraphProps> = ({
  attack,
  decay,
  sustain,
  release,
  strokeColor = '#cbd5e1',
  fillColor = 'rgba(203, 213, 225, 0.1)'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Use parent dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 4;
    const drawHeight = height - padding * 2;
    const drawWidth = width - padding * 2;

    // Normalize values for visualization
    // Total visual time width logic:
    // We want to show the shape clearly. Let's assume a fixed visual width for A+D, and R.
    // Sustain is a level, but visual duration of hold.
    
    // Max values for normalization scaling
    const maxTime = 3000; // roughly max total time of A+D+R we care to show linearly
    const A = (attack / maxTime) * drawWidth * 0.8; // Scale factor
    const D = (decay / maxTime) * drawWidth * 0.8;
    const S_Level = (1 - (sustain / 100)) * drawHeight; // Y position (0 is top)
    const S_Width = drawWidth * 0.15; // Fixed visual hold width
    const R = (release / maxTime) * drawWidth * 0.8;

    // Points
    // Start: Bottom Left
    const p0 = { x: padding, y: height - padding };
    // Attack Peak: Top
    const p1 = { x: padding + Math.max(2, A), y: padding };
    // Decay End / Sustain Start
    const p2 = { x: p1.x + Math.max(2, D), y: padding + S_Level };
    // Sustain End
    const p3 = { x: p2.x + S_Width, y: padding + S_Level };
    // Release End
    const p4 = { x: Math.min(drawWidth + padding, p3.x + Math.max(2, R)), y: height - padding };

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Path
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    
    // Line Styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    
    // Shadow/Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = strokeColor;
    
    ctx.stroke();

    // Fill
    ctx.lineTo(p4.x, height - padding);
    ctx.lineTo(p0.x, height - padding);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.shadowBlur = 0;
    ctx.fill();

  }, [attack, decay, sustain, release, strokeColor, fillColor]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block"
    />
  );
};

export default EnvelopeGraph;
