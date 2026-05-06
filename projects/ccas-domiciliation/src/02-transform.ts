/**
 * Croise les données CCAS annuaire service-public × Soliguide
 * Produit les JSON pour le dashboard dans data/output/
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "..", "data", "raw");
const OUTPUT_DIR = join(__dirname, "..", "data", "output");

// --- Types ---

interface SoliguideRow {
  rowId: string;
  "Numéro de la fiche": string;
  "Nom de la structure": string;
  "Adresse postale": string;
  Ville: string;
  "Code Postal": string;
  "Les services": string;
  "Le lien de la fiche soliguide": string;
  Latitude: string;
  Longitude: string;
}

interface AnnuaireRecord {
  id: string;
  nom: string;
  siret: string | null;
  siren: string | null;
  adresse: string | null;
  telephone: string | null;
  adresse_courriel: string | null;
  code_insee_commune: string | null;
  pivot: string | null;
}

interface CcasOutput {
  id: string;
  nom: string;
  commune: string;
  codePostal: string;
  departement: string;
  region: string;
  lat: number | null;
  lng: number | null;
  source: "annuaire";
  dansSoliguide: boolean;
  soliguideId: string | null;
  soliguideUrl: string | null;
  soliguideServices: string[];
  faitDomiciliation: boolean;
}

interface SoliguideOutput {
  id: string;
  nom: string;
  ville: string;
  codePostal: string;
  departement: string;
  lat: number | null;
  lng: number | null;
  services: string[];
  url: string;
  estCcas: boolean;
  matchAnnuaire: boolean;
}

// --- Mapping département → région ---

const DEP_REGION: Record<string, string> = {
  "01": "Auvergne-Rhône-Alpes", "03": "Auvergne-Rhône-Alpes", "07": "Auvergne-Rhône-Alpes",
  "15": "Auvergne-Rhône-Alpes", "26": "Auvergne-Rhône-Alpes", "38": "Auvergne-Rhône-Alpes",
  "42": "Auvergne-Rhône-Alpes", "43": "Auvergne-Rhône-Alpes", "63": "Auvergne-Rhône-Alpes",
  "69": "Auvergne-Rhône-Alpes", "73": "Auvergne-Rhône-Alpes", "74": "Auvergne-Rhône-Alpes",
  "21": "Bourgogne-Franche-Comté", "25": "Bourgogne-Franche-Comté", "39": "Bourgogne-Franche-Comté",
  "58": "Bourgogne-Franche-Comté", "70": "Bourgogne-Franche-Comté", "71": "Bourgogne-Franche-Comté",
  "89": "Bourgogne-Franche-Comté", "90": "Bourgogne-Franche-Comté",
  "22": "Bretagne", "29": "Bretagne", "35": "Bretagne", "56": "Bretagne",
  "18": "Centre-Val de Loire", "28": "Centre-Val de Loire", "36": "Centre-Val de Loire",
  "37": "Centre-Val de Loire", "41": "Centre-Val de Loire", "45": "Centre-Val de Loire",
  "2A": "Corse", "2B": "Corse",
  "08": "Grand Est", "10": "Grand Est", "51": "Grand Est", "52": "Grand Est",
  "54": "Grand Est", "55": "Grand Est", "57": "Grand Est", "67": "Grand Est", "68": "Grand Est", "88": "Grand Est",
  "02": "Hauts-de-France", "59": "Hauts-de-France", "60": "Hauts-de-France",
  "62": "Hauts-de-France", "80": "Hauts-de-France",
  "75": "Île-de-France", "77": "Île-de-France", "78": "Île-de-France",
  "91": "Île-de-France", "92": "Île-de-France", "93": "Île-de-France",
  "94": "Île-de-France", "95": "Île-de-France",
  "11": "Occitanie", "12": "Occitanie", "30": "Occitanie", "31": "Occitanie",
  "32": "Occitanie", "34": "Occitanie", "46": "Occitanie", "48": "Occitanie",
  "65": "Occitanie", "66": "Occitanie", "81": "Occitanie", "82": "Occitanie",
  "14": "Normandie", "27": "Normandie", "50": "Normandie", "61": "Normandie", "76": "Normandie",
  "44": "Pays de la Loire", "49": "Pays de la Loire", "53": "Pays de la Loire",
  "72": "Pays de la Loire", "85": "Pays de la Loire",
  "16": "Nouvelle-Aquitaine", "17": "Nouvelle-Aquitaine", "19": "Nouvelle-Aquitaine",
  "23": "Nouvelle-Aquitaine", "24": "Nouvelle-Aquitaine", "33": "Nouvelle-Aquitaine",
  "40": "Nouvelle-Aquitaine", "47": "Nouvelle-Aquitaine", "64": "Nouvelle-Aquitaine",
  "79": "Nouvelle-Aquitaine", "86": "Nouvelle-Aquitaine", "87": "Nouvelle-Aquitaine",
  "04": "Provence-Alpes-Côte d'Azur", "05": "Provence-Alpes-Côte d'Azur",
  "06": "Provence-Alpes-Côte d'Azur", "13": "Provence-Alpes-Côte d'Azur",
  "83": "Provence-Alpes-Côte d'Azur", "84": "Provence-Alpes-Côte d'Azur",
  "09": "Occitanie",
  // DOM-TOM
  "971": "Guadeloupe", "972": "Martinique", "973": "Guyane",
  "974": "La Réunion", "976": "Mayotte",
};

function getDepartement(codePostal: string): string {
  if (!codePostal) return "??";
  const cp = codePostal.trim();
  if (cp.startsWith("97") || cp.startsWith("98")) return cp.substring(0, 3);
  if (cp.startsWith("20")) {
    const num = parseInt(cp, 10);
    return num >= 20200 ? "2B" : "2A";
  }
  return cp.substring(0, 2);
}

function getRegion(dep: string): string {
  return DEP_REGION[dep] || "Autre";
}

function parseAdresse(adresseJson: string | null): {
  commune: string;
  codePostal: string;
  lat: number | null;
  lng: number | null;
} {
  if (!adresseJson) return { commune: "", codePostal: "", lat: null, lng: null };
  try {
    const arr = JSON.parse(adresseJson);
    if (Array.isArray(arr) && arr.length > 0) {
      const a = arr[0];
      return {
        commune: a.nom_commune || "",
        codePostal: a.code_postal || "",
        lat: a.latitude ? parseFloat(a.latitude) : null,
        lng: a.longitude ? parseFloat(a.longitude) : null,
      };
    }
  } catch {}
  return { commune: "", codePostal: "", lat: null, lng: null };
}

function normaliserNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // --- 1. Charger le CSV Soliguide ---
  console.log("📄 Chargement du CSV Soliguide...");
  const csvContent = readFileSync(
    join(RAW_DIR, "autoexport_soliguide (3).csv"),
    "utf-8"
  );
  const parsed = Papa.parse<SoliguideRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  const soliguideRows = parsed.data;
  console.log(`  ↳ ${soliguideRows.length} structures Soliguide`);

  // --- 2. Charger le JSON annuaire ---
  console.log("📄 Chargement du JSON annuaire...");
  const annuaireRaw: AnnuaireRecord[] = JSON.parse(
    readFileSync(join(RAW_DIR, "ccas-annuaire.json"), "utf-8")
  );
  console.log(`  ↳ ${annuaireRaw.length} CCAS/CIAS dans l'annuaire`);

  // --- 3. Indexer Soliguide par nom normalisé + ville ---
  const soliguideByNomVille = new Map<string, SoliguideRow>();
  const soliguideByVille = new Map<string, SoliguideRow[]>();

  for (const row of soliguideRows) {
    const key = normaliserNom(row["Nom de la structure"] + " " + row.Ville);
    soliguideByNomVille.set(key, row);

    const villeKey = normaliserNom(row.Ville);
    if (!soliguideByVille.has(villeKey)) {
      soliguideByVille.set(villeKey, []);
    }
    soliguideByVille.get(villeKey)!.push(row);
  }

  // --- 4. Croiser annuaire × Soliguide ---
  console.log("🔀 Croisement annuaire × Soliguide...");

  const ccasList: CcasOutput[] = [];
  let matchCount = 0;

  for (const record of annuaireRaw) {
    const { commune, codePostal, lat, lng } = parseAdresse(record.adresse);
    const dep = getDepartement(codePostal);
    const region = getRegion(dep);

    // Chercher un match dans Soliguide
    let match: SoliguideRow | undefined;

    // Essai 1 : nom normalisé + ville
    const nomVilleKey = normaliserNom(record.nom + " " + commune);
    match = soliguideByNomVille.get(nomVilleKey);

    // Essai 2 : chercher par ville et nom partiel
    if (!match) {
      const villeKey = normaliserNom(commune);
      const candidates = soliguideByVille.get(villeKey) || [];
      const normNom = normaliserNom(record.nom);
      match = candidates.find((c) => {
        const normC = normaliserNom(c["Nom de la structure"]);
        return normC.includes(villeKey) || normNom.includes(normaliserNom(c.Ville));
      });
    }

    // Essai 3 : par code postal exact pour les CCAS
    if (!match) {
      const cp = codePostal.trim();
      if (cp) {
        match = soliguideRows.find((r) => {
          if (r["Code Postal"]?.trim() !== cp) return false;
          const rNorm = normaliserNom(r["Nom de la structure"]);
          const aNorm = normaliserNom(record.nom);
          // Même commune dans le nom
          const communeNorm = normaliserNom(commune);
          return (
            rNorm.includes(communeNorm) ||
            aNorm.includes(normaliserNom(r.Ville))
          );
        });
      }
    }

    if (match) matchCount++;

    const services = match
      ? match["Les services"]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    ccasList.push({
      id: record.id,
      nom: record.nom,
      commune,
      codePostal,
      departement: dep,
      region,
      lat,
      lng,
      source: "annuaire",
      dansSoliguide: !!match,
      soliguideId: match ? match["Numéro de la fiche"] : null,
      soliguideUrl: match ? match["Le lien de la fiche soliguide"] : null,
      soliguideServices: services,
      faitDomiciliation: match
        ? services.some((s) => s.toLowerCase().includes("domiciliation"))
        : false,
    });
  }

  console.log(`  ↳ ${matchCount} CCAS matchés avec Soliguide sur ${annuaireRaw.length}`);

  // --- 5. Structures Soliguide (vue Soliguide) ---
  const soliguideList: SoliguideOutput[] = soliguideRows.map((row) => {
    const cp = row["Code Postal"]?.trim() || "";
    const dep = getDepartement(cp);
    const estCcas =
      row["Nom de la structure"].toLowerCase().includes("ccas") ||
      row["Nom de la structure"].toLowerCase().includes("cias") ||
      row["Nom de la structure"].toLowerCase().includes("centre communal");

    return {
      id: row["Numéro de la fiche"],
      nom: row["Nom de la structure"],
      ville: row.Ville,
      codePostal: cp,
      departement: dep,
      lat: row.Latitude ? parseFloat(row.Latitude) : null,
      lng: row.Longitude ? parseFloat(row.Longitude) : null,
      services: row["Les services"]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      url: row["Le lien de la fiche soliguide"],
      estCcas,
      matchAnnuaire: false, // on pourrait enrichir
    };
  });

  // --- 6. Stats ---
  const totalAnnuaire = ccasList.length;
  const totalSoliguide = soliguideList.length;
  const ccasDansSoliguide = ccasList.filter((c) => c.dansSoliguide).length;
  const ccasAvecDom = ccasList.filter((c) => c.faitDomiciliation).length;
  const soliguideEstCcas = soliguideList.filter((s) => s.estCcas).length;
  const soliguideEstAsso = soliguideList.filter((s) => !s.estCcas).length;

  // Stats par département
  const depStats = new Map<
    string,
    { total: number; dansSoliguide: number; avecDom: number }
  >();
  for (const c of ccasList) {
    const key = c.departement;
    if (!depStats.has(key)) depStats.set(key, { total: 0, dansSoliguide: 0, avecDom: 0 });
    const s = depStats.get(key)!;
    s.total++;
    if (c.dansSoliguide) s.dansSoliguide++;
    if (c.faitDomiciliation) s.avecDom++;
  }

  // Stats par région
  const regionStats = new Map<
    string,
    { total: number; dansSoliguide: number; avecDom: number }
  >();
  for (const c of ccasList) {
    const key = c.region;
    if (!regionStats.has(key)) regionStats.set(key, { total: 0, dansSoliguide: 0, avecDom: 0 });
    const s = regionStats.get(key)!;
    s.total++;
    if (c.dansSoliguide) s.dansSoliguide++;
    if (c.faitDomiciliation) s.avecDom++;
  }

  const stats = {
    totalCcasAnnuaire: totalAnnuaire,
    totalSoliguide,
    ccasDansSoliguide,
    tauxCouverture: Math.round((ccasDansSoliguide / totalAnnuaire) * 10000) / 100,
    ccasAvecDomiciliation: ccasAvecDom,
    soliguideEstCcas,
    soliguideEstAsso,
    parDepartement: Object.fromEntries(
      [...depStats.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    ),
    parRegion: Object.fromEntries(
      [...regionStats.entries()].sort((a, b) => b[1].total - a[1].total)
    ),
  };

  // --- 7. Écriture des fichiers ---
  writeFileSync(join(OUTPUT_DIR, "ccas.json"), JSON.stringify(ccasList, null, 2), "utf-8");
  writeFileSync(join(OUTPUT_DIR, "soliguide.json"), JSON.stringify(soliguideList, null, 2), "utf-8");
  writeFileSync(join(OUTPUT_DIR, "stats.json"), JSON.stringify(stats, null, 2), "utf-8");

  console.log("\n📊 Résultats :");
  console.log(`  CCAS annuaire :     ${totalAnnuaire}`);
  console.log(`  Structures Soliguide : ${totalSoliguide} (${soliguideEstCcas} CCAS, ${soliguideEstAsso} assos)`);
  console.log(`  CCAS matchés :      ${ccasDansSoliguide} (${stats.tauxCouverture}%)`);
  console.log(`  CCAS avec domiciliation : ${ccasAvecDom}`);
  console.log(`\n✅ Fichiers générés dans ${OUTPUT_DIR}`);
}

main();
