const { app, BrowserWindow } = require('electron');
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

