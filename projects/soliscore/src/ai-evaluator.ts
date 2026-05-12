import Anthropic from "@anthropic-ai/sdk";
import type { FicheAPI, RuleResult } from "./types.js";
import { getFreeTextFields, formatNewhours } from "./rules.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es un évaluateur de qualité de données pour Soliguide, un annuaire de services solidaires français.
Tu dois analyser les champs textuels d'une fiche et retourner une évaluation JSON structurée, sans aucun autre texte.`;

interface AIEvaluation {
  orthographe: { nb_fautes: number; exemples: string[] };
  horaires: {
    mentionne_horaires: boolean;
    horaires_speciaux: boolean;
    coherent: boolean | null;
  };
}

export async function evaluateAIRules(fiche: FicheAPI): Promise<{ orthographe: RuleResult; horaires_coherence: RuleResult }> {
  const freeText = getFreeTextFields(fiche);
  const structuredHours = formatNewhours(fiche);

  if (!freeText) {
    return {
      orthographe: makeOrtho(0, []),
      horaires_coherence: makeHorairesCoherence(false, false, null),
    };
  }

  const userPrompt = `Fiche : "${fiche.name}"

CHAMPS TEXTUELS LIBRES :
${freeText}

HORAIRES STRUCTURÉS :
${structuredHours}

Évalue ces deux critères et réponds UNIQUEMENT avec ce JSON :

{
  "orthographe": {
    "nb_fautes": <nombre entier de fautes d'orthographe françaises — ne pas compter les noms propres, sigles, abréviations>,
    "exemples": ["mot fautif → correction", ...]
  },
  "horaires": {
    "mentionne_horaires": <true si un champ libre mentionne des heures ou des jours d'ouverture spécifiques>,
    "horaires_speciaux": <true si les horaires mentionnés sont "spéciaux" (ex: 1er jeudi du mois) — ces cas ne comptent pas comme incohérents>,
    "coherent": <true si cohérents avec les horaires structurés, false si incohérents, null si mentionne_horaires=false ou horaires_speciaux=true>
  }
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  let evaluation: AIEvaluation;
  try {
    evaluation = JSON.parse(text.trim());
  } catch {
    // Fallback if JSON parsing fails
    evaluation = {
      orthographe: { nb_fautes: 0, exemples: [] },
      horaires: { mentionne_horaires: false, horaires_speciaux: false, coherent: null },
    };
  }

  return {
    orthographe: makeOrtho(evaluation.orthographe.nb_fautes, evaluation.orthographe.exemples),
    horaires_coherence: makeHorairesCoherence(
      evaluation.horaires.mentionne_horaires,
      evaluation.horaires.horaires_speciaux,
      evaluation.horaires.coherent
    ),
  };
}

function makeOrtho(nbFautes: number, exemples: string[]): RuleResult {
  let points: number;
  let detail: string;
  if (nbFautes === 0) {
    points = 0; detail = "Aucune faute détectée";
  } else if (nbFautes <= 2) {
    points = -3; detail = `${nbFautes} faute(s) : ${exemples.join(", ")}`;
  } else {
    points = -5; detail = `${nbFautes} fautes : ${exemples.slice(0, 3).join(", ")}${exemples.length > 3 ? "…" : ""}`;
  }
  return { id: "orthographe", label: "Orthographe", section: "Générique", type: "malus", points, max: 0, detail };
}

function makeHorairesCoherence(mentionne: boolean, speciaux: boolean, coherent: boolean | null): RuleResult {
  let points: number;
  let detail: string;
  if (!mentionne) {
    points = 0; detail = "Aucune mention d'horaires dans les champs libres";
  } else if (speciaux) {
    points = 0; detail = "Horaires spéciaux mentionnés (ex: 1er jeudi du mois) — cas normal";
  } else if (coherent === true) {
    points = -2; detail = "Horaires dans les champs libres cohérents avec la fiche (redondant)";
  } else {
    points = -5; detail = "Horaires dans les champs libres incohérents avec les horaires structurés";
  }
  return { id: "horaires_coherence", label: "Horaires — Cohérence", section: "Horaires", type: "malus", points, max: 0, detail };
}
