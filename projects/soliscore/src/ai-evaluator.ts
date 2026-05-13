import Anthropic from "@anthropic-ai/sdk";
import type { FicheAPI, RuleResult } from "./types.js";
import { getLabeledFreeTextFields, formatNewhours } from "./rules.js";

let client: Anthropic;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `Tu es un évaluateur de qualité de données pour Soliguide, un annuaire de services solidaires français.
Tu dois analyser les champs textuels d'une fiche et retourner une évaluation JSON structurée, sans aucun autre texte.`;

interface AIEvaluation {
  orthographe: { nb_fautes: number; exemples: string[] };
  horaires: {
    mentionne_horaires: boolean;
    champ: string | null;
    extrait: string | null;
    horaires_speciaux: boolean;
    coherent: boolean | null;
  };
}

export async function evaluateAIRules(fiche: FicheAPI): Promise<{ orthographe: RuleResult; horaires_coherence: RuleResult }> {
  const labeledFields = getLabeledFreeTextFields(fiche);
  const structuredHours = formatNewhours(fiche);

  if (!labeledFields.length) {
    return {
      orthographe: makeOrtho(0, []),
      horaires_coherence: makeHorairesCoherence(false, null, null, false, null),
    };
  }

  const labeledText = labeledFields.map((f) => `[${f.label}]\n${f.text}`).join("\n\n");

  const userPrompt = `Fiche : "${fiche.name}"

CHAMPS TEXTUELS LIBRES (avec leur nom entre crochets) :
${labeledText}

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
    "champ": <nom exact du champ entre crochets où les horaires sont mentionnés, ou null si mentionne_horaires=false>,
    "extrait": <courte citation (max 80 caractères) du texte qui mentionne les horaires, ou null si mentionne_horaires=false>,
    "horaires_speciaux": <true si les horaires mentionnés sont "spéciaux" (ex: 1er jeudi du mois) — ces cas ne comptent pas comme incohérents>,
    "coherent": <true si cohérents avec les horaires structurés, false si incohérents, null si mentionne_horaires=false ou horaires_speciaux=true>
  }
}`;

  const response = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let evaluation: AIEvaluation;
  try {
    evaluation = JSON.parse(text);
  } catch {
    evaluation = {
      orthographe: { nb_fautes: 0, exemples: [] },
      horaires: { mentionne_horaires: false, champ: null, extrait: null, horaires_speciaux: false, coherent: null },
    };
  }

  return {
    orthographe: makeOrtho(evaluation.orthographe.nb_fautes, evaluation.orthographe.exemples),
    horaires_coherence: makeHorairesCoherence(
      evaluation.horaires.mentionne_horaires,
      evaluation.horaires.champ,
      evaluation.horaires.extrait,
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

function makeHorairesCoherence(mentionne: boolean, champ: string | null, extrait: string | null, speciaux: boolean, coherent: boolean | null): RuleResult {
  let points: number;
  let detail: string;
  const where = champ ? ` dans le champ "${champ}"` : " dans les champs libres";
  const citation = extrait ? ` — extrait : "${extrait}"` : "";
  if (!mentionne) {
    points = 0; detail = "Aucune mention d'horaires dans les champs libres";
  } else if (speciaux) {
    points = 0; detail = `Horaires spéciaux mentionnés${where}${citation} (ex: 1er jeudi du mois) — non pénalisé`;
  } else if (coherent === true) {
    points = -2; detail = `Des horaires sont décrits${where}${citation} et sont cohérents avec ceux de la fiche — information redondante`;
  } else {
    points = -5; detail = `Des horaires sont décrits${where}${citation} mais sont incohérents avec les horaires structurés de la fiche`;
  }
  return { id: "horaires_coherence", label: "Horaires — Cohérence", section: "Horaires", type: "malus", points, max: 0, detail };
}
