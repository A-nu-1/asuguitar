
const fs = require("node:fs");
const { getDatabase } = require("./database.cjs");

function importSongs(filePath) {
  const database = getDatabase();

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // Supabase SQL Editor exports an array containing guitar_backup.
  const backup = Array.isArray(raw)
    ? raw[0]?.guitar_backup
    : raw.guitar_backup ?? raw;

  if (!backup) {
    throw new Error("Invalid guitar backup format.");
  }

  const songs = backup.songs;
  const bars = backup.song_bars;

  if (!Array.isArray(songs) || !Array.isArray(bars)) {
    throw new Error("Backup must contain songs and song_bars arrays.");
  }

  // Verify the expected backup before making any changes.
  if (songs.length !== 13 || bars.length !== 366) {
    throw new Error(
      `Unexpected backup counts: ${songs.length} songs, ${bars.length} bars.`
    );
  }

  const songIds = new Set(songs.map((song) => song.id));

  if (
    songIds.size !== songs.length ||
    new Set(bars.map((bar) => bar.id)).size !== bars.length ||
    bars.some((bar) => !songIds.has(bar.song_id))
  ) {
    throw new Error("Backup contains duplicate IDs or orphan bars.");
  }

  // Do not overwrite any existing local songs.
  const existingSongs = database
    .prepare("SELECT COUNT(*) AS count FROM songs")
    .get().count;

  const existingBars = database
    .prepare("SELECT COUNT(*) AS count FROM song_bars")
    .get().count;

  if (existingSongs !== 0 || existingBars !== 0) {
    throw new Error(
      "SQLite is not empty. Import cancelled to protect existing data."
    );
  }

  const insertSong = database.prepare(`
    INSERT INTO songs (
      id, title, song_type, tempo_bpm, time_signature,
      chord_lines, extraction_status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBar = database.prepare(`
    INSERT INTO song_bars (
      id, song_id, bar_number, section, lyrics, notes
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  database.exec("BEGIN TRANSACTION");

  try {
    for (const song of songs) {
      insertSong.run(
        song.id,
        song.title,
        song.song_type,
        song.tempo_bpm,
        song.time_signature,
        JSON.stringify(song.chord_lines ?? []),
        "accepted",
        song.created_at,
        song.updated_at
      );
    }

    for (const bar of bars) {
      insertBar.run(
        bar.id,
        bar.song_id,
        bar.bar_number,
        bar.section,
        bar.lyrics,
        JSON.stringify(bar.notes ?? [])
      );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  const result = {
    songs: database
      .prepare("SELECT COUNT(*) AS count FROM songs")
      .get().count,
    bars: database
      .prepare("SELECT COUNT(*) AS count FROM song_bars")
      .get().count,
  };

  console.log("SQLite migration completed:", result);

  return result;
}

module.exports = { importSongs };
