const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.ico');
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true
    },
    backgroundColor: '#0a0a0a',
    show: false,
    titleBarStyle: 'default',
  };

  // Добавляем иконку только если файл существует
  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }

  const win = new BrowserWindow(windowOptions);

  // Показываем окно только после загрузки
  win.once('ready-to-show', () => {
    win.show();
  });

  // Загружаем приложение
  if (process.env.NODE_ENV === 'development') {
    // В режиме разработки подключаемся к Vite dev server
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // В продакшене загружаем собранные файлы
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Обработка ошибок загрузки
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    if (process.env.NODE_ENV === 'development') {
      console.log('Make sure Vite dev server is running on http://localhost:5173');
    }
  });
}

// Этот метод будет вызван когда Electron закончит инициализацию
app.whenReady().then(() => {
  createWindow();

  // IPC Handlers
  console.log('Registering IPC handlers...');
  ipcMain.handle('select-directory', async () => {
    console.log('Opening directory dialog...');
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result.canceled) {
      console.log('Dialog canceled');
      return null;
    }
    console.log('Directory selected:', result.filePaths[0]);
    return result.filePaths[0];
  });

  ipcMain.handle('save-character', async (event, { filePath, data }) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('load-characters', async (event, directoryPath) => {
    try {
      if (!fs.existsSync(directoryPath)) return [];
      const files = fs.readdirSync(directoryPath);
      const characters = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(directoryPath, file), 'utf8');
          try {
            const char = JSON.parse(content);
            if (char.id && char.name) {
              characters.push(char);
            }
          } catch (e) {}
        }
      }
      return characters;
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('delete-character', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  app.on('activate', () => {
    // На macOS обычно пересоздают окно в приложении когда кликают на иконку в доке
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выходим когда все окна закрыты, кроме macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

