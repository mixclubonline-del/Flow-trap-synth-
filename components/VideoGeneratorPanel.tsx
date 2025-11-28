
import React, { useState, useEffect, useRef } from 'react';
import { generateVideoFromPrompt, generateVideoFromImage, getVideosOperation } from '../lib/gemini';
import { fileToBase64 } from '../lib/utils';
import { VideoOperation } from '../types';

type GenerationMode = 'text' | 'image';
type AspectRatio = '16:9' | '9:16';

// Extend the global window object for aistudio properties
declare global {
  interface Window {
    // FIX: Use the 'AIStudio' type to match the existing global definition and resolve the conflict.
    aistudio?: AIStudio;
  }
}

const VideoGeneratorPanel: React.FC = () => {
  const [mode, setMode] = useState<GenerationMode>('text');
  const [prompt, setPrompt] = useState<string>('');
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);

  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for API key status when component mounts
    const checkApiKey = async () => {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setIsKeySelected(true);
      }
    };
    checkApiKey();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);
  
  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        // Assume key selection is successful to avoid race conditions.
        // The API call will fail if it's not, and the user will be prompted again.
        setIsKeySelected(true);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage({ file, url: URL.createObjectURL(file) });
    }
  };

  const startPolling = (operation: VideoOperation) => {
    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        setLoadingMessage("Checking video status...");
        const updatedOperation = await getVideosOperation(operation);
        if (updatedOperation.done) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setLoadingMessage("Finalizing video...");
          const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
          if (downloadLink) {
            // Must append API key to fetch the video blob
            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const videoBlob = await videoResponse.blob();
            setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
          } else {
            setError("Video generation finished, but no video URL was found.");
          }
          setIsLoading(false);
        } else {
            setLoadingMessage("Still generating, this can take several minutes...");
        }
      } catch (err: any) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setError(`Error during polling: ${err.message}`);
        setIsLoading(false);
      }
    }, 10000); // Poll every 10 seconds
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && mode === 'text') {
      setError('Please enter a prompt.');
      return;
    }
    if (!image && mode === 'image') {
        setError('Please upload an image.');
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setLoadingMessage("Initializing video generation...");

    try {
      let operation;
      if (mode === 'image' && image) {
        const base64Data = await fileToBase64(image.file);
        operation = await generateVideoFromImage(prompt, base64Data, image.file.type, aspectRatio);
      } else {
        operation = await generateVideoFromPrompt(prompt, aspectRatio);
      }
      setLoadingMessage("Video generation started. This will take a few minutes...");
      startPolling(operation);
    } catch (err: any) {
      setError(`Error starting generation: ${err.message}`);
      if (err.message?.includes('Requested entity was not found')) {
        // Handle potential stale API key
        setError("API Key error. Please re-select your key and try again.");
        setIsKeySelected(false);
      }
      setIsLoading(false);
    }
  };
  
  const renderContent = () => {
    if (!isKeySelected) {
        return (
            <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-200 mb-2">API Key Required for Veo</h3>
                <p className="text-slate-400 mb-4">Video generation requires a user-selected API key.</p>
                <button onClick={handleSelectKey} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-2 px-6 rounded-md">
                    Select API Key
                </button>
                 <p className="text-xs text-slate-500 mt-4">
                  For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">billing documentation</a>.
                </p>
            </div>
        )
    }

    if (isLoading) {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-200 font-semibold text-lg">{loadingMessage}</p>
          <p className="text-slate-400 text-sm">Please keep this window open.</p>
        </div>
      );
    }

    if (error) {
      return <div className="text-red-400 text-center">{error}</div>;
    }

    if (generatedVideoUrl) {
      return (
        <video src={generatedVideoUrl} controls autoPlay className="max-w-full max-h-[60vh] h-auto rounded-lg shadow-2xl" />
      );
    }
    
    // Default empty state
    return (
        <div className="text-center text-slate-500">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <p>Your generated video will appear here.</p>
        </div>
    )
  }


  return (
    <div className="flex flex-col flex-1 p-6 bg-transparent overflow-y-auto custom-scrollbar">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-6">Video Generator (Veo)</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Controls Panel */}
        <div className="lg:col-span-1 glass-panel rounded-xl shadow-xl p-6 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-1 rounded-md">
            <button onClick={() => setMode('text')} className={`py-2 rounded-md text-sm font-medium ${mode === 'text' ? 'bg-cyan-600 text-white' : 'text-slate-300'}`}>Text-to-Video</button>
            <button onClick={() => setMode('image')} className={`py-2 rounded-md text-sm font-medium ${mode === 'image' ? 'bg-cyan-600 text-white' : 'text-slate-300'}`}>Image-to-Video</button>
          </div>

          {mode === 'image' && (
            <div>
              <label htmlFor="video-image-upload" className="cursor-pointer bg-slate-700/50 text-slate-300 rounded-md p-3 text-center block w-full border-2 border-dashed border-slate-600 text-sm">
                {image ? `Selected: ${image.file.name}` : 'Upload Starting Image'}
              </label>
              <input id="video-image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">{mode === 'image' ? 'Prompt (Optional)' : 'Prompt'}</label>
            <textarea
              className="w-full p-3 rounded-md bg-slate-900/50 text-slate-100 border border-slate-700 resize-y"
              rows={5}
              placeholder="A futuristic synth in a neon-lit studio..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading || !isKeySelected}
            ></textarea>
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAspectRatio('16:9')} className={`py-2 rounded-md text-sm ${aspectRatio === '16:9' ? 'bg-cyan-600' : 'bg-slate-700/50'}`}>16:9 (Landscape)</button>
              <button onClick={() => setAspectRatio('9:16')} className={`py-2 rounded-md text-sm ${aspectRatio === '9:16' ? 'bg-cyan-600' : 'bg-slate-700/50'}`}>9:16 (Portrait)</button>
            </div>
          </div>
          <div className="flex-grow"></div>
          <button
            className="w-full py-3 px-6 rounded-md bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-lg disabled:opacity-50"
            onClick={handleGenerate}
            disabled={isLoading || !isKeySelected}
          >
            Generate Video
          </button>
        </div>

        {/* Display Panel */}
        <div className="lg:col-span-2 glass-panel rounded-xl shadow-xl p-6 flex items-center justify-center min-h-[400px]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default VideoGeneratorPanel;