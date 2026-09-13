const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listMockupFiles: () => ipcRenderer.invoke('list-mockup-files'),
  openMockupsFolder: () => ipcRenderer.invoke('open-mockups-folder'),
  onMockupsChanged: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('mockups-changed', listener);
    return () => {
      ipcRenderer.removeListener('mockups-changed', listener);
    };
  },
  saveUserSettings: (data) => ipcRenderer.invoke('save-user-settings', data),
  loadUserSettings: () => ipcRenderer.invoke('load-user-settings')
});
