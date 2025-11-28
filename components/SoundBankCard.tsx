
import React from 'react';

interface SoundBankCardProps {
  name: string;
  imageUrl: string;
  genre?: string;
  isLiked?: boolean;
  onPreviewClick: (sampleAudioUrl: string, bankName: string) => void;
  onLoadClick: (bankName: string) => void;
  isPlayingPreview: boolean;
  sampleAudioUrl: string;
}

const SoundBankCard: React.FC<SoundBankCardProps> = ({ name, imageUrl, genre, isLiked = false, onPreviewClick, onLoadClick, isPlayingPreview, sampleAudioUrl }) => {
  return (
    <div className="relative group rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out cursor-pointer glass-panel">
      <div onClick={() => onPreviewClick(sampleAudioUrl, name)}>
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 group-hover:from-black/90 transition-all duration-300"></div>
        <div className="absolute bottom-0 left-0 p-4 text-white">
          <h4 className="text-md font-bold text-slate-100 group-hover:text-cyan-300 transition-colors duration-300">{name}</h4>
          {genre && <p className="text-xs text-slate-400 mt-1">{genre}</p>}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="p-4 rounded-full border-2 border-cyan-400/80">
            {isPlayingPreview ? (
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </div>
        </div>
      </div>
      
      {/* Load Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onLoadClick(name); }}
        className="absolute top-3 left-3 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500 text-cyan-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:shadow-cyan-glow"
      >
        LOAD PATCH
      </button>

      {isLiked && (
        <div className="absolute top-3 right-3 text-pink-400 opacity-70 group-hover:opacity-100 pointer-events-none">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
        </div>
      )}
    </div>
  );
};

export default SoundBankCard;
