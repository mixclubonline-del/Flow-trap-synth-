// lib/gemini.ts
import { GoogleGenAI, Modality, GenerateContentResponse, LiveServerMessage, Blob, FunctionDeclaration, Type, GenerateVideosOperation } from "@google/genai";
import { AudioDecodingFunctions, VideoOperation } from "../types";

// Helper functions for audio encoding/decoding, as specified by guidelines
const audioUtils: AudioDecodingFunctions = {
  decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },

  async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  },

  encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },
};

function createAudioBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: audioUtils.encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export async function sendChatMessageStream(
  messages: { role: string; parts: { text: string }[] }[],
  isDeepThinking: boolean,
  modelName: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro' = 'gemini-2.5-flash',
): Promise<AsyncIterable<GenerateContentResponse>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const currentModel = isDeepThinking ? 'gemini-2.5-pro' : modelName;

  const config = isDeepThinking
    ? { thinkingConfig: { thinkingBudget: 32768 } }
    : {};

  const chat = ai.chats.create({
    model: currentModel,
    config: config,
    history: messages.slice(0, -1), // All messages except the last one (current user prompt)
  });

  const lastUserMessage = messages[messages.length - 1].parts[0].text || '';

  const response = await chat.sendMessageStream({ message: lastUserMessage });
  return response;
}

export async function generateImage(
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1',
): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    const base64ImageBytes: string | undefined = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64ImageBytes) {
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
  return undefined;
}

export async function editImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error('Error editing image:', error);
    throw error;
  }
  return undefined;
}

export async function generateVideoFromPrompt(
  prompt: string,
  aspectRatio: '16:9' | '9:16',
): Promise<VideoOperation> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const operation: GenerateVideosOperation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    },
  });
  return operation;
}

export async function generateVideoFromImage(
  prompt: string,
  base64ImageData: string,
  mimeType: string,
  aspectRatio: '16:9' | '9:16',
): Promise<VideoOperation> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: base64ImageData,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    },
  });
  return operation;
}

export async function getVideosOperation(operation: VideoOperation): Promise<VideoOperation> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const updatedOperation = await ai.operations.getVideosOperation({ operation });
  return updatedOperation;
}

export async function analyzeImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
    });
    return response.text;
}

export async function analyzeVideo(base64VideoData: string, mimeType: string, prompt: string): Promise<string> {
    // Note: Sending large video files as base64 strings can be inefficient.
    // For production applications, consider using a server-side proxy or a different API (e.g., Vertex AI)
    // that supports direct file uploads or URIs.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { inlineData: { data: base64VideoData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
    });
    return response.text;
}

export async function generateSpeech(
  text: string,
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' = 'Zephyr',
): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    }
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
  return undefined;
}

export interface LiveSessionCallbacks {
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => Promise<void>;
  onerror?: (e: ErrorEvent) => void;
  onclose?: (e: CloseEvent) => void;
}

export async function startLiveAudioSession(
  callbacks: LiveSessionCallbacks,
  sendInitialPrompt: string | null = null,
  enableTranscription: boolean = true,
  enableSpeechOutput: boolean = true,
  systemInstruction: string = 'You are a friendly and helpful AI assistant.',
  functionDeclarations: FunctionDeclaration[] = [],
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let config: any = {
    responseModalities: [Modality.AUDIO], // Always request audio for Live API
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
    },
    systemInstruction: systemInstruction,
  };

  if (enableTranscription) {
    config.inputAudioTranscription = {};
    config.outputAudioTranscription = {};
  }

  if (functionDeclarations.length > 0) {
    config.tools = [{ functionDeclarations: functionDeclarations }];
  }


  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: callbacks,
    config: config,
  });

  const session = await sessionPromise;

  if (sendInitialPrompt) {
    session.sendRealtimeInput({ text: sendInitialPrompt });
  }

  return { session, createAudioBlob, audioUtils };
}
