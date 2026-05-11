/**
 * Convertit le CSV FINESS en JSON aplati prêt pour le géocodage BAN.
 *
 * - Applique la même whitelist de catégories que 02-match.ts.
 * - Champs en anglais, format simplifié (id, name, address, city, postalCode…).
 * - Préserve le `banAddress` existant si on relance après géocodage.
 * - Output : data/raw/finess.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import proj4 from "proj4";
import {
  parseFinessCSV,
  type FinessRecord,
} from "./utils/csv-parser.js";
import {
  extractVilleFromLigneAcheminement,
  extractCodePostalFromLigneAcheminement,
} from "./utils/matching.js";
import type { BanAddress } from "../../../.claude/skills/geocodage/ban-address.js";
import type { DilaPlace } from "../../../.claude/skills/dila/place.js";

const LAMBERT93 =
  "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

export interface FinessPlace {
  id: string;                     // nofinesset
  name: string;                   // rslongue || rs
  address: string;                // numvoie typvoie voie compvoie
  city: string;                   // extrait depuis ligneacheminement
  postalCode: string;             // extrait depuis ligneacheminement
  department: string;             // departement (label)
  departmentCode: string;         // codedepartement
  category: string;               // categetablib
  categoryCode: string;           // categetab
  phone: string;
  siret: string;
  lat: number | null;
  lon: number | null;
  updatedAt: string;              // datemaj (YYYY-MM-DD)
  openedAt: string;               // dateouv (YYYY-MM-DD)
  authorizedAt: string;           // dateautor (YYYY-MM-DD)
  banAddress?: BanAddress | null; // ajouté par geocode:finess (skill geocodage)
  dila?: DilaPlace | null;        // ajouté par enrich:finess-dila (jointure SIRET)
}

const INCLUDED_CATEGORIES = new Set([
  "Appartement de Coordination Thérapeutique (A.C.T.)",
  "Autre Centre d'Accueil",
  "Centre Médico-Psychologique (C.M.P.)",
  "Centre d'Accueil Thérapeutique à temps partiel (C.A.T.T.P.)",
  "Centre de Jour pour Personnes Agées",
  "Centre de Santé",
  "Centre de Vaccination",
  "Centre de Vaccination BCG",
  "Centre de santé sexuelle",
  "Centre gratuit d'information de dépistage et de diagnostic",
  "Centre soins accompagnement prévention addictologie (CSAPA)",
  "Club Equipe de Prévention",
  "Communautés professionnelles territoriales de santé (CPTS)",
  "Ctre.Accueil/ Accomp.Réduc.Risq.Usag. Drogues (C.A.A.R.U.D.)",
  "Equipe Mobile Médico-sociale Précarité (EMMSP)",
  "Etablissement Consultation Protection Infantile",
  "Etablissement Expérimental pour Personnes Agées",
  "Etablissement d'hébergement pour personnes âgées dépendantes",
  "Groupement de coopération sanitaire - Etablissement de santé",
  "Groupement de coopération sanitaire de moyens",
  "Groupement de coopération sanitaire de moyens - Exploitant",
  "Lits Halte Soins Santé (L.H.S.S.)",
  "Lits d'Accueil Médicalisés (L.A.M.)",
  "Maison de Santé pour Maladies Mentales",
  "Maison de santé (L.6223-3)",
  "Maisons Relais - Pensions de Famille",
  "Protection Maternelle et Infantile (P.M.I.)",
  "Résidences autonomie",
  "Service autonomie aide (SAA)",
  "Service autonomie aide et soins (SAAS)",
  "Service d'Accompagnement à la Vie Sociale (S.A.V.S.)",
  "Service d'accompagnement médico-social adultes handicapés",
  "Service de Soins Infirmiers A Domicile (S.S.I.A.D)",
  "Service d'aide et d'accompagnement à domicile aux familles (SAADF)",
]);

function toFinessPlace(
  r: FinessRecord,
  existingBan: Map<string, BanAddress | null>,
  existingDila: Map<string, DilaPlace | null>,
): FinessPlace {
  let lat: number | null = null;
  let lon: number | null = null;
  if (r.coordX && r.coordY) {
    const [la, lo] = proj4(LAMBERT93, "EPSG:4326", [r.coordX, r.coordY]);
    lat = lo;
    lon = la;
  }
  const place: FinessPlace = {
    id: r.nofinesset,
    name: r.rslongue || r.rs,
    address: [r.numvoie, r.typvoie, r.voie, r.compvoie].filter(Boolean).join(" "),
    city: extractVilleFromLigneAcheminement(r.ligneacheminement),
    postalCode: extractCodePostalFromLigneAcheminement(r.ligneacheminement),
    department: r.departement,
    departmentCode: r.codedepartement,
    category: r.categetablib,
    categoryCode: r.categetab,
    phone: r.telephone,
    siret: r.siret,
    lat,
    lon,
    updatedAt: r.datemaj,
    openedAt: r.dateouv,
    authorizedAt: r.dateautor,
  };
  if (existingBan.has(place.id)) {
    place.banAddress = existingBan.get(place.id) ?? null;
  }
  if (existingDila.has(place.id)) {
    place.dila = existingDila.get(place.id) ?? null;
  }
  return place;
}

function main() {
  const FINESS_CSV = "data/finess.csv";
  const OUT = "data/raw/finess.json";

  if (!existsSync(FINESS_CSV)) {
    console.error(`❌ ${FINESS_CSV} manquant. Lance: pnpm download:finess`);
    process.exit(1);
  }

  console.log("📂 Lecture du CSV FINESS…");
  const records = parseFinessCSV(FINESS_CSV);
  console.log(`   ${records.length} établissements lus`);

  const filtered = records.filter((r) => INCLUDED_CATEGORIES.has(r.categetablib));
  console.log(`   ${filtered.length} retenus (whitelist ${INCLUDED_CATEGORIES.size} catégories)`);

  // Préserve les enrichissements (banAddress, dila) si le fichier existe
  const existingBan = new Map<string, BanAddress | null>();
  const existingDila = new Map<string, DilaPlace | null>();
  if (existsSync(OUT)) {
    const prev: FinessPlace[] = JSON.parse(readFileSync(OUT, "utf-8"));
    for (const p of prev) {
      if (p.banAddress !== undefined) existingBan.set(p.id, p.banAddress ?? null);
      if (p.dila !== undefined) existingDila.set(p.id, p.dila ?? null);
    }
    console.log(`   ${existingBan.size} banAddress + ${existingDila.size} dila préservés depuis ${OUT}`);
  }

  const out = filtered.map((r) => toFinessPlace(r, existingBan, existingDila));
  mkdirSync("data/raw", { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`✅ ${out.length} fiches écrites → ${OUT}`);
}

main();
