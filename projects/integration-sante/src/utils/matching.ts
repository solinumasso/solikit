import levenshtein from "fast-levenshtein";

/**
 * Acronym → full form mapping (lowercase, no accents).
 * Used to expand abbreviations before Levenshtein comparison.
 */
const ACRONYMS: Record<string, string> = {
  "pmi": "protection maternelle et infantile",
  "cmpp": "centre medico psycho pedagogique",
  "cmp": "centre medico psychologique",
  "cada": "centre d accueil de demandeurs d asile",
  "chrs": "centre d hebergement et de reinsertion sociale",
  "ccas": "centre communal d action sociale",
  "cias": "centre intercommunal d action sociale",
  "lhss": "lits halte soins sante",
  "mds": "maison de sante",
  "ch": "centre hospitalier",
  "chr": "centre hospitalier regional",
  "chu": "centre hospitalier universitaire",
  "ssiad": "service de soins infirmiers a domicile",
  "csapa": "centre de soins d accompagnement et de prevention en addictologie",
  "caarud": "centre d accueil et d accompagnement a la reduction des risques pour usagers de drogues",
  "pass": "permanence d acces aux soins de sante",
  "cpef": "centre de planification et d education familiale",
};

/**
 * Multi-word synonyms: all forms normalized to a canonical form.
 */
const SYNONYMS: [string, string][] = [
  ["centre hospitalier", "hopital"],
  ["hopital", "hopital"],
];

/**
 * Expand known acronyms and normalize synonyms in a normalized string.
 */
export function expandAcronyms(str: string): string {
  // 1. Single-word acronyms
  let result = str.replace(/\b[a-z]{2,6}\b/g, (word) => ACRONYMS[word] || word);
  // 2. Multi-word synonyms → canonical form
  for (const [from, to] of SYNONYMS) {
    result = result.replaceAll(from, to);
  }
  return result;
}

/**
 * Normalize a string for comparison:
 * lowercase, remove accents, trim, collapse whitespace
 */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_'/,.()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize a phone number: keep only digits, strip leading 33 (international)
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // +33 / 0033 → 0...
  if (digits.startsWith("33") && digits.length >= 11) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

/**
 * Extract city name from FINESS ligneacheminement (e.g. "01300 BELLEY" -> "belley")
 */
export function extractVilleFromLigneAcheminement(ligne: string): string {
  const withoutPostal = ligne.replace(/^\d{5}\s*/, "");
  const withoutCedex = withoutPostal.replace(/\s*CEDEX.*$/i, "");
  return normalize(withoutCedex);
}

/**
 * Extract postal code from FINESS ligneacheminement
 */
export function extractCodePostalFromLigneAcheminement(ligne: string): string {
  const match = ligne.match(/^(\d{5})/);
  return match ? match[1] : "";
}

/**
 * Build a full address string from FINESS fields
 */
export function buildFinessAddress(record: {
  numvoie: string;
  typvoie: string;
  voie: string;
  compvoie: string;
}): string {
  return normalize(
    [record.numvoie, record.typvoie, record.voie, record.compvoie]
      .filter(Boolean)
      .join(" ")
  );
}

/**
 * Extract address without city/postal from Soliguide address
 */
export function normalizeSoliguideAddress(adresse: string): string {
  const parts = adresse.split(",");
  const streetPart = parts.length > 1 ? parts.slice(0, -1).join(",") : adresse;
  return normalize(streetPart);
}

/**
 * Normalized Levenshtein similarity (0..1).
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const dist = levenshtein.get(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

/**
 * Haversine distance between two GPS points, in metres.
 */
export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Scoring ──

export interface ScoreDetail {
  nomLevenshtein: number;
  nomMatch: boolean;
  adresseLevenshtein: number;
  adresseMatch: boolean;
  distanceMetres: number | null;
  /** true if distanceMetres <= 200 */
  geoMatch: boolean;
  codePostalMatch: boolean;
  telephoneMatch: boolean;
  /** Which step decided the match: "nom+geo", "adresse", "telephone", or null */
  matchedBy: string | null;
}

export type MatchConfidence = "certain" | "possible";

export interface MatchScoring {
  score: number;
  /** null means "non matché" */
  confidence: MatchConfidence | null;
  detail: ScoreDetail;
}

export interface ComputeScoreInput {
  finessName: string;
  finessAddress: string;
  finessPostal: string;
  finessPhone: string;
  soliguideNom: string;
  soliguideAddress: string;
  soliguidePostal: string;
  soliguidePhone: string;
  finessLat?: number | null;
  finessLon?: number | null;
  soliguideLat?: number | null;
  soliguideLon?: number | null;
}

/**
 * Cascade scoring:
 * 1. nom ≥80% + geo ≤200m → certain
 * 2. Otherwise, factor in address
 * 3. If still not enough, check phone match
 * If nom <50% AND adresse <50% → non matché
 */
export function computeScore(input: ComputeScoreInput): MatchScoring {
  const {
    finessName, finessAddress, finessPostal, finessPhone,
    soliguideNom, soliguideAddress, soliguidePostal, soliguidePhone,
    finessLat, finessLon, soliguideLat, soliguideLon,
  } = input;

  // 1. Name similarity (with acronym expansion)
  const normFName = expandAcronyms(normalize(finessName));
  const normSName = expandAcronyms(normalize(soliguideNom));
  const nomLev = similarity(normFName, normSName);
  const nomMatch = nomLev >= 0.9;

  // 2. Address similarity
  const adresseLev = similarity(finessAddress, soliguideAddress);
  const adresseMatch = adresseLev >= 0.9;

  // 3. Geo distance
  let distanceMetres: number | null = null;
  let geoMatch = false;
  if (
    finessLat != null && finessLon != null &&
    soliguideLat != null && soliguideLon != null
  ) {
    distanceMetres = Math.round(
      haversineMetres(finessLat, finessLon, soliguideLat, soliguideLon)
    );
    geoMatch = distanceMetres <= 200;
  }

  // 4. Postal code
  const codePostalMatch = finessPostal === soliguidePostal;

  // 5. Phone match
  const fPhone = normalizePhone(finessPhone);
  const sPhone = normalizePhone(soliguidePhone);
  const telephoneMatch = fPhone.length >= 10 && sPhone.length >= 10 && fPhone === sPhone;

  // ── Score computation ──
  const geoScore = geoMatch ? 1 : 0;
  const phoneBonus = telephoneMatch ? 0.1 : 0;

  let score: number;
  if (distanceMetres !== null) {
    // With geo: nom 30%, adresse 25%, geo 25%, cp 10%, phone bonus 10%
    score = nomLev * 0.3 + adresseLev * 0.25 + geoScore * 0.25 + (codePostalMatch ? 0.1 : 0) + phoneBonus;
  } else {
    // Without geo: nom 35%, adresse 35%, cp 15%, phone bonus 15% (capped)
    score = nomLev * 0.35 + adresseLev * 0.35 + (codePostalMatch ? 0.15 : 0) + Math.min(phoneBonus, 0.15);
  }
  score = Math.round(score * 100) / 100;

  // ── Confidence classification ──
  let confidence: MatchConfidence | null;
  let matchedBy: string | null = null;

  // Early exit: both name and address are too poor, phone can't save it alone
  if (nomLev < 0.7 && adresseLev < 0.7 && !telephoneMatch) {
    confidence = null;
  } else if (score >= 0.75) {
    confidence = "certain";
    matchedBy = telephoneMatch ? "score+telephone" : "score";
  } else if (score >= 0.6) {
    confidence = "possible";
    matchedBy = telephoneMatch ? "score+telephone" : "score";
  } else if (telephoneMatch && (nomLev >= 0.3 || adresseLev >= 0.3)) {
    // Phone match rescues borderline cases
    confidence = "possible";
    matchedBy = "telephone";
  } else {
    confidence = null;
  }

  return buildResult(confidence, matchedBy, {
    nomLev, nomMatch, adresseLev, adresseMatch,
    distanceMetres, geoMatch, codePostalMatch, telephoneMatch,
    score,
  });
}

function buildResult(
  confidence: MatchConfidence | null,
  matchedBy: string | null,
  d: {
    nomLev: number;
    nomMatch: boolean;
    adresseLev: number;
    adresseMatch: boolean;
    distanceMetres: number | null;
    geoMatch: boolean;
    codePostalMatch: boolean;
    telephoneMatch: boolean;
    score?: number;
  }
): MatchScoring {
  return {
    score: d.score ?? 0,
    confidence,
    detail: {
      nomLevenshtein: Math.round(d.nomLev * 1000) / 1000,
      nomMatch: d.nomMatch,
      adresseLevenshtein: Math.round(d.adresseLev * 1000) / 1000,
      adresseMatch: d.adresseMatch,
      distanceMetres: d.distanceMetres,
      geoMatch: d.geoMatch,
      codePostalMatch: d.codePostalMatch,
      telephoneMatch: d.telephoneMatch,
      matchedBy,
    },
  };
}
