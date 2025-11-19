const { contextBridge } = require('electron');

// Безопасное API для взаимодействия с Electron (если понадобится в будущем)
contextBridge.exposeInMainWorld('electronAPI', {
  // Пример: можно добавить функции для работы с файлами
  // getAppVersion: () => require('electron').app.getVersion(),
});

