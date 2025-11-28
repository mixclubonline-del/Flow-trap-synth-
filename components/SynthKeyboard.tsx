
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { SynthKeyboardProps, ScaleType, RootKey } from '../types';
import { useSynth } from '../contexts/SynthContext';
import { noteMap } from '../note-map.js';

const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const blackNotes = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SynthKeyboard: React.FC<SynthKeyboardProps> = ({
  octaves = 2,
  startOctave = 3,
  onNoteOn,
  onNoteOff,
  pressedKeys: externalPressedKeys,
  keyWidth = 40,
  rootKey,
  scaleType
}) => {
  const synth = useSynth();
  const [internalPressedKeys, setInternalPressedKeys] = useState<Set<string>>(new Set());
  const actualPressedKeys = externalPressedKeys || internalPressedKeys;
  const activePointers = useRef<Map<number, string>>(new Map());

  // --- Music Theory Logic ---
  const scaleIntervals: Record<ScaleType, number[]> = {
      'Chromatic': [1,1,1,1,1,1,1,1,1,1,1,1],
      'Major': [2, 2, 1, 2, 2, 2, 1],
      'Minor': [2, 1, 2, 2, 1, 2, 2],
      'Harmonic Minor': [2, 1, 2, 2, 1, 3, 1],
      'Melodic Minor': [2, 1, 2, 2, 2, 2, 1],
      'Dorian': [2, 1, 2, 2, 2, 1, 2],
      'Phrygian': [1, 2, 2, 2, 1, 2, 2],
      'Lydian': [2, 2, 2, 1, 2, 2, 1],
      'Mixolydian': [2, 2, 1, 2, 2, 1, 2],
      'Locrian': [1, 2, 2, 1, 2, 2, 2],
  };

  const allowedNotes = useMemo(() => {
      if (!rootKey || !scaleType) return null;
      
      const rootIndex = allNotes.indexOf(rootKey);
      if (rootIndex === -1) return null;

      const intervals = scaleIntervals[scaleType];
      const validNotes = new Set<string>();
      
      // Calculate valid notes across all relevant octaves
      // We don't just want note names, we want specific keys if possible, but 
      // usually scales are note-name based.
      let currentIndex = rootIndex;
      validNotes.add(allNotes[currentIndex]);
      
      intervals.forEach(interval => {
          currentIndex = (currentIndex + interval) % 12;
          validNotes.add(allNotes[currentIndex]);
      });
      
      return validNotes;
  }, [rootKey, scaleType]);

  const keyLayout = useMemo(() => {
    const keys: { note: string; isBlack: boolean; isInScale: boolean; isRoot: boolean }[] = [];
    for (let o = 0; o < octaves; o++) {
      const currentOctave = startOctave + o;
      whiteNotes.forEach((note, i) => {
        const fullNote = `${note}${currentOctave}`;
        keys.push({ 
            note: fullNote, 
            isBlack: false,
            isInScale: allowedNotes ? allowedNotes.has(note) : true,
            isRoot: rootKey === note
        });
        if (blackNotes[i]) {
          const blackNote = blackNotes[i]!;
          const fullBlackNote = `${blackNote}${currentOctave}`;
          keys.push({ 
              note: fullBlackNote, 
              isBlack: true,
              isInScale: allowedNotes ? allowedNotes.has(blackNote) : true,
              isRoot: rootKey === blackNote
          });
        }
      });
    }
    return keys;
  }, [octaves, startOctave, allowedNotes, rootKey]);

  const triggerNoteOn = useCallback((note: string) => {
    if (!externalPressedKeys) {
      setInternalPressedKeys(prev => new Set(prev).add(note));
    }
    onNoteOn?.(note);
    synth?.noteOn(note);
  }, [onNoteOn, externalPressedKeys, synth]);

  const triggerNoteOff = useCallback((note: string) => {
    if (!externalPressedKeys) {
      setInternalPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }
    onNoteOff?.(note);
    synth?.noteOff(note);
  }, [onNoteOff, externalPressedKeys, synth]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    processPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (e.buttons > 0) {
      processPointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    const note = activePointers.current.get(e.pointerId);
    if (note) {
      triggerNoteOff(note);
      activePointers.current.delete(e.pointerId);
    }
  };

  const processPointer = (e: React.PointerEvent) => {
    const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    const note = element?.getAttribute('data-note');
    const previousNote = activePointers.current.get(e.pointerId);

    if (note) {
      if (note !== previousNote) {
        if (previousNote) triggerNoteOff(previousNote);
        triggerNoteOn(note);
        activePointers.current.set(e.pointerId, note);
      }
    } else {
      if (previousNote) {
        triggerNoteOff(previousNote);
        activePointers.current.delete(e.pointerId);
      }
    }
  };

  const whiteKeyHeight = keyWidth * 4;
  const blackKeyWidth = keyWidth * 0.6;
  const blackKeyHeight = whiteKeyHeight * 0.6;
  const totalWhiteKeys = octaves * 7;
  const keyboardWidth = totalWhiteKeys * keyWidth;
  
  const blackKeyOffsets = [0.7, 1.7, 3.7, 4.7, 5.7];

  return (
    <div
      className="relative flex select-none rounded-b-[20px] overflow-hidden backdrop-blur-md touch-none"
      style={{ width: keyboardWidth, height: whiteKeyHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* White Keys */}
      {keyLayout.filter(k => !k.isBlack).map((key, index) => {
        const isActive = actualPressedKeys.has(key.note);
        const opacityClass = key.isInScale ? 'opacity-100' : 'opacity-40 brightness-50';
        const rootClass = key.isRoot ? 'bg-cyan-900/30' : '';
        
        return (
          <div
            key={key.note}
            data-note={key.note}
            className={`absolute top-0 border-r border-white/10 rounded-b-lg transition-all duration-75 cursor-pointer group ${opacityClass} ${rootClass}
              ${isActive 
                ? 'bg-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.4)_inset] translate-y-1' 
                : 'bg-white/5 hover:bg-white/10'
              }`}
            style={{
              left: index * keyWidth,
              width: keyWidth,
              height: whiteKeyHeight,
              zIndex: 1,
            }}
          >
             <div className={`absolute bottom-2 w-full text-center text-[10px] font-bold pointer-events-none ${isActive ? 'text-cyan-200' : 'text-white/20'}`}>
                {key.note}
             </div>
             {key.isRoot && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_cyan]"></div>}
          </div>
        );
      })}

      {/* Black Keys */}
      {Array.from({ length: octaves }).map((_, octaveIndex) => 
        blackKeyOffsets.map((offset, noteIndex) => {
            const noteName = `${blackNotes[whiteNotes.findIndex(n => n === 'C' || n === 'D' || n === 'F' || n === 'G' || n === 'A')[noteIndex]]}${startOctave + octaveIndex}`;
            const keyData = keyLayout.find(k => k.note === noteName);
            
            if (keyData) {
                const isActive = actualPressedKeys.has(noteName);
                const opacityClass = keyData.isInScale ? 'opacity-100' : 'opacity-30 grayscale';
                const rootClass = keyData.isRoot ? 'border-cyan-500' : 'border-white/5';
                
                return (
                  <div
                    key={noteName}
                    data-note={noteName}
                    className={`absolute top-0 rounded-b-md border cursor-pointer transition-all duration-75 ${opacityClass} ${rootClass}
                      ${isActive 
                        ? 'bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.6)] translate-y-1' 
                        : 'bg-black/80 shadow-lg'
                      }`}
                    style={{
                      left: (octaveIndex * 7 * keyWidth) + (offset * keyWidth) - (blackKeyWidth / 2) + keyWidth,
                      width: blackKeyWidth,
                      height: blackKeyHeight,
                      zIndex: 2,
                    }}
                  >
                     {keyData.isRoot && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_5px_magenta]"></div>}
                  </div>
                );
            }
            return null;
        })
      )}
    </div>
  );
};

export default SynthKeyboard;
