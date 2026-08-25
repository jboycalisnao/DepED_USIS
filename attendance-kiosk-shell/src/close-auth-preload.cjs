const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usisCloseAuth', {
  submit(credentials) {
    return ipcRenderer.invoke('usis-kiosk-shell:native-exit-auth-submit', credentials);
  },
  cancel() {
    ipcRenderer.send('usis-kiosk-shell:native-exit-auth-cancel');
  },
});
