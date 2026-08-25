const electron = require('electron');
const app = electron.app || electron.default?.app;
const BrowserWindow = electron.BrowserWindow || electron.default?.BrowserWindow;
const ipcMain = electron.ipcMain || electron.default?.ipcMain;
const session = electron.session || electron.default?.session;
const dialog = electron.dialog || electron.default?.dialog;
const path = require('node:path');

if (!app || !BrowserWindow || !ipcMain || !session || !dialog) {
  throw new Error('Electron main-process APIs are unavailable.');
}

const DEFAULT_KIOSK_URL = 'https://attendance.leonnhs.edu.ph/attendance/kiosk';
const KIOSK_URL = process.env.ATTENDANCE_KIOSK_URL || DEFAULT_KIOSK_URL;
const START_FULLSCREEN = process.env.ATTENDANCE_KIOSK_FULLSCREEN !== 'false';
const START_KIOSK = process.env.ATTENDANCE_KIOSK_LOCKED === 'true';
const APP_ICON = path.join(__dirname, '..', 'build', 'icon.png');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://vubmvthbsnzzhmjbdces.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Ym12dGhic256emhtamJkY2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTIwMTMsImV4cCI6MjA4MDY4ODAxM30.woE4szCZ6PAbTU54Rf5b9oqr5QPS9aaBh_qRmLJ3B8k';

app.commandLine.appendSwitch('disable-serial-blocklist');

let mainWindow = null;
let exitApproved = false;
let exitPromptActive = false;
let rendererExitAuthReady = false;
let rendererExitAuthFallbackTimer = null;
let closeAuthWindow = null;
let serialPickerWindow = null;
let serialPickerCallback = null;

function describeSerialPort(port) {
  const parts = [
    port.displayName || port.name || 'Serial Device',
    port.vendorId ? `VID ${port.vendorId}` : '',
    port.productId ? `PID ${port.productId}` : '',
  ].filter(Boolean);

  return parts.join(' - ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesPassword(record, password) {
  const normalized = String(password || '').trim();
  return normalized === record?.password_plain || normalized === record?.password_hash;
}

async function supabaseGet(pathname, params) {
  const url = new URL(`/rest/v1/${pathname}`, SUPABASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  return response.json();
}

async function validateAttendanceCredentials(username, password) {
  const normalizedUsername = normalizeIdentity(username);
  const normalizedPassword = String(password || '').trim();

  if (!normalizedUsername || normalizedPassword.length < 6) {
    return {
      ok: false,
      message: 'Provide a valid username and password with at least 6 characters.',
    };
  }

  const coordinators = await supabaseGet('usis_core_coordinators', {
    select: '*,usis_schools!inner(id,school_code,school_name)',
    username: `eq.${normalizedUsername}`,
    is_active: 'eq.true',
    role: 'in.(attendance_coordinator,school_usis_coordinator,system_admin)',
    limit: '1',
  });

  const record = Array.isArray(coordinators) ? coordinators[0] : null;
  if (!record || !matchesPassword(record, normalizedPassword)) {
    return {
      ok: false,
      message: 'No active attendance account matches the supplied username and password.',
    };
  }

  const moduleRows = await supabaseGet('coordinator_module_access', {
    select: 'modules',
    account_id: `eq.${record.id}`,
    limit: '1',
  });
  const modules = Array.isArray(moduleRows?.[0]?.modules) ? moduleRows[0].modules : [];

  if (!modules.includes('attendance')) {
    return {
      ok: false,
      message: 'Access denied. This account is not granted Attendance module access.',
    };
  }

  return { ok: true };
}

function buildCloseAuthHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize Window Close</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      background: #f6f8fc;
      color: #172033;
    }
    main {
      padding: 22px;
    }
    .eyebrow {
      margin: 0 0 6px;
      color: #0057b8;
      font-size: 12px;
      font-weight: 700;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 20px;
      line-height: 1.2;
    }
    label {
      display: block;
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 600;
      color: #3b4658;
    }
    input {
      width: 100%;
      margin-top: 6px;
      padding: 11px 12px;
      border: 1px solid #cfd7e6;
      border-radius: 8px;
      font: inherit;
      outline: none;
      background: #fff;
    }
    input:focus {
      border-color: #0057b8;
      box-shadow: 0 0 0 3px rgba(0, 87, 184, 0.12);
    }
    .error {
      min-height: 18px;
      margin: 4px 0 14px;
      color: #b42318;
      font-size: 12px;
      font-weight: 600;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    button {
      min-width: 128px;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #cfd7e6;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      background: #fff;
    }
    button.primary {
      border-color: #0057b8;
      background: #0057b8;
      color: #fff;
    }
    button:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Kiosk Shell</p>
    <h1>Authorize Window Close</h1>
    <form id="form">
      <label>
        Username
        <input id="username" type="text" autocomplete="username" autofocus />
      </label>
      <label>
        Password
        <input id="password" type="password" autocomplete="current-password" />
      </label>
      <div id="error" class="error" role="alert"></div>
      <div class="actions">
        <button id="cancel" type="button">Keep Kiosk Open</button>
        <button id="submit" class="primary" type="submit">Close Window</button>
      </div>
    </form>
  </main>
  <script>
    const form = document.getElementById('form');
    const error = document.getElementById('error');
    const submit = document.getElementById('submit');
    document.getElementById('cancel').addEventListener('click', () => window.usisCloseAuth.cancel());
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      submit.disabled = true;
      submit.textContent = 'Checking...';
      const result = await window.usisCloseAuth.submit({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      });
      if (!result.ok) {
        error.textContent = result.message || 'Invalid attendance credentials.';
        submit.disabled = false;
        submit.textContent = 'Close Window';
      }
    });
  </script>
</body>
</html>`;
}

function buildSerialPickerHtml(portList) {
  const items = portList.length
    ? portList.map((port) => `
      <button class="port" type="button" data-port-id="${escapeHtml(port.portId)}">
        <span>${escapeHtml(describeSerialPort(port))}</span>
        <small>${escapeHtml(port.portId || 'serial-port')}</small>
      </button>
    `).join('')
    : '<p class="empty">No serial devices were found. Check the USB cable, then turn the monitor ON again.</p>';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Select Serial Device</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      background: #f6f8fc;
      color: #172033;
    }
    main { padding: 20px; }
    .eyebrow {
      margin: 0 0 6px;
      color: #0057b8;
      font-size: 12px;
      font-weight: 700;
    }
    h1 {
      margin: 0;
      font-size: 20px;
    }
    p {
      margin: 8px 0 16px;
      color: #5b6678;
      font-size: 13px;
    }
    .list {
      display: grid;
      gap: 8px;
      max-height: 230px;
      overflow: auto;
      margin-bottom: 16px;
    }
    .port {
      width: 100%;
      padding: 12px;
      border: 1px solid #cfd7e6;
      border-radius: 8px;
      background: #fff;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .port:hover, .port:focus {
      border-color: #0057b8;
      box-shadow: 0 0 0 3px rgba(0, 87, 184, 0.12);
      outline: none;
    }
    .port span {
      display: block;
      font-size: 14px;
      font-weight: 700;
    }
    .port small {
      display: block;
      margin-top: 3px;
      color: #667085;
      font-size: 12px;
    }
    .empty {
      padding: 16px;
      border: 1px dashed #cfd7e6;
      border-radius: 8px;
      background: #fff;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    .cancel {
      min-width: 110px;
      padding: 10px 14px;
      border: 1px solid #cfd7e6;
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Kiosk Shell</p>
    <h1>Select Serial Device</h1>
    <p>Choose the USB serial reader assigned to the monitor you turned on.</p>
    <div class="list">${items}</div>
    <div class="actions"><button class="cancel" type="button">Cancel</button></div>
  </main>
  <script>
    document.querySelectorAll('.port').forEach((button) => {
      button.addEventListener('click', () => window.usisSerialPicker.select(button.dataset.portId));
    });
    document.querySelector('.cancel').addEventListener('click', () => window.usisSerialPicker.cancel());
  </script>
</body>
</html>`;
}

function clearExitAuthFallbackTimer() {
  if (!rendererExitAuthFallbackTimer) return;
  clearTimeout(rendererExitAuthFallbackTimer);
  rendererExitAuthFallbackTimer = null;
}

async function showCloseFallbackDialog() {
  if (!mainWindow || exitApproved) return;
  if (closeAuthWindow && !closeAuthWindow.isDestroyed()) {
    closeAuthWindow.focus();
    return;
  }

  closeAuthWindow = new BrowserWindow({
    width: 440,
    height: 370,
    parent: mainWindow,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Authorize Window Close',
    icon: APP_ICON,
    autoHideMenuBar: true,
    backgroundColor: '#f6f8fc',
    webPreferences: {
      preload: path.join(__dirname, 'close-auth-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  closeAuthWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildCloseAuthHtml())}`);
  closeAuthWindow.on('closed', () => {
    closeAuthWindow = null;
    if (!exitApproved) {
      exitPromptActive = false;
    }
  });
}

function showSerialPicker(portList, ownerWindow, callback) {
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.close();
  }
  if (serialPickerCallback) {
    serialPickerCallback('');
  }

  serialPickerCallback = callback;
  serialPickerWindow = new BrowserWindow({
    width: 520,
    height: 420,
    parent: ownerWindow || mainWindow,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Select Serial Device',
    icon: APP_ICON,
    autoHideMenuBar: true,
    backgroundColor: '#f6f8fc',
    webPreferences: {
      preload: path.join(__dirname, 'serial-picker-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  serialPickerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildSerialPickerHtml(portList))}`);
  serialPickerWindow.on('closed', () => {
    serialPickerWindow = null;
    if (serialPickerCallback) {
      const cancel = serialPickerCallback;
      serialPickerCallback = null;
      cancel('');
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    fullscreen: START_FULLSCREEN,
    kiosk: START_KIOSK,
    icon: APP_ICON,
    autoHideMenuBar: true,
    backgroundColor: '#f6f8fc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(KIOSK_URL);

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  mainWindow.on('close', async (event) => {
    if (exitApproved) return;

    event.preventDefault();
    if (exitPromptActive) return;

    exitPromptActive = true;
    mainWindow.webContents.send('usis-kiosk-shell:request-exit-auth');

    if (!rendererExitAuthReady) {
      await showCloseFallbackDialog();
      return;
    }

    clearExitAuthFallbackTimer();
    rendererExitAuthFallbackTimer = setTimeout(() => {
      void showCloseFallbackDialog();
    }, 1500);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', () => {
    rendererExitAuthReady = false;
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'serial') return true;
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'serial') {
      callback(true);
      return;
    }
    callback(false);
  });

  session.defaultSession.on('select-serial-port', async (event, portList, webContents, callback) => {
    event.preventDefault();

    const ownerWindow = BrowserWindow.fromWebContents(webContents) || mainWindow;
    showSerialPicker(portList, ownerWindow, callback);
  });

  session.defaultSession.setDevicePermissionHandler((details) => {
    return details.deviceType === 'serial';
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

ipcMain.on('usis-kiosk-shell:exit-approved', () => {
  if (!mainWindow) return;
  exitApproved = true;
  exitPromptActive = false;
  clearExitAuthFallbackTimer();
  mainWindow.close();
});

ipcMain.on('usis-kiosk-shell:exit-denied', () => {
  exitPromptActive = false;
  clearExitAuthFallbackTimer();
});

ipcMain.on('usis-kiosk-shell:exit-auth-listener-ready', () => {
  rendererExitAuthReady = true;
});

ipcMain.handle('usis-kiosk-shell:native-exit-auth-submit', async (_event, credentials) => {
  try {
    const result = await validateAttendanceCredentials(credentials?.username, credentials?.password);
    if (!result.ok) return result;

    exitApproved = true;
    exitPromptActive = false;
    clearExitAuthFallbackTimer();
    if (closeAuthWindow && !closeAuthWindow.isDestroyed()) {
      closeAuthWindow.close();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'Unable to verify attendance credentials.',
    };
  }
});

ipcMain.on('usis-kiosk-shell:native-exit-auth-cancel', () => {
  exitPromptActive = false;
  clearExitAuthFallbackTimer();
  if (closeAuthWindow && !closeAuthWindow.isDestroyed()) {
    closeAuthWindow.close();
  }
});

ipcMain.on('usis-kiosk-shell:serial-picker-select', (_event, portId) => {
  if (serialPickerCallback) {
    const callback = serialPickerCallback;
    serialPickerCallback = null;
    callback(portId || '');
  }
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.close();
  }
});

ipcMain.on('usis-kiosk-shell:serial-picker-cancel', () => {
  if (serialPickerCallback) {
    const callback = serialPickerCallback;
    serialPickerCallback = null;
    callback('');
  }
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
