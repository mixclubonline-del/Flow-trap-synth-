
import { noteMap, midiToFreq } from '../note-map.js';
import { SamplePad } from '../types';

interface Voice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  subOsc: OscillatorNode;
  
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  subGain: GainNode;
  
  osc1Panner: StereoPannerNode;
  osc2Panner: StereoPannerNode;
  
  filter: BiquadFilterNode;
  envelope: GainNode;
  
  lfo1: OscillatorNode;
  lfo1Gain: GainNode;
  lfo2: OscillatorNode;
  lfo2Gain: GainNode;

  fmConnectionGain?: GainNode; // FM Modulation Gain
  
  note: string;
}

class SynthEngine {
  public audioContext: AudioContext;
  public analyser: AnalyserNode; // Public for visualizer access
  private masterGain: GainNode;
  private compressor: DynamicsCompressorNode; // Master Compressor
  private busGain: GainNode; // Main summing bus before effects
  private dest: MediaStreamAudioDestinationNode;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  // Effects Nodes
  private distortionNode: WaveShaperNode;
  private reverbNode: ConvolverNode;
  private reverbSendGain: GainNode;
  private delayNode: DelayNode;
  private delayFeedbackGain: GainNode;
  private delaySendGain: GainNode;

  private activeVoices: Map<string, Voice> = new Map();
  private lastMidi: number | null = null;
  private readonly MAX_VOICES = 20; // Voice limit for robustness
  
  // Arpeggiator State
  private heldNotes: string[] = [];
  private arpSequence: string[] = [];
  private arpIndex: number = 0;
  private nextNoteTime: number = 0;
  private arpTimerID: number | null = null;

  // Sampler State
  private sampleBuffers: Map<number, AudioBuffer> = new Map();

  private params: any = {
    osc1Shape: 'sawtooth', osc1Tune: 0, osc1Fine: 0, osc1Level: 0.8, osc1Pan: 0,
    osc2Shape: 'square', osc2Tune: 0, osc2Fine: 0, osc2Level: 0.6, osc2Pan: 0,
    
    // FM Params
    fmRouting: 'none', fmDepth: 0, fmGain: 0.5, fmRatio: 1,

    filterCutoff: 8000, filterResonance: 20, filterEnvAmt: 50, filterDrive: 0,
    glide: 0, glideMode: 'linear', glideCurve: 0, layerMix: 0.5,
    globalAttack: 0.005, globalDecay: 0.1, globalSustain: 0.8, globalRelease: 0.2,
    
    bass808Tune: 0, bass808Decay: 50, bass808Drive: 0, bass808Level: 0,
    arpeggiatorRate: 50, arpeggiatorGate: 50, arpeggiatorSwing: 0, arpeggiatorMode: 'up',
    arpeggiatorOn: false, bpm: 140,
    lfo1Shape: 'sine', lfo1Rate: 20, lfo2Shape: 'triangle', lfo2Rate: 5,

    masterVolume: 0.8, pitchBend: 0,
    reverbSend: 0, delaySend: 0, masterDrive: 0
  };

  constructor() {
    // Cross-browser AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.dest = this.audioContext.createMediaStreamDestination();
    
    // --- Routing Setup ---
    this.masterGain = this.audioContext.createGain();
    
    // Analyser Setup
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    // Master Bus Compression (Glue)
    this.compressor = this.audioContext.createDynamicsCompressor();
    // Tuned for "Trap" Punch
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 5;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.15;

    // Chain: Compressor -> Master Gain -> Outputs
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.connect(this.dest); // For recording
    
    this.busGain = this.audioContext.createGain();

    // 1. Distortion (Insert on Main Path)
    this.distortionNode = this.audioContext.createWaveShaper();
    this.makeDistortionCurve(0); // Init with 0 drive
    
    // 2. Reverb (Send)
    this.reverbNode = this.audioContext.createConvolver();
    this.reverbSendGain = this.audioContext.createGain();
    this.reverbSendGain.gain.value = 0;
    this.createReverbImpulse(); 
    
    // 3. Delay (Send)
    this.delayNode = this.audioContext.createDelay(2.0);
    this.delayFeedbackGain = this.audioContext.createGain();
    this.delaySendGain = this.audioContext.createGain();
    
    this.delayNode.delayTime.value = 0.375; 
    this.delayFeedbackGain.gain.value = 0.4;
    this.delaySendGain.gain.value = 0;

    // Signal Flow: Bus -> Distortion -> (Sends) -> Compressor
    this.busGain.connect(this.distortionNode);
    this.distortionNode.connect(this.compressor); // Dry/Distorted path to compressor

    // Effect Sends (Parallel)
    this.distortionNode.connect(this.reverbSendGain);
    this.reverbSendGain.connect(this.reverbNode);
    this.reverbNode.connect(this.compressor);

    this.distortionNode.connect(this.delaySendGain);
    this.delaySendGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.compressor);

    this.setParam('masterVolume', this.params.masterVolume);
  }

  // --- Recording ---
  public startRecording() {
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.dest.stream);
    this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
    this.mediaRecorder.start();
  }

  public stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
        if (!this.mediaRecorder) return;
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.audioChunks, { type: 'audio/wav' });
            resolve(blob);
        };
        this.mediaRecorder.stop();
    });
  }

  // --- Effects Helpers ---
  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 0;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    if (k < 0.01) {
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = x;
        }
    } else {
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
    }
    this.distortionNode.curve = curve;
  }

  private createReverbImpulse() {
    const duration = 2.0;
    const decay = 2.0;
    const rate = this.audioContext.sampleRate;
    const length = rate * duration;
    const impulse = this.audioContext.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i / length;
        const env = Math.pow(1 - n, decay);
        left[i] = (Math.random() * 2 - 1) * env;
        right[i] = (Math.random() * 2 - 1) * env;
    }
    this.reverbNode.buffer = impulse;
  }

  public start() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // --- Sampler Methods ---
  public async loadSample(padId: number, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sampleBuffers.set(padId, audioBuffer);
      return audioBuffer;
  }

  public triggerSample(padId: number, params: { volume: number, pitch: number, pan: number, reverse: boolean }) {
      const buffer = this.sampleBuffers.get(padId);
      if (!buffer) return;

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      const panner = this.audioContext.createStereoPanner ? this.audioContext.createStereoPanner() : this.audioContext.createGain();

      source.buffer = buffer;

      // Handle Reverse
      if (params.reverse) {
          const reversedBuffer = this.audioContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
          for (let i = 0; i < buffer.numberOfChannels; i++) {
             const origData = buffer.getChannelData(i);
             const revData = reversedBuffer.getChannelData(i);
             for (let j = 0; j < buffer.length; j++) {
                 revData[j] = origData[buffer.length - 1 - j];
             }
          }
          source.buffer = reversedBuffer;
      }

      // Pitch
      const rate = Math.pow(2, params.pitch / 12);
      source.playbackRate.value = rate;

      gainNode.gain.value = params.volume;
      
      if (this.audioContext.createStereoPanner) {
          (panner as StereoPannerNode).pan.value = params.pan;
      }

      // Route to compressor instead of master directly to include it in mix glue
      source.connect(panner).connect(gainNode).connect(this.compressor);
      source.start(0);
  }

  // --- Drum Synthesis ---
  public triggerDrum(type: string, velocity: number = 100) {
      const t = this.audioContext.currentTime;
      const vel = velocity / 127;
      
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      gain.connect(this.compressor); // Route drums to compressor

      switch (type) {
          case '808':
              osc.frequency.setValueAtTime(150, t);
              osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
              gain.gain.setValueAtTime(vel * 0.8, t);
              gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
              osc.connect(gain);
              osc.start(t);
              osc.stop(t + 0.5);
              break;
          case 'Kick':
              osc.frequency.setValueAtTime(200, t);
              osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
              gain.gain.setValueAtTime(vel, t);
              gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
              osc.connect(gain);
              osc.start(t);
              osc.stop(t + 0.3);
              break;
          case 'Snare':
              const noiseBuffer = this.audioContext.createBuffer(1, 44100, 44100);
              const output = noiseBuffer.getChannelData(0);
              for (let i = 0; i < 44100; i++) output[i] = Math.random() * 2 - 1;
              const noise = this.audioContext.createBufferSource();
              noise.buffer = noiseBuffer;
              const noiseFilter = this.audioContext.createBiquadFilter();
              noiseFilter.type = 'highpass';
              noiseFilter.frequency.value = 1000;
              noise.connect(noiseFilter).connect(gain);
              
              const snareOsc = this.audioContext.createOscillator();
              snareOsc.type = 'triangle';
              snareOsc.frequency.setValueAtTime(180, t);
              const snareOscGain = this.audioContext.createGain();
              snareOsc.connect(snareOscGain).connect(gain);

              gain.gain.setValueAtTime(vel * 0.8, t);
              gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
              
              noise.start(t);
              snareOsc.start(t);
              noise.stop(t + 0.2);
              snareOsc.stop(t + 0.2);
              break;
          case 'Hi-Hat':
          case 'Open Hat':
              const hatBuffer = this.audioContext.createBuffer(1, 44100, 44100);
              const hatData = hatBuffer.getChannelData(0);
              for (let i = 0; i < 44100; i++) hatData[i] = Math.random() * 2 - 1;
              const hatNoise = this.audioContext.createBufferSource();
              hatNoise.buffer = hatBuffer;
              const hatFilter = this.audioContext.createBiquadFilter();
              hatFilter.type = 'highpass';
              hatFilter.frequency.value = 5000; 
              
              gain.gain.setValueAtTime(vel * 0.6, t);
              const duration = type === 'Open Hat' ? 0.4 : 0.05;
              gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
              
              hatNoise.connect(hatFilter).connect(gain);
              hatNoise.start(t);
              hatNoise.stop(t + duration);
              break;
          case 'Clap':
              const clapBuffer = this.audioContext.createBuffer(1, 44100, 44100);
              const clapData = clapBuffer.getChannelData(0);
              for (let i = 0; i < 44100; i++) clapData[i] = Math.random() * 2 - 1;
              const clapNoise = this.audioContext.createBufferSource();
              clapNoise.buffer = clapBuffer;
              const clapFilter = this.audioContext.createBiquadFilter();
              clapFilter.type = 'bandpass';
              clapFilter.frequency.value = 900;
              
              clapNoise.connect(clapFilter).connect(gain);
              
              const startTime = t;
              gain.gain.setValueAtTime(0, startTime);
              gain.gain.linearRampToValueAtTime(vel, startTime + 0.01);
              gain.gain.linearRampToValueAtTime(0, startTime + 0.020);
              gain.gain.linearRampToValueAtTime(vel, startTime + 0.030);
              gain.gain.linearRampToValueAtTime(0, startTime + 0.040);
              gain.gain.linearRampToValueAtTime(vel, startTime + 0.050);
              gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
              
              clapNoise.start(startTime);
              clapNoise.stop(startTime + 0.2);
              break;
           case 'Perc':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(600, t);
              osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
              gain.gain.setValueAtTime(vel * 0.7, t);
              gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
              osc.connect(gain);
              osc.start(t);
              osc.stop(t + 0.1);
              break;
      }
  }

  // --- MIDI Helper ---
  public getMidi(note: string): number {
    return (noteMap as any)[note];
  }

  private calculateFreq(midi: number, tune: number, fine: number): number {
    const adjustedMidi = midi + this.params.pitchBend;
    const freq = midiToFreq(adjustedMidi);
    const tuneRatio = Math.pow(2, tune / 12);
    const fineRatio = Math.pow(2, fine / 1200);
    return freq * tuneRatio * fineRatio;
  }

  // --- Arpeggiator Logic ---
  private updateArpSequence() {
      // Basic sorting based on MIDI number
      const sortedNotes = [...this.heldNotes].sort((a, b) => this.getMidi(a) - this.getMidi(b));
      
      switch (this.params.arpeggiatorMode) {
          case 'up':
              this.arpSequence = sortedNotes;
              break;
          case 'down':
              this.arpSequence = sortedNotes.reverse();
              break;
          case 'up/down':
              this.arpSequence = [...sortedNotes, ...sortedNotes.slice(0, -1).reverse().slice(0, -1)];
              if (this.arpSequence.length === 0 && sortedNotes.length > 0) this.arpSequence = sortedNotes;
              break;
          default:
              this.arpSequence = sortedNotes;
      }
  }

  private scheduleArp() {
      if (!this.params.arpeggiatorOn || this.arpSequence.length === 0) return;

      const secondsPerBeat = 60.0 / this.params.bpm;
      let noteTime = secondsPerBeat;
      if (this.params.arpeggiatorRate > 20) noteTime = secondsPerBeat / 2;
      if (this.params.arpeggiatorRate > 40) noteTime = secondsPerBeat / 4;
      if (this.params.arpeggiatorRate > 60) noteTime = secondsPerBeat / 8;
      if (this.params.arpeggiatorRate > 80) noteTime = secondsPerBeat / 16;

      const lookahead = 0.1;
      
      if (this.nextNoteTime < this.audioContext.currentTime) {
          this.nextNoteTime = this.audioContext.currentTime;
      }

      while (this.nextNoteTime < this.audioContext.currentTime + lookahead) {
          if (this.arpSequence.length > 0) {
              const note = this.arpSequence[this.arpIndex % this.arpSequence.length];
              const gateLen = noteTime * (this.params.arpeggiatorGate / 100);
              
              this.triggerNote(note, this.nextNoteTime, gateLen);
              
              this.arpIndex++;
              this.nextNoteTime += noteTime;
          }
      }

      this.arpTimerID = window.setTimeout(() => this.scheduleArp(), 25);
  }

  private triggerNote(note: string, startTime: number, duration?: number) {
      // Voice Stealing / Limiting
      if (this.activeVoices.size >= this.MAX_VOICES) {
          // Hard kill oldest voice to prevent CPU overload
          const oldestNote = this.activeVoices.keys().next().value;
          if (oldestNote) {
              const voice = this.activeVoices.get(oldestNote);
              if (voice) {
                   try {
                       voice.osc1.disconnect(); voice.osc2.disconnect(); voice.subOsc.disconnect();
                   } catch(e) { /* ignore already stopped */ }
              }
              this.activeVoices.delete(oldestNote);
          }
      }

      const midi = this.getMidi(note);
      
      const envelope = this.audioContext.createGain();
      envelope.connect(this.busGain);

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      
      // Filter Envelope Logic
      const { filterCutoff, filterEnvAmt, globalAttack, globalDecay, globalSustain, globalRelease } = this.params;
      const envAmount = filterEnvAmt / 100;
      
      // Calculate target frequency based on envelope amount (simple scaling +10kHz range)
      const peakFreq = Math.min(20000, Math.max(20, filterCutoff + (envAmount * 10000)));
      const sustainFreq = filterCutoff + ((peakFreq - filterCutoff) * globalSustain);

      filter.frequency.setValueAtTime(filterCutoff, startTime);
      filter.frequency.linearRampToValueAtTime(peakFreq, startTime + globalAttack);
      filter.frequency.setTargetAtTime(sustainFreq, startTime + globalAttack, globalDecay);
      
      filter.Q.setValueAtTime(this.params.filterResonance / 5, startTime);
      filter.connect(envelope);

      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      const subOsc = this.audioContext.createOscillator();
      const osc1Gain = this.audioContext.createGain();
      const osc2Gain = this.audioContext.createGain();
      const subGain = this.audioContext.createGain();

      const osc1Panner = this.audioContext.createStereoPanner ? this.audioContext.createStereoPanner() : this.audioContext.createGain(); 
      const osc2Panner = this.audioContext.createStereoPanner ? this.audioContext.createStereoPanner() : this.audioContext.createGain();

      osc1.connect(osc1Panner).connect(osc1Gain).connect(filter);
      osc2.connect(osc2Panner).connect(osc2Gain).connect(filter);
      subOsc.connect(subGain).connect(this.busGain);

      const lfo1 = this.audioContext.createOscillator();
      const lfo1Gain = this.audioContext.createGain();
      lfo1.connect(lfo1Gain).connect(filter.frequency);
      
      const lfo2 = this.audioContext.createOscillator();
      const lfo2Gain = this.audioContext.createGain();
      lfo2.connect(lfo2Gain);
      lfo2Gain.connect(osc1.frequency);
      lfo2Gain.connect(osc2.frequency);

      // --- FM Synthesis Logic ---
      const fmConnectionGain = this.audioContext.createGain();
      let freq1 = this.calculateFreq(midi, this.params.osc1Tune, this.params.osc1Fine);
      let freq2 = this.calculateFreq(midi, this.params.osc2Tune, this.params.osc2Fine);

      // Apply Ratio
      if (this.params.fmRouting === '1->2') {
          freq1 *= this.params.fmRatio;
      } else if (this.params.fmRouting === '2->1') {
          freq2 *= this.params.fmRatio;
      }

      osc1.frequency.setValueAtTime(freq1, startTime);
      osc2.frequency.setValueAtTime(freq2, startTime);

      // Connect FM
      const fmAmount = (this.params.fmDepth * 50) + (this.params.fmGain * 500); // Scale modulation
      if (this.params.fmRouting === '1->2') {
          fmConnectionGain.gain.setValueAtTime(fmAmount, startTime);
          osc1.connect(fmConnectionGain);
          fmConnectionGain.connect(osc2.frequency);
      } else if (this.params.fmRouting === '2->1') {
          fmConnectionGain.gain.setValueAtTime(fmAmount, startTime);
          osc2.connect(fmConnectionGain);
          fmConnectionGain.connect(osc1.frequency);
      }

      osc1.type = this.params.osc1Shape;
      osc2.type = this.params.osc2Shape;
      subOsc.type = 'sine';

      const subFreq = this.calculateFreq(midi - 12, this.params.bass808Tune, 0);
      subOsc.frequency.setValueAtTime(subFreq, startTime);

      osc1Gain.gain.setValueAtTime(this.params.osc1Level * (1 - this.params.layerMix), startTime);
      osc2Gain.gain.setValueAtTime(this.params.osc2Level * this.params.layerMix, startTime);
      
      if (this.audioContext.createStereoPanner) {
          (osc1Panner as StereoPannerNode).pan.setValueAtTime(this.params.osc1Pan / 100, startTime);
          (osc2Panner as StereoPannerNode).pan.setValueAtTime(this.params.osc2Pan / 100, startTime);
      }

      const subDecayTime = this.params.bass808Decay / 50; 
      subGain.gain.setValueAtTime(this.params.bass808Level / 100, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + subDecayTime + 0.1);

      lfo1.type = this.params.lfo1Shape;
      lfo1.frequency.setValueAtTime(this.params.lfo1Rate / 5, startTime);
      lfo1Gain.gain.setValueAtTime(200, startTime);

      lfo2.type = this.params.lfo2Shape;
      lfo2.frequency.setValueAtTime(this.params.lfo2Rate / 5, startTime);
      lfo2Gain.gain.setValueAtTime(5, startTime);

      osc1.start(startTime);
      osc2.start(startTime);
      subOsc.start(startTime);
      lfo1.start(startTime);
      lfo2.start(startTime);

      // Envelope
      envelope.gain.setValueAtTime(0, startTime);
      envelope.gain.linearRampToValueAtTime(1, startTime + globalAttack);
      envelope.gain.setTargetAtTime(globalSustain, startTime + globalAttack, globalDecay + 0.001);

      // --- Cleanup Function ---
      const cleanup = () => {
          // Explicitly disconnect nodes to ensure garbage collection
          osc1.disconnect();
          osc2.disconnect();
          subOsc.disconnect();
          osc1Gain.disconnect();
          osc2Gain.disconnect();
          subGain.disconnect();
          if (osc1Panner !== osc1Gain) osc1Panner.disconnect();
          if (osc2Panner !== osc2Gain) osc2Panner.disconnect();
          fmConnectionGain.disconnect();
          lfo1.disconnect();
          lfo1Gain.disconnect();
          lfo2.disconnect();
          lfo2Gain.disconnect();
          filter.disconnect();
          envelope.disconnect();
      };
      
      // Register cleanup for onended (Robustness against memory leaks)
      osc1.onended = cleanup;

      // Release
      const releaseStart = duration ? startTime + duration : 0; // If duration is known (ARP)
      if (releaseStart > 0) {
          // Release Envelope
          envelope.gain.setTargetAtTime(0, releaseStart, globalRelease + 0.001);
          
          // Release Filter Envelope
          filter.frequency.setTargetAtTime(filterCutoff, releaseStart, globalRelease);

          const stopTime = releaseStart + globalRelease * 5;
          osc1.stop(stopTime);
          osc2.stop(stopTime);
          subOsc.stop(stopTime);
          lfo1.stop(stopTime);
          lfo2.stop(stopTime);
      } else {
          // Manual note trigger (no duration) - track for noteOff
          const voice: Voice = { 
              osc1, osc2, subOsc, osc1Gain, osc2Gain, subGain, 
              osc1Panner: osc1Panner as StereoPannerNode, osc2Panner: osc2Panner as StereoPannerNode, 
              filter, envelope, lfo1, lfo1Gain, lfo2, lfo2Gain, note,
              fmConnectionGain 
          };
          this.activeVoices.set(note, voice);
      }
  }

  public noteOn(note: string) {
    if (!this.heldNotes.includes(note)) {
        this.heldNotes.push(note);
    }
    
    if (this.params.arpeggiatorOn) {
        this.updateArpSequence();
        if (!this.arpTimerID) {
            this.nextNoteTime = this.audioContext.currentTime;
            this.scheduleArp();
        }
    } else {
        if (this.activeVoices.has(note)) return;
        this.triggerNote(note, this.audioContext.currentTime);
        this.lastMidi = this.getMidi(note);
    }
  }

  public noteOff(note: string) {
    this.heldNotes = this.heldNotes.filter(n => n !== note);
    
    if (this.params.arpeggiatorOn) {
        this.updateArpSequence();
        if (this.heldNotes.length === 0) {
            if (this.arpTimerID) {
                clearTimeout(this.arpTimerID);
                this.arpTimerID = null;
                this.arpIndex = 0;
            }
        }
    } else {
        const voice = this.activeVoices.get(note);
        if (!voice) return;

        const now = this.audioContext.currentTime;
        const { globalRelease, filterCutoff } = this.params;
        
        // VCA Release
        voice.envelope.gain.cancelScheduledValues(now);
        voice.envelope.gain.setTargetAtTime(0, now, globalRelease + 0.001);

        // Filter Release
        voice.filter.frequency.cancelScheduledValues(now);
        voice.filter.frequency.setTargetAtTime(filterCutoff, now, globalRelease + 0.001);

        const stopTime = now + globalRelease * 5; 
        
        // Setup cleanup on oscillator end (using onended already registered or adding logic)
        // Since we created the osc in triggerNote, the onended there will handle it.
        
        voice.osc1.stop(stopTime);
        voice.osc2.stop(stopTime);
        voice.subOsc.stop(stopTime); 
        voice.lfo1.stop(stopTime);
        voice.lfo2.stop(stopTime);
        this.activeVoices.delete(note);
    }
  }

  public setParam(param: string, value: any) {
    this.params[param] = value;
    const now = this.audioContext.currentTime;
    
    switch (param) {
      case 'arpeggiatorOn':
          if (!value && this.arpTimerID) {
              clearTimeout(this.arpTimerID);
              this.arpTimerID = null;
          }
          break;
      case 'arpeggiatorMode':
          this.updateArpSequence();
          break;
      case 'masterVolume':
        this.masterGain.gain.setTargetAtTime(value, now, 0.01);
        break;
      case 'masterDrive':
         this.makeDistortionCurve(value * 100); 
         break;
      case 'reverbSend':
         this.reverbSendGain.gain.setTargetAtTime(value, now, 0.01);
         break;
      case 'delaySend':
         this.delaySendGain.gain.setTargetAtTime(value, now, 0.01);
         break;
      case 'filterCutoff':
      case 'filterResonance':
        this.activeVoices.forEach(voice => {
            voice.filter.frequency.setTargetAtTime(this.params.filterCutoff, now, 0.01);
            voice.filter.Q.setTargetAtTime(this.params.filterResonance / 5, now, 0.01);
        });
        break;
      case 'fmDepth':
      case 'fmGain':
         this.activeVoices.forEach(voice => {
             if (voice.fmConnectionGain) {
                 const fmAmount = (this.params.fmDepth * 50) + (this.params.fmGain * 500);
                 voice.fmConnectionGain.gain.setTargetAtTime(fmAmount, now, 0.01);
             }
         });
         break;
      case 'fmRatio':
      case 'osc1Tune':
      case 'osc1Fine':
      case 'osc2Tune':
      case 'osc2Fine':
          this.activeVoices.forEach(voice => {
              const midi = this.getMidi(voice.note);
              let freq1 = this.calculateFreq(midi, this.params.osc1Tune, this.params.osc1Fine);
              let freq2 = this.calculateFreq(midi, this.params.osc2Tune, this.params.osc2Fine);
              
              if (this.params.fmRouting === '1->2') freq1 *= this.params.fmRatio;
              if (this.params.fmRouting === '2->1') freq2 *= this.params.fmRatio;
              
              voice.osc1.frequency.setTargetAtTime(freq1, now, 0.01);
              voice.osc2.frequency.setTargetAtTime(freq2, now, 0.01);
          });
          break;
    }
    
    if (['osc1Level', 'osc2Level', 'layerMix', 'osc1Pan', 'osc2Pan', 'osc1Shape', 'osc2Shape', 'lfo1Rate', 'lfo1Shape', 'lfo2Rate', 'lfo2Shape'].includes(param)) {
         this.activeVoices.forEach(voice => {
             if (param.includes('Level') || param === 'layerMix') {
                 voice.osc1Gain.gain.setTargetAtTime(this.params.osc1Level * (1 - this.params.layerMix), now, 0.01);
                 voice.osc2Gain.gain.setTargetAtTime(this.params.osc2Level * this.params.layerMix, now, 0.01);
             }
             if (param.includes('Shape')) {
                voice.osc1.type = this.params.osc1Shape;
                voice.osc2.type = this.params.osc2Shape;
             }
         });
    }
  }
}

export default SynthEngine;
