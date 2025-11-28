
import React, { useState, useEffect } from 'react';
import { useSynth } from '../contexts/SynthContext';
import FlowConnect from '../lib/FlowConnect';

interface HeaderProps {
  toggleSidebar: () => void;
  onRandomize?: () => void; // Hook into app randomization
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, onRandomize }) => {
  const synth = useSynth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [lastRecording, setLastRecording] = useState<Blob | null>(null);
  const [isMastering, setIsMastering] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = async () => {
    if (!synth) return;
    
    if (isRecording) {
      setIsRecording(false);
      const blob = await synth.stopRecording();
      setLastRecording(blob);
      
      // Auto download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fire-trap-session-${new Date().toISOString()}.wav`;
      a.click();
    } else {
      synth.startRecording();
      setIsRecording(true);
      setLastRecording(null);
    }
  };

  const handleMastering = async () => {
    if (!lastRecording) return;
    
    setIsMastering(true);
    try {
        const flow = new FlowConnect({
          appId: 'mastering-pro',
          appName: 'Mastering Pro',
          version: '1.0.0'
        });
        await flow.connect();
        // Send audio to Flow
        flow.shareAudio({ name: `Session ${new Date().toLocaleTimeString()}`, buffer: lastRecording });
    } catch (e) {
        console.error("Mastering failed", e);
    } finally {
        setIsMastering(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 z-20 relative">
      {/* Left: Logo & Sidebar Toggle */}
      <div className="flex items-center space-x-6 glass-panel px-4 py-2 rounded-full">
        <button
          className="text-slate-400 hover:text-white transition-colors duration-200 focus:outline-none"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
        </button>
        <div className="text-sm font-bold tracking-[0.3em] uppercase text-slate-200">
          Fire Trap <span className="text-cyan-400 text-glow">Vision</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-3">
        {/* Chaos/Randomize Button */}
        {onRandomize && (
          <button 
             onClick={onRandomize}
             className="flex items-center space-x-2 px-4 py-2 rounded-full border border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:shadow-purple-glow hover:text-white transition-all duration-300 group"
             title="Randomize Parameters"
          >
            <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            <span className="text-xs font-bold tracking-widest">CHAOS</span>
          </button>
        )}
        
        {/* Recorder */}
        <button 
           onClick={toggleRecording}
           className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-300 ${isRecording ? 'bg-red-500/20 border-red-500 text-red-400 shadow-red-glow' : 'glass-button text-slate-400'}`}
        >
           <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></div>
           <span className="text-xs font-bold font-mono">{isRecording ? formatTime(recordingTime) : 'REC'}</span>
        </button>

        {/* Master Button (FlowConnect) */}
        {lastRecording && (
            <button 
                onClick={handleMastering}
                disabled={isMastering}
                className="flex items-center space-x-2 px-4 py-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:shadow-green-glow transition-all duration-300 animate-fadeIn"
            >
                {isMastering ? (
                    <div className="w-3 h-3 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin"></div>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                )}
                <span className="text-xs font-bold tracking-widest">MASTER AI</span>
            </button>
        )}

        <button className="px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/50 text-cyan-300 text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/20 hover:shadow-cyan-glow transition-all duration-300">
          Save Preset
        </button>
      </div>
    </header>
  );
};

export default Header;
