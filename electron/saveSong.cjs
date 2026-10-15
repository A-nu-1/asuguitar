
const { app } = require("electron");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { getDatabase } = require("./database.cjs");

const MAX_PDF_SIZE = 50 * 1024 * 1024;

function saveSong(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid song data.");
  }

  const {
    title,
    class_date,
    description,
    youtube_url,
    song_type = "melody",
    extraction_status,
    tempo_bpm,
    time_signature,
    capo = 0,
    strumming_pattern,
    bars,
    chord_lines,
    pdf_bytes,
  } = payload;

  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Song title is required.");
  }

  if (!["melody", "chords"].includes(song_type)) {
    throw new Error("Invalid song type.");
  }

  if (!["accepted", "pdf_only"].includes(extraction_status)) {
    throw new Error("Invalid extraction decision.");
  }

  if (!(pdf_bytes instanceof Uint8Array)) {
    throw new Error("Original PDF is required.");
  }

  if (
    pdf_bytes.length === 0 ||
    pdf_bytes.length > MAX_PDF_SIZE
  ) {
    throw new Error("PDF must be between 1 byte and 50 MB.");
  }

  const pdfHeader = Buffer.from(
    pdf_bytes.subarray(0, 5)
  ).toString("ascii");

  if (pdfHeader !== "%PDF-") {
    throw new Error("The selected file is not a valid PDF.");
  }

  if (
    !Number.isInteger(capo) ||
    capo < 0 ||
    capo > 12
  ) {
    throw new Error("Capo must be between 0 and 12.");
  }

  const accepted = extraction_status === "accepted";

  if (accepted && song_type === "melody") {
    if (!Array.isArray(bars) || bars.length === 0) {
      throw new Error(
        "Accepted melody must contain bars."
      );
    }
  }

  if (accepted && song_type === "chords") {
    if (
      !Array.isArray(chord_lines) ||
      chord_lines.length === 0
    ) {
      throw new Error(
        "Accepted chord song must contain chord lines."
      );
    }

    for (const [index, line] of chord_lines.entries()) {
      if (
        !line ||
        typeof line.section !== "string" ||
        typeof line.lyrics !== "string" ||
        typeof line.chords !== "string" ||
        (line.placements !== undefined &&
          !Array.isArray(line.placements))
      ) {
        throw new Error(
          `Invalid chord line ${index + 1}.`
        );
      }
    }
  }

  const database = getDatabase();

  const songId = randomUUID();
  const pdfFilename = `${songId}.pdf`;

  const pdfFolder = path.join(
    app.getPath("userData"),
    "data",
    "pdfs"
  );

  fs.mkdirSync(pdfFolder, { recursive: true });

  const pdfPath = path.join(pdfFolder, pdfFilename);

  // Rejected extraction becomes a PDF-only tab.
  const finalSongType = accepted ? song_type : "tab";

  const savedBars =
    accepted && song_type === "melody"
      ? bars
      : [];

  const savedChordLines =
    accepted && song_type === "chords"
      ? chord_lines
      : [];

  let transactionStarted = false;

  try {
    // Save the original PDF locally.
    fs.writeFileSync(pdfPath, pdf_bytes, {
      flag: "wx",
    });

    database.exec("BEGIN IMMEDIATE");
    transactionStarted = true;

    database
      .prepare(`
        INSERT INTO songs (
          id,
          title,
          song_type,
          class_date,
          description,
          youtube_url,
          pdf_filename,
          extraction_status,
          capo,
          strumming_pattern,
          tempo_bpm,
          time_signature,
          chord_lines
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        songId,
        title.trim(),
        finalSongType,
        class_date || null,
        description || null,
        youtube_url || null,
        pdfFilename,
        extraction_status,
        finalSongType === "chords" ? capo : 0,
        finalSongType === "chords"
          ? strumming_pattern || null
          : null,
        accepted ? tempo_bpm ?? null : null,
        accepted ? time_signature || null : null,
        finalSongType === "chords"
          ? JSON.stringify(savedChordLines)
          : null
      );

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

    for (const [index, bar] of savedBars.entries()) {
      if (!bar || !Array.isArray(bar.notes)) {
        throw new Error(
          `Invalid melody bar ${index + 1}.`
        );
      }

      insertBar.run(
        randomUUID(),
        songId,
        index + 1,
        bar.section || null,
        bar.lyrics || null,
        JSON.stringify(bar.notes)
      );
    }

    database.exec("COMMIT");
    transactionStarted = false;

    return {
      id: songId,
      song_type: finalSongType,
      title: title.trim(),
      pdf_filename: pdfFilename,
      bars_saved: savedBars.length,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        database.exec("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Database rollback failed:",
          rollbackError
        );
      }
    }

    try {
      fs.rmSync(pdfPath, { force: true });
    } catch (cleanupError) {
      console.error(
        "PDF cleanup failed:",
        cleanupError
      );
    }

    throw error;
  }
}

module.exports = { saveSong };
