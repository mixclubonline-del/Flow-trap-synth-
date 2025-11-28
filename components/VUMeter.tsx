import React, { useState, useEffect } from 'react';

const VUMeter: React.FC = () => {
  const [level, setLevel] = useState(0);
  const numSegments = 16;

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate a pulsing audio signal
      const randomPeak = Math.random();
      const newLevel = Math.floor(randomPeak * numSegments * 0.8 + Math.random() * 0.2 * numSegments);
      setLevel(newLevel);
    }, 150); // Update rate

    return () => clearInterval(interval);
  }, []);

  const segments = Array.from({ length: numSegments }).map((_, i) => {
    const isActive = i < level;
    let color = 'bg-slate-700/50';
    if (isActive) {
      if (i > numSegments - 3) {
        color = 'bg-red-500 shadow-red-glow'; // Peak
      } else if (i > numSegments - 6) {
        color = 'bg-yellow-400 shadow-yellow-glow'; // High
      } else {
        color = 'bg-green-500 shadow-green-glow'; // Normal
      }
    }
    return (
      <div
        key={i}
        className={`w-full h-1.5 rounded-sm transition-colors duration-100 ${color}`}
      ></div>
    );
  });

  return (
    <div className="flex flex-col-reverse w-4 h-32 bg-slate-900/50 p-1 rounded-md space-y-1 shadow-inner">
      {segments}
    </div>
  );
};

export default VUMeter;
