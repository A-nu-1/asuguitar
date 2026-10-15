
import type { Bar, ChordLine, Note } from "@/types/guitar";

const TOTAL_BARS = 50;
const TOTAL_CHORD_LINES = 50;

// =====================================================
// SAMPLE MELODY — 50 BARS
// =====================================================

const melodySections = [
  "Intro",
  "Verse 1",
  "Chorus",
  "Verse 2",
  "Bridge",
];

const melodyPatterns = [
  [
    { string: 1, fret: "0" },
    { string: 2, fret: "1" },
    { string: 3, fret: "2" },
    { string: 2, fret: "3" },
  ],
  [
    { string: 3, fret: "0" },
    { string: 2, fret: "1" },
    { string: 1, fret: "3" },
    { string: 2, fret: "1" },
  ],
  [
    { string: 4, fret: "2" },
    { string: 3, fret: "2" },
    { string: 2, fret: "0" },
    { string: 1, fret: "0" },
  ],
  [
    { string: 1, fret: "3" },
    { string: 2, fret: "3" },
    { string: 3, fret: "0" },
    { string: 4, fret: "2" },
  ],
  [
    { string: 5, fret: "0" },
    { string: 4, fret: "2" },
    { string: 3, fret: "2" },
    { string: 2, fret: "1" },
  ],
];

export const sampleMelodyBars: Bar[] = Array.from(
  { length: TOTAL_BARS },
  (_, index) => {
    const barNumber = index + 1;

    const sectionIndex = Math.min(
      Math.floor(index / 10),
      melodySections.length - 1
    );

    const pattern =
      melodyPatterns[index % melodyPatterns.length];

    const notes: Note[] = pattern.map((note, noteIndex) => ({
      id: `note-${barNumber}-${noteIndex + 1}`,
      string: note.string,
      fret: note.fret,
      beat: noteIndex + 1,
      duration: 1,
      position: 12 + noteIndex * 24,
    }));

    return {
      id: `bar-${barNumber}`,
      number: barNumber,
      section: melodySections[sectionIndex],
      lyrics: `Practice melody — bar ${barNumber}`,
      notes,
    };
  }
);

// =====================================================
// SAMPLE CHORDS — 50 LINES
// =====================================================

const chordSections = [
  "Verse 1",
  "Chorus",
  "Verse 2",
  "Bridge",
  "Final Chorus",
];

const chordProgressions = [
  ["C", "G", "Am", "F"],
  ["G", "D", "Em", "C"],
  ["Am", "F", "C", "G"],
  ["D", "A", "Bm", "G"],
  ["Em", "C", "G", "D"],
];

const sampleLyrics = [
  "Every little note becomes a song tonight",
  "Playing my guitar beneath the morning light",
  "Learning every chord and finding my own way",
  "Music keeps me smiling through another day",
  "Let the melody carry me along",
  "Every single practice makes my fingers strong",
  "Strings are ringing softly in the air",
  "Music takes me somewhere without a care",
  "One more chord and one more melody",
  "Playing guitar feels like being free",
];

export const sampleChordLines: ChordLine[] = Array.from(
  { length: TOTAL_CHORD_LINES },
  (_, index) => {
    const lineNumber = index + 1;

    const sectionIndex = Math.min(
      Math.floor(index / 10),
      chordSections.length - 1
    );

    const chords =
      chordProgressions[index % chordProgressions.length];

    const lyrics =
      sampleLyrics[index % sampleLyrics.length];

    return {
      id: `line-${lineNumber}`,
      section: chordSections[sectionIndex],
      lyrics,
      chords: chords.join(" "),

      placements: chords.map((chord, chordIndex) => ({
        id: `chord-${lineNumber}-${chordIndex + 1}`,
        chord,
        position: chordIndex * 25,
        charIndex: [0, 10, 20, 30][chordIndex],
      })),
    };
  }
);


export const demoSongs = [
  {
    id: "sample-melody",
    title: "Sample Melody Song",
    song_type: "melody",
    description: "50 melody bars for scrolling practice",
    class_date: "2026-10-10",
    created_at: "2026-10-10",
    tempo_bpm: 100,
    time_signature: "4/4",
    capo: 0,
    strumming_pattern: null,
    youtube_url: "https://www.youtube.com/watch?v=YGVKHFCkZVA",
    pdfUrl: "/demo/melody.pdf",
    chord_lines: [],
    bars: sampleMelodyBars.map((bar) => ({
      id: bar.id,
      bar_number: bar.number,
      section: bar.section,
      lyrics: bar.lyrics,
      notes: bar.notes,
    })),
  },
  {
    id: "sample-chords",
    title: "Sample Chord Song",
    song_type: "chords",
    description: "50 chord lines for scrolling practice",
    class_date: "2026-10-09",
    created_at: "2026-10-09",
    tempo_bpm: 100,
    time_signature: "4/4",
    capo: 0,
    strumming_pattern: "D DU UDU",
    youtube_url: "https://www.youtube.com/watch?v=YGVKHFCkZVA",
    pdfUrl: "/demo/chords.pdf",
    chord_lines: sampleChordLines,
    bars: [],
  },
  {
    id: "sample-tab",
    title: "Sample PDF-Only Tab",
    song_type: "tab",
    description: "Practice directly from the original PDF",
    class_date: "2026-10-08",
    created_at: "2026-10-08",
    tempo_bpm: null,
    time_signature: null,
    capo: 0,
    strumming_pattern: null,
    youtube_url: "https://www.youtube.com/watch?v=YGVKHFCkZVA",
    pdfUrl: "/demo/tab.pdf",
    chord_lines: [],
    bars: [],
  },
] as const;

