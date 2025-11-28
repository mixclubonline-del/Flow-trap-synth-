import React, { createContext, useContext } from 'react';
import SynthEngine from '../lib/synthEngine';

export const SynthContext = createContext<SynthEngine | null>(null);

export const SynthProvider = SynthContext.Provider;

export const useSynth = (): SynthEngine | null => {
    return useContext(SynthContext);
};
