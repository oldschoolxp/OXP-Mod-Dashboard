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
