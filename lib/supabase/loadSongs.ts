
import type {
  Song,
  ChordLine,
  Bar,
  Note,
} from "@/types/guitar";

import { supabase } from "@/lib/supabase";

export type LibrarySong = {
  id: string;
  title: string;
  song_type: "chords" | "melody";
  tempo_bpm: number | null;
  time_signature: string | null;
  created_at: string;
  updated_at: string;
};

type SavedBarRow = {
  id: string;
  bar_number: number;
  section: string | null;
  lyrics: string | null;
  notes: Note[] | null;
};

export async function loadLibrarySongs(): Promise<LibrarySong[]> {
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, title, song_type, tempo_bpm, time_signature, created_at, updated_at",
    )
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LibrarySong[];
}

export async function loadLibrarySong(
  songId: string,
): Promise<Song> {
  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, title, song_type, tempo_bpm, time_signature, chord_lines",
    )
    .eq("id", songId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Song not found.");
  }

  const baseSong = {
    title: data.title,
    timeSignature: data.time_signature ?? "",
    tempo: data.tempo_bpm ?? null,
    source: {
      method: "supabase",
      filename: "",
    },
  };

  // CHORD SONG
  // Preserve the existing working behaviour.
  if (data.song_type === "chords") {
    const chordLines = Array.isArray(data.chord_lines)
      ? (data.chord_lines as ChordLine[])
      : [];

    return {
      ...baseSong,
      mode: "chords",
      bars: [],
      chordLines,
    };
  }

  // MELODY SONG
  if (data.song_type === "melody") {
    const { data: barRows, error: barsError } =
      await supabase
        .from("song_bars")
        .select("id, bar_number, section, lyrics, notes")
        .eq("song_id", songId)
        .order("bar_number", { ascending: true });

    if (barsError) {
      throw new Error(
        "Could not load melody bars: " + barsError.message,
      );
    }

    const bars: Bar[] = (
      (barRows ?? []) as SavedBarRow[]
    ).map((row) => ({
      id: row.id,
      number: row.bar_number,
      section: row.section ?? "Unassigned",
      lyrics: row.lyrics ?? "",
      notes: Array.isArray(row.notes) ? row.notes : [],
    }));

    return {
      ...baseSong,
      mode: "melody",
      bars,
      chordLines: [],
    };
  }

  throw new Error("Unsupported song type.");
}
