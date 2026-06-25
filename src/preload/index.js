import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('catAlarm', {
  showCat: (options) => ipcRenderer.invoke('cat:show', options),
  hideCat: () => ipcRenderer.invoke('cat:hide'),
  dismissCat: () => ipcRenderer.invoke('cat:dismiss'),
  restartTimer: () => ipcRenderer.invoke('cat:restart'),
  closeApp: () => ipcRenderer.invoke('app:close'),
  onCatPlay: (callback) => ipcRenderer.on('cat:play', callback),
  onCatMoved: (callback) => ipcRenderer.on('cat:moved', (_event, bounds) => callback(bounds)),
  onCatDismissed: (callback) => ipcRenderer.on('cat:dismissed', callback),
  onCatRestart: (callback) => ipcRenderer.on('cat:restart', callback),
  onCatError: (callback) => ipcRenderer.on('cat:error', (_event, message) => callback(message))
});
