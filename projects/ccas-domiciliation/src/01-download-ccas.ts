/**
 * Télécharge la liste complète des CCAS/CIAS depuis l'API de l'annuaire service-public.gouv.fr
 * et la sauvegarde en JSON brut dans data/raw/
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "data", "raw");
const OUTPUT_FILE = join(RAW_DIR, "ccas-annuaire.json");

const API_BASE =
  "https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records";

const LIMIT = 100; // max par requête

interface AnnuaireRecord {
  id: string;
  nom: string;
  siret: string | null;
  siren: string | null;
  adresse: string | null;
  telephone: string | null;
  adresse_courriel: string | null;
  site_internet: string | null;
  code_insee_commune: string | null;
  pivot: string | null;
}

async function fetchAllCCAS(): Promise<AnnuaireRecord[]> {
  const all: AnnuaireRecord[] = [];
  let offset = 0;

  // Premier appel pour connaître le total
  const firstUrl = `${API_BASE}?where=pivot%20like%20%22ccas%22&limit=${LIMIT}&offset=0`;
  const firstResp = await fetch(firstUrl);
  const firstData = await firstResp.json();
  const total: number = firstData.total_count;

  console.log(`📊 ${total} CCAS/CIAS trouvés dans l'annuaire`);

  all.push(...firstData.results);
  offset += LIMIT;

  const MAX = 10000;
  while (offset < Math.min(total, MAX)) {
    const url = `${API_BASE}?where=pivot%20like%20%22ccas%22&limit=${LIMIT}&offset=${offset}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.log(`  ⚠️  HTTP ${resp.status} à offset ${offset}, pause 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      const data = await resp.json();
      if (!data.results || !Array.isArray(data.results)) {
        console.log(`  ⚠️  Pas de résultats à offset ${offset}, pause 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      all.push(...data.results);
      offset += LIMIT;
    } catch (err) {
      console.log(`  ⚠️  Erreur à offset ${offset}, pause 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    if (offset % 1000 === 0) {
      console.log(`  ↳ ${all.length} / ${total}...`);
    }
  }

  return all;
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });

  console.log("⬇️  Téléchargement des CCAS depuis l'annuaire service-public.gouv.fr...");
  const records = await fetchAllCCAS();

  console.log(`✅ ${records.length} CCAS récupérés`);
  writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2), "utf-8");
  console.log(`💾 Sauvegardé dans ${OUTPUT_FILE}`);
}

main().catch(console.error);
