
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainSynthPanel from './components/MainSynthPanel';
import SynthKeyboard from './components/SynthKeyboard';
import KnobControl from './components/KnobControl';
import SoundBankBrowser from './components/SoundBankBrowser';
import AIChatPanel from './components/AIChatPanel';
import VoiceInputPanel from './components/VoiceInputPanel';
import ContentAnalyzerPanel from './components/ContentAnalyzerPanel';
import SequencerPanel from './components/SequencerPanel';
import SamplerPanel from './components/SamplerPanel';
import Slider from './components/Slider';
import VUMeter from './components/VUMeter';
import { AppView, ArpeggiatorMode, LayerTriggerMode, LfoShape, ScaleType, RootKey, FmRouting } from './types';

// New Imports for Audio Engine
import AudioActivationOverlay from './components/AudioActivationOverlay';
import { SynthProvider } from './contexts/SynthContext';
import SynthEngine from './lib/synthEngine';


const App: React.FC = () => {
  // --- Synth Engine State ---
  const synthEngine = useRef<SynthEngine | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  
  // --- UI State ---
  const [currentView, setCurrentView] = useState<AppView>('synthEditor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarSections, setSidebarSections] = useState({
    navigation: true, aiTools: true,
  });

  // --- Music Theory & Global State ---
  const [bpm, setBpm] = useState(140);
  const [scaleRoot, setScaleRoot] = useState<RootKey>('C');
  const [scaleType, setScaleType] = useState<ScaleType>('Phrygian');
  const [isArpeggiatorOn, setIsArpeggiatorOn] = useState(false);

  // --- Synth Parameter State ---
  // Oscillators
  const [osc1Shape, setOsc1Shape] = useState<"sawtooth" | "square" | "sine" | "triangle">('sawtooth');
  const [osc1Tune, setOsc1Tune] = useState(0);
  const [osc1Fine, setOsc1Fine] = useState(0);
  const [osc1Level, setOsc1Level] = useState(0.8);
  const [osc1Pan, setOsc1Pan] = useState(0);
  const [osc2Shape, setOsc2Shape] = useState<'sawtooth' | 'square' | 'sine' | 'triangle'>('square');
  const [osc2Tune, setOsc2Tune] = useState(0);
  const [osc2Fine, setOsc2Fine] = useState(0);
  const [osc2Level, setOsc2Level] = useState(0.6);
  const [osc2Pan, setOsc2Pan] = useState(0);
  
  // FM Synthesis
  const [fmRouting, setFmRouting] = useState<FmRouting>('none');
  const [fmDepth, setFmDepth] = useState(0);
  const [fmGain, setFmGain] = useState(0.5);
  const [fmRatio, setFmRatio] = useState(1);
  
  // Filter & Global Env
  const [filterCutoff, setFilterCutoff] = useState(8000);
  const [filterResonance, setFilterResonance] = useState(20);
  const [filterEnvAmt, setFilterEnvAmt] = useState(50);
  const [filterDrive, setFilterDrive] = useState(20);
  const [globalAttack, setGlobalAttack] = useState(0.005);
  const [globalDecay, setGlobalDecay] = useState(0.1);
  const [globalSustain, setGlobalSustain] = useState(0.8);
  const [globalRelease, setGlobalRelease] = useState(0.2);
  
  // Engine / Layer
  const [glide, setGlide] = useState(0);
  const [glideMode, setGlideMode] = useState<'linear' | 'exponential'>('linear');
  const [glideCurve, setGlideCurve] = useState(0); // 0-100, affects rate scaling
  const [layerMix, setLayerMix] = useState(0.5);
  const [layerTriggerMode, setLayerTriggerMode] = useState<LayerTriggerMode>('cycle');

  // 808 Sub Module
  const [bass808Tune, setBass808Tune] = useState(0);
  const [bass808Decay, setBass808Decay] = useState(50);
  const [bass808Drive, setBass808Drive] = useState(0);
  const [bass808Level, setBass808Level] = useState(0);

  // Arpeggiator
  const [arpeggiatorRate, setArpeggiatorRate] = useState(50);
  const [arpeggiatorGate, setArpeggiatorGate] = useState(50);
  const [arpeggiatorSwing, setArpeggiatorSwing] = useState(0);
  const [arpeggiatorMode, setArpeggiatorMode] = useState<ArpeggiatorMode>('up');

  // LFOs
  const [lfo1Shape, setLfo1Shape] = useState<LfoShape>('sine');
  const [lfo1Rate, setLfo1Rate] = useState(20); // 0-100
  const [lfo2Shape, setLfo2Shape] = useState<LfoShape>('triangle');
  const [lfo2Rate, setLfo2Rate] = useState(5); // 0-100

  // Master FX
  const [reverbSend, setReverbSend] = useState(0.2);
  const [delaySend, setDelaySend] = useState(0.1);
  const [masterDrive, setMasterDrive] = useState(0);
  
  // --- Performance Controls State ---
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [pitchBend, setPitchBend] = useState(0);
  const [timbre, setTimbre] = useState(60);
  const [fxSend, setFxSend] = useState(50);
  
  // --- Preset Management State ---
  const [presets, setPresets] = useState<any[]>([]);
  const [currentPresetName, setCurrentPresetName] = useState('Init Preset');
  
  // --- All Synth Parameters ---
  const synthParams = {
    osc1Shape, osc1Tune, osc1Fine, osc1Level, osc1Pan,
    osc2Shape, osc2Tune, osc2Fine, osc2Level, osc2Pan,
    fmRouting, fmDepth, fmGain, fmRatio,
    filterCutoff, filterResonance, filterEnvAmt, filterDrive,
    glide, glideMode, glideCurve, layerMix, layerTriggerMode,
    globalAttack, globalDecay, globalSustain, globalRelease,
    bass808Tune, bass808Decay, bass808Drive, bass808Level,
    arpeggiatorRate, arpeggiatorGate, arpeggiatorSwing, arpeggiatorMode,
    arpeggiatorOn: isArpeggiatorOn, bpm,
    lfo1Shape, lfo1Rate, lfo2Shape, lfo2Rate,
    reverbSend, delaySend, masterDrive,
    masterVolume, pitchBend, timbre, fxSend
  };

  // --- Effect to update synth engine on parameter changes ---
  useEffect(() => {
    if (!isAudioActive || !synthEngine.current) return;
    Object.entries(synthParams).forEach(([key, value]) => {
      synthEngine.current?.setParam(key, value);
    });
  }, [synthParams, isAudioActive]);


  const handleActivateAudio = () => {
    if (!synthEngine.current) {
      synthEngine.current = new SynthEngine();
    }
    synthEngine.current.start();
    setIsAudioActive(true);
    setupMidi();
  };
  
  // --- WebMIDI Setup ---
  const setupMidi = async () => {
    if (navigator.requestMIDIAccess) {
      try {
        const midiAccess = await navigator.requestMIDIAccess();
        const inputs = midiAccess.inputs.values();
        for (const input of inputs) {
          input.onmidimessage = (message) => {
             const [command, note, velocity] = message.data;
             if (!synthEngine.current) return;
             
             // Note notes are MIDI numbers. We need to convert to Note Names (e.g. 60 -> C4)
             const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
             const octave = Math.floor(note / 12) - 1;
             const noteName = `${notes[note % 12]}${octave}`;

             if (command === 144 && velocity > 0) { // Note On
                handleNoteOn(noteName);
                synthEngine.current.noteOn(noteName);
             } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
                handleNoteOff(noteName);
                synthEngine.current.noteOff(noteName);
             }
          };
        }
      } catch (e) {
        console.warn("MIDI access failed", e);
      }
    }
  };

  const handleNoteOn = useCallback((note: string) => {
    setPressedKeys(prev => new Set(prev).add(note));
  }, []);

  const handleNoteOff = useCallback((note: string) => {
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
  }, []);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
  const toggleSidebarSection = useCallback((section: keyof typeof sidebarSections) => {
    setSidebarSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // --- Chaos Randomizer ---
  const randomizeParams = () => {
    const r = Math.random;
    const shapes = ['sawtooth', 'square', 'sine', 'triangle'] as const;
    
    setOsc1Shape(shapes[Math.floor(r() * 4)]);
    setOsc1Tune(Math.floor(r() * 24) - 12);
    setOsc2Shape(shapes[Math.floor(r() * 4)]);
    setOsc2Tune(Math.floor(r() * 24) - 12);
    
    setFilterCutoff(200 + r() * 10000);
    setFilterResonance(r() * 80);
    setFilterDrive(r() * 50);
    
    setGlobalAttack(r() * 0.5);
    setGlobalDecay(r() * 1.0);
    
    setReverbSend(r() * 0.6);
    setDelaySend(r() * 0.5);
    setMasterDrive(r() * 0.4);
    
    setLfo1Rate(r() * 80);
    
    // FM Randomization
    setFmDepth(r() * 100);
    setFmGain(r());
    setFmRouting(['none', '1->2', '2->1'][Math.floor(r() * 3)] as FmRouting);
  };
  
  // --- Sound Bank Loading Logic ---
  const handleLoadBank = (bankName: string) => {
      // Map bank names to presets
      const name = bankName.toLowerCase();
      
      if (name.includes('inferno 808')) {
          setOsc1Shape('sine'); setOsc1Tune(-12); setOsc1Level(0.9);
          setBass808Level(1.0); setBass808Drive(0.8); setBass808Decay(80);
          setFilterCutoff(400); setFilterDrive(60);
          setMasterDrive(0.5);
      } else if (name.includes('molten lead')) {
          setOsc1Shape('sawtooth'); setOsc2Shape('square'); setOsc2Tune(7);
          setFilterCutoff(8000); setFilterResonance(60);
          setGlide(0.1); setDelaySend(0.4); setReverbSend(0.4);
          setFmRouting('1->2'); setFmDepth(30); setFmRatio(1);
      } else if (name.includes('ashen pad')) {
          setOsc1Shape('triangle'); setOsc2Shape('sine'); setOsc2Fine(10);
          setGlobalAttack(1.5); setGlobalRelease(2.0);
          setFilterCutoff(2000); setReverbSend(0.8);
      } else if (name.includes('trap ghost')) {
          setOsc1Shape('sine'); setOsc2Shape('triangle'); setOsc1Tune(12);
          setLfo1Rate(60); setFilterCutoff(3000);
          setIsArpeggiatorOn(true); setArpeggiatorRate(60);
      } else {
          // Default Random
          randomizeParams();
      }
      
      setCurrentPresetName(bankName);
      setCurrentView('synthEditor');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'soundBanks': return <SoundBankBrowser onLoadBank={handleLoadBank} />;
      case 'sequencer': return <SequencerPanel bpm={bpm} setBpm={setBpm} />;
      case 'sampler': return <SamplerPanel />;
      case 'aiChat': return <AIChatPanel />;
      case 'voiceInput': return <VoiceInputPanel />;
      case 'contentAnalyzer': return <ContentAnalyzerPanel />;
      case 'synthEditor':
      default:
        return (
          <MainSynthPanel
            // Oscillators
            osc1Shape={osc1Shape} setOsc1Shape={setOsc1Shape} osc1Tune={osc1Tune} setOsc1Tune={setOsc1Tune}
            osc1Fine={osc1Fine} setOsc1Fine={setOsc1Fine} osc1Level={osc1Level * 100} setOsc1Level={(v) => setOsc1Level(v / 100)}
            osc1Pan={osc1Pan} setOsc1Pan={setOsc1Pan}
            osc2Shape={osc2Shape} setOsc2Shape={setOsc2Shape} osc2Tune={osc2Tune} setOsc2Tune={setOsc2Tune}
            osc2Fine={osc2Fine} setOsc2Fine={setOsc2Fine} osc2Level={osc2Level * 100} setOsc2Level={(v) => setOsc2Level(v / 100)}
            osc2Pan={osc2Pan} setOsc2Pan={setOsc2Pan}
            
            // FM Synthesis
            fmRouting={fmRouting} setFmRouting={setFmRouting}
            fmDepth={fmDepth} setFmDepth={setFmDepth}
            fmGain={fmGain * 100} setFmGain={(v) => setFmGain(v / 100)}
            fmRatio={fmRatio} setFmRatio={setFmRatio}
            
            // Filter & Env
            filterCutoff={filterCutoff} setFilterCutoff={setFilterCutoff} filterResonance={filterResonance} setFilterResonance={setFilterResonance}
            filterEnvAmt={filterEnvAmt} setFilterEnvAmt={setFilterEnvAmt} filterDrive={filterDrive} setFilterDrive={setFilterDrive}
            globalAttack={globalAttack * 1000} setGlobalAttack={(v) => setGlobalAttack(v / 1000)} globalDecay={globalDecay * 1000} setGlobalDecay={(v) => setGlobalDecay(v / 1000)}
            globalSustain={globalSustain * 100} setGlobalSustain={(v) => setGlobalSustain(v / 100)} globalRelease={globalRelease * 1000} setGlobalRelease={(v) => setGlobalRelease(v / 1000)}
            
            // Engine / Layer
            layerMix={layerMix * 100} setLayerMix={(v) => setLayerMix(v / 100)} 
            glide={glide * 1000} setGlide={(v) => setGlide(v / 1000)}
            glideMode={glideMode} setGlideMode={setGlideMode}
            glideCurve={glideCurve} setGlideCurve={setGlideCurve}
            layerTriggerMode={layerTriggerMode} setLayerTriggerMode={setLayerTriggerMode}

            // 808
            bass808Tune={bass808Tune} setBass808Tune={setBass808Tune}
            bass808Decay={bass808Decay} setBass808Decay={setBass808Decay}
            bass808Drive={bass808Drive} setBass808Drive={setBass808Drive}
            bass808Level={bass808Level} setBass808Level={setBass808Level}

            // Arpeggiator
            arpeggiatorRate={arpeggiatorRate} setArpeggiatorRate={setArpeggiatorRate}
            arpeggiatorGate={arpeggiatorGate} setArpeggiatorGate={setArpeggiatorGate}
            arpeggiatorSwing={arpeggiatorSwing} setArpeggiatorSwing={setArpeggiatorSwing}
            arpeggiatorMode={arpeggiatorMode} setArpeggiatorMode={setArpeggiatorMode}

            // LFOs
            lfo1Shape={lfo1Shape} setLfo1Shape={setLfo1Shape}
            lfo1Rate={lfo1Rate} setLfo1Rate={setLfo1Rate}
            lfo2Shape={lfo2Shape} setLfo2Shape={setLfo2Shape}
            lfo2Rate={lfo2Rate} setLfo2Rate={setLfo2Rate}

            // Master FX
            reverbSend={reverbSend * 100} setReverbSend={(v) => setReverbSend(v / 100)}
            delaySend={delaySend * 100} setDelaySend={(v) => setDelaySend(v / 100)}
            masterDrive={masterDrive * 100} setMasterDrive={(v) => setMasterDrive(v / 100)}

            // Presets
            presets={presets} setPresets={setPresets} currentPresetName={currentPresetName} setCurrentPresetName={setCurrentPresetName}
          />
        );
    }
  };

  return (
    <SynthProvider value={synthEngine.current}>
      <div className="flex flex-col h-screen antialiased text-slate-200">
        {!isAudioActive && <AudioActivationOverlay onActivate={handleActivateAudio} />}
        
        <Header toggleSidebar={toggleSidebar} onRandomize={randomizeParams} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} setCurrentView={setCurrentView}
            activeView={currentView} openSections={sidebarSections} toggleSection={toggleSidebarSection}
          />
          <main className="flex-1 flex flex-col overflow-hidden">
            {renderContent()}
          </main>
        </div>

        <footer className="glass-panel p-4 flex flex-col shadow-inner border-t border-slate-700 z-10 sticky bottom-0 bg-black/80 backdrop-blur-xl">
           {/* Music Theory Toolbar */}
           <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center space-x-6">
                 {/* Arp Toggle */}
                 <button 
                    onClick={() => setIsArpeggiatorOn(!isArpeggiatorOn)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all ${isArpeggiatorOn ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-orange-glow' : 'border-white/10 text-slate-500'}`}
                 >
                    <div className={`w-2 h-2 rounded-full ${isArpeggiatorOn ? 'bg-orange-500' : 'bg-slate-600'}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">ARP</span>
                 </button>

                 {/* Key Selector */}
                 <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Root</span>
                    <select 
                       value={scaleRoot} 
                       onChange={(e) => setScaleRoot(e.target.value as RootKey)}
                       className="bg-white/5 border border-white/10 rounded-md text-xs font-bold text-cyan-300 px-2 py-1 outline-none focus:border-cyan-500"
                    >
                       {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                 </div>

                 {/* Scale Selector */}
                 <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Scale</span>
                     <select 
                       value={scaleType} 
                       onChange={(e) => setScaleType(e.target.value as ScaleType)}
                       className="bg-white/5 border border-white/10 rounded-md text-xs font-bold text-purple-300 px-2 py-1 outline-none focus:border-purple-500"
                    >
                       {['Chromatic', 'Major', 'Minor', 'Harmonic Minor', 'Phrygian', 'Dorian', 'Lydian', 'Mixolydian', 'Locrian'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
              </div>
              
              {/* Global Transport Info */}
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-500">
                  <span>BPM: <span className="text-white">{bpm}</span></span>
              </div>
           </div>

          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
              <SynthKeyboard
                octaves={3} startOctave={3} onNoteOn={handleNoteOn}
                onNoteOff={handleNoteOff} pressedKeys={pressedKeys} keyWidth={40}
                rootKey={scaleRoot} scaleType={scaleType}
              />
            </div>
            <div className="flex items-center justify-center gap-x-8 flex-1">
               <Slider label="Pitch Bend" min={-12} max={12} step={1} initialValue={pitchBend} onChange={setPitchBend} accentColor="from-blue-500 to-indigo-400" />
               <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4 md:gap-x-12">
                  <KnobControl label="Timbre" min={0} max={100} step={1} initialValue={timbre} onChange={setTimbre} accentColor="from-blue-500 to-cyan-400" />
                  <KnobControl label="FX Send" min={0} max={100} step={1} initialValue={fxSend} onChange={setFxSend} accentColor="from-red-500 to-pink-400" />
               </div>
            </div>
            <div className="flex items-center gap-x-6 ml-auto pl-6 border-l border-slate-700">
              <div className="flex items-center gap-x-3">
                <VUMeter />
                <Slider label="Master" min={0} max={100} step={1} initialValue={masterVolume * 100} onChange={(v) => setMasterVolume(v / 100)} accentColor="from-slate-400 to-gray-200" />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </SynthProvider>
  );
};

export default App;
