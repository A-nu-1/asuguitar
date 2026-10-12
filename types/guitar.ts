export type Token = {
  text: string;
  x: number | null;
  y: number | null;
  page: number;
};

export type Geometry = {
  number: number;
  row: number;
  page?: number;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
};

export type Note = {
  id: string;
  string: number;
  fret: string;
  beat: number | null;
  duration: number | null;
  sourceX?: number;
  sourceY?: number;
  position?: number;
};

export type Bar = {
  id: string;
  number: number;
  section: string;
  lyrics: string;
  notes: Note[];
};

export type ChordPlacement = {
  id: string;
  chord: string;

  position: number; // Existing visual position (0–100%)
  charIndex?: number | null; // Character anchor in lyrics
  sourceX?: number; // Original PDF coordinate
  manuallyPositioned?: boolean;
};

export type ChordLine = {
  id: string;
  section: string;
  lyrics: string;
  chords: string;
  placements?: ChordPlacement[];
};


export type Song = {
  title: string;
  mode: "melody" | "chords";
  timeSignature: string;
  tempo: number | null;
  bars: Bar[];
  chordLines: ChordLine[];
  source: {
    method: string;
    filename: string;
  };
};