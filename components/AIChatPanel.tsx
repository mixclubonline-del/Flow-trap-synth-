
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessageStream, startLiveAudioSession, LiveSessionCallbacks } from '../lib/gemini';
import { ChatMessage, AudioDecodingFunctions } from '../types';
import { LiveServerMessage, Blob } from "@google/genai";

// Audio utility functions defined locally to be self-contained
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
  encode: (bytes: Uint8Array): string => {
    let binary = ''; const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  },
};


const AIChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isThinkingMode, setIsThinkingMode] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTime = useRef(0);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const outputGainNode = useRef<GainNode | null>(null);
  const activeAudioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const [currentInputTranscription, setCurrentInputTranscription] = useState('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');

  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    outputAudioContext.current = new AudioContextClass({ sampleRate: 24000 });
    outputGainNode.current = outputAudioContext.current.createGain();
    outputGainNode.current.connect(outputAudioContext.current.destination);
    return () => { outputAudioContext.current?.close(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map((msg) => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text || '' }] }));
      const fullChatHistory = [...chatHistory, { role: 'user', parts: [{ text }] }];
      const modelToUse = isThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      const stream = await sendChatMessageStream(fullChatHistory as any, isThinkingMode, modelToUse);

      let fullResponse = '';
      setMessages((prev) => [...prev, { sender: 'gemini', text: '', isStreaming: true }]);

      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          setMessages((prev) => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, text: fullResponse } : msg));
        }
      }

      setMessages((prev) => prev.map((msg) => msg.isStreaming ? { ...msg, isStreaming: false } : msg));

      if (isSpeaking && fullResponse) {
        const audioBase64 = await startTtsPlayback(fullResponse);
        if (audioBase64) {
          setMessages((prev) => prev.map((msg, i) => i === prev.length - 1 ? { ...msg, audioBase64 } : msg));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [...prev, { sender: 'gemini', text: 'An error occurred. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startTtsPlayback = async (text: string): Promise<string | undefined> => {
    try {
      const base64Audio = await (await import('../lib/gemini')).generateSpeech(text, 'Zephyr');
      if (base64Audio && outputAudioContext.current && outputGainNode.current) {
        nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
        const audioBuffer = await audioUtils.decodeAudioData(audioUtils.decode(base64Audio), outputAudioContext.current, 24000, 1);
        const source = outputAudioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputGainNode.current);
        source.addEventListener('ended', () => activeAudioSources.current.delete(source));
        source.start(nextStartTime.current);
        nextStartTime.current += audioBuffer.duration;
        activeAudioSources.current.add(source);
        return base64Audio;
      }
    } catch (error) { console.error('Error playing TTS:', error); }
  };

  const handleToggleMic = useCallback(async () => {
    if (isMicActive) {
      mediaStreamSource.current?.disconnect();
      scriptProcessor.current?.disconnect();
      audioContext.current?.close();
      const session = await sessionPromiseRef.current;
      session?.session.close();
      if (currentInputTranscription.trim()) await handleSendMessage(currentInputTranscription);
      setCurrentInputTranscription(''); setCurrentOutputTranscription('');
      setIsMicActive(false);
    } else {
      setCurrentInputTranscription(''); setCurrentOutputTranscription('');
      setIsMicActive(true); setIsLoading(true);
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
          sessionPromiseRef.current?.then((s) => s.session.sendRealtimeInput({ media: pcmBlob }));
        };

        const callbacks: LiveSessionCallbacks = {
          onopen: () => { console.debug('Live session opened'); setIsLoading(false); },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) setCurrentOutputTranscription(p => p + msg.serverContent.outputTranscription.text);
            if (msg.serverContent?.inputTranscription) setCurrentInputTranscription(p => p + msg.serverContent.inputTranscription.text);
            if (msg.serverContent?.turnComplete) {
              if (currentInputTranscription.trim()) setMessages(p => [...p, { sender: 'user', text: currentInputTranscription.trim() }]);
              if (currentOutputTranscription.trim()) setMessages(p => [...p, { sender: 'gemini', text: currentOutputTranscription.trim() }]);
              setCurrentInputTranscription(''); setCurrentOutputTranscription('');
            }
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContext.current && outputGainNode.current && isSpeaking) {
                // Playback logic from before
            }
            if (msg.serverContent?.interrupted) {
              activeAudioSources.current.forEach(s => s.stop()); activeAudioSources.current.clear(); nextStartTime.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e); setIsLoading(false); setIsMicActive(false);
            setMessages(p => [...p, { sender: 'gemini', text: 'Live session error.' }]);
          },
          onclose: (e: CloseEvent) => { console.debug('Live session closed'); setIsMicActive(false); setIsLoading(false); },
        };
        sessionPromiseRef.current = startLiveAudioSession(callbacks, null, true, true);
      } catch (error) {
        console.error('Error starting live audio session:', error); setIsLoading(false); setIsMicActive(false);
        setMessages(p => [...p, { sender: 'gemini', text: 'Could not start microphone.' }]);
      }
    }
  }, [isMicActive, currentInputTranscription, currentOutputTranscription, messages, isSpeaking]);

  return (
    <div className="flex flex-col flex-1 p-6 bg-transparent overflow-hidden">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">AI Assistant</h2>
      <div className="flex-1 glass-panel rounded-xl shadow-xl p-4 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600/50 text-white rounded-br-none' : 'bg-slate-700/50 text-slate-200 rounded-bl-none'}`}>
                {msg.text}{msg.isStreaming && <span className="ml-2 animate-pulse">...</span>}
              </div>
            </div>
          ))}
          {isLoading && !isMicActive && (
            <div className="flex justify-start"><div className="px-4 py-2 rounded-lg bg-slate-700/50">...</div></div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {(isMicActive || currentInputTranscription) && (
          <div className="bg-slate-900/50 p-3 rounded-lg mt-4 text-slate-300 text-sm shadow-inner">
            {currentInputTranscription || "Listening..."}
          </div>
        )}
        <div className="mt-4 p-2 glass-panel rounded-lg flex items-center shadow-lg border-t border-slate-700">
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-400 px-3 py-2 text-lg focus:ring-0"
            placeholder={isMicActive ? "Speaking..." : "Ask Gemini..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputMessage)}
            disabled={isLoading || isMicActive}
          />
          <div className="flex items-center space-x-2 ml-2">
            <button
              className={`p-2 rounded-full ${isMicActive ? 'bg-red-500 text-white animate-pulse shadow-red-glow' : 'bg-slate-700/50 hover:bg-slate-700'}`}
              onClick={handleToggleMic} title={isMicActive ? "Stop" : "Speak"}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zM4 8a1 1 0 011 1v1a5 5 0 005 5v2.085a1 1 0 01-1 .995H8a1 1 0 110-2h2v-2.085A5.002 5.002 0 005 9V8a1 1 0 011-1z"/></svg>
            </button>
            <button
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={() => handleSendMessage(inputMessage)} disabled={isLoading || isMicActive}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l4.475-1.897 4.5 0a1 1 0 00.9-.544l4.9-8.498a1 1 0 00-.916-1.506z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
