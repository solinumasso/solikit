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

const CATEGORIES = ["Alimentation", "Hébergement", "Santé", "Emploi", "Administratif", "Petite enfance", "Hygiène", "Transport"];

// ─── Génération des indicateurs ───────────────────────────────────────────────

type HistoriquePoint = { mois: string; valeur: number };

interface IndicateurNumerique {
  valeur: number;
  historique: HistoriquePoint[];
}

interface IndicateurCategories {
  valeur: string[];
  historique: null;
}

interface IndicateursTerritoire {
  nb_services_alimentaires: IndicateurNumerique;
  taux_ouverture: IndicateurNumerique;
  taux_saturation: IndicateurNumerique;
  top_categories: IndicateurCategories;
}

type TypeTerritoire = "commune" | "epci" | "departement" | "region";

interface TerritoireData {
  code: string;
  nom: string;
  type: TypeTerritoire;
  indicateurs: IndicateursTerritoire;
}

// Plages de valeurs selon le type de territoire
const PLAGES: Record<TypeTerritoire, { nbMin: number; nbMax: number }> = {
  commune:     { nbMin: 1,   nbMax: 80 },
  epci:        { nbMin: 10,  nbMax: 200 },
  departement: { nbMin: 20,  nbMax: 400 },
  region:      { nbMin: 50,  nbMax: 1000 },
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

function genererTopCategories(rand: () => number): string[] {
  const shuffled = [...CATEGORIES].sort(() => rand() - 0.5);
  return shuffled.slice(0, 3);
}

function genererIndicateurs(code: string, type: TypeTerritoire): IndicateursTerritoire {
  const rand = seededRandom(hashCode(code + type));
  const { nbMin, nbMax } = PLAGES[type];

  const nbServices = Math.round(nbMin + rand() * (nbMax - nbMin));
  const tauxOuverture = 40 + rand() * 55;
  const tauxSaturation = 30 + rand() * 60;

  return {
    nb_services_alimentaires: {
      valeur: nbServices,
      historique: genererHistoriqueNb(rand, nbServices),
    },
    taux_ouverture: {
      valeur: Math.round(tauxOuverture * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxOuverture, -4, 2),
    },
    taux_saturation: {
      valeur: Math.round(tauxSaturation * 10) / 10,
      historique: genererHistoriquePourcentage(rand, tauxSaturation, -3, 6),
    },
    top_categories: {
      valeur: genererTopCategories(rand),
      historique: null,
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
