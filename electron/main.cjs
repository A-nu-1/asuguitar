const { app, BrowserWindow, ipcMain } = require("electron");
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const {
  initializeDatabase,
  getDatabase,
  closeDatabase,
} = require("./database.cjs");
const { saveSong } = require("./saveSong.cjs");
const { loadSongPdf } = require("./loadSongPdf.cjs");
const { updateSong } = require("./updateSong.cjs");

const { shell } = require("electron");

let server = null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

function startServer() {
  return new Promise((resolve, reject) => {
    const root = path.resolve(__dirname, "../out");

    server = http.createServer((req, res) => {
      try {
        const requestPath = new URL(req.url || "/", "http://localhost")
          .pathname;

        const decodedPath = decodeURIComponent(requestPath);
        const relativePath = decodedPath.replace(/^\/+/, "");
        const requestedFile = path.resolve(root, relativePath);

        // Never serve files outside the exported application.
        if (
          requestedFile !== root &&
          !requestedFile.startsWith(root + path.sep)
        ) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }

        let filePath = requestedFile;

        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          const indexFile = path.join(filePath, "index.html");
          const htmlFile = `${filePath}.html`;

          if (fs.existsSync(indexFile)) {
            filePath = indexFile;
          } else if (fs.existsSync(htmlFile)) {
            filePath = htmlFile;
          } else {
            filePath = indexFile;
          }
        } else if (!path.extname(filePath)) {
          filePath += ".html";
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const mimeType =
          mimeTypes[path.extname(filePath).toLowerCase()] ||
          "application/octet-stream";

        res.writeHead(200, {
          "Content-Type": mimeType,
          "X-Content-Type-Options": "nosniff",
        });

        fs.createReadStream(filePath).pipe(res);
      } catch (error) {
        console.error("File server error:", error);
        res.writeHead(400);
        res.end("Bad request");
      }
    });

    server.once("error", reject);

    // Bind only to this computer.
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address().port);
    });
  });
}

function createWindow(port) {
  const window = new BrowserWindow({
    width: 1200,
    height: 850,
    icon: path.join(__dirname, "../build/icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);

      const allowedHosts = [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
      ];

      const allowedProtocol =
        parsed.protocol === "https:" || parsed.protocol === "http:";

      if (allowedHosts.includes(parsed.hostname) && allowedProtocol) {
        // Always open YouTube securely in the default browser.
        parsed.protocol = "https:";

        void shell.openExternal(parsed.toString()).catch((error) => {
          console.error("Could not open YouTube:", error);
        });
      } else {
        console.warn("Blocked external URL:", url);
      }
    } catch (error) {
      console.error("Invalid external URL:", error);
    }

    return { action: "deny" };
  });

  window.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(async () => {
  try {
    initializeDatabase();

    ipcMain.handle("songs:list", () => {
      const database = getDatabase();

      return database
        .prepare(
          `
      SELECT
        id,
        title,
        song_type,
        class_date,
        description,
        youtube_url,
        pdf_filename,
        extraction_status,
        capo,
        (SELECT COUNT(*)
         FROM song_bars
         WHERE song_id = songs.id) AS bar_count,
        strumming_pattern,
        tempo_bpm,
        time_signature,
        created_at,
        updated_at
      FROM songs
      ORDER BY
        class_date DESC,
        created_at DESC
    `,
        )
        .all();
    });

    ipcMain.handle("songs:get", (_event, songId) => {
      if (typeof songId !== "string" || !songId.trim()) {
        throw new Error("Invalid song ID.");
      }

      const database = getDatabase();

      const song = database
        .prepare(
          `
      SELECT *
      FROM songs
      WHERE id = ?
    `,
        )
        .get(songId);

      if (!song) {
        return null;
      }

      const bars = database
        .prepare(
          `
      SELECT
        id,
        song_id,
        bar_number,
        section,
        lyrics,
        notes,
        symbols
      FROM song_bars
      WHERE song_id = ?
      ORDER BY bar_number ASC
    `,
        )
        .all(songId);

      return {
        ...song,
        chord_lines: JSON.parse(song.chord_lines || "[]"),
        bars: bars.map((bar) => ({
          ...bar,
          notes: JSON.parse(bar.notes || "[]"),
          symbols: JSON.parse(bar.symbols || "[]"),
        })),
      };
    });

    ipcMain.handle("songs:save", (_event, payload) => {
      return saveSong(payload);
    });

    ipcMain.handle("songs:pdf", (_event, songId) => {
      return loadSongPdf(songId);
    });
    ipcMain.handle("songs:update", (_event, payload) => {
      return updateSong(payload);
    });

    ipcMain.handle("songs:delete", (_event, songId) => {
      if (typeof songId !== "string" || !songId.trim()) {
        throw new Error("Invalid song ID.");
      }

      const database = getDatabase();

      // Read the original song and PDF before deleting anything.
      const song = database
        .prepare(
          `SELECT id, title, pdf_filename
       FROM songs
       WHERE id = ?`,
        )
        .get(songId);

      if (!song) {
        throw new Error("Song not found.");
      }

      database.exec("BEGIN IMMEDIATE");

      try {
        // Explicitly delete timings and bars for this song.
        database
          .prepare("DELETE FROM song_video_timings WHERE song_id = ?")
          .run(songId);

        database
          .prepare("DELETE FROM song_chord_timings WHERE song_id = ?")
          .run(songId);

        database
          .prepare("DELETE FROM song_pdf_timings WHERE song_id = ?")
          .run(songId);

        database.prepare("DELETE FROM song_bars WHERE song_id = ?").run(songId);

        const result = database
          .prepare("DELETE FROM songs WHERE id = ?")
          .run(songId);

        if (result.changes !== 1) {
          throw new Error("Song deletion was not confirmed.");
        }

        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }

      // Delete the physical PDF only AFTER SQLite deletion succeeds.
      // Never remove a PDF still referenced by another song.
      if (song.pdf_filename) {
        const stillUsed = database
          .prepare(
            `SELECT COUNT(*) AS count
         FROM songs
         WHERE pdf_filename = ?`,
          )
          .get(song.pdf_filename);

        if (
          stillUsed.count === 0 &&
          path.basename(song.pdf_filename) === song.pdf_filename
        ) {
          const pdfFolder = path.join(app.getPath("userData"), "data", "pdfs");

          const pdfPath = path.join(pdfFolder, song.pdf_filename);

          try {
            fs.rmSync(pdfPath, { force: true });
          } catch (error) {
            // The database deletion succeeded; don't report it as failed.
            console.error("Could not remove deleted song PDF:", error);
          }
        }
      }

      return { success: true, id: songId };
    });

    // -------------------------------------------------------
    // Load YouTube bar synchronization timings
    // -------------------------------------------------------
    ipcMain.handle("songs:sync:get", (_event, payload) => {
      const { songId, videoId } = payload ?? {};

      if (
        typeof songId !== "string" ||
        !songId.trim() ||
        typeof videoId !== "string" ||
        !/^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ) {
        throw new Error("Invalid synchronization request.");
      }

      const database = getDatabase();

      return database
        .prepare(
          `
      SELECT
        bar_id AS barId,
        seconds
      FROM song_video_timings
      WHERE song_id = ?
        AND video_id = ?
      ORDER BY seconds ASC
    `,
        )
        .all(songId, videoId);
    });

    // -------------------------------------------------------
    // Save YouTube bar synchronization timings
    // -------------------------------------------------------
    ipcMain.handle("songs:sync:save", (_event, payload) => {
      const { songId, videoId, timings } = payload ?? {};

      if (
        typeof songId !== "string" ||
        !songId.trim() ||
        typeof videoId !== "string" ||
        !/^[a-zA-Z0-9_-]{11}$/.test(videoId) ||
        !Array.isArray(timings)
      ) {
        throw new Error("Invalid synchronization data.");
      }

      const barIds = new Set();

      for (const timing of timings) {
        if (
          !timing ||
          typeof timing.barId !== "string" ||
          !timing.barId.trim() ||
          typeof timing.seconds !== "number" ||
          !Number.isFinite(timing.seconds) ||
          timing.seconds < 0 ||
          barIds.has(timing.barId)
        ) {
          throw new Error("Invalid or duplicate bar timing.");
        }

        barIds.add(timing.barId);
      }

      const database = getDatabase();

      const deleteStatement = database.prepare(`
     DELETE FROM song_video_timings
     WHERE song_id = ? AND video_id = ?
      `);

      const insertStatement = database.prepare(`
     INSERT INTO song_video_timings (
      song_id,
      video_id,
      bar_id,
      seconds
      )
     SELECT ?, ?, id, ?
     FROM song_bars
     WHERE id = ? AND song_id = ?
     `);

      database.exec("BEGIN TRANSACTION");

      try {
        deleteStatement.run(songId, videoId);

        for (const timing of timings) {
          const result = insertStatement.run(
            songId,
            videoId,
            timing.seconds,
            timing.barId,
            songId,
          );

          if (result.changes !== 1) {
            throw new Error(
              `Bar ${timing.barId} does not belong to this song.`,
            );
          }
        }

        database.exec("COMMIT");

        return {
          success: true,
          savedCount: timings.length,
        };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    });

    ipcMain.handle("songs:chord-sync:get", (_event, payload) => {
      const { songId, videoId } = payload ?? {};

      if (
        typeof songId !== "string" ||
        !songId.trim() ||
        typeof videoId !== "string" ||
        !/^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ) {
        throw new Error("Invalid chord synchronization request.");
      }

      const database = getDatabase();

      return database
        .prepare(
          `
    SELECT
      line_id AS barId,
      seconds
    FROM song_chord_timings
    WHERE song_id = ?
      AND video_id = ?
    ORDER BY seconds ASC
  `,
        )
        .all(songId, videoId);
    });

    ipcMain.handle("songs:chord-sync:save", (_event, payload) => {
      const { songId, videoId, timings } = payload ?? {};

      if (
        typeof songId !== "string" ||
        !songId.trim() ||
        typeof videoId !== "string" ||
        !/^[a-zA-Z0-9_-]{11}$/.test(videoId) ||
        !Array.isArray(timings)
      ) {
        throw new Error("Invalid chord synchronization data.");
      }

      const database = getDatabase();

      // Verify the song and its actual chord-line IDs.
      const song = database
        .prepare(
          `
    SELECT chord_lines
    FROM songs
    WHERE id = ? AND song_type = 'chords'
  `,
        )
        .get(songId);

      if (!song) {
        throw new Error("Chord song not found.");
      }

      const lines = JSON.parse(song.chord_lines || "[]");

      if (!Array.isArray(lines)) {
        throw new Error("Invalid chord-line data.");
      }

      const validIds = new Set(lines.map((line) => line.id));
      const usedIds = new Set();

      for (const timing of timings) {
        if (
          !timing ||
          typeof timing.barId !== "string" ||
          !validIds.has(timing.barId) ||
          usedIds.has(timing.barId) ||
          typeof timing.seconds !== "number" ||
          !Number.isFinite(timing.seconds) ||
          timing.seconds < 0
        ) {
          throw new Error("Invalid or duplicate chord timing.");
        }

        usedIds.add(timing.barId);
      }

      database.exec("BEGIN TRANSACTION");

      try {
        database
          .prepare(
            `
      DELETE FROM song_chord_timings
      WHERE song_id = ? AND video_id = ?
    `,
          )
          .run(songId, videoId);

        const insert = database.prepare(`
      INSERT INTO song_chord_timings (
        song_id,
        video_id,
        line_id,
        seconds
      )
      VALUES (?, ?, ?, ?)
    `);

        for (const timing of timings) {
          insert.run(songId, videoId, timing.barId, timing.seconds);
        }

        database.exec("COMMIT");

        return {
          success: true,
          savedCount: timings.length,
        };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    });

    ipcMain.handle("songs:pdf-sync:get", (_event, payload) => {
      const { songId, videoId } = payload ?? {};

      if (
        typeof songId !== "string" ||
        !songId.trim() ||
        typeof videoId !== "string" ||
        !/^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ) {
        throw new Error("Invalid PDF synchronization request.");
      }

      const database = getDatabase();

      return database
        .prepare(
          `
      SELECT
        id,
        page_number AS page,
        page_position AS position,
        seconds
      FROM song_pdf_timings
      WHERE song_id = ?
        AND video_id = ?
      ORDER BY seconds ASC, id ASC
    `,
        )
        .all(songId, videoId);
    });

    ipcMain.handle("songs:pdf-sync:save", (_event, payload) => {
      const { songId, videoId, timings } = payload ?? {};

      if (
        typeof songId !== "string" ||
        !songId.trim() ||
        typeof videoId !== "string" ||
        !/^[a-zA-Z0-9_-]{11}$/.test(videoId) ||
        !Array.isArray(timings)
      ) {
        throw new Error("Invalid PDF synchronization data.");
      }

      const database = getDatabase();

      // Only PDF-only songs may have PDF synchronization markers.
      const song = database
        .prepare(
          `
      SELECT id
      FROM songs
      WHERE id = ? AND song_type IN ('tab', 'melody')
    `,
        )
        .get(songId);

      if (!song) {
        throw new Error(
          "PDF-only song not found. PDF synchronization is available only for PDF and melody songs.",
        );
      }

      // Validate everything before modifying the database.
      for (const timing of timings) {
        if (
          !timing ||
          !Number.isInteger(timing.page) ||
          timing.page < 1 ||
          typeof timing.position !== "number" ||
          !Number.isFinite(timing.position) ||
          timing.position < 0 ||
          timing.position > 1 ||
          typeof timing.seconds !== "number" ||
          !Number.isFinite(timing.seconds) ||
          timing.seconds < 0
        ) {
          throw new Error("Invalid PDF synchronization marker.");
        }
      }

      database.exec("BEGIN TRANSACTION");

      try {
        // Replace markers for this song and YouTube video only.
        database
          .prepare(
            `
        DELETE FROM song_pdf_timings
        WHERE song_id = ? AND video_id = ?
      `,
          )
          .run(songId, videoId);

        const insert = database.prepare(`
      INSERT INTO song_pdf_timings (
        song_id,
        video_id,
        page_number,
        page_position,
        seconds
      )
      VALUES (?, ?, ?, ?, ?)
    `);

        for (const timing of timings) {
          insert.run(
            songId,
            videoId,
            timing.page,
            timing.position,
            timing.seconds,
          );
        }

        database.exec("COMMIT");

        return {
          success: true,
          savedCount: timings.length,
        };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    });

    const port = await startServer();
    createWindow(port);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(port);
      }
    });
  } catch (error) {
    console.error("Could not start local app server:", error);
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
  if (server) {
    server.close();
    server = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
