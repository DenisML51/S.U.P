const { contextBridge, ipcRenderer } = require('electron');

// Безопасное API для взаимодействия с Electron
contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveCharacter: (filePath, data) => ipcRenderer.invoke('save-character', { filePath, data }),
  loadCharacters: (directoryPath) => ipcRenderer.invoke('load-characters', directoryPath),
  deleteCharacter: (filePath) => ipcRenderer.invoke('delete-character', filePath),
});

