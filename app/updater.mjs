// Selbst-Update über GitHub-Releases (öffentliches Repo oldschoolxp/OXP-Mod-Dashboard).
// Die Dashboard-Funktionen kommen von der Website und brauchen kein Update –
// das hier betrifft nur das Programm selbst (Fenster, Menü, Hinweise …).
//
// Ablauf: beim Start (nach kurzer Pause) und alle 4 Stunden still prüfen,
// eine neue Version im Hintergrund laden und dann fragen, ob jetzt neu
// gestartet werden soll. „Später“ installiert sie beim nächsten Schließen.

import { app, dialog } from 'electron';
import updaterPkg from 'electron-updater';

const { autoUpdater } = updaterPkg;
const CHECK_EVERY = 4 * 60 * 60_000;

let win = null;
let manualCheck = false;
let readyVersion = null;
let onStatus = () => {};

function status(text) {
  onStatus(text);
}

function notesText(info) {
  const notes = info?.releaseNotes;
  if (!notes) return '';
  const text = Array.isArray(notes) ? notes.map((n) => n.note).join('\n') : String(notes);
  // GitHub liefert die Release-Beschreibung als HTML.
  return text.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 600);
}

async function askRestart(info) {
  if (!win || win.isDestroyed()) return;
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    title: 'Update bereit',
    message: `Version ${info.version} ist bereit.`,
    detail: `${notesText(info) || 'Das Programm wurde verbessert.'}\n\nJetzt neu starten? Bei „Später“ wird das Update beim nächsten Schließen installiert.`,
    buttons: ['Jetzt neu starten', 'Später'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (response === 0) {
    // isSilent: ohne Installer-Fenster, isForceRunAfter: danach wieder öffnen
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
  }
}

export function initUpdater(window, { onStatusChange } = {}) {
  win = window;
  if (onStatusChange) onStatus = onStatusChange;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => status('Suche nach Updates …'));
  autoUpdater.on('update-available', (info) => status(`Lade Version ${info.version} …`));
  autoUpdater.on('download-progress', (p) => {
    status(`Lade Update … ${Math.round(p.percent)} %`);
    // Fortschritt auch in der Taskleiste (seit 1.1.1)
    if (win && !win.isDestroyed()) win.setProgressBar(Math.max(0, Math.min(1, p.percent / 100)));
  });
  autoUpdater.on('update-not-available', () => {
    status('');
    if (manualCheck && win && !win.isDestroyed()) {
      dialog.showMessageBox(win, { type: 'info', title: 'Keine Updates', message: `Du hast die neueste Version (${app.getVersion()}).`, noLink: true });
    }
    manualCheck = false;
  });
  autoUpdater.on('update-downloaded', (info) => {
    status('');
    readyVersion = info.version;
    manualCheck = false;
    if (win && !win.isDestroyed()) {
      win.setProgressBar(-1);
      // Taskleiste blinken lassen, falls das Fenster gerade nicht vorne ist.
      if (!win.isFocused()) win.flashFrame(true);
    }
    askRestart(info);
  });
  autoUpdater.on('error', (err) => {
    status('');
    if (win && !win.isDestroyed()) win.setProgressBar(-1);
    console.error('[updater]', err?.message || err);
    if (manualCheck && win && !win.isDestroyed()) {
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'Update-Prüfung fehlgeschlagen',
        message: 'Updates konnten gerade nicht geprüft werden.',
        detail: 'Bitte später nochmal versuchen. Das Dashboard selbst funktioniert normal weiter.',
        noLink: true,
      });
    }
    manualCheck = false;
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 15_000);
  setInterval(check, CHECK_EVERY);
}

/** Aus dem Menü „Hilfe → Nach Updates suchen“. */
export function checkForUpdatesManually() {
  if (readyVersion) {
    askRestart({ version: readyVersion });
    return;
  }
  manualCheck = true;
  autoUpdater.checkForUpdates().catch(() => {});
}

/** Für den Selbsttest: prüft und lädt, installiert aber nie. */
export async function selftestUpdate() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.logger = null;
  const result = await autoUpdater.checkForUpdates();
  const available = result?.updateInfo?.version;
  if (!available || available === app.getVersion()) return { current: app.getVersion(), available: null, downloaded: false };
  const files = await result.downloadPromise;
  return { current: app.getVersion(), available, downloaded: Array.isArray(files) && files.length > 0 };
}
