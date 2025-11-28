import React from 'react';

interface AudioActivationOverlayProps {
  onActivate: () => void;
}

const AudioActivationOverlay: React.FC<AudioActivationOverlayProps> = ({ onActivate }) => {
  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <div className="text-center p-8 rounded-lg">
        <h2 className="text-3xl font-bold text-slate-100 mb-4">Audio Engine is Idle</h2>
        <p className="text-slate-400 mb-8 max-w-md">
          To comply with browser policies and ensure the best audio experience,
          please click the button below to start the synthesizer.
        </p>
        <button
          onClick={onActivate}
          className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-cyan-glow transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
        >
          Start Audio Engine
        </button>
      </div>
    </div>
  );
};

export default AudioActivationOverlay;
