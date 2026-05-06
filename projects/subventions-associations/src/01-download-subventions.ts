/**
 * 01-download-subventions.ts
 * Télécharge le CSV des subventions aux associations votées par la Ville de Paris
 * Source : https://www.data.gouv.fr/datasets/subventions-aux-associations-votees-1
 */

import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(__dirname, "../data/raw");
const OUTPUT_PATH = resolve(RAW_DIR, "subventions-paris.csv");

// Resource ID du CSV sur data.gouv.fr
const RESOURCE_URL =
  "https://www.data.gouv.fr/fr/datasets/r/e87042eb-d665-4952-87a6-41d6fc4c55d8";

async function main() {
  if (existsSync(OUTPUT_PATH)) {
    console.log(`⏭️  Fichier déjà présent : ${OUTPUT_PATH}`);
    console.log("   Supprime-le pour re-télécharger.");
    return;
  }

  console.log("⬇️  Téléchargement des subventions Paris...");
  console.log(`   URL : ${RESOURCE_URL}`);

  const response = await fetch(RESOURCE_URL, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status} : ${response.statusText}`);
  }

  const data = await response.text();
  writeFileSync(OUTPUT_PATH, data, "utf-8");

  const lines = data.split("\n").length - 1;
  console.log(`✅ Téléchargé ! ${lines.toLocaleString("fr")} lignes → ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});
