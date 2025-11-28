
import React, { useState, useRef, useCallback, useEffect } from 'react';
import SoundBankCard from './SoundBankCard';

interface SoundBankBrowserProps {
    onLoadBank?: (bankName: string) => void;
}

const soundBanksData = [
  { name: 'Inferno 808s', imageUrl: 'https://aistudiocdn.com/synth-covers/beatmakers_haze.jpg', genre: 'Bass / 808', sampleAudioUrl: '' },
  { name: 'Molten Leads', imageUrl: 'https://aistudiocdn.com/synth-covers/dark_grime.jpg', genre: 'Trap Leads', sampleAudioUrl: '' },
  { name: 'Ashen Pads', imageUrl: 'https://aistudiocdn.com/synth-covers/irradiated_landscapes.jpg', genre: 'Atmospheric', sampleAudioUrl: '' },
  { name: 'Trap Ghosts', imageUrl: 'https://aistudiocdn.com/synth-covers/ivory_simulacra.jpg', genre: 'Ethereal Keys', sampleAudioUrl: '' },
  { name: 'Mirage Plucks', imageUrl: 'https://aistudiocdn.com/synth-covers/mirage_horizon.jpg', genre: 'Synthwave / Arp', sampleAudioUrl: '' },
  { name: 'Volcanic Bass', imageUrl: 'https://aistudiocdn.com/synth-covers/pigments_2.jpg', genre: 'Distorted Bass', sampleAudioUrl: '' },
  { name: 'Drill Essentials', imageUrl: 'https://aistudiocdn.com/synth-covers/pigments_3.jpg', genre: 'Drill / Grime', sampleAudioUrl: '' },
  { name: 'Lo-Fi Embers', imageUrl: 'https://aistudiocdn.com/synth-covers/pigments_3_5.jpg', genre: 'Lo-Fi / Chill', sampleAudioUrl: '' },
  { name: 'Hyper-Pop Shards', imageUrl: 'https://aistudiocdn.com/synth-covers/pigments_4.jpg', genre: 'Hyper-Pop', sampleAudioUrl: '' },
  { name: 'Chromatic Fire', imageUrl: 'https://aistudiocdn.com/synth-covers/sonata_chroma.jpg', genre: 'Melodic Trap', sampleAudioUrl: '' },
  { name: 'Ambient Smoke', imageUrl: 'https://aistudiocdn.com/synth-covers/soulful_soundscapes.jpg', genre: 'Ambient Trap', sampleAudioUrl: '' },
  { name: 'Glitch System', imageUrl: 'https://aistudiocdn.com/synth-covers/blocky_grooves.jpg', genre: 'Experimental', sampleAudioUrl: '' },
];

const SoundBankBrowser: React.FC<SoundBankBrowserProps> = ({ onLoadBank }) => {
  const [currentPlayingBank, setCurrentPlayingBank] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      stopPreview();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopPreview = () => {
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); } catch (e) {}
      osc.disconnect();
    });
    oscillatorsRef.current = [];
    setCurrentPlayingBank(null);
  };

  const playPreview = (bankName: string) => {
    // initialize AudioContext on user interaction
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const ctx = audioContextRef.current;
    
    // Stop any currently playing sound
    stopPreview();
    setCurrentPlayingBank(bankName);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.1, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2); // 2 second fade out
    masterGain.connect(ctx.destination);
    gainNodeRef.current = masterGain;

    // Create a simple chord / sweep depending on the name (pseudo-random)
    const isBass = bankName.toLowerCase().includes('bass') || bankName.toLowerCase().includes('808');
    const baseFreq = isBass ? 55 : 220;
    
    const freqs = [baseFreq, baseFreq * 1.5, baseFreq * 2]; // Root, Fifth, Octave

    freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = isBass ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        // Detune slightly for thickness
        osc.detune.value = (Math.random() - 0.5) * 20;

        if (!isBass) {
            osc.frequency.exponentialRampToValueAtTime(freq * 2, ctx.currentTime + 0.5); // Sweep up
        } else {
             osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + 0.5); // Sweep down
        }

        osc.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 2);
        oscillatorsRef.current.push(osc);
    });

    // Auto-reset state after playback
    setTimeout(() => {
        if (currentPlayingBank === bankName) {
            setCurrentPlayingBank(null);
        }
    }, 2000);
  };

  const handlePreviewClick = useCallback((_: string, bankName: string) => {
    if (currentPlayingBank === bankName) {
      stopPreview();
    } else {
      playPreview(bankName);
    }
  }, [currentPlayingBank]);

  const handleLoadClick = (bankName: string) => {
      if (onLoadBank) onLoadBank(bankName);
  };

  return (
    <div className="flex flex-col flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
      <div className="flex items-baseline justify-between">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          Sound Banks
        </h2>
        <span className="text-sm text-slate-400">{soundBanksData.length} Banks</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {soundBanksData.map((bank, index) => (
          <SoundBankCard
            key={index}
            name={bank.name}
            imageUrl={bank.imageUrl}
            genre={bank.genre}
            isLiked={index % 3 === 0}
            onPreviewClick={handlePreviewClick}
            onLoadClick={handleLoadClick}
            isPlayingPreview={currentPlayingBank === bank.name}
            sampleAudioUrl={bank.sampleAudioUrl}
          />
        ))}
      </div>
    </div>
  );
};

export default SoundBankBrowser;
