import type { Song } from "@/types/guitar";
import { supabase } from "@/lib/supabase";

export async function saveSong(
  song: Song,
  existingSongId?: string | null,
): Promise<string> {
  // Confirm the user is signed in.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to save songs.");
  }

  // Confirm the user is the guitar library owner.
  const { data: isAdmin, error: adminError } =
    await supabase.rpc("is_guitar_admin");

  if (adminError) throw adminError;

  if (!isAdmin) {
    throw new Error("Only the owner can save songs.");
  }

  // Save song and melody bars in one database transaction.
  const { data: songId, error: saveError } =
    await supabase.rpc("save_guitar_song", {
      p_song_id: existingSongId ?? null,
      p_title: song.title,
      p_song_type: song.mode,
      p_tempo_bpm: song.tempo,
      p_time_signature: song.timeSignature,
      p_chord_lines: song.chordLines,
      p_bars: song.bars,
    });

  if (saveError) {
    throw new Error(saveError.message);
  }

  if (!songId) {
    throw new Error("Song could not be saved.");
  }

  return songId as string;
}
