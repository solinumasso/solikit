/**
 * 🇫🇷 Script CLI générique pour télécharger l'Annuaire Service-Public (DILA).
 *
 * Usage :
 *   pnpm dlx tsx .claude/skills/dila/download.ts --out data/raw/dila.json
 *
 * --out         : fichier JSON de sortie (DilaPlace[])
 * --where       : filtre ODSQL optionnel (ex: 'pivot LIKE "ccas"')
 * --limit       : taille de page (défaut 100, max API ~100)
 * --pages-max   : nombre de pages max (défaut: toutes)
 *
 * Sans `--where`, télécharge l'intégralité du dataset (~95 k entrées).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { toDilaPlace, type DilaPlace } from "./place.js";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    where: { type: "string" },
    limit: { type: "string", default: "100" },
    "pages-max": { type: "string" },
  },
});

const outPath = values.out;
const where = values.where;
const limit = Number(values.limit);
const pagesMax = values["pages-max"] ? Number(values["pages-max"]) : Infinity;

if (!outPath) {
  console.error("❌ Arg requis : --out <path>");
  console.error("   Optionnels  : --where <ODSQL> --limit <n=100> --pages-max <n>");
  process.exit(1);
}

const DATASET = "https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration";

/**
 * /records est paginé avec offset/limit MAIS limité à offset+limit ≤ 10 000.
 * /exports/json renvoie l'intégralité en un seul appel — meilleur dès qu'on veut
 * tout télécharger.
 */
async function fetchAllViaExport() {
  console.log(`   Endpoint : /exports/json (bulk)`);
  const url = new URL(`${DATASET}/exports/json`);
  if (where) url.searchParams.set("where", where);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} : ${await r.text()}`);
  return r.json() as Promise<any[]>;
}

async function fetchPageRecords(offset: number) {
  const url = new URL(`${DATASET}/records`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (where) url.searchParams.set("where", where);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} : ${await r.text()}`);
  return r.json() as Promise<{ total_count: number; results: any[] }>;
}

async function main() {
  console.log(`🇫🇷 DILA — Annuaire Service-Public`);
  if (where) console.log(`   Filtre : ${where}`);

  const startedAt = Date.now();
  const all: DilaPlace[] = [];

  // Sans pages-max imposé, on utilise /exports (1 seul appel, pas de limite 10k)
  if (pagesMax === Infinity) {
    const rows = await fetchAllViaExport();
    for (const raw of rows) all.push(toDilaPlace(raw));
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`   ${rows.length} fiches récupérées en ${elapsed}s`);
  } else {
    // Mode paginé limité (utile pour tester avec --pages-max=1)
    console.log(`   Endpoint : /records (paginé, max offset+limit=10000)`);
    let offset = 0;
    let total = 0;
    let page = 0;
    while (true) {
      const r = await fetchPageRecords(offset);
      total = r.total_count;
      page++;
      for (const raw of r.results) all.push(toDilaPlace(raw));
      const totalPages = Math.min(Math.ceil(total / limit), pagesMax);
      const pct = Math.round((all.length / total) * 100);
      const bar = "█".repeat(Math.floor(pct / 5)).padEnd(20, "░");
      console.log(
        `  Page ${String(page).padStart(3)}/${totalPages} ${bar} ${pct.toString().padStart(3)}%  ` +
        `+${r.results.length} fiches  (cumul ${all.length}/${total})`
      );
      if (r.results.length === 0 || all.length >= total || page >= pagesMax) break;
      offset += limit;
      if (offset + limit > 10000) {
        console.log("   ⚠ Limite API atteinte (offset+limit > 10000). Retire --pages-max pour utiliser /exports.");
        break;
      }
    }
  }

  mkdirSync(dirname(outPath!), { recursive: true });
  writeFileSync(outPath!, JSON.stringify(all, null, 2));
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n🎉 ${all.length} fiches écrites en ${elapsed}s → ${outPath}`);
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
