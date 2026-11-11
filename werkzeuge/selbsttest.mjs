// Startet das Programm zweimal mit eigenem Datenordner (echte Website, dann ohne
// Verbindung) und prüft das Ergebnis. Beendet nur die selbst gestarteten Prozesse.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'werkzeuge', 'ausgabe');
fs.mkdirSync(OUT, { recursive: true });

function run(name, extraEnv) {
  return new Promise((resolve) => {
    const base = path.join(OUT, name);
    for (const ext of ['.json', '.png']) fs.rmSync(base + ext, { force: true });
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'oxp-mod-test-'));
    const child = spawn(electronPath, [ROOT], { env: { ...process.env, OXP_SELFTEST: base, OXP_USER_DATA: userData, ...extraEnv }, stdio: 'ignore' });
    const timer = setTimeout(() => child.kill(), 60_000);
    child.on('exit', () => {
      clearTimeout(timer);
      fs.rmSync(userData, { recursive: true, force: true });
      resolve(fs.existsSync(base + '.json') ? JSON.parse(fs.readFileSync(base + '.json', 'utf8')) : null);
    });
  });
}

let ok = true;
const expect = (label, value) => {
  console.log(`${value ? 'OK  ' : 'FEHL'} ${label}`);
  if (!value) ok = false;
};

const online = await run('online', {});
expect('Programm startet und meldet sich zurück', !!online);
if (online) {
  for (const [k, v] of Object.entries(online.checks)) expect(`Regel ${k}`, v);
  expect(`Website geladen (${online.finalUrl})`, /^https:\/\/www\.oldschoolxp\.de\/(login|mod)/.test(online.finalUrl));
  expect('Kennung ohne "Electron", mit "OXPModDashboard"', !/Electron\//.test(online.userAgent) && /OXPModDashboard\//.test(online.userAgent));
  expect(`Fenstertitel (${online.title})`, online.title === 'OXP Mod-Dashboard');
  expect(`Windows-Hinweise erlaubt (${online.notificationPermission})`, online.notificationPermission === 'granted');
}

const offline = await run('offline', { OXP_MOD_URL: 'https://keine-verbindung.invalid/mod' });
expect('Offline-Seite erscheint ohne Verbindung', !!offline && offline.finalUrl.startsWith('file:') && offline.finalUrl.includes('offline.html'));

console.log(ok ? '\nAlle Prüfungen bestanden.' : '\nMindestens eine Prüfung ist fehlgeschlagen.');
process.exit(ok ? 0 : 1);
