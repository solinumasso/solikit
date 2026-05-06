import { writeFileSync, existsSync } from "fs";
import proj4 from "proj4";
import {
  parseFinessCSV,
  parseSoliguideCSV,
  type FinessRecord,
  type SoliguideRecord,
} from "./utils/csv-parser.js";
import {
  extractVilleFromLigneAcheminement,
  extractCodePostalFromLigneAcheminement,
  buildFinessAddress,
  normalizeSoliguideAddress,
  normalize,
  computeScore,
  type MatchConfidence,
  type ScoreDetail,
} from "./utils/matching.js";

// Lambert-93 (EPSG:2154) -> WGS84 (EPSG:4326)
const LAMBERT93 =
  "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

function lambert93ToWGS84(x: number, y: number): [number, number] {
  const [lon, lat] = proj4(LAMBERT93, "EPSG:4326", [x, y]);
  return [lat, lon];
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
  }>;
}

async function main() {
  const FINESS_PATH = "data/finess.csv";
  const SOLIGUIDE_PATH = existsSync("data/soliguide.csv")
    ? "data/soliguide.csv"
    : "data/autoexport_soliguide.csv";
  const OUTPUT_PATH = "data/matching-results.json";

  if (!existsSync(FINESS_PATH)) {
    console.error(`Fichier manquant : ${FINESS_PATH}. Lancez: pnpm download`);
    process.exit(1);
  }
  if (!existsSync(SOLIGUIDE_PATH)) {
    console.error(`Fichier manquant : ${SOLIGUIDE_PATH}`);
    process.exit(1);
  }

  // 1. Parse
  console.log("Parsing FINESS...");
  const finessRecords = parseFinessCSV(FINESS_PATH);
  console.log(`  ${finessRecords.length} établissements FINESS`);

  console.log("Parsing Soliguide...");
  const soliguideRecords = parseSoliguideCSV(SOLIGUIDE_PATH);
  console.log(`  ${soliguideRecords.length} structures Soliguide`);

  // 1b. Exclude pharmacies (620), EHPAD (500), laboratoires (611)
  const EXCLUDED_CATEGORIES = new Set(["620", "500", "611"]);
  const beforeFilter = finessRecords.length;
  const filtered = finessRecords.filter((r) => !EXCLUDED_CATEGORIES.has(r.categetab));
  console.log(`  Exclus (pharmacies + EHPAD + labo) : ${beforeFilter - filtered.length}`);
  console.log(`  ${filtered.length} établissements après filtre`);

  // 2. Convert Lambert-93 → WGS84
  console.log("Conversion coordonnées Lambert-93 → WGS84...");
  let geoConverted = 0;
  for (const rec of filtered) {
    if (rec.coordX && rec.coordY) {
      const [lat, lon] = lambert93ToWGS84(rec.coordX, rec.coordY);
      rec.lat = lat;
      rec.lon = lon;
      geoConverted++;
    }
  }
  console.log(`  ${geoConverted} coordonnées converties`);

  // 3. Index by normalized city
  console.log("Indexation par ville...");
  const finessByVille = new Map<string, FinessRecord[]>();
  for (const rec of filtered) {
    const ville = extractVilleFromLigneAcheminement(rec.ligneacheminement);
    if (!ville) continue;
    if (!finessByVille.has(ville)) finessByVille.set(ville, []);
    finessByVille.get(ville)!.push(rec);
  }

  const soliguideByVille = new Map<string, SoliguideRecord[]>();
  for (const rec of soliguideRecords) {
    const ville = normalize(rec.ville);
    if (!ville) continue;
    if (!soliguideByVille.has(ville)) soliguideByVille.set(ville, []);
    soliguideByVille.get(ville)!.push(rec);
  }

  let villesCommunes = 0;
  for (const ville of finessByVille.keys()) {
    if (soliguideByVille.has(ville)) villesCommunes++;
  }
  console.log(`  ${finessByVille.size} villes FINESS, ${soliguideByVille.size} villes Soliguide, ${villesCommunes} en commun`);

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
      const finessName = fRec.rslongue || fRec.rs;
      const finessAddr = buildFinessAddress(fRec);
      const finessPostal = extractCodePostalFromLigneAcheminement(fRec.ligneacheminement);

      let best: { sRec: SoliguideRecord; score: number; confidence: MatchConfidence | null; detail: ScoreDetail } | null = null;

      for (const sRec of soliguideInVille) {
        const sAddr = normalizeSoliguideAddress(sRec.adresse);
        const result = computeScore({
          finessName,
          finessAddress: finessAddr,
          finessPostal,
          finessPhone: fRec.telephone,
          soliguideNom: sRec.nom,
          soliguideAddress: sAddr,
          soliguidePostal: sRec.codePostal,
          soliguidePhone: sRec.telephone,
          finessLat: fRec.lat,
          finessLon: fRec.lon,
          soliguideLat: sRec.lat,
          soliguideLon: sRec.lon,
        });

        if (!best || result.score > best.score) {
          best = { sRec, score: result.score, confidence: result.confidence, detail: result.detail };
        }
      }

      const confidence = best ? best.confidence : null;
      const hasMatch = best && confidence !== null;

      if (!hasMatch) continue; // skip non-matched entries

      const entry: MatchEntry = {
        finess: {
          nofinesset: fRec.nofinesset,
          nom: finessName,
          adresse: [fRec.numvoie, fRec.typvoie, fRec.voie, fRec.compvoie].filter(Boolean).join(" "),
          ville,
          codePostal: finessPostal,
          categorie: fRec.categetablib,
          lat: fRec.lat || null,
          lon: fRec.lon || null,
        },
        soliguide: {
          ficheId: best!.sRec.ficheId,
          nom: best!.sRec.nom,
          adresse: best!.sRec.adresse,
          ville: best!.sRec.ville,
          codePostal: best!.sRec.codePostal,
          lien: best!.sRec.lien,
          lat: best!.sRec.lat,
          lon: best!.sRec.lon,
        },
        scoring: {
          score: best!.score,
          confidence: confidence!,
          detail: best!.detail,
        },
      };

      matchedSoliguideIds.add(best!.sRec.ficheId);
      matchedFinessIds.add(fRec.nofinesset);
      counts[confidence!]++;
      matches.push(entry);
    }
  }

  // 5a. FINESS non matchées
  const finessNonMatchees = filtered
    .filter((r) => !matchedFinessIds.has(r.nofinesset))
    .map((r) => {
      const ville = extractVilleFromLigneAcheminement(r.ligneacheminement);
      const cp = extractCodePostalFromLigneAcheminement(r.ligneacheminement);
      return {
        nofinesset: r.nofinesset,
        nom: r.rslongue || r.rs,
        adresse: [r.numvoie, r.typvoie, r.voie, r.compvoie].filter(Boolean).join(" "),
        ville,
        codePostal: cp,
        categorie: r.categetablib,
        lat: r.lat || null,
        lon: r.lon || null,
      };
    });

  // 5b. Soliguide non matchées
  const soliguideNonMatchees = soliguideRecords
    .filter((s) => !matchedSoliguideIds.has(s.ficheId))
    .map((s) => ({
      ficheId: s.ficheId,
      nom: s.nom,
      adresse: s.adresse,
      ville: s.ville,
      codePostal: s.codePostal,
      lien: s.lien,
      lat: s.lat,
      lon: s.lon,
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
  console.log(`FINESS : ${filtered.length} (${beforeFilter - filtered.length} pharmacies exclues)`);
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
