
const { app } = require("electron");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { getDatabase } = require("./database.cjs");

const MAX_PDF_SIZE = 50 * 1024 * 1024;

function updateSong(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid song data.");
  }

  const {
    id,
    title,
    class_date,
    description,
    youtube_url,
    tempo_bpm,
    time_signature,
    capo,
    strumming_pattern,
    chord_lines,
    bars,
    pdf_bytes,
  } = payload;

  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Song ID is required.");
  }

  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Song title is required.");
  }

  const database = getDatabase();

  const existing = database
    .prepare("SELECT * FROM songs WHERE id = ?")
    .get(id);

  if (!existing) {
    throw new Error("Song not found.");
  }

  // A missing PDF means: keep the existing PDF.
  let newPdfFilename = null;
  let newPdfPath = null;

  if (pdf_bytes != null) {
    if (!(pdf_bytes instanceof Uint8Array)) {
      throw new Error("Invalid PDF data.");
    }

    if (
      pdf_bytes.length === 0 ||
      pdf_bytes.length > MAX_PDF_SIZE
    ) {
      throw new Error("PDF must be between 1 byte and 50 MB.");
    }

    const header = Buffer.from(
      pdf_bytes.subarray(0, 5)
    ).toString("ascii");

    if (header !== "%PDF-") {
      throw new Error("The selected file is not a PDF.");
    }

    newPdfFilename = `${randomUUID()}.pdf`;

    const pdfFolder = path.join(
      app.getPath("userData"),
      "data",
      "pdfs"
    );

    fs.mkdirSync(pdfFolder, { recursive: true });

    newPdfPath = path.join(pdfFolder, newPdfFilename);
  }

  // Supplying bars replaces the melody bars.
  // Omitting bars leaves them untouched.
  if (bars !== undefined) {
    if (existing.song_type !== "melody") {
      throw new Error(
        "Bar editing is only available for melody songs."
      );
    }

    if (!Array.isArray(bars)) {
      throw new Error("Invalid melody bars.");
    }

    for (const bar of bars) {
      if (!bar || !Array.isArray(bar.notes)) {
        throw new Error("Invalid melody bar data.");
      }
    }
  }

  // Supplying chord lines updates a chord song.
  if (chord_lines !== undefined) {
    if (existing.song_type !== "chords") {
      throw new Error(
        "Chord editing is only available for chord songs."
      );
    }

    if (!Array.isArray(chord_lines)) {
      throw new Error("Invalid chord lines.");
    }
  }

  const nextCapo = capo ?? existing.capo ?? 0;

  if (
    !Number.isInteger(nextCapo) ||
    nextCapo < 0 ||
    nextCapo > 12
  ) {
    throw new Error("Capo must be between 0 and 12.");
  }

  let transactionStarted = false;

  try {
    // Save replacement PDF first.
    if (newPdfPath) {
      fs.writeFileSync(newPdfPath, pdf_bytes, {
        flag: "wx",
      });
    }

    database.exec("BEGIN IMMEDIATE");
    transactionStarted = true;

    database
      .prepare(`
        UPDATE songs
        SET
          title = ?,
          class_date = ?,
          description = ?,
          youtube_url = ?,
          pdf_filename = ?,
          tempo_bpm = ?,
          time_signature = ?,
          capo = ?,
          strumming_pattern = ?,
          chord_lines = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(
        title.trim(),
        class_date || null,
        description || null,
        youtube_url || null,
        newPdfFilename || existing.pdf_filename,
        tempo_bpm ?? existing.tempo_bpm ?? null,
        time_signature ?? existing.time_signature ?? null,
        nextCapo,
        strumming_pattern ?? existing.strumming_pattern ?? null,
        chord_lines !== undefined
          ? JSON.stringify(chord_lines)
          : existing.chord_lines,
        id
      );

    if (bars !== undefined) {
      database
        .prepare("DELETE FROM song_bars WHERE song_id = ?")
        .run(id);

      const insertBar = database.prepare(`
        INSERT INTO song_bars (
          id,
          song_id,
          bar_number,
          section,
          lyrics,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const [index, bar] of bars.entries()) {
        insertBar.run(
          bar.id || randomUUID(),
          id,
          index + 1,
          bar.section || null,
          bar.lyrics || null,
          JSON.stringify(bar.notes)
        );
      }
    }

    database.exec("COMMIT");
    transactionStarted = false;

    return {
      id,
      title: title.trim(),
      song_type: existing.song_type,
      pdf_filename:
        newPdfFilename || existing.pdf_filename,
      updated: true,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        database.exec("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    // Remove only the NEW file if saving failed.
    if (newPdfPath) {
      try {
        fs.rmSync(newPdfPath, { force: true });
      } catch (cleanupError) {
        console.error(
          "New PDF cleanup failed:",
          cleanupError
        );
      }
    }

    throw error;
  }
}

module.exports = { updateSong };
