
const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const { getDatabase } = require("./database.cjs");

function loadSongPdf(songId) {
  if (typeof songId !== "string" || !songId.trim()) {
    throw new Error("Invalid song ID.");
  }

  const database = getDatabase();

  const song = database
    .prepare(`
      SELECT pdf_filename
      FROM songs
      WHERE id = ?
    `)
    .get(songId);

  if (!song?.pdf_filename) {
    return null;
  }

  // PDFs created by our save function use UUID filenames.
  // Reject unexpected paths.
  const filename = song.pdf_filename;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(
      filename
    )
  ) {
    throw new Error("Invalid saved PDF filename.");
  }

  const pdfPath = path.join(
    app.getPath("userData"),
    "data",
    "pdfs",
    filename
  );

  if (!fs.existsSync(pdfPath)) {
    throw new Error("Original PDF file was not found.");
  }

  return new Uint8Array(fs.readFileSync(pdfPath));
}

module.exports = { loadSongPdf };
