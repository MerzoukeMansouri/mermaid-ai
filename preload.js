/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getMermaidFiles: (dirPath) => ipcRenderer.invoke('get-mermaid-files', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  watchFile: (filePath) => ipcRenderer.invoke('watch-file', filePath),
  onFileChanged: (callback) => {
    ipcRenderer.on('file-changed', (event, content) => callback(content));
  },

  // AI Ollama Integration
  aiEditMermaid: (filePath, instruction) =>
    ipcRenderer.invoke('ai-edit-mermaid', filePath, instruction),
  applyAiChanges: (filePath, newContent) =>
    ipcRenderer.invoke('apply-ai-changes', filePath, newContent),
  rollbackFile: (filePath, versionIndex) =>
    ipcRenderer.invoke('rollback-file', filePath, versionIndex),
  getFileHistory: (filePath) =>
    ipcRenderer.invoke('get-file-history', filePath),
  checkOllamaStatus: () =>
    ipcRenderer.invoke('check-ollama-status')
});
