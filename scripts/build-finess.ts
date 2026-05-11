/**
 * Build du bundle de déploiement pour la static app Clever Cloud.
 *
 *  pnpm build:finess              → prépare dist/integration-sante/ + commit local
 *  pnpm deploy:finess             → build + git push soliguide-solihub HEAD:master
 *
 * L'historique git du dossier `dist/integration-sante/` est PRÉSERVÉ entre les
 * runs — c'est lui qu'on push vers Clever (pas de --force).
 */

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const SRC = join(REPO_ROOT, "projects/integration-sante");
const OUT = join(REPO_ROOT, "dist/integration-sante");

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

function rsyncAssets(srcDir: string, destDir: string) {
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  cpSync(srcDir, destDir, { recursive: true });
}

function copyFile(rel: string) {
  cpSync(join(SRC, rel), join(OUT, rel));
}

function du(path: string): string {
  try {
    return execSync(`du -sh "${path}"`, { encoding: "utf-8" }).split("\t")[0];
  } catch {
    return "?";
  }
}

// ── 1. Pré-checks ──
if (!existsSync(join(SRC, "data/matching-results.json"))) {
  console.error(`❌ ${SRC}/data/matching-results.json manquant.`);
  console.error(`   Lance d'abord : cd ${SRC} && pnpm match`);
  process.exit(1);
}

// ── 2. Init du repo de déploiement si premier run ──
if (!existsSync(join(OUT, ".git"))) {
  console.log(`🔧 Premier build — init du repo dans ${OUT}`);
  mkdirSync(OUT, { recursive: true });
  sh("git init -q && git checkout -qb master", { cwd: OUT });
}

mkdirSync(join(OUT, "data"), { recursive: true });

// ── 3. Synchronise les fichiers ──
console.log(`📂 Synchronise vers ${OUT}…`);
for (const f of [
  "index.html",
  "categories.html",
  "stats-departements.html",
  "docs.html",
  "app.js",
  "categories.js",
  "style.css",
]) {
  copyFile(f);
}
rsyncAssets(join(SRC, "assets"), join(OUT, "assets"));
cpSync(
  join(SRC, "data/matching-results.json"),
  join(OUT, "data/matching-results.json"),
);

// ── 4. Stats ──
console.log(
  `✅ Bundle prêt — total ${du(OUT)} (dont ${du(join(OUT, "data/matching-results.json"))} pour matching-results.json)`,
);

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
  const remote = shQuiet("git remote get-url soliguide-solihub", OUT);
  if (!remote) {
    console.error(`❌ Remote 'soliguide-solihub' manquant dans ${OUT}. Lance une fois :`);
    console.error(`   cd ${OUT}`);
    console.error(`   git remote add soliguide-solihub <url-clever-cloud>`);
    process.exit(1);
  }
  console.log("🚀 git push soliguide-solihub HEAD:master…");
  sh("git push soliguide-solihub HEAD:master", { cwd: OUT });
  console.log("✅ Déployé. La build est visible dans la console Clever.");
}
