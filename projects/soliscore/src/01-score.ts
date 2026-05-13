import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), "../../.env") });

import type { FicheAPI, FicheScore } from "./types.js";
import {
  scoreTitre, scoreDescription, scoreTelephonePresence, scoreEmailPresence,
  scoreHorairesPresence, scoreTelephoneCoherence, scoreEmailCoherence, scoreAcronymes,
} from "./rules.js";
import { evaluateAIRules } from "./ai-evaluator.js";

const INPUT_PATH = path.join(process.cwd(), "data", "raw", "fiches.json");
const OUTPUT_PATH = path.join(process.cwd(), "data", "output", "scores.json");

async function scoreFiche(fiche: FicheAPI): Promise<FicheScore> {
  // Règles déterministes et regex
  const deterministicRules = [
    scoreTitre(fiche),
    scoreDescription(fiche),
    scoreTelephonePresence(fiche),
    scoreEmailPresence(fiche),
    scoreHorairesPresence(fiche),
    scoreTelephoneCoherence(fiche),
    scoreEmailCoherence(fiche),
    scoreAcronymes(fiche),
  ];

  // Règles IA
  const { orthographe, horaires_coherence } = await evaluateAIRules(fiche);

  const composantes = [...deterministicRules, orthographe, horaires_coherence];
  const score_bonus = composantes.filter((r) => r.type === "bonus").reduce((s, r) => s + r.points, 0);
  const score_malus = composantes.filter((r) => r.type === "malus").reduce((s, r) => s + r.points, 0);

  return {
    lieu_id: fiche.lieu_id,
    name: fiche.name,
    seo_url: fiche.seo_url,
    score_total: score_bonus + score_malus,
    score_bonus,
    score_malus,
    composantes,
  };
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`❌ Fichier introuvable : ${INPUT_PATH}`);
    console.error("   Place ton export JSON dans data/raw/fiches.json");
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const fiches: FicheAPI[] = Array.isArray(parsed) ? parsed : (parsed.places ?? []);
  console.log(`📂 ${fiches.length} fiche(s) chargée(s)`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY manquant. Crée un fichier .env à la racine du repo avec ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  const scores: FicheScore[] = [];
  const BATCH = 5; // appels IA en parallèle max

  for (let i = 0; i < fiches.length; i += BATCH) {
    const batch = fiches.slice(i, i + BATCH);
    console.log(`⚙️  Scoring fiches ${i + 1}–${Math.min(i + BATCH, fiches.length)}/${fiches.length}…`);
    const results = await Promise.all(batch.map(scoreFiche));
    scores.push(...results);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(scores, null, 2), "utf-8");
  console.log(`✅ scores.json généré (${scores.length} fiches)`);

  const avg = scores.reduce((s, f) => s + f.score_total, 0) / scores.length;
  const max = Math.max(...scores.map((f) => f.score_total));
  const min = Math.min(...scores.map((f) => f.score_total));
  console.log(`📊 Score moyen: ${avg.toFixed(1)} | Min: ${min} | Max: ${max}`);
}

main();
