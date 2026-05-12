import * as fs from "fs";
import * as path from "path";

// Générateur pseudo-aléatoire déterministe (LCG) — stable entre les runs
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ─── Données géographiques ───────────────────────────────────────────────────

interface TerritoireRef {
  code: string;
  nom: string;
  epci: { code: string; nom: string };
  departement: { code: string; nom: string };
  region: { code: string; nom: string };
}

const COMMUNES: TerritoireRef[] = [
  { code: "75056", nom: "Paris",        epci: { code: "200054781", nom: "Métropole du Grand Paris" },         departement: { code: "75", nom: "Paris" },             region: { code: "11", nom: "Île-de-France" } },
  { code: "69123", nom: "Lyon",         epci: { code: "200046977", nom: "Métropole de Lyon" },                departement: { code: "69", nom: "Rhône" },             region: { code: "84", nom: "Auvergne-Rhône-Alpes" } },
  { code: "13055", nom: "Marseille",    epci: { code: "200054807", nom: "Métropole Aix-Marseille-Provence" }, departement: { code: "13", nom: "Bouches-du-Rhône" },  region: { code: "93", nom: "Provence-Alpes-Côte d'Azur" } },
  { code: "31555", nom: "Toulouse",     epci: { code: "243100518", nom: "Toulouse Métropole" },               departement: { code: "31", nom: "Haute-Garonne" },     region: { code: "76", nom: "Occitanie" } },
  { code: "59350", nom: "Lille",        epci: { code: "246000749", nom: "Métropole Européenne de Lille" },   departement: { code: "59", nom: "Nord" },              region: { code: "32", nom: "Hauts-de-France" } },
  { code: "06088", nom: "Nice",         epci: { code: "200030195", nom: "Métropole Nice Côte d'Azur" },      departement: { code: "06", nom: "Alpes-Maritimes" },   region: { code: "93", nom: "Provence-Alpes-Côte d'Azur" } },
  { code: "44109", nom: "Nantes",       epci: { code: "244400404", nom: "Nantes Métropole" },                departement: { code: "44", nom: "Loire-Atlantique" },  region: { code: "52", nom: "Pays de la Loire" } },
  { code: "67482", nom: "Strasbourg",   epci: { code: "246700488", nom: "Eurométropole de Strasbourg" },     departement: { code: "67", nom: "Bas-Rhin" },          region: { code: "44", nom: "Grand Est" } },
  { code: "33063", nom: "Bordeaux",     epci: { code: "243300316", nom: "Bordeaux Métropole" },              departement: { code: "33", nom: "Gironde" },           region: { code: "75", nom: "Nouvelle-Aquitaine" } },
  { code: "34172", nom: "Montpellier",  epci: { code: "243400017", nom: "Montpellier Méditerranée" },        departement: { code: "34", nom: "Hérault" },           region: { code: "76", nom: "Occitanie" } },
  { code: "51454", nom: "Reims",        epci: { code: "200004697", nom: "CA Grand Reims" },                  departement: { code: "51", nom: "Marne" },             region: { code: "44", nom: "Grand Est" } },
  { code: "76540", nom: "Rouen",        epci: { code: "200023414", nom: "Métropole Rouen Normandie" },       departement: { code: "76", nom: "Seine-Maritime" },    region: { code: "28", nom: "Normandie" } },
  { code: "38185", nom: "Grenoble",     epci: { code: "200040715", nom: "Grenoble-Alpes-Métropole" },        departement: { code: "38", nom: "Isère" },             region: { code: "84", nom: "Auvergne-Rhône-Alpes" } },
  { code: "14118", nom: "Caen",         epci: { code: "241400114", nom: "Caen la Mer" },                     departement: { code: "14", nom: "Calvados" },          region: { code: "28", nom: "Normandie" } },
  { code: "35238", nom: "Rennes",       epci: { code: "243500139", nom: "Rennes Métropole" },                departement: { code: "35", nom: "Ille-et-Vilaine" },  region: { code: "53", nom: "Bretagne" } },
];

const THEMATIQUES = ["Accueil", "Activités", "Alimentation", "Conseil", "Formation et emploi", "Hébergement et logement", "Hygiène et bien-être", "Matériel", "Santé", "Technologie", "Transport / Mobilité"];

// ─── Génération des indicateurs ───────────────────────────────────────────────

type HistoriquePoint = { mois: string; valeur: number };
type HistoriqueDistributionPoint = { mois: string; valeur: Record<string, number> };
type DistributionEntry = { label: string; pct: number };

interface IndicateurNumerique {
  valeur: number;
  historique: HistoriquePoint[] | null;
}

interface IndicateurDistribution {
  valeur: DistributionEntry[];
  historique: HistoriqueDistributionPoint[];
}

interface IndicateursTerritoire {
  nb_services_alimentaires: IndicateurNumerique;
  taux_ouverture_moyen: IndicateurNumerique;
  taux_ouverture_ete: IndicateurNumerique;
  taux_satures: IndicateurNumerique;
  taux_acces_libre: IndicateurNumerique;
  taux_inscription: IndicateurNumerique;
  taux_rendez_vous: IndicateurNumerique;
  taux_orientation: IndicateurNumerique;
  taux_sans_participation: IndicateurNumerique;
  risque_precarite_alimentaire: IndicateurNumerique;
  nb_recherches_alimentation: IndicateurNumerique;
  part_recherches_alimentation: IndicateurNumerique;
  nb_consultations_alimentation: IndicateurNumerique;
  part_consultations_alimentation: IndicateurNumerique;
  repartition_recherches_thematiques: IndicateurDistribution;
  repartition_consultations_thematiques: IndicateurDistribution;
}

type TypeTerritoire = "commune" | "epci" | "departement" | "region";

interface TerritoireData {
  code: string;
  nom: string;
  type: TypeTerritoire;
  indicateurs: IndicateursTerritoire;
}

const PLAGES: Record<TypeTerritoire, { nbMin: number; nbMax: number }> = {
  commune:     { nbMin: 1,   nbMax: 80 },
  epci:        { nbMin: 10,  nbMax: 200 },
  departement: { nbMin: 20,  nbMax: 400 },
  region:      { nbMin: 50,  nbMax: 1000 },
};

const PLAGES_USAGE: Record<TypeTerritoire, { rechMin: number; rechMax: number }> = {
  commune:     { rechMin: 200,   rechMax: 3000 },
  epci:        { rechMin: 1000,  rechMax: 15000 },
  departement: { rechMin: 5000,  rechMax: 80000 },
  region:      { rechMin: 30000, rechMax: 400000 },
};

// Génère 48 mois de janvier 2022 à décembre 2025
function genererMois(): string[] {
  const mois: string[] = [];
  for (let annee = 2022; annee <= 2025; annee++) {
    for (let m = 1; m <= 12; m++) {
      mois.push(`${annee}-${String(m).padStart(2, "0")}`);
    }
  }
  return mois;
}

const MOIS = genererMois();

function genererHistoriqueNb(rand: () => number, valeurFinale: number): HistoriquePoint[] {
  // Partir d'une valeur initiale ~80% de la valeur finale, progression douce
  const valeurInitiale = valeurFinale * (0.7 + rand() * 0.2);
  return MOIS.map((mois, i) => {
    const progression = i / (MOIS.length - 1);
    const base = valeurInitiale + (valeurFinale - valeurInitiale) * progression;
    const bruit = (rand() - 0.5) * 0.15 * base;
    return { mois, valeur: Math.max(1, Math.round(base + bruit)) };
  });
}

function genererHistoriquePourcentage(
  rand: () => number,
  valeurFinale: number,
  saisonnaliteEte: number,  // -/+ points en juillet-août
  saisonnaliteHiver: number // -/+ points en décembre-janvier
): HistoriquePoint[] {
  return MOIS.map((mois) => {
    const moisNum = parseInt(mois.split("-")[1]);
    let saisonnalite = 0;
    if (moisNum === 7 || moisNum === 8) saisonnalite = saisonnaliteEte;
    if (moisNum === 12 || moisNum === 1) saisonnalite = saisonnaliteHiver;
    const bruit = (rand() - 0.5) * 8;
    const valeur = Math.min(100, Math.max(0, valeurFinale + saisonnalite + bruit));
    return { mois, valeur: Math.round(valeur * 10) / 10 };
  });
}

function genererDistribution(rand: () => number, dominantPct: number): DistributionEntry[] {
  const others = THEMATIQUES.filter(t => t !== "Alimentation").map((label) => ({
    label,
    pct: Math.round((100 - dominantPct) / (THEMATIQUES.length - 1) * (0.5 + rand() * 1.0)),
  }));
  const totalOthers = others.reduce((s, o) => s + o.pct, 0);
  const remaining = 100 - dominantPct;
  const normalized = others.map((o) => ({ label: o.label, pct: Math.round(o.pct * remaining / totalOthers) }));
  return [{ label: "Alimentation", pct: dominantPct }, ...normalized];
}

function genererHistoriqueDistribution(rand: () => number, distribution: DistributionEntry[]): HistoriqueDistributionPoint[] {
  return MOIS.map(mois => {
    const raw = distribution.map(e => ({
      label: e.label,
      v: Math.max(0.5, e.pct + (rand() - 0.5) * e.pct * 0.4),
    }));
    const total = raw.reduce((s, e) => s + e.v, 0);
    const valeur: Record<string, number> = {};
    raw.forEach(e => { valeur[e.label] = Math.round(e.v * 100 / total); });
    return { mois, valeur };
  });
}

function genererIndicateurs(code: string, type: TypeTerritoire): IndicateursTerritoire {
  const rand = seededRandom(hashCode(code + type));
  const { nbMin, nbMax } = PLAGES[type];
  const { rechMin, rechMax } = PLAGES_USAGE[type];

  const nbServices = Math.round(nbMin + rand() * (nbMax - nbMin));
  const tauxOuverture = 40 + rand() * 55;
  const tauxOuvertureEte = Math.max(0, tauxOuverture - 10 - rand() * 20);
  const tauxSatures = 5 + rand() * 40;
  const tauxAccesLibre = 20 + rand() * 55;
  const tauxInscription = 5 + rand() * 35;
  const tauxRendezVous = 5 + rand() * 30;
  const tauxOrientation = 3 + rand() * 20;
  const tauxSansParticipation = 40 + rand() * 50;
  const risquePrecarite = Math.round(rand() * 100);
  const nbRecherches = Math.round(rechMin + rand() * (rechMax - rechMin));
  const partRecherches = 20 + rand() * 40;
  const nbConsultations = Math.round(nbRecherches * (0.25 + rand() * 0.4));
  const partConsultations = 15 + rand() * 35;
  const dominantRech = Math.round(partRecherches);
  const dominantCons = Math.round(partConsultations);

  return {
    nb_services_alimentaires: {
      valeur: nbServices,
      historique: genererHistoriqueNb(rand, nbServices),
    },
    taux_ouverture_moyen: {
      valeur: Math.round(tauxOuverture * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxOuverture, -4, 2),
    },
    taux_ouverture_ete: {
      valeur: Math.round(tauxOuvertureEte * 10) / 10,
      historique: null,
    },
    taux_satures: {
      valeur: Math.round(tauxSatures * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxSatures, 3, -2),
    },
    taux_acces_libre: {
      valeur: Math.round(tauxAccesLibre * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxAccesLibre, 0, 0),
    },
    taux_inscription: {
      valeur: Math.round(tauxInscription * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxInscription, 0, 0),
    },
    taux_rendez_vous: {
      valeur: Math.round(tauxRendezVous * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxRendezVous, 0, 0),
    },
    taux_orientation: {
      valeur: Math.round(tauxOrientation * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxOrientation, 0, 0),
    },
    taux_sans_participation: {
      valeur: Math.round(tauxSansParticipation * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxSansParticipation, 0, 0),
    },
    risque_precarite_alimentaire: {
      valeur: risquePrecarite,
      historique: null,
    },
    nb_recherches_alimentation: {
      valeur: nbRecherches,
      historique: genererHistoriqueNb(rand, nbRecherches),
    },
    part_recherches_alimentation: {
      valeur: Math.round(partRecherches * 10) / 10,
      historique: genererHistoriquePourcentage(rand, partRecherches, 0, 0),
    },
    nb_consultations_alimentation: {
      valeur: nbConsultations,
      historique: genererHistoriqueNb(rand, nbConsultations),
    },
    part_consultations_alimentation: {
      valeur: Math.round(partConsultations * 10) / 10,
      historique: genererHistoriquePourcentage(rand, partConsultations, 0, 0),
    },
    repartition_recherches_thematiques: {
      valeur: genererDistribution(rand, dominantRech),
      historique: genererHistoriqueDistribution(rand, genererDistribution(rand, dominantRech)),
    },
    repartition_consultations_thematiques: {
      valeur: genererDistribution(rand, dominantCons),
      historique: genererHistoriqueDistribution(rand, genererDistribution(rand, dominantCons)),
    },
  };
}

// ─── Construction du JSON final ───────────────────────────────────────────────

const territoires: Record<string, TerritoireData> = {};

// Ensemble des EPCIs, départements, régions déjà traités
const epcisVus = new Set<string>();
const deptsVus = new Set<string>();
const regionsVues = new Set<string>();

for (const commune of COMMUNES) {
  // Commune
  territoires[commune.code] = {
    code: commune.code,
    nom: commune.nom,
    type: "commune",
    indicateurs: genererIndicateurs(commune.code, "commune"),
  };

  // EPCI (une seule fois)
  if (!epcisVus.has(commune.epci.code)) {
    epcisVus.add(commune.epci.code);
    territoires[commune.epci.code] = {
      code: commune.epci.code,
      nom: commune.epci.nom,
      type: "epci",
      indicateurs: genererIndicateurs(commune.epci.code, "epci"),
    };
  }

  // Département (une seule fois)
  if (!deptsVus.has(commune.departement.code)) {
    deptsVus.add(commune.departement.code);
    territoires[commune.departement.code] = {
      code: commune.departement.code,
      nom: `${commune.departement.nom} (${commune.departement.code})`,
      type: "departement",
      indicateurs: genererIndicateurs(commune.departement.code, "departement"),
    };
  }

  // Région (une seule fois)
  if (!regionsVues.has(commune.region.code)) {
    regionsVues.add(commune.region.code);
    territoires[commune.region.code] = {
      code: commune.region.code,
      nom: commune.region.nom,
      type: "region",
      indicateurs: genererIndicateurs(commune.region.code, "region"),
    };
  }
}

const output = {
  communes: COMMUNES,
  territoires,
};

// ─── Écriture du fichier ──────────────────────────────────────────────────────

const outputPath = path.join(process.cwd(), "data", "output", "mock-data.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

const nbTerritoires = Object.keys(territoires).length;
console.log(`✅ mock-data.json généré (${COMMUNES.length} communes, ${nbTerritoires} territoires)`);
