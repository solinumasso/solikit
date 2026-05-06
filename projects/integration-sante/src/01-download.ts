import { writeFileSync, mkdirSync, existsSync } from "fs";

const FINESS_URL =
  "https://www.data.gouv.fr/api/1/datasets/r/98f3161f-79ff-4f16-8f6a-6d571a80fea2";

const OUTPUT_PATH = "data/finess.csv";

async function main() {
  mkdirSync("data", { recursive: true });

  console.log("Téléchargement du CSV FINESS (géolocalisé) depuis data.gouv.fr...");
  const response = await fetch(FINESS_URL, { redirect: "follow" });

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(OUTPUT_PATH, buffer);

  const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
  console.log(`Fichier sauvegardé : ${OUTPUT_PATH} (${sizeMB} Mo)`);

  // Quick sanity check
  const lines = buffer.toString("utf-8").split("\n");
  const dataLines = lines.filter((l) => l.startsWith("structureet;"));
  console.log(`Lignes structureet : ${dataLines.length}`);
  const geoLines = lines.filter((l) => l.startsWith("geolocalisation;"));
  console.log(`Lignes géolocalisation : ${geoLines.length}`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
