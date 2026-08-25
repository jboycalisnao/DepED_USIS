const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usisSerialPicker', {
  select(portId) {
    ipcRenderer.send('usis-kiosk-shell:serial-picker-select', portId);
  },
  cancel() {
    ipcRenderer.send('usis-kiosk-shell:serial-picker-cancel');
  },
});
