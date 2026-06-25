import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CAT_DESIGN_WIDTH = 560;
const CAT_DESIGN_HEIGHT = 560;
const CAT_ART_WIDTH = 360;
const DEFAULT_CAT_AREA_RATIO = 50;

let mainWindow;
let catWindow;

function preloadPath() {
  return join(__dirname, '../preload/index.cjs');
}

function rendererUrl(page = 'index.html') {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/${page === 'index.html' ? '' : page}`;
  }

  return join(__dirname, `../renderer/${page}`);
}

function loadRenderer(window, page = 'index.html') {
  if (process.env.ELECTRON_RENDERER_URL) {
    return window.loadURL(rendererUrl(page));
  }

  return window.loadFile(rendererUrl(page));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 520,
    minWidth: 320,
    minHeight: 520,
    resizable: false,
    frame: false,
    title: 'CatAlarm',
    backgroundColor: '#090911',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.on('closed', () => {
    hideCat();
    mainWindow = undefined;
  });

  loadRenderer(mainWindow);
}

function getDisplayArea() {
  const targetDisplay = mainWindow
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();

  return targetDisplay.workArea;
}

function getCatScale(workArea, sizePercent = 100) {
  const targetWidth = Math.sqrt((workArea.width * workArea.height) / DEFAULT_CAT_AREA_RATIO);
  const scale = (targetWidth / CAT_ART_WIDTH) * (Number(sizePercent) / 100 || 1);
  return Math.max(0.42, Math.min(1.35, scale));
}

function getCatBounds(options = {}) {
  const workArea = getDisplayArea();
  const scale = getCatScale(workArea, options.sizePercent);
  const width = Math.round(CAT_DESIGN_WIDTH * scale);
  const height = Math.round(CAT_DESIGN_HEIGHT * scale);
  const gap = Math.max(18, Math.round(28 * scale));
  const centerX = Math.round(workArea.x + (workArea.width - width) / 2);
  const centerY = Math.round(workArea.y + (workArea.height - height) / 2);

  const positions = {
    center: { x: centerX, y: centerY },
    top: { x: centerX, y: workArea.y + gap },
    bottom: { x: centerX, y: workArea.y + workArea.height - height - gap },
    left: { x: workArea.x + gap, y: centerY },
    right: { x: workArea.x + workArea.width - width - gap, y: centerY },
    'top-left': { x: workArea.x + gap, y: workArea.y + gap },
    'top-right': { x: workArea.x + workArea.width - width - gap, y: workArea.y + gap },
    'bottom-left': { x: workArea.x + gap, y: workArea.y + workArea.height - height - gap },
    'bottom-right': {
      x: workArea.x + workArea.width - width - gap,
      y: workArea.y + workArea.height - height - gap
    }
  };

  if (options.position === 'random') {
    return {
      x: Math.round(workArea.x + gap + Math.random() * Math.max(0, workArea.width - width - gap * 2)),
      y: Math.round(workArea.y + gap + Math.random() * Math.max(0, workArea.height - height - gap * 2)),
      width,
      height,
      scale
    };
  }

  return {
    ...(positions[options.position] ?? positions['bottom-right']),
    width,
    height,
    scale
  };
}

async function showCat(options = {}) {
  hideCat();

  const { scale: _scale, ...bounds } = getCatBounds(options);

  catWindow = new BrowserWindow({
    ...bounds,
    title: 'CatAlarm Cat',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  catWindow.setAlwaysOnTop(true, 'screen-saver');
  catWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  catWindow.once('closed', () => {
    catWindow = undefined;
  });

  const reveal = () => {
    if (!catWindow || catWindow.isDestroyed()) return;
    catWindow.showInactive();
    catWindow.moveTop();
    catWindow.webContents.send('cat:play');
  };

  catWindow.once('ready-to-show', reveal);
  catWindow.webContents.once('did-finish-load', reveal);
  catWindow.webContents.once('did-fail-load', (_event, code, description) => {
    mainWindow?.webContents.send('cat:error', `${code}: ${description}`);
  });

  await loadRenderer(catWindow, 'cat.html');
  setTimeout(reveal, 500);

  return true;
}

function hideCat() {
  if (catWindow && !catWindow.isDestroyed()) {
    catWindow.close();
  }

  catWindow = undefined;
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  hideCat();
});

ipcMain.handle('cat:show', (_event, options) => showCat(options));
ipcMain.handle('cat:hide', () => {
  hideCat();
  return true;
});
ipcMain.handle('cat:dismiss', () => {
  hideCat();
  mainWindow?.webContents.send('cat:dismissed');
  return true;
});
ipcMain.handle('cat:restart', () => {
  hideCat();
  mainWindow?.webContents.send('cat:restart');
  return true;
});

ipcMain.handle('app:close', () => {
  hideCat();
  app.quit();
  return true;
});
