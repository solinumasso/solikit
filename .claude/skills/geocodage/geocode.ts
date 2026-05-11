/**
 * 🗺️ Script CLI générique pour géocoder un JSON via la Géoplateforme (BAN).
 *
 * - Lit un fichier JSON (tableau d'objets).
 * - Pour chaque objet sans `banAddress`, appelle https://data.geopf.fr/geocodage/search.
 * - Écrit le résultat en place (atomic rewrite) après chaque batch → on peut couper et
 *   reprendre, on ne paye jamais 2× le même appel.
 * - Rate limit : 40 appels/s par défaut (limite Géoplateforme).
 *
 * Usage :
 *   pnpm dlx tsx .claude/skills/geocodage/geocode.ts \
 *     --in data/raw/soliguide.json \
 *     --addressField address \
 *     --postcodeField postalCode \
 *     --cityField city
 *
 * --in        : fichier JSON à enrichir (modifié en place)
 * --addressField  : clé du champ adresse dans chaque objet (ex: "address")
 * --postcodeField : clé du code postal (optionnel, améliore le match)
 * --cityField     : clé de la ville (optionnel, améliore le match)
 * --rate          : appels/s (défaut 40, max Géoplateforme)
 * --force         : re-géocode même si banAddress déjà présent
 */

import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { parseArgs } from "node:util";
import { pickBestBanAddress, type BanAddress } from "./ban-address.js";

const { values } = parseArgs({
  options: {
    in: { type: "string" },
    addressField: { type: "string" },
    postcodeField: { type: "string" },
    cityField: { type: "string" },
    rate: { type: "string", default: "40" },
    force: { type: "boolean", default: false },
  },
});

const filePath = values.in;
const addressField = values.addressField;
const postcodeField = values.postcodeField;
const cityField = values.cityField;
const rate = Number(values.rate);
const force = values.force;

if (!filePath || !addressField) {
  console.error("❌ Args requis : --in <path> --addressField <key>");
  console.error("   Optionnels   : --postcodeField <key> --cityField <key> --rate <n=40> --force");
  process.exit(1);
}

const ENDPOINT = "https://data.geopf.fr/geocodage/search";
const SAVE_EVERY = 200; // sauvegarde toutes les N adresses traitées

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(q: string, postcode: string, city: string): Promise<BanAddress | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");
  if (postcode) url.searchParams.set("postcode", postcode);
  if (city) url.searchParams.set("city", city);
  const r = await fetch(url);
  if (!r.ok) {
    if (r.status === 429) {
      // rate limited : on patiente 1s puis on retry une fois
      await sleep(1000);
      const r2 = await fetch(url);
      if (!r2.ok) return null;
      return pickBestBanAddress(await r2.json());
    }
    return null;
  }
  return pickBestBanAddress(await r.json());
}

function saveAtomic(path: string, data: any) {
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, path);
}

async function main() {
  console.log(`🗺️ Géocodage BAN — ${filePath}`);
  const records: Array<Record<string, any>> = JSON.parse(readFileSync(filePath!, "utf-8"));
  const total = records.length;

  const toDo: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (force || records[i].banAddress == null) {
      const addr = String(records[i][addressField!] ?? "").trim();
      if (addr) toDo.push(i);
    }
  }
  const alreadyDone = total - toDo.length;
  console.log(`   ${total} entrées, ${alreadyDone} déjà géocodées, ${toDo.length} à traiter`);
  if (toDo.length === 0) {
    console.log("✅ Rien à faire.");
    return;
  }

  const intervalMs = 1000 / rate;
  let processed = 0;
  let hits = 0;
  let misses = 0;
  let lastTick = Date.now();
  const startedAt = Date.now();

  for (const i of toDo) {
    const rec = records[i];
    const q = String(rec[addressField!] ?? "").trim();
    const postcode = postcodeField ? String(rec[postcodeField] ?? "").trim() : "";
    const city = cityField ? String(rec[cityField] ?? "").trim() : "";

    // ── tick rate ──
    const wait = lastTick + intervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastTick = Date.now();

    let res: BanAddress | null = null;
    try {
      res = await geocode(q, postcode, city);
    } catch (e: any) {
      console.warn(`  ⚠ erreur pour "${q}" : ${e.message}`);
    }
    rec.banAddress = res;
    if (res) hits++;
    else misses++;
    processed++;

    if (processed % 50 === 0 || processed === toDo.length) {
      const pct = Math.round((processed / toDo.length) * 100);
      const elapsed = (Date.now() - startedAt) / 1000;
      const rps = (processed / elapsed).toFixed(1);
      const eta = elapsed > 0 ? Math.round((elapsed / processed) * (toDo.length - processed)) : 0;
      const bar = "█".repeat(Math.floor(pct / 5)).padEnd(20, "░");
      process.stdout.write(
        `\r  ${bar} ${pct.toString().padStart(3)}%  ${processed}/${toDo.length}  ` +
        `(✓ ${hits} / ✗ ${misses})  ${rps} c/s  ETA ${eta}s   `
      );
    }
    if (processed % SAVE_EVERY === 0) {
      saveAtomic(filePath!, records);
    }
  }

  saveAtomic(filePath!, records);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n🎉 ${processed} géocodées en ${elapsed}s — ${hits} succès, ${misses} sans résultat`);
  console.log(`   Fichier mis à jour : ${filePath}`);
}

main().catch((err) => {
  console.error("\n❌ Erreur :", err);
  process.exit(1);
});
