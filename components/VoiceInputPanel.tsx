
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { startLiveAudioSession, LiveSessionCallbacks } from '../lib/gemini';
import { TranscriptionState, AudioDecodingFunctions } from '../types';
import { LiveServerMessage, Blob } from '@google/genai';

// Self-contained audio utilities
const createAudioBlob: (data: Float32Array) => Blob = (() => {
  const encode = (bytes: Uint8Array): string => {
    let binary = ''; const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  };
  return (data: Float32Array): Blob => {
    const l = data.length; const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };
})();
const audioUtils: AudioDecodingFunctions = {
  decode: (base64: string): Uint8Array => {
    const binaryString = atob(base64); const len = binaryString.length; const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
  },
  decodeAudioData: async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer); const frameCount = dataInt16.length / numChannels; const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
    }
    return buffer;
  },
  encode: (bytes: Uint8Array): string => "", // Not needed client-side for this component
};

const VoiceInputPanel: React.FC = () => {
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>({
    isRecording: false, transcription: '', interimTranscription: '', error: null,
  });
  const [modelResponse, setModelResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const audioContext = useRef<AudioContext | null>(null);
  const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    outputAudioContext.current = new AudioContextClass({ sampleRate: 24000 });
    return () => { outputAudioContext.current?.close(); };
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!transcriptionState.isRecording) return;
    mediaStreamSource.current?.disconnect();
    scriptProcessor.current?.disconnect();
    audioContext.current?.close();
    const session = await sessionPromiseRef.current;
    session?.session.close();
    setTranscriptionState(prev => ({ ...prev, isRecording: false }));
    setIsLoading(false);
  }, [transcriptionState.isRecording]);
  
  const handleStartRecording = useCallback(async () => {
    if (transcriptionState.isRecording) return;
    setTranscriptionState({ isRecording: true, transcription: '', interimTranscription: '', error: null });
    setModelResponse('');
    setIsLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext.current = new AudioContextClass({ sampleRate: 16000 });
      mediaStreamSource.current = audioContext.current.createMediaStreamSource(stream);
      scriptProcessor.current = audioContext.current.createScriptProcessor(4096, 1, 1);
      mediaStreamSource.current.connect(scriptProcessor.current);
      scriptProcessor.current.connect(audioContext.current.destination);

      scriptProcessor.current.onaudioprocess = (e) => {
        const pcmBlob = createAudioBlob(e.inputBuffer.getChannelData(0));
        sessionPromiseRef.current?.then(s => s.session.sendRealtimeInput({ media: pcmBlob }));
      };

      const callbacks: LiveSessionCallbacks = {
        onopen: () => setIsLoading(false),
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            setTranscriptionState(prev => ({ ...prev, interimTranscription: message.serverContent.inputTranscription.text }));
          }
          if (message.serverContent?.outputTranscription) {
            setModelResponse(prev => prev + message.serverContent.outputTranscription.text);
          }
          if (message.serverContent?.turnComplete) {
            setTranscriptionState(prev => ({ ...prev, transcription: prev.transcription + ' ' + prev.interimTranscription.trim(), interimTranscription: '' }));
          }
        },
        onerror: (e) => {
          setTranscriptionState(prev => ({ ...prev, error: 'Session error: ' + e.message }));
          handleStopRecording();
        },
        onclose: () => handleStopRecording(),
      };
      sessionPromiseRef.current = startLiveAudioSession(callbacks, null, true, true);
    } catch (err: any) {
      setTranscriptionState(prev => ({ ...prev, error: 'Mic access error: ' + err.message }));
      handleStopRecording();
    }
  }, [transcriptionState.isRecording, handleStopRecording]);

  useEffect(() => { return () => { handleStopRecording(); }; }, [handleStopRecording]);

  return (
    <div className="flex flex-col flex-1 p-6 bg-transparent overflow-y-auto custom-scrollbar">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-6">Voice Transcriber</h2>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-xl shadow-xl p-6 flex flex-col items-center justify-center space-y-6">
          <button
            className={`p-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 ${transcriptionState.isRecording ? 'bg-red-600 text-white animate-pulse shadow-red-glow focus:ring-red-500' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-glow focus:ring-green-500'}`}
            onClick={transcriptionState.isRecording ? handleStopRecording : handleStartRecording}
            disabled={isLoading && !transcriptionState.isRecording}
          >
            {transcriptionState.isRecording ? (
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
            ) : (
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg>
            )}
          </button>
          <div className="text-center">
            <p className="font-semibold text-lg">{transcriptionState.isRecording ? "Recording..." : "Ready to Transcribe"}</p>
            {isLoading && <p className="text-sm text-slate-400">Connecting...</p>}
            {transcriptionState.error && <p className="text-sm text-red-400 mt-2">{transcriptionState.error}</p>}
          </div>
        </div>
        <div className="glass-panel rounded-xl shadow-xl p-6 flex flex-col space-y-4">
          <div className="flex-1 bg-slate-900/50 p-4 rounded-lg shadow-inner min-h-[150px] overflow-y-auto custom-scrollbar">
            <h3 className="text-slate-300 font-semibold mb-2">Your Speech:</h3>
            <p className="text-slate-100">{transcriptionState.transcription}</p>
            <p className="text-slate-400 italic">{transcriptionState.interimTranscription}</p>
          </div>
          <div className="flex-1 bg-slate-900/50 p-4 rounded-lg shadow-inner min-h-[150px] overflow-y-auto custom-scrollbar">
            <h3 className="text-slate-300 font-semibold mb-2">Model Response:</h3>
            <p className="text-slate-100">{modelResponse || "..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceInputPanel;
