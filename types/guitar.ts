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

export type MelodySymbolType =
  | "hammer-on"
  | "pull-off"
  | "slide-up"
  | "slide-down"
  | "rest-quarter"
  | "rest-eighth"
  | "rest-half"
  | "rest-whole"
  | "coda"
  | "segno"
  | "finger"
  | "text";

export type MelodySymbol = {
  id: string;
  type: MelodySymbolType;

  // Position inside the bar, as percentages.
  x: number;
  y: number;

  // Optional dimensions for arcs and larger symbols.
  width?: number;
  height?: number;

  // Optional destination for a cross-bar connection.
  endBarId?: string | null;

  // For circled fingering numbers.
  text?: string;

  rotation?: number;
};

export type Bar = {
  id: string;
  number: number;
  section: string;
  lyrics: string;
  notes: Note[];
  symbols?: MelodySymbol[];
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

export type LibrarySong = {
  id: string;
  title: string;
  song_type: "melody" | "tab" | "chords";
  class_date: string | null;
  created_at: string;

  bar_count: number;
  capo: number | null;
};

export type SongSaveBar = {
  id: string;
  number: number;
  section: string;
  lyrics: string;
  notes: Array<{
    id: string;
    string: number;
    fret: string;
    beat: number | null;
    duration: number | null;
    sourceX?: number;
    sourceY?: number;
    position?: number;
  }>;
  symbols?: MelodySymbol[];
};

export type GuitarAPI = {
  getSongs: () => Promise<LibrarySong[]>;

  getSong: (songId: string) => Promise<unknown>;

  getSongPdf: (songId: string) => Promise<Uint8Array | null>;

  // ADD SONG
  saveSong: (payload: {
    title: string;
    class_date: string | null;
    description: string | null;
    youtube_url: string | null;

    // Optional so existing Add Melody keeps working.
    // Add Chords will explicitly send "chords".
    song_type?: "melody" | "chords";

    extraction_status: "accepted" | "pdf_only";

    tempo_bpm: number | null;
    time_signature: string | null;

    capo?: number;
    strumming_pattern?: string | null;

    bars: SongSaveBar[];
    chord_lines?: ChordLine[];

    pdf_bytes: Uint8Array;
  }) => Promise<{
    id: string;
    song_type: "melody" | "chords" | "tab";
    title: string;
    pdf_filename: string;
    bars_saved: number;
  }>;

  // EDIT SONG
  updateSong: (payload: {
    convert_to_melody?: boolean;
    id: string;
    title: string;
    class_date: string | null;
    description: string | null;
    youtube_url: string | null;

    tempo_bpm?: number | null;
    time_signature?: string | null;

    capo?: number;
    strumming_pattern?: string | null;

    bars?: SongSaveBar[];
    chord_lines?: ChordLine[];

    pdf_bytes?: Uint8Array;
  }) => Promise<{
    id: string;
    title: string;
    song_type: "melody" | "chords" | "tab";
    pdf_filename: string | null;
    updated: boolean;
  }>;

  // YOUTUBE SYNCHRONIZATION

  getSongSync: (
    songId: string,
    videoId: string,
  ) => Promise<
    Array<{
      barId: string;
      seconds: number;
    }>
  >;

  saveSongSync: (
    songId: string,
    videoId: string,
    timings: Array<{
      barId: string;
      seconds: number;
    }>,
  ) => Promise<{
    success: boolean;
    savedCount: number;
  }>;

  // CHORD YOUTUBE SYNCHRONIZATION
  getChordSync: (
    songId: string,
    videoId: string,
  ) => Promise<
    Array<{
      barId: string;
      seconds: number;
    }>
  >;

  saveChordSync: (
    songId: string,
    videoId: string,
    timings: Array<{
      barId: string;
      seconds: number;
    }>,
  ) => Promise<{
    success: boolean;
    savedCount: number;
  }>;

  // PDF–YOUTUBE SYNCHRONIZATION
  getPdfSync: (
    songId: string,
    videoId: string,
  ) => Promise<
    Array<{
      id: number;
      page: number;
      position: number;
      seconds: number;
    }>
  >;

  savePdfSync: (
    songId: string,
    videoId: string,
    timings: Array<{
      page: number;
      position: number;
      seconds: number;
    }>,
  ) => Promise<{
    success: boolean;
    savedCount: number;
  }>;
};
