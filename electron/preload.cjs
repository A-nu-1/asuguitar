const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("guitarAPI", {
  getSongs: () => ipcRenderer.invoke("songs:list"),

  getSong: (songId) => ipcRenderer.invoke("songs:get", songId),

  saveSong: (payload) => ipcRenderer.invoke("songs:save", payload),

  getSongPdf: (songId) => ipcRenderer.invoke("songs:pdf", songId),

  updateSong: (payload) => ipcRenderer.invoke("songs:update", payload),

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
});
