/**
 * Build du bundle pour la static app Clever Cloud — projet `aide-regularisation-espagne`.
 *
 *  pnpm build:aide-es           → prépare dist/aide-regularisation-espagne/ + commit local
 *  pnpm deploy:aide-es          → build + git push soliguide-aide-es HEAD:master
 *
 * Le dashboard utilise des chemins relatifs `../data/output/*.json` (depuis
 * `dashboard/`). À la racine du dist on rewrite en `data/output/...`.
 */

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const SRC = join(REPO_ROOT, "projects/aide-regularisation-espagne");
const OUT = join(REPO_ROOT, "dist/aide-regularisation-espagne");

const PUSH = process.argv.includes("--push");

function sh(cmd: string, opts: { cwd?: string; quiet?: boolean } = {}) {
  return execSync(cmd, {
    cwd: opts.cwd ?? REPO_ROOT,
    stdio: opts.quiet ? "pipe" : "inherit",
    encoding: "utf-8",
  });
}

function shQuiet(cmd: string, cwd: string) {
  try {
    return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function rsyncDir(srcDir: string, destDir: string) {
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  cpSync(srcDir, destDir, { recursive: true });
}

function du(path: string): string {
  try {
    return execSync(`du -sh "${path}"`, { encoding: "utf-8" }).split("\t")[0];
  } catch {
    return "?";
  }
}

// Fichiers JSON requis par le dashboard
const DATA_FILES = [
  "oficinas_regularizacion_2026.json",
  "soliguide-conseil-administratif-es.json",
];

// ── 1. Pré-checks ──
for (const f of DATA_FILES) {
  if (!existsSync(join(SRC, "data/output", f))) {
    console.error(`❌ ${SRC}/data/output/${f} manquant.`);
    console.error(`   Lance d'abord les scripts dans ${SRC}/src/`);
    process.exit(1);
  }
}

// ── 2. Init du repo de déploiement si premier run ──
if (!existsSync(join(OUT, ".git"))) {
  console.log(`🔧 Premier build — init du repo dans ${OUT}`);
  mkdirSync(OUT, { recursive: true });
  sh("git init -q && git checkout -qb master", { cwd: OUT });
}

mkdirSync(join(OUT, "data/output"), { recursive: true });

// ── 3. Synchronise les fichiers du dashboard ──
console.log(`📂 Synchronise vers ${OUT}…`);
cpSync(join(SRC, "dashboard/index.html"), join(OUT, "index.html"));
cpSync(join(SRC, "dashboard/style.css"), join(OUT, "style.css"));
rsyncDir(join(SRC, "dashboard/assets"), join(OUT, "assets"));

// app.js : rewrite des chemins `../data/output/` → `data/output/`
const appJsSrc = readFileSync(join(SRC, "dashboard/app.js"), "utf-8");
const appJsDist = appJsSrc.replaceAll("../data/output/", "data/output/");
writeFileSync(join(OUT, "app.js"), appJsDist);
console.log("   🔁 app.js : chemins data/output/ réécrits");

// Data JSON
for (const f of DATA_FILES) {
  cpSync(join(SRC, "data/output", f), join(OUT, "data/output", f));
}

// ── 4. Stats ──
console.log(`✅ Bundle prêt — total ${du(OUT)}`);
for (const f of DATA_FILES) {
  console.log(`   • ${f.padEnd(40)} ${du(join(OUT, "data/output", f))}`);
}

// ── 5. Commit incrémental ──
sh("git add -A", { cwd: OUT, quiet: true });
const diff = shQuiet("git diff --cached --name-only", OUT);
if (!diff) {
  console.log("ℹ️  Rien à commiter (bundle identique)");
} else {
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  sh(`git commit -qm "deploy: ${stamp}"`, { cwd: OUT, quiet: true });
  console.log(`📝 Commit créé : deploy: ${stamp}`);
}

// ── 6. Push optionnel ──
if (PUSH) {
  const remote = shQuiet("git remote get-url soliguide-aide-es", OUT);
  if (!remote) {
    console.error(`❌ Remote 'soliguide-aide-es' manquant dans ${OUT}. Lance une fois :`);
    console.error(`   cd ${OUT}`);
    console.error(`   git remote add soliguide-aide-es <url-clever-cloud>`);
    process.exit(1);
  }
  console.log("🚀 git push soliguide-aide-es HEAD:master…");
  sh("git push soliguide-aide-es HEAD:master", { cwd: OUT });
  console.log("✅ Déployé. La build est visible dans la console Clever.");
}
