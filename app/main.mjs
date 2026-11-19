// OldschoolXP Mod-Dashboard: ein eigenes Fenster für oldschoolxp.de/mod.
// Bewusst nur eine Hülle um die Website: jede Verbesserung dort ist sofort
// auch hier, und im Programm liegen keine Zugangsdaten oder Schlüssel.

import { app, BrowserWindow, Menu, shell, session, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initUpdater, checkForUpdatesManually, selftestUpdate } from './updater.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const START_URL = process.env.OXP_MOD_URL || 'https://www.oldschoolxp.de/mod';
const PARTITION = 'persist:oxp-mod';

// Innerhalb des Fensters erlaubt: die Website, der Website-Login und die Twitch-Anmeldung.
// Alles andere (Clips, Kanäle, Discord …) öffnet im normalen Browser.
const INTERN = [/^(www\.)?oldschoolxp\.de$/, /(^|\.)twitch\.tv$/, /\.supabase\.co$/];

app.setName('OXP Mod-Dashboard');
app.setAppUserModelId('de.oldschoolxp.moddashboard');
if (process.env.OXP_USER_DATA) app.setPath('userData', process.env.OXP_USER_DATA);

// Twitch lehnt die Anmeldung in „unbekannten“ Browsern teils ab; deshalb ohne
// Electron-Kennung, dafür mit eigener, an der die Website das Programm erkennt.
app.userAgentFallback = `${app.userAgentFallback.replace(/ Electron\/\S+/, '').replace(/ (OXP\S*|oxp-mod-dashboard)\/\S+/gi, '')} OXPModDashboard/${app.getVersion()}`;

if (!app.requestSingleInstanceLock()) app.quit();

const STATE_FILE = () => path.join(app.getPath('userData'), 'fenster.json');
let win;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8'));
  } catch {
    return {};
  }
}

function saveState() {
  if (!win || win.isDestroyed()) return;
  const state = { ...loadState(), maximized: win.isMaximized(), alwaysOnTop: win.isAlwaysOnTop(), zoom: win.webContents.getZoomFactor() };
  if (!win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) state.bounds = win.getBounds();
  try {
    fs.mkdirSync(path.dirname(STATE_FILE()), { recursive: true });
    fs.writeFileSync(STATE_FILE(), JSON.stringify(state));
  } catch {
    // Fensterposition ist Komfort, kein Fehlergrund
  }
}

/** Gespeicherte Position nur nutzen, wenn sie noch auf einem vorhandenen Bildschirm liegt. */
function visibleBounds(bounds) {
  if (!bounds) return null;
  const onScreen = screen.getAllDisplays().some(({ workArea: a }) => bounds.x < a.x + a.width - 80 && bounds.x + bounds.width > a.x + 80 && bounds.y >= a.y - 10 && bounds.y < a.y + a.height - 80);
  return onScreen ? bounds : null;
}

export function isInternal(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:') return true;
    return u.protocol === 'https:' && INTERN.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

function openExternal(url) {
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
}

function toggleAlwaysOnTop(item) {
  win.setAlwaysOnTop(item ? item.checked : !win.isAlwaysOnTop());
  buildMenu();
  saveState();
}

function buildMenu() {
  const onTop = win?.isAlwaysOnTop() ?? false;
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Ansicht',
        submenu: [
          { label: 'Neu laden', accelerator: 'F5', click: () => win.webContents.reload() },
          { label: 'Neu laden', accelerator: 'CmdOrCtrl+R', visible: false, click: () => win.webContents.reload() },
          { label: 'Zum Dashboard', accelerator: 'CmdOrCtrl+H', click: () => win.loadURL(START_URL) },
          { type: 'separator' },
          { label: 'Immer im Vordergrund', type: 'checkbox', checked: onTop, accelerator: 'CmdOrCtrl+Shift+T', click: toggleAlwaysOnTop },
          { type: 'separator' },
          { label: 'Größer', accelerator: 'CmdOrCtrl+Plus', click: () => zoom(0.1) },
          { label: 'Größer', accelerator: 'CmdOrCtrl+=', visible: false, click: () => zoom(0.1) },
          { label: 'Kleiner', accelerator: 'CmdOrCtrl+-', click: () => zoom(-0.1) },
          { label: 'Normale Größe', accelerator: 'CmdOrCtrl+0', click: () => zoom(0) },
          { type: 'separator' },
          { label: 'Vollbild', role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Hilfe',
        submenu: [
          { label: 'Im Browser öffnen', click: () => openExternal(win.webContents.getURL().startsWith('http') ? win.webContents.getURL() : START_URL) },
          { label: 'Nach Updates suchen', click: () => checkForUpdatesManually() },
          { label: `Version ${app.getVersion()}`, enabled: false },
        ],
      },
    ]),
  );
}

function zoom(step) {
  const next = step === 0 ? 1 : Math.min(2, Math.max(0.6, win.webContents.getZoomFactor() + step));
  win.webContents.setZoomFactor(Math.round(next * 10) / 10);
  saveState();
}

function showOffline(errorDescription) {
  win.loadFile(path.join(HERE, 'offline.html'), { query: { ziel: START_URL, fehler: errorDescription || '' } });
}

function createWindow() {
  const state = loadState();
  const bounds = visibleBounds(state.bounds);
  win = new BrowserWindow({
    width: bounds?.width ?? 1440,
    height: bounds?.height ?? 900,
    ...(bounds ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 420,
    minHeight: 480,
    title: 'OXP Mod-Dashboard',
    backgroundColor: '#14121c',
    icon: path.join(HERE, 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    alwaysOnTop: !!state.alwaysOnTop,
    show: false,
    webPreferences: { partition: PARTITION, contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  if (state.maximized) win.maximize();
  buildMenu();

  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => {
    if (state.zoom) win.webContents.setZoomFactor(state.zoom);
  });

  // Fremde Seiten nie im Programmfenster laden, sondern im Standardbrowser.
  const guard = (event, url) => {
    if (!isInternal(url)) {
      event.preventDefault();
      openExternal(url);
    }
  };
  win.webContents.on('will-navigate', guard);
  win.webContents.on('will-redirect', guard);
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('did-fail-load', (_e, code, description, url, isMainFrame) => {
    // -3 = abgebrochen (z. B. durch die Weiterleitungs-Sperre oben), kein echter Fehler
    if (isMainFrame && code !== -3 && !url.startsWith('file:')) showOffline(description);
  });

  for (const event of ['resize', 'move', 'maximize', 'unmaximize']) win.on(event, () => saveStateSoon());
  win.on('close', saveState);
  win.on('page-title-updated', (event) => {
    event.preventDefault();
    win.setTitle('OXP Mod-Dashboard');
  });

  win.loadURL(START_URL);
  return win;
}

let saveTimer;
function saveStateSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 500);
}

function configureSession() {
  const ses = session.fromPartition(PARTITION);
  // Nur Hinweise (Windows-Benachrichtigungen), Zwischenablage und Vollbild – keine Kamera, kein Mikrofon, kein Standort.
  const allowed = new Set(['notifications', 'clipboard-sanitized-write', 'fullscreen']);
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
});

app.whenReady().then(async () => {
  configureSession();
  const selftest = process.env.OXP_SELFTEST ? (await import('./selbsttest-intern.mjs')).runSelftest : null;
  // Nur für den Update-Test: prüft und lädt die neueste Version, installiert nichts und beendet sich.
  if (process.env.OXP_TEST_UPDATE) {
    const result = await selftestUpdate().catch((e) => ({ error: String(e?.message || e) }));
    fs.writeFileSync(process.env.OXP_TEST_UPDATE, JSON.stringify(result, null, 2));
    app.quit();
    return;
  }
  createWindow();
  selftest?.(win, { isInternal, startUrl: START_URL });
  // Nur in der installierten Version (nicht beim Entwickeln oder im Selbsttest) nach Updates suchen.
  if (app.isPackaged && !process.env.OXP_SELFTEST) {
    initUpdater(win, { onStatusChange: (text) => win && !win.isDestroyed() && win.setTitle(text ? `OXP Mod-Dashboard – ${text}` : 'OXP Mod-Dashboard') });
  }
});

app.on('window-all-closed', () => app.quit());
