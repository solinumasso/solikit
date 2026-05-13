import type { FicheAPI, RuleResult } from "./types.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&hellip;/g, "…")
    .replace(/&[a-z]+;/gi, "");
}

function cleanHtml(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ").trim();
}

export interface LabeledField { label: string; text: string; }

export function getLabeledFreeTextFields(fiche: FicheAPI): LabeledField[] {
  const fields: LabeledField[] = [];
  const add = (label: string, raw: string | undefined) => {
    if (raw) { const text = cleanHtml(raw); if (text) fields.push({ label, text }); }
  };
  add("Description", fiche.description);
  add("Description des horaires", fiche.newhours?.description);
  add("Précisions rendez-vous", fiche.modalities?.appointment?.precisions);
  add("Précisions inscription", fiche.modalities?.inscription?.precisions);
  add("Précisions orientation", fiche.modalities?.orientation?.precisions);
  add("Précisions tarif", fiche.modalities?.price?.precisions);
  add("Autre modalité", fiche.modalities?.other);
  add("Description des publics", fiche.publics?.description);
  fiche.services_all?.forEach((s, i) => add(`Service ${i + 1}`, s.description));
  add("Info fermeture", fiche.tempInfos?.closure?.description);
  add("Info horaires temporaires", fiche.tempInfos?.hours?.description);
  add("Message temporaire", fiche.tempInfos?.message?.description);
  add("Nom message temporaire", fiche.tempInfos?.message?.name);
  return fields;
}

export function getFreeTextFields(fiche: FicheAPI): string {
  return getLabeledFreeTextFields(fiche).map((f) => f.text).join("\n\n");
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

export function scoreDescription(fiche: FicheAPI): RuleResult {
  const raw = fiche.description?.trim() ?? "";
  const desc = stripHtml(raw);
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
  const fields = getLabeledFreeTextFields(fiche);
  const structuredPhones = (fiche.entity?.phones ?? []).map((p) => normalizePhone(p.phoneNumber));

  const found: { phone: string; label: string }[] = [];
  for (const { label, text } of fields) {
    for (const m of text.matchAll(PHONE_REGEX)) {
      found.push({ phone: normalizePhone(m[0]), label });
    }
  }

  if (found.length === 0) {
    return { id: "telephone_coherence", label: "Téléphone — Cohérence", section: "Informations générales", type: "malus", points: 0, max: 0, detail: "Aucun numéro dans les champs libres" };
  }
  const incoherent = found.filter(({ phone }) => !structuredPhones.includes(phone));
  if (incoherent.length === 0) {
    return { id: "telephone_coherence", label: "Téléphone — Cohérence", section: "Informations générales", type: "malus", points: 0, max: 0, detail: "Numéro(s) dans les champs libres cohérents avec la fiche" };
  }
  const detail = incoherent.map(({ phone, label }) => `${phone} (dans : ${label})`).join(", ") + ` — différent du numéro de la fiche (${structuredPhones.join(", ") || "aucun"})`;
  return { id: "telephone_coherence", label: "Téléphone — Cohérence", section: "Informations générales", type: "malus", points: -5, max: 0, detail };
}

export function scoreEmailCoherence(fiche: FicheAPI): RuleResult {
  const fields = getLabeledFreeTextFields(fiche);
  const structuredEmail = fiche.entity?.mail?.toLowerCase().trim() ?? "";

  const found: { email: string; label: string }[] = [];
  for (const { label, text } of fields) {
    for (const m of text.matchAll(EMAIL_REGEX)) {
      found.push({ email: m[0].toLowerCase(), label });
    }
  }

  if (found.length === 0) {
    return { id: "email_coherence", label: "Email — Cohérence", section: "Informations générales", type: "malus", points: 0, max: 0, detail: "Aucun email dans les champs libres" };
  }
  const allMatch = found.every(({ email }) => email === structuredEmail);
  if (allMatch) {
    const where = [...new Set(found.map((f) => f.label))].join(", ");
    return { id: "email_coherence", label: "Email — Cohérence", section: "Informations générales", type: "malus", points: -2, max: 0, detail: `Email ${found[0].email} répété dans les champs libres (${where}) — identique à la fiche, mais redondant` };
  }
  const different = found.filter(({ email }) => email !== structuredEmail);
  const detail = different.map(({ email, label }) => `${email} (dans : ${label})`).join(", ") + ` — différent de l'email de la fiche (${structuredEmail || "aucun"})`;
  return { id: "email_coherence", label: "Email — Cohérence", section: "Informations générales", type: "malus", points: -5, max: 0, detail };
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
    const list = unexplained.slice(0, 8).join(", ") + (unexplained.length > 8 ? "…" : "");
    return { id: "acronymes", label: "Acronymes non explicités", section: "Générique", type: "malus", points: -5, max: 0, detail: `${unexplained.length} acronyme(s) utilisé(s) sans explication dans le texte : ${list}. Un acronyme est considéré expliqué s'il est suivi ou précédé de sa signification entre parenthèses, ex: "CCAS (Centre Communal d'Action Sociale)".` };
  }
  return { id: "acronymes", label: "Acronymes non explicités", section: "Générique", type: "malus", points: 0, max: 0, detail: unexplained.length === 0 ? "Aucun acronyme non explicité détecté" : `${unexplained.length} acronyme(s) non explicité(s) — sous le seuil de 3` };
}
