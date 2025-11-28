const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteMap = {};

for (let octave = 0; octave < 9; octave++) {
  for (let i = 0; i < 12; i++) {
    const noteName = `${notes[i]}${octave}`;
    const midiNumber = 12 + (octave * 12) + i;
    noteMap[noteName] = midiNumber;
  }
}

export const midiToFreq = (midi) => {
  return 440 * Math.pow(2, (midi - 69) / 12);
};
