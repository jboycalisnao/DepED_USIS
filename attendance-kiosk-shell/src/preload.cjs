const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usisKioskShell', {
  onExitAuthRequest(callback) {
    const listener = () => callback();
    ipcRenderer.on('usis-kiosk-shell:request-exit-auth', listener);
    ipcRenderer.send('usis-kiosk-shell:exit-auth-listener-ready');
    return () => ipcRenderer.removeListener('usis-kiosk-shell:request-exit-auth', listener);
  },
  approveExit() {
    ipcRenderer.send('usis-kiosk-shell:exit-approved');
  },
  denyExit() {
    ipcRenderer.send('usis-kiosk-shell:exit-denied');
  },
});
