const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.ravenlabs.embroideryvisualizer');
}

let mainWindow;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const mockupsDir = app.isPackaged
  ? path.join(process.resourcesPath, 'public/mockups')
  : path.join(__dirname, '../public/mockups');

// Ensure mockups directory exists
try {
  if (!fs.existsSync(mockupsDir)) {
    fs.mkdirSync(mockupsDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create mockups directory:', e);
}

function scanMockupsDir() {
  try {
    if (!fs.existsSync(mockupsDir)) return [];
    const files = fs.readdirSync(mockupsDir);
    const valid = files.filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f));
    return valid.map(filename => {
      const filePath = path.join(mockupsDir, filename);
      let mtime = Date.now();
      let size = 0;
      try {
        const stat = fs.statSync(filePath);
        mtime = stat.mtimeMs;
        size = stat.size;
      } catch {
        // Ignore stat errors
      }
      return {
        filename,
        url: isDev
          ? `/mockups/${filename}?v=${Math.round(mtime)}`
          : `${pathToFileURL(filePath).href}?v=${Math.round(mtime)}`,
        mtime,
        size
      };
    });
  } catch (e) {
    return [];
  }
}

// IPC Handlers
ipcMain.handle('list-mockup-files', () => {
  return scanMockupsDir();
});

ipcMain.handle('open-mockups-folder', async () => {
  try {
    if (!fs.existsSync(mockupsDir)) {
      fs.mkdirSync(mockupsDir, { recursive: true });
    }
    await shell.openPath(mockupsDir);
    return true;
  } catch (e) {
    console.error('Failed to open mockups folder:', e);
    return false;
  }
});

const userSettingsFile = path.join(app.getPath('userData'), 'user_settings.json');

ipcMain.handle('save-user-settings', async (_event, data) => {
  try {
    if (data === null) {
      if (fs.existsSync(userSettingsFile)) {
        fs.unlinkSync(userSettingsFile);
      }
      return true;
    }
    fs.writeFileSync(userSettingsFile, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save user settings file:', e);
    return false;
  }
});

ipcMain.handle('load-user-settings', async () => {
  try {
    if (fs.existsSync(userSettingsFile)) {
      const content = fs.readFileSync(userSettingsFile, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  } catch (e) {
    console.error('Failed to load user settings file:', e);
    return null;
  }
});

let watcherDebounce = null;
function setupFolderWatcher() {
  try {
    if (fs.existsSync(mockupsDir)) {
      fs.watch(mockupsDir, (eventType, filename) => {
        if (watcherDebounce) clearTimeout(watcherDebounce);
        watcherDebounce = setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            const files = scanMockupsDir();
            mainWindow.webContents.send('mockups-changed', files);
          }
        }, 250);
      });
    }
  } catch (e) {
    console.warn('Could not attach fs.watch to mockups folder:', e);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/EV-logo.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0a0a0a',
    title: 'Embroidery Visualizer & Mockup Studio — Raven Labs',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    autoHideMenuBar: true
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupFolderWatcher();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
