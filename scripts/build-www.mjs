// Copia la app web a www/, la carpeta que Capacitor empaqueta en la app móvil.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const FILES = ["index.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest", "data", "assets"];

rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const f of FILES) cpSync(f, `www/${f}`, { recursive: true });
console.log("www/ lista");
