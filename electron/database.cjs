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
