
import React, { useState } from 'react';
import { analyzeImage, analyzeVideo } from '../lib/gemini';
import { fileToBase64 } from '../lib/utils';

const ContentAnalyzerPanel: React.FC = () => {
  const [media, setMedia] = useState<{ file: File; url: string; type: 'image' | 'video' } | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
      if (fileType) {
        setMedia({ file, url: URL.createObjectURL(file), type: fileType });
        setAnalysis('');
        setError(null);
      } else {
        setError('Unsupported file type. Please upload an image or video.');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!media || !prompt.trim()) {
      setError('Please upload a file and enter a question.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const base64Data = await fileToBase64(media.file);
      let result;
      if (media.type === 'image') {
        result = await analyzeImage(base64Data, media.file.type, prompt);
      } else { // video
        result = await analyzeVideo(base64Data, media.file.type, prompt);
      }
      setAnalysis(result);
    } catch (err: any) {
      setError(`Error during analysis: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const MediaPreview: React.FC<{ media: { url: string; type: 'image' | 'video' } }> = ({ media }) => {
    if (media.type === 'image') {
      return <img src={media.url} alt="Preview" className="max-w-full max-h-[40vh] h-auto rounded-md object-contain" />;
    }
    return <video src={media.url} controls className="max-w-full max-h-[40vh] h-auto rounded-md" />;
  };

  return (
    <div className="flex flex-col flex-1 p-6 bg-transparent overflow-y-auto custom-scrollbar">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 mb-6">Content Analyzer</h2>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload & Prompt */}
        <div className="glass-panel rounded-xl shadow-xl p-6 flex flex-col space-y-4">
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 p-4 rounded-lg shadow-inner min-h-[250px]">
                {media ? (
                    <MediaPreview media={media} />
                ) : (
                    <p className="text-slate-500 text-center">Upload an image or video to analyze</p>
                )}
            </div>
            <label htmlFor="media-upload" className="cursor-pointer bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-md p-3 text-center border-2 border-dashed border-slate-600">
                {media ? `Change File: ${media.file.name}` : 'Select Image or Video'}
            </label>
            <input id="media-upload" type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} disabled={isLoading} />
            <textarea
                className="w-full p-3 rounded-md bg-slate-900/50 text-slate-100 border border-slate-700 resize-y"
                rows={3}
                placeholder="What do you want to know about this content?"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={isLoading || !media}
            />
            <button
                className="w-full py-3 px-6 rounded-md bg-gradient-to-r from-blue-500 to-teal-500 text-white font-bold text-lg disabled:opacity-50"
                onClick={handleAnalyze}
                disabled={isLoading || !media || !prompt.trim()}
            >
                {isLoading ? 'Analyzing...' : 'Analyze Content'}
            </button>
        </div>

        {/* Analysis Result */}
        <div className="glass-panel rounded-xl shadow-xl p-6 flex flex-col">
            <h3 className="text-xl font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-700">Analysis Result</h3>
            <div className="flex-1 bg-slate-900/50 p-4 rounded-lg shadow-inner overflow-y-auto custom-scrollbar">
                {isLoading && <p className="text-slate-400 animate-pulse">Gemini is thinking...</p>}
                {error && <p className="text-red-400">{error}</p>}
                {analysis && <p className="text-slate-200 whitespace-pre-wrap">{analysis}</p>}
                {!isLoading && !error && !analysis && <p className="text-slate-500">Your analysis will appear here.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ContentAnalyzerPanel;
