import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { FicheAPI, FicheScore } from "../src/types.js";
import {
  scoreTitre, scoreDescription, scoreTelephonePresence, scoreEmailPresence,
  scoreHorairesPresence, scoreTelephoneCoherence, scoreEmailCoherence, scoreAcronymes,
} from "../src/rules.js";
import { evaluateAIRules } from "../src/ai-evaluator.js";

const MAX_FICHES = 100;
const BATCH = 5;

async function scoreFiche(fiche: FicheAPI): Promise<FicheScore> {
  const deterministicRules = [
    scoreTitre(fiche), scoreDescription(fiche),
    scoreTelephonePresence(fiche), scoreEmailPresence(fiche),
    scoreHorairesPresence(fiche), scoreTelephoneCoherence(fiche),
    scoreEmailCoherence(fiche), scoreAcronymes(fiche),
  ];
  const { orthographe, horaires_coherence } = await evaluateAIRules(fiche);
  const composantes = [...deterministicRules, orthographe, horaires_coherence];
  const score_bonus = composantes.filter(r => r.type === "bonus").reduce((s, r) => s + r.points, 0);
  const score_malus = composantes.filter(r => r.type === "malus").reduce((s, r) => s + r.points, 0);
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body;
  const fiches: FicheAPI[] = Array.isArray(body) ? body : (body?.places ?? []);

  if (!fiches.length) {
    return res.status(400).json({ error: "Aucune fiche trouvée dans le fichier." });
  }
  if (fiches.length > MAX_FICHES) {
    return res.status(400).json({
      error: `Trop de fiches : ${fiches.length} reçues, maximum ${MAX_FICHES}.`,
    });
  }

  const scores: FicheScore[] = [];
  for (let i = 0; i < fiches.length; i += BATCH) {
    const batch = fiches.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(scoreFiche));
    scores.push(...results);
  }

  return res.status(200).json(scores);
}
