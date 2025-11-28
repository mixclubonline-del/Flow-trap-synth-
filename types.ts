
// types.ts
import type { GenerateVideosOperation } from '@google/genai';

export type AppView =
  | 'soundBanks'
  | 'synthEditor'
  | 'sequencer'
  | 'sampler'
  | 'aiChat'
  | 'voiceInput'
  | 'contentAnalyzer';

export interface KnobControlProps {
  label: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  onChange: (value: number) => void;
  accentColor?: string;
}

export interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  onChange: (value: number) => void;
  accentColor?: string;
}

export interface SynthKeyboardProps {
  octaves: number;
  startOctave: number;
  onNoteOn?: (note: string) => void;
  onNoteOff?: (note: string) => void;
  pressedKeys?: Set<string>;
  keyWidth?: number; // New prop to customize key width for smaller keyboards
  rootKey?: RootKey;
  scaleType?: ScaleType;
}

export interface KeyConfig {
  note: string;
  isBlack: boolean;
  midi: number;
}

export interface ChatMessage {
  sender: 'user' | 'gemini';
  text?: string;
  audioBase64?: string;
  isStreaming?: boolean;
}

export interface TranscriptionState {
  isRecording: boolean;
  transcription: string;
  interimTranscription: string;
  error: string | null;
}

// Utility types for audio decoding
export interface AudioDecodingFunctions {
  decode(base64: string): Uint8Array;
  decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer>;
  encode(bytes: Uint8Array): string;
}

export type ArpeggiatorMode = 'up' | 'down' | 'up/down';
export type LayerTriggerMode = 'round robin' | 'random' | 'cycle';
export type LfoShape = 'sine' | 'square' | 'saw' | 'triangle';
export type FmRouting = 'none' | '1->2' | '2->1';

// Type for video generation operation tracking
export type VideoOperation = GenerateVideosOperation;

// Sequencer Types
export interface SequenceStep {
  active: boolean;
  velocity: number;
}

export interface SequenceTrack {
  name: string;
  color: string;
  steps: SequenceStep[];
  sample?: string; // Placeholder for future sample triggering
}

// Sampler Types
export interface SamplePad {
  id: number;
  name: string;
  buffer: AudioBuffer | null;
  color: string;
  volume: number;
  pitch: number; // 0 is normal, -12 to +12 semitones
  pan: number;
  reverse: boolean;
  isLoaded: boolean;
}

// Music Theory Types
export type ScaleType = 'Chromatic' | 'Major' | 'Minor' | 'Harmonic Minor' | 'Melodic Minor' | 'Dorian' | 'Phrygian' | 'Lydian' | 'Mixolydian' | 'Locrian';
export type RootKey = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

// AI Studio Type
export interface AIStudio {
  hasSelectedApiKey(): Promise<boolean>;
  openSelectKey(): Promise<void>;
}

// Visualizer Types
export type AnalysisMode = 'synthetic' | 'scope' | 'spectrum';
