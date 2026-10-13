
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

let server = null;

const PORT = 4173;

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
        const requestPath = new URL(
          req.url || "/",
          "http://localhost",
        ).pathname;

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
          filePath = path.join(filePath, "index.html");
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
    server.listen(PORT, "127.0.0.1", () => {
      resolve();
    });
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  window.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error("Could not start local app server:", error);
    app.quit();
  }
});

app.on("before-quit", () => {
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
