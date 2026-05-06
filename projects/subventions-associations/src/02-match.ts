/**
 * 02-match.ts
 * Croise les subventions Paris avec les fiches Soliguide.
 * Matching par nom d'association (fuzzy) avec code postal comme filtre secondaire.
 * Produit les JSON pour le dashboard.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import Fuse from "fuse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(__dirname, "../data/raw");
const OUTPUT_DIR = resolve(__dirname, "../data/output");

// --- Types ---

interface SubventionRow {
  "Numéro de dossier": string;
  "Année budgétaire": string;
  Collectivité: string;
  "Nom Bénéficiaire": string;
  "Numéro Siret": string;
  "Objet du dossier": string;
  "Montant voté": string;
  Direction: string;
  "Nature de la subvention": string;
  "Secteurs d'activités définies par l'association": string;
}

interface SoliguideRow {
  "Numéro de la fiche": string;
  "Nom de la structure": string;
  "Adresse postale": string;
  "Code Postal": string;
  Ville: string;
  "Les services": string;
  "Le type de public accueilli": string;
  "Le lien de la fiche soliguide": string;
  Latitude: string;
  Longitude: string;
  "Dernière mise à jour": string;
}

interface Association {
  nom: string;
  nomNormalise: string;
  siret: string;
  subventions: {
    annee: number;
    montant: number;
    objet: string;
    direction: string;
    nature: string;
    secteurs: string;
  }[];
  totalMontant: number;
  anneesActives: number[];
}

interface FicheSoliguide {
  id: string;
  nom: string;
  nomNormalise: string;
  adresse: string;
  codePostal: string;
  services: string;
  publicAccueilli: string;
  lien: string;
  lat: number;
  lng: number;
  derniereMaj: string;
}

interface Match {
  association: Association;
  fiche: FicheSoliguide;
  score: number;
}

// --- Normalisation ---

function normaliserNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprimer accents
    .replace(/[''`]/g, " ")
    .replace(/[-/]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(
      /\b(association|asso|assoc|societe|soc|fondation|federation|fed|collectif|comite|union|ligue|groupement|centre|maison|institut)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extraireCodePostal(texte: string): string[] {
  const matches = texte.match(/\b75\d{3}\b/g);
  return matches ? [...new Set(matches)] : [];
}

// --- Parsing ---

function parseCsv<T>(filePath: string, delimiter = ","): T[] {
  const content = readFileSync(filePath, "utf-8");
  const result = Papa.parse<T>(content, {
    header: true,
    delimiter,
    skipEmptyLines: true,
  });
  if (result.errors.length > 0) {
    console.warn(
      `⚠️  ${result.errors.length} erreurs de parsing dans ${filePath}`
    );
  }
  return result.data;
}

// --- Main ---

function main() {
  console.log("📂 Chargement des données...");

  // Parse subventions (séparateur point-virgule)
  const subventionsRaw = parseCsv<SubventionRow>(
    resolve(RAW_DIR, "subventions-paris.csv"),
    ";"
  );
  console.log(`   Subventions : ${subventionsRaw.length.toLocaleString("fr")} lignes`);

  // Parse Soliguide
  const soliguideRaw = parseCsv<SoliguideRow>(
    resolve(RAW_DIR, "solguide-paris.csv")
  );
  console.log(`   Soliguide : ${soliguideRaw.length.toLocaleString("fr")} fiches`);

  // --- Agréger les subventions par association ---
  console.log("\n🔄 Agrégation des subventions par association...");

  const assosMap = new Map<string, Association>();

  for (const row of subventionsRaw) {
    const nom = row["Nom Bénéficiaire"]?.trim();
    if (!nom) continue;

    const montant = parseFloat(row["Montant voté"]?.replace(/\s/g, "") || "0");
    if (isNaN(montant) || montant <= 0) continue;

    const annee = parseInt(row["Année budgétaire"]);
    if (isNaN(annee)) continue;

    const siret = row["Numéro Siret"]?.trim() || "";
    // Clé : SIRET si dispo, sinon nom normalisé
    const cle = siret || normaliserNom(nom);

    let asso = assosMap.get(cle);
    if (!asso) {
      asso = {
        nom,
        nomNormalise: normaliserNom(nom),
        siret,
        subventions: [],
        totalMontant: 0,
        anneesActives: [],
      };
      assosMap.set(cle, asso);
    }

    asso.subventions.push({
      annee,
      montant,
      objet: row["Objet du dossier"]?.trim() || "",
      direction: row["Direction"]?.trim() || "",
      nature: row["Nature de la subvention"]?.trim() || "",
      secteurs:
        row["Secteurs d'activités définies par l'association"]?.trim() || "",
    });

    asso.totalMontant += montant;
    if (!asso.anneesActives.includes(annee)) {
      asso.anneesActives.push(annee);
    }
  }

  // Trier les années
  for (const asso of assosMap.values()) {
    asso.anneesActives.sort((a, b) => a - b);
  }

  const associations = [...assosMap.values()];
  console.log(`   ${associations.length.toLocaleString("fr")} associations uniques`);

  // Filtrer sur les années récentes (2020+) pour les matchs les plus pertinents
  const assosRecentes = associations.filter((a) =>
    a.anneesActives.some((y) => y >= 2020)
  );
  console.log(
    `   ${assosRecentes.length.toLocaleString("fr")} actives depuis 2020`
  );

  // --- Préparer les fiches Soliguide ---
  console.log("\n📋 Préparation des fiches Soliguide...");

  const fiches: FicheSoliguide[] = soliguideRaw
    .filter((r) => r["Nom de la structure"]?.trim())
    .map((r) => ({
      id: r["Numéro de la fiche"]?.trim(),
      nom: r["Nom de la structure"]?.trim(),
      nomNormalise: normaliserNom(r["Nom de la structure"] || ""),
      adresse: r["Adresse postale"]?.trim() || "",
      codePostal: r["Code Postal"]?.trim() || "",
      services: r["Les services"]?.trim() || "",
      publicAccueilli: r["Le type de public accueilli"]?.trim() || "",
      lien: r["Le lien de la fiche soliguide"]?.trim() || "",
      lat: parseFloat(r["Latitude"]) || 0,
      lng: parseFloat(r["Longitude"]) || 0,
      derniereMaj: r["Dernière mise à jour"]?.trim() || "",
    }));

  console.log(`   ${fiches.length} fiches valides`);

  // --- Fuzzy matching ---
  console.log("\n🔍 Matching en cours...");

  const fuse = new Fuse(fiches, {
    keys: ["nomNormalise"],
    threshold: 0.3, // seuil de tolérance (0 = exact, 1 = tout match)
    includeScore: true,
    minMatchCharLength: 3,
  });

  const matches: Match[] = [];
  const nonTrouvees: Association[] = [];

  for (const asso of assosRecentes) {
    const resultats = fuse.search(asso.nomNormalise);

    if (resultats.length > 0 && resultats[0].score !== undefined) {
      const meilleur = resultats[0];
      const score = 1 - meilleur.score!; // Inverser : 1 = parfait

      if (score >= 0.7) {
        matches.push({
          association: asso,
          fiche: meilleur.item,
          score: Math.round(score * 100) / 100,
        });
      } else {
        nonTrouvees.push(asso);
      }
    } else {
      nonTrouvees.push(asso);
    }
  }

  // Dédupliquer : une fiche Soliguide ne matche qu'une seule asso (la meilleure)
  const ficheVue = new Map<string, Match>();
  for (const m of matches.sort((a, b) => b.score - a.score)) {
    if (!ficheVue.has(m.fiche.id)) {
      ficheVue.set(m.fiche.id, m);
    }
  }
  const matchsUniques = [...ficheVue.values()];

  console.log(`\n✅ Résultats :`);
  console.log(
    `   ${matchsUniques.length} correspondances trouvées`
  );
  console.log(
    `   ${nonTrouvees.length} associations subventionnées non trouvées sur Soliguide`
  );

  // --- Années disponibles ---
  const toutesAnnees = [
    ...new Set(assosRecentes.flatMap((a) => a.anneesActives)),
  ].sort((a, b) => b - a);

  // --- Stats ---
  const stats = {
    totalSubventions: subventionsRaw.length,
    totalAssociations: associations.length,
    associationsRecentes: assosRecentes.length,
    totalFichesSoliguide: fiches.length,
    correspondances: matchsUniques.length,
    nonTrouvees: nonTrouvees.length,
    tauxCorrespondance: Math.round(
      (matchsUniques.length / assosRecentes.length) * 100 * 10
    ) / 10,
    montantTotalSubventions: associations.reduce(
      (s, a) => s + a.totalMontant,
      0
    ),
    montantMatchs: matchsUniques.reduce(
      (s, m) => s + m.association.totalMontant,
      0
    ),
    anneesDisponibles: toutesAnnees,
    topDirections: getTopN(
      assosRecentes.flatMap((a) => a.subventions.map((s) => s.direction)),
      10
    ),
    topSecteurs: getTopN(
      assosRecentes.flatMap((a) =>
        a.subventions
          .map((s) => s.secteurs)
          .filter(Boolean)
          .flatMap((s) => s.split(",").map((x) => x.trim()))
      ),
      10
    ),
  };

  // --- Export JSON ---
  console.log("\n💾 Export des JSON...");

  writeJson("stats.json", stats);

  writeJson(
    "matches.json",
    matchsUniques.map((m) => ({
      associationNom: m.association.nom,
      associationSiret: m.association.siret,
      totalMontant: m.association.totalMontant,
      anneesActives: m.association.anneesActives,
      subventions: m.association.subventions
        .sort((a, b) => b.annee - a.annee),
      ficheId: m.fiche.id,
      ficheNom: m.fiche.nom,
      ficheServices: m.fiche.services,
      ficheLien: m.fiche.lien,
      ficheLat: m.fiche.lat,
      ficheLng: m.fiche.lng,
      ficheDerniereMaj: m.fiche.derniereMaj,
      score: m.score,
    }))
  );

  // Top 200 assos non trouvées (par montant total)
  writeJson(
    "non-trouvees.json",
    nonTrouvees
      .sort((a, b) => b.totalMontant - a.totalMontant)
      .slice(0, 200)
      .map((a) => ({
        nom: a.nom,
        siret: a.siret,
        totalMontant: a.totalMontant,
        anneesActives: a.anneesActives,
        subventions: a.subventions
          .sort((a, b) => b.annee - a.annee),
      }))
  );

  console.log("✅ Terminé !");
}

// --- Helpers ---

function getTopN(
  items: string[],
  n: number
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item) counts.set(item, (counts.get(item) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function writeJson(filename: string, data: unknown) {
  const path = resolve(OUTPUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  console.log(`   → ${path}`);
}

main();
