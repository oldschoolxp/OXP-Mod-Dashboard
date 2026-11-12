# OldschoolXP Mod-Dashboard (Windows-Programm)

Eigenes Fenster für das Mod-Dashboard der Website (`https://www.oldschoolxp.de/mod`).
Das Programm ist bewusst nur eine Hülle: Alle Funktionen kommen von der Website,
jede Verbesserung dort ist sofort auch hier. Zugangsdaten oder Schlüssel liegen nicht im Programm.

## Was das Programm zusätzlich kann
- eigenes Fenster mit OX-Symbol, merkt sich Größe, Position und Zoom
- **Immer im Vordergrund**: Strg+Umschalt+T (oder Alt drücken, Menü „Ansicht“)
- Windows-Hinweise bei neuen Entbannungsanträgen, Team-Notizen und verdächtigen Nachrichten
  (nur wenn das Fenster nicht vorne ist; die Glocke im Dashboard schaltet sie ab)
- F5 neu laden, Strg+H zurück zum Dashboard, Strg+Plus/Minus/0 Zoom, F11 Vollbild
- fremde Links (Clips, Discord, Kanäle) öffnen im normalen Browser
- Seite „Keine Verbindung“ mit „Nochmal versuchen“, wenn das Internet fehlt
- **Selbst-Update** (ab 1.1.0): prüft beim Start und alle 4 Stunden auf GitHub-Releases dieses Repos, lädt im Hintergrund und fragt „Jetzt neu starten?“; sonst wird beim nächsten Schließen installiert. Menü Hilfe → „Nach Updates suchen“.

## Entwickeln
```
npm install
node node_modules/electron/install.js   # lädt Electron, falls npm das Installationsskript übersprungen hat
npm start
npm run selftest     # startet das Programm zweimal (online/offline) und prüft es
npm run installer    # baut dist-installer/OXP-Mod-Dashboard-Setup-<Version>.exe
```

Zum Testen gegen eine andere Adresse: Umgebungsvariable `OXP_MOD_URL` setzen.
Eigener Datenordner für Tests: `OXP_USER_DATA`.

Der Installer ist nicht signiert; Windows zeigt beim ersten Start „Der Computer wurde durch Windows geschützt“
→ „Weitere Informationen“ → „Trotzdem ausführen“.

## Neue Version veröffentlichen (Update für alle)
1. In `package.json` die `version` erhöhen (z. B. 1.1.0 → 1.2.0).
2. Committen und pushen.
3. `GH_TOKEN=$(gh auth token) npm run release` – baut den Installer und legt ihn mit `latest.yml` als GitHub-Release an.
4. Die installierten Programme finden das Update innerhalb von 4 Stunden (oder sofort über „Nach Updates suchen“).

Wichtig: Nur das Programm selbst braucht Updates. Alles im Dashboard kommt von der Website und ist ohne Update sofort da.
