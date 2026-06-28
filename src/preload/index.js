import { contextBridge, ipcRenderer } from 'electron';

function subscribe(channel, callback) {
  const listener = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('catAlarm', {
  showCat: (options) => ipcRenderer.invoke('cat:show', options),
  hideCat: () => ipcRenderer.invoke('cat:hide'),
  dismissCat: () => ipcRenderer.invoke('cat:dismiss'),
  restartTimer: () => ipcRenderer.invoke('cat:restart'),
  setCatInteractive: (interactive) => ipcRenderer.invoke('cat:set-interactive', interactive),
  closeApp: () => ipcRenderer.invoke('app:close'),
  onCatPlay: (callback) => subscribe('cat:play', callback),
  onCatMoved: (callback) => subscribe('cat:moved', callback),
  onCatDismissed: (callback) => subscribe('cat:dismissed', callback),
  onCatRestart: (callback) => subscribe('cat:restart', callback),
  onCatError: (callback) => subscribe('cat:error', callback)
});
