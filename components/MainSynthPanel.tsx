
import React, { useState, useCallback, useEffect } from 'react';
import KnobControl from './KnobControl';
import WaveVisualizer from './WaveVisualizer';
import { ArpeggiatorMode, LayerTriggerMode, LfoShape, FmRouting } from '../types';
import LFOVisualizer from './LFOVisualizer';
import EnvelopeGraph from './EnvelopeGraph';
import FilterGraph from './FilterGraph';
import XYPad from './XYPad';

// --- Prop Types ---
interface MainSynthPanelProps {
  osc1Shape: "sawtooth" | "square" | "sine" | "triangle"; setOsc1Shape: (s: "sawtooth" | "square" | "sine" | "triangle") => void;
  osc1Tune: number; setOsc1Tune: (n: number) => void;
  osc1Fine: number; setOsc1Fine: (n: number) => void;
  osc1Level: number; setOsc1Level: (n: number) => void;
  osc1Pan: number; setOsc1Pan: (n: number) => void;
  osc2Shape: "sawtooth" | "square" | "sine" | "triangle"; setOsc2Shape: (s: "sawtooth" | "square" | "sine" | "triangle") => void;
  osc2Tune: number; setOsc2Tune: (n: number) => void;
  osc2Fine: number; setOsc2Fine: (n: number) => void;
  osc2Level: number; setOsc2Level: (n: number) => void;
  osc2Pan: number; setOsc2Pan: (n: number) => void;
  
  // FM Props
  fmRouting: FmRouting; setFmRouting: (r: FmRouting) => void;
  fmDepth: number; setFmDepth: (n: number) => void;
  fmGain: number; setFmGain: (n: number) => void;
  fmRatio: number; setFmRatio: (n: number) => void;

  filterCutoff: number; setFilterCutoff: (n: number) => void;
  filterResonance: number; setFilterResonance: (n: number) => void;
  filterEnvAmt: number; setFilterEnvAmt: (n: number) => void;
  filterDrive: number; setFilterDrive: (n: number) => void;
  globalAttack: number; setGlobalAttack: (n: number) => void;
  globalDecay: number; setGlobalDecay: (n: number) => void;
  globalSustain: number; setGlobalSustain: (n: number) => void;
  globalRelease: number; setGlobalRelease: (n: number) => void;
  bass808Tune: number; setBass808Tune: (n: number) => void;
  bass808Decay: number; setBass808Decay: (n: number) => void;
  bass808Drive: number; setBass808Drive: (n: number) => void;
  bass808Level: number; setBass808Level: (n: number) => void;
  layerMix: number; setLayerMix: (n: number) => void;
  layerTriggerMode: LayerTriggerMode; setLayerTriggerMode: (m: LayerTriggerMode) => void;
  glide: number; setGlide: (n: number) => void;
  glideMode: 'linear' | 'exponential'; setGlideMode: (m: 'linear' | 'exponential') => void;
  glideCurve: number; setGlideCurve: (n: number) => void;
  arpeggiatorRate: number; setArpeggiatorRate: (n: number) => void;
  arpeggiatorGate: number; setArpeggiatorGate: (n: number) => void;
  arpeggiatorSwing: number; setArpeggiatorSwing: (n: number) => void;
  arpeggiatorMode: ArpeggiatorMode; setArpeggiatorMode: (m: ArpeggiatorMode) => void;
  lfo1Shape: LfoShape; setLfo1Shape: (s: LfoShape) => void;
  lfo1Rate: number; setLfo1Rate: (n: number) => void;
  lfo2Shape: LfoShape; setLfo2Shape: (s: LfoShape) => void;
  lfo2Rate: number; setLfo2Rate: (n: number) => void;
  
  // Master FX
  reverbSend: number; setReverbSend: (n: number) => void;
  delaySend: number; setDelaySend: (n: number) => void;
  masterDrive: number; setMasterDrive: (n: number) => void;

  presets: Preset[]; setPresets: (p: Preset[]) => void;
  currentPresetName: string; setCurrentPresetName: (s: string) => void;
}

// --- Preset Management ---
type PresetSettings = Omit<MainSynthPanelProps, 'presets' | 'setPresets' | 'currentPresetName' | 'setCurrentPresetName'>;
interface Preset { name: string; settings: any; }

// --- Helper Components ---
const Module: React.FC<{title: string, children: React.ReactNode, className?: string, titleClassName?: string}> = ({ title, children, className = '', titleClassName = '' }) => (
  <div className={`glass-panel rounded-[32px] p-6 flex flex-col h-full transition-transform duration-300 hover:scale-[1.01] hover:border-white/10 ${className}`}>
    <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-6 pb-2 border-b border-white/5 ${titleClassName}`}>
      {title}
    </h3>
    <div className="flex-1 relative">
      {children}
    </div>
  </div>
);

const ShapeButton: React.FC<{ label: string; value: string; current: string; set: (s: any) => void; accentColor: string }> = ({ label, value, current, set, accentColor }) => (
  <button
    className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300 w-full border
      ${current === value 
          ? `${accentColor} text-white border-transparent shadow-lg` 
          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
      }`}
    onClick={() => set(value)}
  >
    {label}
  </button>
);

const MainSynthPanel: React.FC<MainSynthPanelProps> = (props) => {
  const {
    osc1Shape, setOsc1Shape, osc1Tune, setOsc1Tune, osc1Fine, setOsc1Fine, osc1Level, setOsc1Level, osc1Pan, setOsc1Pan,
    osc2Shape, setOsc2Shape, osc2Tune, setOsc2Tune, osc2Fine, setOsc2Fine, osc2Level, setOsc2Level, osc2Pan, setOsc2Pan,
    fmRouting, setFmRouting, fmDepth, setFmDepth, fmGain, setFmGain, fmRatio, setFmRatio,
    filterCutoff, setFilterCutoff, filterResonance, setFilterResonance, filterEnvAmt, setFilterEnvAmt, filterDrive, setFilterDrive,
    globalAttack, setGlobalAttack, globalDecay, setGlobalDecay, globalSustain, setGlobalSustain, globalRelease, setGlobalRelease,
    bass808Tune, setBass808Tune, bass808Decay, setBass808Decay, bass808Drive, setBass808Drive, bass808Level, setBass808Level,
    layerMix, setLayerMix, layerTriggerMode, setLayerTriggerMode, 
    glide, setGlide, glideMode, setGlideMode, glideCurve, setGlideCurve,
    arpeggiatorRate, setArpeggiatorRate, arpeggiatorGate, setArpeggiatorGate, arpeggiatorSwing, setArpeggiatorSwing, arpeggiatorMode, setArpeggiatorMode,
    lfo1Shape, setLfo1Shape, lfo1Rate, setLfo1Rate, lfo2Shape, setLfo2Shape, lfo2Rate, setLfo2Rate,
    reverbSend, setReverbSend, delaySend, setDelaySend, masterDrive, setMasterDrive,
    presets, setPresets, currentPresetName, setCurrentPresetName
  } = props;
  
  const [newPresetName, setNewPresetName] = useState('');

  const applyPreset = useCallback((settings: any) => {
    setOsc1Shape(settings.osc1Shape); setOsc1Tune(settings.osc1Tune); setOsc1Fine(settings.osc1Fine); setOsc1Level(settings.osc1Level); setOsc1Pan(settings.osc1Pan);
    setOsc2Shape(settings.osc2Shape); setOsc2Tune(settings.osc2Tune); setOsc2Fine(settings.osc2Fine); setOsc2Level(settings.osc2Level); setOsc2Pan(settings.osc2Pan);
    if(settings.fmRouting) { setFmRouting(settings.fmRouting); setFmDepth(settings.fmDepth); setFmGain(settings.fmGain); setFmRatio(settings.fmRatio); }
    setFilterCutoff(settings.filterCutoff); setFilterResonance(settings.filterResonance); setFilterEnvAmt(settings.filterEnvAmt); setFilterDrive(settings.filterDrive);
    setGlobalAttack(settings.globalAttack); setGlobalDecay(settings.globalDecay); setGlobalSustain(settings.globalSustain); setGlobalRelease(settings.globalRelease);
    setLayerMix(settings.layerMix); setLayerTriggerMode(settings.layerTriggerMode || 'cycle');
    setGlide(settings.glide);
    if (settings.glideMode) setGlideMode(settings.glideMode);
    if (settings.glideCurve !== undefined) setGlideCurve(settings.glideCurve);
    
    // 808
    if (settings.bass808Level !== undefined) {
        setBass808Tune(settings.bass808Tune); setBass808Decay(settings.bass808Decay); setBass808Drive(settings.bass808Drive); setBass808Level(settings.bass808Level);
    }
    // Arp
    if (settings.arpeggiatorRate !== undefined) {
        setArpeggiatorRate(settings.arpeggiatorRate); setArpeggiatorGate(settings.arpeggiatorGate); setArpeggiatorSwing(settings.arpeggiatorSwing); setArpeggiatorMode(settings.arpeggiatorMode);
    }
    // LFO
    if (settings.lfo1Rate !== undefined) {
        setLfo1Shape(settings.lfo1Shape); setLfo1Rate(settings.lfo1Rate); setLfo2Shape(settings.lfo2Shape); setLfo2Rate(settings.lfo2Rate);
    }
    // FX
    if (settings.reverbSend !== undefined) {
      setReverbSend(settings.reverbSend); setDelaySend(settings.delaySend); setMasterDrive(settings.masterDrive);
    }

  }, [
    setOsc1Shape, setOsc1Tune, setOsc1Fine, setOsc1Level, setOsc1Pan, setOsc2Shape, setOsc2Tune, setOsc2Fine, setOsc2Level, setOsc2Pan, 
    setFmRouting, setFmDepth, setFmGain, setFmRatio,
    setFilterCutoff, setFilterResonance, setFilterEnvAmt, setFilterDrive, setGlobalAttack, setGlobalDecay, setGlobalSustain, setGlobalRelease, 
    setLayerMix, setLayerTriggerMode, setGlide, setGlideMode, setGlideCurve,
    setBass808Tune, setBass808Decay, setBass808Drive, setBass808Level,
    setArpeggiatorRate, setArpeggiatorGate, setArpeggiatorSwing, setArpeggiatorMode,
    setLfo1Shape, setLfo1Rate, setLfo2Shape, setLfo2Rate,
    setReverbSend, setDelaySend, setMasterDrive
  ]);

  const gatherCurrentSettings = useCallback(() => ({
    osc1Shape, osc1Tune, osc1Fine, osc1Level, osc1Pan, osc2Shape, osc2Tune, osc2Fine, osc2Level, osc2Pan,
    fmRouting, fmDepth, fmGain, fmRatio,
    filterCutoff, filterResonance, filterEnvAmt, filterDrive, globalAttack, globalDecay, globalSustain, globalRelease,
    layerMix, layerTriggerMode, glide, glideMode, glideCurve,
    bass808Tune, bass808Decay, bass808Drive, bass808Level,
    arpeggiatorRate, arpeggiatorGate, arpeggiatorSwing, arpeggiatorMode,
    lfo1Shape, lfo1Rate, lfo2Shape, lfo2Rate,
    reverbSend, delaySend, masterDrive
  }), [
    osc1Shape, osc1Tune, osc1Fine, osc1Level, osc1Pan, osc2Shape, osc2Tune, osc2Fine, osc2Level, osc2Pan,
    fmRouting, fmDepth, fmGain, fmRatio,
    filterCutoff, filterResonance, filterEnvAmt, filterDrive, globalAttack, globalDecay, globalSustain, globalRelease,
    layerMix, layerTriggerMode, glide, glideMode, glideCurve,
    bass808Tune, bass808Decay, bass808Drive, bass808Level,
    arpeggiatorRate, arpeggiatorGate, arpeggiatorSwing, arpeggiatorMode,
    lfo1Shape, lfo1Rate, lfo2Shape, lfo2Rate,
    reverbSend, delaySend, masterDrive
  ]);

  useEffect(() => {
    if (presets.length > 0) return;
    const initSettings = {
      osc1Shape: 'sawtooth', osc1Tune: 0, osc1Fine: 0, osc1Level: 80, osc1Pan: 0,
      osc2Shape: 'square', osc2Tune: 0, osc2Fine: 0, osc2Level: 60, osc2Pan: 0,
      fmRouting: 'none', fmDepth: 0, fmGain: 50, fmRatio: 1,
      filterCutoff: 8000, filterResonance: 20, filterEnvAmt: 50, filterDrive: 20,
      globalAttack: 5, globalDecay: 100, globalSustain: 80, globalRelease: 200,
      layerMix: 50, glide: 0, glideMode: 'linear', glideCurve: 0, layerTriggerMode: 'cycle',
      bass808Tune: 0, bass808Decay: 50, bass808Drive: 0, bass808Level: 0,
      arpeggiatorRate: 50, arpeggiatorGate: 50, arpeggiatorSwing: 0, arpeggiatorMode: 'up',
      lfo1Shape: 'sine', lfo1Rate: 20, lfo2Shape: 'triangle', lfo2Rate: 5,
      reverbSend: 20, delaySend: 10, masterDrive: 0
    };
    const initPreset: Preset = { name: 'Init Preset', settings: initSettings };
    const factoryPresets: Preset[] = [
      initPreset,
      { name: 'Arp Dream', settings: { ...initSettings, osc1Shape: 'sine', filterCutoff: 4500, globalRelease: 800, glide: 50, lfo1Rate: 40, lfo1Shape: 'saw', reverbSend: 50, delaySend: 40 } },
      { name: '808 Rumble', settings: { ...initSettings, osc1Shape: 'sine', filterCutoff: 180, globalAttack: 1, glide: 20, bass808Level: 80, bass808Decay: 80, masterDrive: 40 } },
      { name: 'Fire Lead', settings: { ...initSettings, osc2Fine: 8, osc2Level: 75, filterCutoff: 6000, filterResonance: 40, filterDrive: 30, glide: 100, glideMode: 'exponential', glideCurve: 60, lfo2Rate: 60, reverbSend: 30, delaySend: 20 } },
      { name: 'Ambient Pad', settings: { ...initSettings, osc1Shape: 'triangle', osc2Shape: 'sine', osc2Tune: 12, filterCutoff: 3000, globalAttack: 800, globalRelease: 1500, glide: 0, lfo1Rate: 10, reverbSend: 70, delaySend: 50 } },
    ];
    setPresets(factoryPresets as any);
  }, [presets, setPresets]);

  const handleLoadPreset = (name: string) => {
    const preset = presets.find(p => p.name === name);
    if (preset) {
        applyPreset(preset.settings);
        setCurrentPresetName(name);
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const currentSettingsForSave = gatherCurrentSettings();
    const newPreset: Preset = { name: newPresetName.trim(), settings: currentSettingsForSave };
    setPresets([...presets, newPreset] as any);
    setCurrentPresetName(newPresetName.trim());
    setNewPresetName('');
  };

  return (
    <div className="flex flex-col flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar pb-32">
      
      {/* Top Row: Oscillators, FM, & Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[320px]">
        {/* Layer 1 */}
        <div className="lg:col-span-3">
          <Module title="Oscillator A" titleClassName="text-amber-400 text-glow">
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="grid grid-cols-2 gap-4">
                <ShapeButton label="Saw" value="sawtooth" current={osc1Shape} set={setOsc1Shape} accentColor="bg-amber-500 shadow-yellow-glow" />
                <ShapeButton label="Sqr" value="square" current={osc1Shape} set={setOsc1Shape} accentColor="bg-amber-500 shadow-yellow-glow" />
                <ShapeButton label="Sin" value="sine" current={osc1Shape} set={setOsc1Shape} accentColor="bg-amber-500 shadow-yellow-glow" />
                <ShapeButton label="Tri" value="triangle" current={osc1Shape} set={setOsc1Shape} accentColor="bg-amber-500 shadow-yellow-glow" />
              </div>
              <div className="grid grid-cols-2 gap-6 place-items-center">
                <KnobControl label="Tune" min={-12} max={12} step={1} initialValue={osc1Tune} onChange={setOsc1Tune} accentColor="from-amber-500 to-orange-400" />
                <KnobControl label="Fine" min={-50} max={50} step={1} initialValue={osc1Fine} onChange={setOsc1Fine} accentColor="from-amber-500 to-orange-400" />
                <KnobControl label="Level" min={0} max={100} step={1} initialValue={osc1Level} onChange={setOsc1Level} accentColor="from-amber-500 to-orange-400" />
                <KnobControl label="Pan" min={-100} max={100} step={1} initialValue={osc1Pan} onChange={setOsc1Pan} accentColor="from-amber-500 to-orange-400" />
              </div>
            </div>
          </Module>
        </div>

        {/* FM Matrix */}
        <div className="lg:col-span-2">
            <Module title="FM Matrix" titleClassName="text-teal-400 text-glow">
                 <div className="flex flex-col h-full justify-between gap-4">
                     <div className="grid grid-cols-1 gap-2">
                         <ShapeButton label="Off" value="none" current={fmRouting} set={setFmRouting} accentColor="bg-teal-500 shadow-teal-glow" />
                         <ShapeButton label="A -> B" value="1->2" current={fmRouting} set={setFmRouting} accentColor="bg-teal-500 shadow-teal-glow" />
                         <ShapeButton label="B -> A" value="2->1" current={fmRouting} set={setFmRouting} accentColor="bg-teal-500 shadow-teal-glow" />
                     </div>
                     <div className="grid grid-cols-1 gap-4 place-items-center">
                         <KnobControl label="Depth" min={0} max={100} step={1} initialValue={fmDepth} onChange={setFmDepth} accentColor="from-teal-500 to-emerald-400" />
                         <KnobControl label="Gain" min={0} max={100} step={1} initialValue={fmGain} onChange={setFmGain} accentColor="from-teal-500 to-emerald-400" />
                         <KnobControl label="Ratio" min={1} max={8} step={0.5} initialValue={fmRatio} onChange={setFmRatio} accentColor="from-teal-500 to-emerald-400" />
                     </div>
                 </div>
            </Module>
        </div>

        {/* Visualizer Centerpiece */}
        <div className="lg:col-span-4 relative">
          <div className="glass-panel rounded-[32px] h-full overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none"></div>
            <WaveVisualizer osc1Shape={osc1Shape} osc2Shape={osc2Shape} height={320} />
          </div>
        </div>

        {/* Layer 2: Oscillator B Controls (Mirrors Oscillator A) */}
        <div className="lg:col-span-3">
           <Module title="Oscillator B" titleClassName="text-cyan-400 text-glow">
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="grid grid-cols-2 gap-4">
                <ShapeButton label="Saw" value="sawtooth" current={osc2Shape} set={setOsc2Shape} accentColor="bg-cyan-500 shadow-cyan-glow" />
                <ShapeButton label="Sqr" value="square" current={osc2Shape} set={setOsc2Shape} accentColor="bg-cyan-500 shadow-cyan-glow" />
                <ShapeButton label="Sin" value="sine" current={osc2Shape} set={setOsc2Shape} accentColor="bg-cyan-500 shadow-cyan-glow" />
                <ShapeButton label="Tri" value="triangle" current={osc2Shape} set={setOsc2Shape} accentColor="bg-cyan-500 shadow-cyan-glow" />
              </div>
              <div className="grid grid-cols-2 gap-6 place-items-center">
                <KnobControl label="Tune" min={-12} max={12} step={1} initialValue={osc2Tune} onChange={setOsc2Tune} accentColor="from-cyan-500 to-blue-400" />
                <KnobControl label="Fine" min={-50} max={50} step={1} initialValue={osc2Fine} onChange={setOsc2Fine} accentColor="from-cyan-500 to-blue-400" />
                <KnobControl label="Level" min={0} max={100} step={1} initialValue={osc2Level} onChange={setOsc2Level} accentColor="from-cyan-500 to-blue-400" />
                <KnobControl label="Pan" min={-100} max={100} step={1} initialValue={osc2Pan} onChange={setOsc2Pan} accentColor="from-cyan-500 to-blue-400" />
              </div>
            </div>
          </Module>
        </div>
      </div>
      
      {/* Middle Row: Filter, Env, Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Module title="Filter" titleClassName="text-purple-400 text-glow">
             {/* Graph Background */}
             <div className="absolute top-12 left-0 right-0 h-32 opacity-50 pointer-events-none z-0">
                <FilterGraph cutoff={filterCutoff} resonance={filterResonance} />
             </div>
             {/* Controls Overlay */}
             <div className="grid grid-cols-4 gap-4 place-items-center h-full relative z-10 pt-24">
              <KnobControl label="Cutoff" min={20} max={20000} step={10} initialValue={filterCutoff} onChange={setFilterCutoff} accentColor="from-purple-500 to-fuchsia-400" />
              <KnobControl label="Res" min={0} max={100} step={1} initialValue={filterResonance} onChange={setFilterResonance} accentColor="from-purple-500 to-fuchsia-400" />
              <KnobControl label="Env" min={0} max={100} step={1} initialValue={filterEnvAmt} onChange={setFilterEnvAmt} accentColor="from-purple-500 to-fuchsia-400" />
              <KnobControl label="Drive" min={0} max={100} step={1} initialValue={filterDrive} onChange={setFilterDrive} accentColor="from-purple-500 to-fuchsia-400" />
            </div>
        </Module>

        <Module title="Global Envelope" titleClassName="text-slate-300">
             {/* Graph Background */}
             <div className="absolute top-12 left-0 right-0 h-32 opacity-50 pointer-events-none z-0">
                <EnvelopeGraph attack={globalAttack} decay={globalDecay} sustain={globalSustain} release={globalRelease} />
             </div>
             {/* Controls Overlay */}
             <div className="grid grid-cols-4 gap-4 place-items-center h-full relative z-10 pt-24">
                <KnobControl label="Atk" min={0} max={1000} step={10} initialValue={globalAttack} onChange={setGlobalAttack} accentColor="from-slate-300 to-white" />
                <KnobControl label="Dec" min={0} max={1000} step={10} initialValue={globalDecay} onChange={setGlobalDecay} accentColor="from-slate-300 to-white" />
                <KnobControl label="Sus" min={0} max={100} step={1} initialValue={globalSustain} onChange={setGlobalSustain} accentColor="from-slate-300 to-white" />
                <KnobControl label="Rel" min={0} max={2000} step={10} initialValue={globalRelease} onChange={setGlobalRelease} accentColor="from-slate-300 to-white" />
            </div>
        </Module>

        <Module title="Library" titleClassName="text-emerald-400 text-glow">
             <div className="flex flex-col h-full justify-between space-y-4">
                <select
                    value={currentPresetName}
                    onChange={(e) => handleLoadPreset(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white/5 text-emerald-300 border border-white/10 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors text-sm font-semibold tracking-wide"
                >
                    {presets.map(p => <option key={p.name} value={p.name} className="bg-slate-900 text-slate-200">{p.name}</option>)}
                </select>

                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="New Preset"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="flex-1 p-3 rounded-xl bg-white/5 text-slate-200 border border-white/10 focus:outline-none focus:border-emerald-500/50 text-xs placeholder-slate-500"
                    />
                    <button
                        onClick={handleSavePreset}
                        className="px-6 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs hover:bg-emerald-500/30 transition-all hover:shadow-emerald-glow disabled:opacity-50"
                        disabled={!newPresetName.trim()}
                    >
                        SAVE
                    </button>
                </div>
            </div>
        </Module>
      </div>

      {/* Bottom Row: 808, Engine, Arp, Mod, FX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Module title="808 Core" titleClassName="text-red-500 text-glow">
             <div className="grid grid-cols-2 gap-6 place-items-center">
                <KnobControl label="Tune" min={-24} max={24} step={1} initialValue={bass808Tune} onChange={setBass808Tune} accentColor="from-red-500 to-rose-500" />
                <KnobControl label="Decay" min={0} max={100} step={1} initialValue={bass808Decay} onChange={setBass808Decay} accentColor="from-red-500 to-rose-500" />
                <KnobControl label="Drive" min={0} max={100} step={1} initialValue={bass808Drive} onChange={setBass808Drive} accentColor="from-red-500 to-rose-500" />
                <KnobControl label="Level" min={0} max={100} step={1} initialValue={bass808Level} onChange={setBass808Level} accentColor="from-red-500 to-rose-500" />
            </div>
        </Module>

        <Module title="Engine" titleClassName="text-pink-400 text-glow">
            <div className="flex flex-col h-full justify-between gap-4">
                <div className="grid grid-cols-3 gap-2 place-items-center">
                    <KnobControl label="Mix" min={0} max={100} step={1} initialValue={layerMix} onChange={setLayerMix} accentColor="from-pink-500 to-purple-500" />
                    <KnobControl label="Glide" min={0} max={1000} step={10} initialValue={glide} onChange={setGlide} accentColor="from-pink-500 to-purple-500" />
                    <KnobControl label="Curve" min={0} max={100} step={1} initialValue={glideCurve} onChange={setGlideCurve} accentColor="from-pink-500 to-purple-500" />
                </div>
                 <div className="grid grid-cols-2 gap-2">
                    <ShapeButton label="Lin" value='linear' current={glideMode} set={setGlideMode} accentColor="bg-pink-500 shadow-pink-glow" />
                    <ShapeButton label="Exp" value='exponential' current={glideMode} set={setGlideMode} accentColor="bg-pink-500 shadow-pink-glow" />
                </div>
                 <div className="grid grid-cols-3 gap-1">
                    <ShapeButton label="Cyc" value='cycle' current={layerTriggerMode} set={setLayerTriggerMode} accentColor="bg-pink-500 shadow-pink-glow" />
                    <ShapeButton label="Rnd" value='random' current={layerTriggerMode} set={setLayerTriggerMode} accentColor="bg-pink-500 shadow-pink-glow" />
                    <ShapeButton label="RR" value='round robin' current={layerTriggerMode} set={setLayerTriggerMode} accentColor="bg-pink-500 shadow-pink-glow" />
                </div>
            </div>
        </Module>

        <Module title="Arpeggiator" titleClassName="text-orange-400 text-glow">
            <div className="flex flex-col h-full">
                <div className="grid grid-cols-3 gap-2 place-items-center mb-4">
                    <KnobControl label="Rate" min={0} max={100} step={1} initialValue={arpeggiatorRate} onChange={setArpeggiatorRate} accentColor="from-orange-500 to-amber-500" />
                    <KnobControl label="Gate" min={0} max={100} step={1} initialValue={arpeggiatorGate} onChange={setArpeggiatorGate} accentColor="from-orange-500 to-amber-500" />
                    <KnobControl label="Swng" min={0} max={100} step={1} initialValue={arpeggiatorSwing} onChange={setArpeggiatorSwing} accentColor="from-orange-500 to-amber-500" />
                </div>
                 <div className="grid grid-cols-2 gap-2 mt-auto">
                    <ShapeButton label="Up" value="up" current={arpeggiatorMode} set={setArpeggiatorMode} accentColor="bg-orange-500 shadow-orange-glow" />
                    <ShapeButton label="Down" value="down" current={arpeggiatorMode} set={setArpeggiatorMode} accentColor="bg-orange-500 shadow-orange-glow" />
                </div>
            </div>
        </Module>

        <Module title="Modulation" titleClassName="text-green-400 text-glow">
             <div className="flex flex-col h-full gap-4">
                <div className="flex-1 min-h-[100px] w-full bg-black/20 rounded-xl border border-white/5 overflow-hidden relative">
                    <XYPad 
                       x={filterCutoff} 
                       y={filterResonance} 
                       minX={20} maxX={20000} 
                       minY={0} maxY={100} 
                       onChangeX={setFilterCutoff} 
                       onChangeY={setFilterResonance} 
                       label="FILTER XY"
                    />
                </div>
                <div className="flex items-center gap-4">
                     <KnobControl label="LFO Rate" min={0} max={100} step={1} initialValue={lfo1Rate} onChange={setLfo1Rate} accentColor="from-green-500 to-emerald-500" />
                     <div className="grid grid-cols-2 gap-2 flex-1">
                        <ShapeButton label="Sin" value="sine" current={lfo1Shape} set={setLfo1Shape} accentColor="bg-green-500 shadow-green-glow" />
                        <ShapeButton label="Sqr" value="square" current={lfo1Shape} set={setLfo1Shape} accentColor="bg-green-500 shadow-green-glow" />
                     </div>
                </div>
             </div>
        </Module>

        <Module title="Master FX" titleClassName="text-blue-400 text-glow">
            <div className="grid grid-cols-3 gap-2 place-items-center h-full">
                <KnobControl label="Reverb" min={0} max={100} step={1} initialValue={reverbSend} onChange={setReverbSend} accentColor="from-blue-500 to-indigo-500" />
                <KnobControl label="Delay" min={0} max={100} step={1} initialValue={delaySend} onChange={setDelaySend} accentColor="from-blue-500 to-indigo-500" />
                <KnobControl label="Drive" min={0} max={100} step={1} initialValue={masterDrive} onChange={setMasterDrive} accentColor="from-blue-500 to-indigo-500" />
            </div>
        </Module>
      </div>
    </div>
  );
};

export default MainSynthPanel;
