import React, { useRef, useEffect } from 'react';
import { LfoShape } from '../types';

interface LFOVisualizerProps {
  shape: LfoShape;
  rate: number; // 0-100
}

const LFOVisualizer: React.FC<LFOVisualizerProps> = ({ shape, rate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  const phase = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#4ade80'; // emerald-400
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(52, 211, 153, 0.7)';
      ctx.shadowBlur = 5;
      
      ctx.beginPath();
      
      const halfHeight = height / 2;
      const frequency = 2; // How many cycles to show
      const animationSpeed = (rate / 100) * 0.1 + 0.005;
      phase.current = (phase.current + animationSpeed) % (Math.PI * 2);

      for (let x = 0; x < width; x++) {
        const angle = (x / width) * Math.PI * 2 * frequency + phase.current;
        let y = halfHeight;

        switch (shape) {
          case 'sine':
            y = halfHeight - Math.sin(angle) * (halfHeight * 0.8);
            break;
          case 'square':
            y = halfHeight - (Math.sin(angle) >= 0 ? 1 : -1) * (halfHeight * 0.8);
            break;
          case 'saw':
            y = halfHeight - (1 - (2 * (angle / (Math.PI * 2)) % 1)) * (halfHeight * 0.8);
            break;
          case 'triangle':
            y = halfHeight - (Math.abs(((angle / Math.PI) % 2) - 1) * 2 - 1) * (halfHeight * 0.8);
            break;
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [shape, rate]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      role="img"
      aria-label={`Animated ${shape} LFO waveform`}
    />
  );
};

export default LFOVisualizer;
