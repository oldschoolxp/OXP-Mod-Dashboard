// Neue Version veröffentlichen – danach holen sich alle installierten Programme das Update.
//
//   1. Version in package.json erhöhen (z. B. 1.1.2 → 1.1.3)
//   2. node werkzeuge/veroeffentlichen.mjs "Was ist neu (kurz)"
//
// Baut den Installer, erzeugt latest.yml (daran erkennen die Programme die neue Version) und lädt alles
// in den eigenen Cloudflare-Speicher (R2-Bucket oxp-updates), erreichbar unter
// https://updates.oldschoolxp.de/mod-dashboard/. Dafür muss Wrangler angemeldet sein (npx wrangler login).
// Das Code-Repo auf GitHub ist privat und spielt für die Updates keine Rolle.
//
// --github  legt zusätzlich ein GitHub-Release an (nur für die Übergangsversion 1.1.2 nötig).
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BUCKET = "oxp-updates";
const PREFIX = "mod-dashboard";
const BASE_URL = `https://updates.oldschoolxp.de/${PREFIX}`;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const args = process.argv.slice(2);
const withGithub = args.includes("--github");
const notizen = args.filter((a) => a !== "--github")[0] || `OXP Mod-Dashboard ${version}`;
const dist = path.join(root, "dist-installer");
const exe = `OXP-Mod-Dashboard-Setup-${version}.exe`;
// npx braucht unter Windows die Shell, gh nicht (ohne Shell bleiben Leerzeichen und Klammern im Text heil)
const run = (cmd, argv, shell = false) => execFileSync(cmd, argv, { cwd: root, stdio: "inherit", shell });

console.log(`Baue OXP Mod-Dashboard ${version} …`);
fs.rmSync(dist, { recursive: true, force: true });
run("npx", ["electron-builder", "--win", "nsis", "--publish", "never"], true);

const daten = fs.readFileSync(path.join(dist, exe));
const sha512 = crypto.createHash("sha512").update(daten).digest("base64");
const notesYaml = notizen.replace(/'/g, "''");
fs.writeFileSync(
  path.join(dist, "latest.yml"),
  `version: ${version}\nfiles:\n  - url: ${exe}\n    sha512: ${sha512}\n    size: ${daten.length}\npath: ${exe}\nsha512: ${sha512}\nreleaseNotes: '${notesYaml}'\nreleaseDate: '${new Date().toISOString()}'\n`,
);

const putOnce = (file, contentType, cacheControl) =>
  run("npx", ["-y", "wrangler@4.161.0", "r2", "object", "put", `${BUCKET}/${PREFIX}/${file}`, "--file", `"${path.join(dist, file)}"`, "--content-type", contentType, "--cache-control", `"${cacheControl}"`, "--remote"], true);

// Hochladen klappt gelegentlich beim ersten Mal nicht (Verbindung) – dann einmal neu versuchen.
const put = (...a) => {
  try {
    putOnce(...a);
  } catch {
    console.log("Noch ein Versuch …");
    putOnce(...a);
  }
};

console.log(`Lade nach ${BASE_URL} …`);
// Erst Installer und Blockmap, ganz zum Schluss latest.yml – sonst sähen Programme eine Version, deren Datei noch fehlt.
put(exe, "application/octet-stream", "public, max-age=31536000, immutable");
put(`${exe}.blockmap`, "application/octet-stream", "public, max-age=31536000, immutable");
put("latest.yml", "text/yaml", "no-cache");

if (withGithub) {
  console.log("Lege zusätzlich das GitHub-Release an …");
  run("gh", ["release", "create", `v${version}`, "--repo", "oldschoolxp/OXP-Mod-Dashboard", "--title", `OXP Mod-Dashboard ${version}`, "--notes", notizen, path.join(dist, exe), path.join(dist, "latest.yml"), path.join(dist, `${exe}.blockmap`)]);
}
console.log(`Fertig: Version ${version} ist veröffentlicht. Installierte Programme holen sie beim nächsten Prüfen.`);
