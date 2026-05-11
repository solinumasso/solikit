import { writeFileSync, existsSync, readFileSync } from "fs";
import {
  normalizeAddress,
  normalize,
  computeScore,
  type MatchConfidence,
  type ScoreDetail,
} from "./utils/matching.js";
import type { SoliguidePlace } from "../../../../.claude/skills/soliguide-api/place.js";
import type { FinessPlace } from "./01c-finess-to-json.js";
import type { BanAddress } from "../../../../.claude/skills/geocodage/ban-address.js";
import type { DilaPlace } from "../../../../.claude/skills/dila/place.js";

/**
 * DILA réduit pour le payload du dashboard : on garde uniquement les champs
 * affichés (sites, contacts, horaires) — on vire description/SIRET/adresse
 * qui sont soit lourds soit dupliqués avec FINESS.
 */
interface SlimDila {
  websites: string[];
  email: string;
  phones: string[];
  hours: any | null;
  hoursComment: string;
  partenaire: string;
  url: string;
  updatedAt: string;
}
function slim(d: DilaPlace | null | undefined): SlimDila | null {
  if (!d) return null;
  return {
    websites: d.websites,
    email: d.email,
    phones: d.phones,
    hours: d.hours,
    hoursComment: d.hoursComment,
    partenaire: d.partenaire,
    url: d.url,
    updatedAt: d.updatedAt,
  };
}

// ── Output types ──

interface MatchEntry {
  finess: {
    nofinesset: string;
    nom: string;
    adresse: string;
    ville: string;
    codePostal: string;
    categorie: string;
    lat: number | null;
    lon: number | null;
    updatedAt: string;
    banAddress?: BanAddress | null;
    dila?: SlimDila | null;
  };
  soliguide: {
    ficheId: string;
    nom: string;
    adresse: string;
    ville: string;
    codePostal: string;
    lien: string;
    lat: number | null;
    lon: number | null;
    services: string[];
    description: string;
    phones: string[];
    email: string;
    updatedAt: string;
    banAddress?: BanAddress | null;
  } | null;
  scoring: {
    score: number;
    confidence: MatchConfidence;
    detail: ScoreDetail;
  };
}

interface OutputJSON {
  meta: {
    date: string;
    finessTotal: number;
    soliguideTotal: number;
    villesCommunes: number;
  };
  stats: {
    certain: number;
    possible: number;
    finessNonMatchees: number;
    soliguideNonMatchees: number;
  };
  matches: MatchEntry[];
  finessNonMatchees: Array<{
    nofinesset: string;
    nom: string;
    adresse: string;
    ville: string;
    codePostal: string;
    categorie: string;
    lat: number | null;
    lon: number | null;
    updatedAt: string;
    banAddress?: BanAddress | null;
    dila?: SlimDila | null;
  }>;
  soliguideNonMatchees: Array<{
    ficheId: string;
    nom: string;
    adresse: string;
    ville: string;
    codePostal: string;
    lien: string;
    lat: number | null;
    lon: number | null;
    services: string[];
    description: string;
    phones: string[];
    email: string;
    updatedAt: string;
    banAddress?: BanAddress | null;
  }>;
}

async function main() {
  const FINESS_PATH = "data/raw/finess.json";
  const SOLIGUIDE_PATH = "data/raw/soliguide.json";
  const OUTPUT_PATH = "data/matching-results.json";

  if (!existsSync(FINESS_PATH)) {
    console.error(`Fichier manquant : ${FINESS_PATH}. Lance: pnpm finess:to-json`);
    process.exit(1);
  }
  if (!existsSync(SOLIGUIDE_PATH)) {
    console.error(`Fichier manquant : ${SOLIGUIDE_PATH}. Lance: pnpm download:soliguide`);
    process.exit(1);
  }

  console.log("Lecture FINESS (JSON déjà filtré + géocodé)…");
  const finessRecords: FinessPlace[] = JSON.parse(readFileSync(FINESS_PATH, "utf-8"));
  console.log(`  ${finessRecords.length} fiches FINESS`);

  console.log("Lecture Soliguide…");
  const soliguideRecords: SoliguidePlace[] = JSON.parse(readFileSync(SOLIGUIDE_PATH, "utf-8"));
  console.log(`  ${soliguideRecords.length} fiches Soliguide`);

  const finessBanCount = finessRecords.filter((r) => r.banAddress != null).length;
  const soliguideBanCount = soliguideRecords.filter((r) => r.banAddress != null).length;
  console.log(`  BAN : ${finessBanCount}/${finessRecords.length} FINESS, ${soliguideBanCount}/${soliguideRecords.length} Soliguide`);

  // Index par ville (normalize pour éviter casse/accents)
  console.log("Indexation par ville…");
  const finessByVille = new Map<string, FinessPlace[]>();
  for (const rec of finessRecords) {
    const ville = rec.city;
    if (!ville) continue;
    if (!finessByVille.has(ville)) finessByVille.set(ville, []);
    finessByVille.get(ville)!.push(rec);
  }

  const soliguideByVille = new Map<string, SoliguidePlace[]>();
  for (const rec of soliguideRecords) {
    const ville = normalize(rec.city);
    if (!ville) continue;
    if (!soliguideByVille.has(ville)) soliguideByVille.set(ville, []);
    soliguideByVille.get(ville)!.push(rec);
  }

  let villesCommunes = 0;
  for (const ville of finessByVille.keys()) {
    if (soliguideByVille.has(ville)) villesCommunes++;
  }
  console.log(`  ${finessByVille.size} villes FINESS, ${soliguideByVille.size} villes Soliguide, ${villesCommunes} en commun`);

  const filtered = finessRecords; // déjà filtré dans 01c-finess-to-json
  const beforeFilter = filtered.length;

  // 4. Matching city by city
  console.log("Matching en cours...");
  const matches: MatchEntry[] = [];
  const matchedSoliguideIds = new Set<string>();
  const matchedFinessIds = new Set<string>();
  const counts = { certain: 0, possible: 0 };

  let processed = 0;
  for (const [ville, finessInVille] of finessByVille) {
    processed++;
    if (processed % 500 === 0) {
      console.log(`  ${processed}/${finessByVille.size} villes...`);
    }

    const soliguideInVille = soliguideByVille.get(ville) || [];

    for (const fRec of finessInVille) {
      // Adresse de référence : si BAN dispo, on prend "housenumber street" (pas le label complet
      // qui inclut CP+ville et fausse le Levenshtein contre des adresses sans CP).
      const finessStreet = fRec.banAddress
        ? `${fRec.banAddress.housenumber} ${fRec.banAddress.street}`.trim()
        : fRec.address;
      const finessAddr = normalizeAddress(finessStreet);

      let best: { sRec: SoliguidePlace; score: number; confidence: MatchConfidence | null; detail: ScoreDetail } | null = null;

      for (const sRec of soliguideInVille) {
        const sStreet = sRec.banAddress
          ? `${sRec.banAddress.housenumber} ${sRec.banAddress.street}`.trim()
          : sRec.address;
        const sAddr = normalizeAddress(sStreet);
        const result = computeScore({
          finessName: fRec.name,
          finessAddress: finessAddr,
          finessPostal: fRec.banAddress?.postcode ?? fRec.postalCode,
          finessPhone: fRec.phone,
          soliguideNom: sRec.name,
          soliguideAddress: sAddr,
          soliguidePostal: sRec.banAddress?.postcode ?? sRec.postalCode,
          soliguidePhone: sRec.phones[0] ?? "",
          finessLat: fRec.banAddress?.lat ?? fRec.lat,
          finessLon: fRec.banAddress?.lon ?? fRec.lon,
          soliguideLat: sRec.banAddress?.lat ?? sRec.lat,
          soliguideLon: sRec.banAddress?.lon ?? sRec.lon,
        });

        if (!best || result.score > best.score) {
          best = { sRec, score: result.score, confidence: result.confidence, detail: result.detail };
        }
      }

      const confidence = best ? best.confidence : null;
      const hasMatch = best && confidence !== null;

      if (!hasMatch) continue;

      const entry: MatchEntry = {
        finess: {
          nofinesset: fRec.id,
          nom: fRec.name,
          adresse: fRec.address,
          ville: fRec.city,
          codePostal: fRec.postalCode,
          categorie: fRec.category,
          lat: fRec.lat,
          lon: fRec.lon,
          updatedAt: fRec.updatedAt ?? "",
          banAddress: fRec.banAddress ?? null,
          dila: slim(fRec.dila),
        },
        soliguide: {
          ficheId: best!.sRec.id,
          nom: best!.sRec.name,
          adresse: best!.sRec.address,
          ville: best!.sRec.city,
          codePostal: best!.sRec.postalCode,
          lien: best!.sRec.url,
          lat: best!.sRec.lat,
          lon: best!.sRec.lon,
          services: best!.sRec.categories,
          description: best!.sRec.description,
          phones: best!.sRec.phones,
          email: best!.sRec.email,
          updatedAt: best!.sRec.updatedAt ?? "",
          banAddress: best!.sRec.banAddress ?? null,
        },
        scoring: {
          score: best!.score,
          confidence: confidence!,
          detail: best!.detail,
        },
      };

      matchedSoliguideIds.add(best!.sRec.id);
      matchedFinessIds.add(fRec.id);
      counts[confidence!]++;
      matches.push(entry);
    }
  }

  // 5a. FINESS non matchées (les "5 Soliguide les plus proches" sont désormais
  // fetchés dynamiquement côté frontend via l'API Soliguide au clic Détail).
  const finessNonMatchees = filtered
    .filter((r) => !matchedFinessIds.has(r.id))
    .map((r) => ({
      nofinesset: r.id,
      nom: r.name,
      adresse: r.address,
      ville: r.city,
      codePostal: r.postalCode,
      categorie: r.category,
      lat: r.lat,
      lon: r.lon,
      updatedAt: r.updatedAt ?? "",
      banAddress: r.banAddress ?? null,
      dila: slim(r.dila),
    }));

  // 5b. Soliguide non matchées
  const soliguideNonMatchees = soliguideRecords
    .filter((s) => !matchedSoliguideIds.has(s.id))
    .map((s) => ({
      ficheId: s.id,
      nom: s.name,
      adresse: s.address,
      ville: s.city,
      codePostal: s.postalCode,
      lien: s.url,
      lat: s.lat,
      lon: s.lon,
      services: s.categories,
      description: s.description,
      phones: s.phones,
      email: s.email,
      updatedAt: s.updatedAt ?? "",
      banAddress: s.banAddress ?? null,
    }));

  // 6. Build output
  matches.sort((a, b) => b.scoring.score - a.scoring.score);

  const output: OutputJSON = {
    meta: {
      date: new Date().toISOString().split("T")[0],
      finessTotal: filtered.length,
      soliguideTotal: soliguideRecords.length,
      villesCommunes,
    },
    stats: {
      certain: counts.certain,
      possible: counts.possible,
      finessNonMatchees: finessNonMatchees.length,
      soliguideNonMatchees: soliguideNonMatchees.length,
    },
    matches,
    finessNonMatchees,
    soliguideNonMatchees,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log("\n=== Résultats ===");
  console.log(`FINESS retenus : ${filtered.length} (${beforeFilter - filtered.length} hors whitelist)`);
  console.log(`Soliguide : ${soliguideRecords.length}`);
  console.log(`Certains (score ≥75%) : ${counts.certain}`);
  console.log(`Possibles (score 60–75%) : ${counts.possible}`);
  console.log(`FINESS non matchées : ${finessNonMatchees.length}`);
  console.log(`Soliguide non matchées : ${soliguideNonMatchees.length}`);
  console.log(`\nFichier : ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
