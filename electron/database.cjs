const { app } = require("electron");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

let db = null;

function initializeDatabase() {
  const dataFolder = path.join(app.getPath("userData"), "data");

  fs.mkdirSync(dataFolder, { recursive: true });

  const databasePath = path.join(dataFolder, "asuguitar.sqlite");

  db = new DatabaseSync(databasePath);

  db.exec(`
    PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,

  song_type TEXT NOT NULL
    CHECK (song_type IN ('melody', 'tab', 'chords')),

  class_date TEXT,
  description TEXT,
  youtube_url TEXT,
  pdf_filename TEXT,

  extraction_status TEXT NOT NULL DEFAULT 'pdf_only'
    CHECK (extraction_status IN ('accepted', 'pdf_only')),

  capo INTEGER DEFAULT 0
    CHECK (capo >= 0 AND capo <= 12),

  strumming_pattern TEXT,

  tempo_bpm REAL,
  time_signature TEXT,
  chord_lines TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

    CREATE TABLE IF NOT EXISTS song_bars (
      id TEXT PRIMARY KEY,
      song_id TEXT NOT NULL,
      bar_number INTEGER NOT NULL,
      section TEXT,
      lyrics TEXT,
      notes TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (song_id)
        REFERENCES songs(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_song_bars_song
      ON song_bars(song_id, bar_number);

      
CREATE TABLE IF NOT EXISTS song_video_timings (
  song_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  bar_id TEXT NOT NULL,
  seconds REAL NOT NULL CHECK (seconds >= 0),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (song_id, video_id, bar_id),

  FOREIGN KEY (song_id)
    REFERENCES songs(id)
    ON DELETE CASCADE,

  FOREIGN KEY (bar_id)
    REFERENCES song_bars(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_song_video_timings
  ON song_video_timings(song_id, video_id, seconds);

  
-- YouTube synchronization for chord lines
CREATE TABLE IF NOT EXISTS song_chord_timings (
  song_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  line_id TEXT NOT NULL,
  seconds REAL NOT NULL CHECK (seconds >= 0),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (song_id, video_id, line_id),

  FOREIGN KEY (song_id)
    REFERENCES songs(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_song_chord_timings
  ON song_chord_timings(song_id, video_id, seconds);

  
-- YouTube synchronization for PDF positions
CREATE TABLE IF NOT EXISTS song_pdf_timings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  song_id TEXT NOT NULL,
  video_id TEXT NOT NULL,

  page_number INTEGER NOT NULL
    CHECK (page_number >= 1),

  page_position REAL NOT NULL
    CHECK (page_position >= 0 AND page_position <= 1),

  seconds REAL NOT NULL
    CHECK (seconds >= 0),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (song_id)
    REFERENCES songs(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_song_pdf_timings
  ON song_pdf_timings(song_id, video_id, seconds);


  `);

  console.log("SQLite database ready:", databasePath);

  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error("Database has not been initialized.");
  }

  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
};
