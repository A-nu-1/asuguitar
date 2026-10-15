
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("guitarAPI", {
  getSongs: () => ipcRenderer.invoke("songs:list"),

  getSong: (songId) =>
    ipcRenderer.invoke("songs:get", songId),

  saveSong: (payload) =>
  ipcRenderer.invoke("songs:save", payload),

  getSongPdf: (songId) =>
  ipcRenderer.invoke("songs:pdf", songId),

  updateSong: (payload) =>
  ipcRenderer.invoke("songs:update", payload),
});
