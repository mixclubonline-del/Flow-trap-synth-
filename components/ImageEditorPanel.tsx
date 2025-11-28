
import React, { useState, useCallback } from 'react';
import { editImage } from '../lib/gemini';
import { fileToBase64 } from '../lib/utils';

const ImageEditorPanel: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalImage({ file, url: URL.createObjectURL(file) });
      setEditedImageUrl(null);
      setError(null);
    }
  };

  const handleEditImage = async () => {
    if (!originalImage || !prompt.trim()) {
      setError('Please upload an image and enter an editing prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImageUrl(null);

    try {
      const base64Data = await fileToBase64(originalImage.file);
      const newImageUrl = await editImage(base64Data, originalImage.file.type, prompt);
      if (newImageUrl) {
        setEditedImageUrl(newImageUrl);
      } else {
        setError('Image editing failed. Please try a different prompt.');
      }
    } catch (err: any) {
      setError(`Error: ${err.message || 'Unknown error during editing'}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 bg-transparent overflow-y-auto custom-scrollbar">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 mb-6">Image Editor</h2>

      <div className="flex-1 glass-panel rounded-xl shadow-xl p-6 flex flex-col">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <label htmlFor="image-upload" className="flex-1 cursor-pointer bg-slate-700/50 hover:bg-slate-700 transition-colors duration-200 text-slate-300 rounded-md p-4 text-center border-2 border-dashed border-slate-600">
            {originalImage ? `Selected: ${originalImage.file.name}` : 'Click to Upload Image'}
            <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
          </label>
          <input
            type="text"
            className="flex-1 md:flex-[2] bg-slate-900/50 border border-slate-700 rounded-md p-4 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="e.g., 'Add a retro filter' or 'Make it look like a sketch'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading || !originalImage}
          />
          <button
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 px-6 rounded-md hover:from-pink-600 hover:to-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleEditImage}
            disabled={isLoading || !originalImage || !prompt.trim()}
          >
            {isLoading ? 'Editing...' : 'Apply Edit'}
          </button>
        </div>

        {error && <div className="text-red-400 text-center p-4 mb-4 bg-red-900/50 rounded-md">{error}</div>}

        {/* Image Display */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
          <div className="flex flex-col items-center justify-center bg-slate-900/50 p-4 rounded-lg shadow-inner">
            <h3 className="text-slate-400 font-semibold mb-3">Original</h3>
            {originalImage ? (
              <img src={originalImage.url} alt="Original" className="max-w-full max-h-[50vh] h-auto rounded-md object-contain" />
            ) : <p className="text-slate-500">Upload an image to start</p>}
          </div>
          <div className="flex flex-col items-center justify-center bg-slate-900/50 p-4 rounded-lg shadow-inner">
            <h3 className="text-slate-400 font-semibold mb-3">Edited</h3>
            {isLoading && <div className="text-slate-400 animate-pulse">Applying magic...</div>}
            {editedImageUrl && !isLoading && (
              <img src={editedImageUrl} alt="Edited by AI" className="max-w-full max-h-[50vh] h-auto rounded-md object-contain" />
            )}
             {!editedImageUrl && !isLoading && <p className="text-slate-500">Your edited image will appear here</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorPanel;
