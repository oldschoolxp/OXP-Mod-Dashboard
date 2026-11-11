// Nur für den Selbsttest (OXP_SELFTEST gesetzt): prüft Fenster, Weiterleitungs-Sperre
// und Kennung, speichert ein Bildschirmfoto des Fensters und beendet sich dann selbst.
import { app } from 'electron';
import fs from 'node:fs';

export function runSelftest(win, { isInternal, startUrl }) {
  const out = process.env.OXP_SELFTEST;
  const result = { startUrl, checks: {}, events: [] };
  const c = result.checks;
  c.internWebsite = isInternal('https://www.oldschoolxp.de/mod');
  c.internTwitchLogin = isInternal('https://id.twitch.tv/oauth2/authorize');
  c.externClip = !isInternal('https://clips.twitch.tv.example.com/x') && isInternal('https://clips.twitch.tv/x');
  c.externDiscord = !isInternal('https://discord.gg/abc');
  c.externHttp = !isInternal('http://www.oldschoolxp.de/mod');
  c.externTrick = !isInternal('https://oldschoolxp.de.evil.com/');

  let done = false;
  const finish = async () => {
    if (done) return;
    done = true;
    try {
      await new Promise((r) => setTimeout(r, 4000));
      result.finalUrl = win.webContents.getURL();
      result.title = win.getTitle();
      result.userAgent = await win.webContents.executeJavaScript('navigator.userAgent');
      result.notificationPermission = await win.webContents.executeJavaScript('typeof Notification === "undefined" ? "none" : Notification.permission');
      result.layout = await win.webContents.executeJavaScript(`({ nav: !!document.querySelector('.site-nav'), footer: !!document.querySelector('.site-footer'), logout: !!document.querySelector('[aria-label^="Abmelden"]'), mainWidth: document.querySelector('main')?.clientWidth, windowWidth: innerWidth, boardHeight: [...document.querySelectorAll('.absolute.flex.flex-col')].reduce((m, p) => Math.max(m, p.offsetTop + p.offsetHeight), 0), windowHeight: innerHeight })`);
      result.alertsButton =await win.webContents.executeJavaScript('document.querySelector(\'[aria-label*="Windows-Hinweise"]\')?.getAttribute("aria-pressed") ?? null');
      const image = await win.webContents.capturePage();
      fs.writeFileSync(out + '.png', image.toPNG());
    } catch (e) {
      result.error = String(e?.stack || e);
    }
    fs.writeFileSync(out + '.json', JSON.stringify(result, null, 2));
    app.quit();
  };
  const wc = win.webContents;
  wc.on('did-start-navigation', (d) => result.events.push(`start ${d.url ?? ''}`));
  wc.on('did-fail-load', (_e, code, desc, url) => result.events.push(`fail ${code} ${desc} ${url}`));
  wc.on('did-finish-load', () => {
    result.events.push(`finish ${wc.getURL()}`);
    finish();
  });
  setTimeout(() => finish(), 40_000);
}
