import type { FicheAPI, RuleResult } from "./types.js";

// ── Helpers ────────────────────────────────────────────────────────────────

export function getFreeTextFields(fiche: FicheAPI): string {
  const parts: string[] = [];
  if (fiche.description) parts.push(fiche.description);
  if (fiche.newhours?.description) parts.push(fiche.newhours.description);
  if (fiche.modalities?.appointment?.precisions) parts.push(fiche.modalities.appointment.precisions);
  if (fiche.modalities?.inscription?.precisions) parts.push(fiche.modalities.inscription.precisions);
  if (fiche.modalities?.orientation?.precisions) parts.push(fiche.modalities.orientation.precisions);
  if (fiche.modalities?.price?.precisions) parts.push(fiche.modalities.price.precisions);
  if (fiche.modalities?.other) parts.push(fiche.modalities.other);
  if (fiche.publics?.description) parts.push(fiche.publics.description);
  fiche.services_all?.forEach((s) => { if (s.description) parts.push(s.description); });
  if (fiche.tempInfos?.closure?.description) parts.push(fiche.tempInfos.closure.description);
  if (fiche.tempInfos?.hours?.description) parts.push(fiche.tempInfos.hours.description);
  if (fiche.tempInfos?.message?.description) parts.push(fiche.tempInfos.message.description);
  if (fiche.tempInfos?.message?.name) parts.push(fiche.tempInfos.message.name);
  return parts.filter(Boolean).join("\n\n");
}

export function formatNewhours(fiche: FicheAPI): string {
  const nh = fiche.newhours;
  if (!nh) return "Aucun horaire renseigné";
  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
  const LABELS: Record<string, string> = {
    monday: "Lun", tuesday: "Mar", wednesday: "Mer",
    thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim",
  };
  const lines: string[] = [];
  for (const day of DAYS) {
    const d = nh[day];
    if (!d) continue;
    if (!d.open) {
      lines.push(`${LABELS[day]}: Fermé`);
    } else {
      const slots = d.timeslot?.map((t) => `${fmt(t.start)}-${fmt(t.end)}`).join(", ") || "Ouvert";
      lines.push(`${LABELS[day]}: ${slots}`);
    }
  }
  if (nh.closedHolidays && nh.closedHolidays !== "UNKNOWN") {
    lines.push(`Jours fériés: ${nh.closedHolidays === "OPEN" ? "Ouvert" : "Fermé"}`);
  }
  return lines.join("\n") || "Aucun horaire renseigné";
}

function fmt(t: number): string {
  const h = Math.floor(t / 100);
  const m = t % 100;
  return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
}

function hasHours(fiche: FicheAPI): boolean {
  const nh = fiche.newhours;
  if (!nh) return false;
  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
  return DAYS.some((d) => nh[d]?.open === true);
}

// ── Règles déterministes ────────────────────────────────────────────────────

export function scoreTitre(fiche: FicheAPI): RuleResult {
  const name = fiche.name?.trim() ?? "";
  let points: number;
  let detail: string;
  if (!name) {
    points = 0; detail = "Pas de titre";
  } else if (name.length >= 7 && name.length <= 55) {
    points = 5; detail = `${name.length} caractères (optimal 7–55)`;
  } else {
    points = 2; detail = `${name.length} caractères (hors plage 7–55)`;
  }
  return { id: "titre", label: "Titre", section: "Informations générales", type: "bonus", points, max: 5, detail };
}

export function scoreDescription(fiche: FicheAPI): RuleResult {
  const desc = fiche.description?.trim() ?? "";
  let points: number;
  let detail: string;
  if (!desc) {
    points = 0; detail = "Pas de description";
  } else if (desc.length >= 300 && desc.length <= 900) {
    points = 5; detail = `${desc.length} caractères (optimal 300–900)`;
  } else {
    points = 2; detail = `${desc.length} caractères (hors plage 300–900)`;
  }
  return { id: "description", label: "Description", section: "Informations générales", type: "bonus", points, max: 5, detail };
}

export function scoreTelephonePresence(fiche: FicheAPI): RuleResult {
  const phones = fiche.entity?.phones ?? [];
  let points: number;
  let detail: string;
  if (phones.length === 0) {
    points = 0; detail = "Aucun numéro renseigné";
  } else if (phones.some((p) => p.label?.trim())) {
    points = 5; detail = `${phones.length} numéro(s), au moins un avec libellé`;
  } else {
    points = 3; detail = `${phones.length} numéro(s), aucun avec libellé`;
  }
  return { id: "telephone_presence", label: "Téléphone — Présence", section: "Informations générales", type: "bonus", points, max: 5, detail };
}

export function scoreEmailPresence(fiche: FicheAPI): RuleResult {
  const mail = fiche.entity?.mail?.trim() ?? "";
  const points = mail ? 5 : 0;
  const detail = mail ? `Email renseigné : ${mail}` : "Aucun email renseigné";
  return { id: "email_presence", label: "Email — Présence", section: "Informations générales", type: "bonus", points, max: 5, detail };
}

export function scoreHorairesPresence(fiche: FicheAPI): RuleResult {
  let points: number;
  let detail: string;
  if (!hasHours(fiche)) {
    points = 0; detail = "Aucun horaire renseigné";
  } else {
    const holiday = fiche.newhours?.closedHolidays;
    if (holiday && holiday !== "UNKNOWN") {
      points = 5; detail = `Horaires renseignés + info jours fériés (${holiday === "OPEN" ? "ouvert" : "fermé"})`;
    } else {
      points = 3; detail = "Horaires renseignés, pas d'info jours fériés";
    }
  }
  return { id: "horaires_presence", label: "Horaires — Présence", section: "Horaires", type: "bonus", points, max: 5, detail };
}

// ── Règles regex ────────────────────────────────────────────────────────────

const PHONE_REGEX = /(?:(?:\+33|0033|0)\s*[1-9](?:[\s.\-]?\d{2}){4})/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function normalizePhone(p: string): string {
  return p.replace(/[\s.\-]/g, "").replace(/^(?:\+33|0033)/, "0");
}

export function scoreTelephoneCoherence(fiche: FicheAPI): RuleResult {
  const freeText = getFreeTextFields(fiche);
  const phonesInText = [...freeText.matchAll(PHONE_REGEX)].map((m) => normalizePhone(m[0]));
  const structuredPhones = (fiche.entity?.phones ?? []).map((p) => normalizePhone(p.phoneNumber));

  if (phonesInText.length === 0) {
    return { id: "telephone_coherence", label: "Téléphone — Cohérence", section: "Informations générales", type: "malus", points: 0, max: 0, detail: "Aucun numéro dans les champs libres" };
  }
  const incoherent = phonesInText.filter((p) => !structuredPhones.includes(p));
  if (incoherent.length === 0) {
    return { id: "telephone_coherence", label: "Téléphone — Cohérence", section: "Informations générales", type: "malus", points: 0, max: 0, detail: "Numéro(s) dans les champs libres cohérents avec la fiche" };
  }
  return { id: "telephone_coherence", label: "Téléphone — Cohérence", section: "Informations générales", type: "malus", points: -5, max: 0, detail: `Numéro(s) dans les champs libres non cohérents : ${incoherent.join(", ")}` };
}

export function scoreEmailCoherence(fiche: FicheAPI): RuleResult {
  const freeText = getFreeTextFields(fiche);
  const emailsInText = [...freeText.matchAll(EMAIL_REGEX)].map((m) => m[0].toLowerCase());
  const structuredEmail = fiche.entity?.mail?.toLowerCase().trim() ?? "";

  if (emailsInText.length === 0) {
    return { id: "email_coherence", label: "Email — Cohérence", section: "Informations générales", type: "malus", points: 0, max: 0, detail: "Aucun email dans les champs libres" };
  }
  const allMatch = emailsInText.every((e) => e === structuredEmail);
  if (allMatch) {
    return { id: "email_coherence", label: "Email — Cohérence", section: "Informations générales", type: "malus", points: -2, max: 0, detail: `Email dans les champs libres identique à celui de la fiche (redondant)` };
  }
  return { id: "email_coherence", label: "Email — Cohérence", section: "Informations générales", type: "malus", points: -5, max: 0, detail: `Email dans les champs libres différent de celui de la fiche` };
}

export function scoreAcronymes(fiche: FicheAPI): RuleResult {
  const freeText = getFreeTextFields(fiche);
  if (!freeText) {
    return { id: "acronymes", label: "Acronymes non explicités", section: "Générique", type: "malus", points: 0, max: 0, detail: "Aucun champ libre" };
  }

  // Detect acronyms explained AFTER: "CCAS (Centre Communal...)"
  const explainedAfter = new Set<string>();
  for (const m of freeText.matchAll(/\b([A-Z]{2,})\s*\(/g)) {
    explainedAfter.add(m[1]);
  }
  // Detect acronyms explained BEFORE: "Centre Communal d'Action Sociale (CCAS)"
  const explainedBefore = new Set<string>();
  for (const m of freeText.matchAll(/\(([A-Z]{2,})\)/g)) {
    explainedBefore.add(m[1]);
  }
  const explained = new Set([...explainedAfter, ...explainedBefore]);

  const allAcronyms = new Set<string>();
  for (const m of freeText.matchAll(/\b([A-Z]{2,})\b/g)) {
    allAcronyms.add(m[1]);
  }

  const unexplained = [...allAcronyms].filter((a) => !explained.has(a));

  if (unexplained.length >= 3) {
    return { id: "acronymes", label: "Acronymes non explicités", section: "Générique", type: "malus", points: -5, max: 0, detail: `${unexplained.length} acronyme(s) non explicité(s) : ${unexplained.slice(0, 5).join(", ")}` };
  }
  return { id: "acronymes", label: "Acronymes non explicités", section: "Générique", type: "malus", points: 0, max: 0, detail: unexplained.length === 0 ? "Aucun acronyme non explicité" : `${unexplained.length} acronyme(s) non explicité(s) — sous le seuil de 3` };
}
