const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("guitarAPI", {
  getSongs: () => ipcRenderer.invoke("songs:list"),

  getSong: (songId) => ipcRenderer.invoke("songs:get", songId),

  saveSong: (payload) => ipcRenderer.invoke("songs:save", payload),

  getSongPdf: (songId) => ipcRenderer.invoke("songs:pdf", songId),

  updateSong: (payload) => ipcRenderer.invoke("songs:update", payload),

  deleteSong: (songId) => ipcRenderer.invoke("songs:delete", songId),

  // Load saved YouTube synchronization mappings.
  getSongSync: (songId, videoId) =>
    ipcRenderer.invoke("songs:sync:get", {
      songId,
      videoId,
    }),

  // Save YouTube synchronization mappings.
  saveSongSync: (songId, videoId, timings) =>
    ipcRenderer.invoke("songs:sync:save", {
      songId,
      videoId,
      timings,
    }),

  // CHORD YOUTUBE SYNCHRONIZATION
  getChordSync: (songId, videoId) =>
    ipcRenderer.invoke("songs:chord-sync:get", {
      songId,
      videoId,
    }),

  saveChordSync: (songId, videoId, timings) =>
    ipcRenderer.invoke("songs:chord-sync:save", {
      songId,
      videoId,
      timings,
    }),

  // PDF–YOUTUBE SYNCHRONIZATION
  getPdfSync: (songId, videoId) =>
    ipcRenderer.invoke("songs:pdf-sync:get", {
      songId,
      videoId,
    }),

  savePdfSync: (songId, videoId, timings) =>
    ipcRenderer.invoke("songs:pdf-sync:save", {
      songId,
      videoId,
      timings,
    }),
});
