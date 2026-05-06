import Papa from "papaparse";
import { readFileSync } from "fs";

export interface FinessRecord {
  nofinesset: string;
  nofinessej: string;
  rs: string; // raison sociale courte
  rslongue: string; // raison sociale longue
  numvoie: string;
  typvoie: string;
  voie: string;
  compvoie: string;
  compldistrib: string;
  codedepartement: string;
  departement: string;
  ligneacheminement: string; // ex: "01300 BELLEY"
  telephone: string;
  categetab: string;
  categetablib: string;
  siret: string;
  codeape: string;
  dateouv: string;
  dateautor: string;
  datemaj: string;
  // Geolocalisation (from separate rows)
  coordX?: number;
  coordY?: number;
  lat?: number;
  lon?: number;
}

export interface SoliguideRecord {
  rowId: string;
  ficheId: string;
  dateMaj: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
  email: string;
  telephone: string;
  services: string;
  lien: string;
  lat: number | null;
  lon: number | null;
}

// FINESS CSV columns (separator ;, first line is metadata, no header row)
// Column indices (0-based) for structureet rows:
const FINESS_COLS = {
  type: 0, // "structureet"
  nofinesset: 1,
  nofinessej: 2,
  rs: 3,
  rslongue: 4,
  complrs: 5,
  compldistrib: 6,
  numvoie: 7,
  typvoie: 8,
  voie: 9,
  compvoie: 10,
  lieuditbp: 11,
  commune: 12,
  codedepartement: 13,
  departement: 14,
  ligneacheminement: 15,
  telephone: 16,
  telecopie: 17,
  categetab: 18,
  categetablib: 19,
  categagetab: 20,
  categagetablib: 21,
  siret: 22,
  codeape: 23,
  codemft: 24,
  libmft: 25,
  codesph: 26,
  libsph: 27,
  dateouv: 28,
  dateautor: 29,
  datemaj: 30,
};

export function parseFinessCSV(filePath: string): FinessRecord[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Skip first line (metadata: "finess;etalab;96;2026-03-11")
  const structureLines: string[] = [];
  const geoMap = new Map<string, { x: number; y: number }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("structureet;")) {
      structureLines.push(line);
    } else if (line.startsWith("geolocalisation;")) {
      const parts = line.split(";");
      const nofinesset = parts[1];
      const x = parseFloat(parts[2]);
      const y = parseFloat(parts[3]);
      if (nofinesset && !isNaN(x) && !isNaN(y)) {
        geoMap.set(nofinesset, { x, y });
      }
    }
  }

  const records: FinessRecord[] = [];

  for (const line of structureLines) {
    const cols = line.split(";");

    const record: FinessRecord = {
      nofinesset: cols[FINESS_COLS.nofinesset] || "",
      nofinessej: cols[FINESS_COLS.nofinessej] || "",
      rs: cols[FINESS_COLS.rs] || "",
      rslongue: cols[FINESS_COLS.rslongue] || "",
      numvoie: cols[FINESS_COLS.numvoie] || "",
      typvoie: cols[FINESS_COLS.typvoie] || "",
      voie: cols[FINESS_COLS.voie] || "",
      compvoie: cols[FINESS_COLS.compvoie] || "",
      compldistrib: cols[FINESS_COLS.lieuditbp] || "",
      codedepartement: cols[FINESS_COLS.codedepartement] || "",
      departement: cols[FINESS_COLS.departement] || "",
      ligneacheminement: cols[FINESS_COLS.ligneacheminement] || "",
      telephone: cols[FINESS_COLS.telephone] || "",
      categetab: cols[FINESS_COLS.categetab] || "",
      categetablib: cols[FINESS_COLS.categetablib] || "",
      siret: cols[FINESS_COLS.siret] || "",
      codeape: cols[FINESS_COLS.codeape] || "",
      dateouv: cols[FINESS_COLS.dateouv] || "",
      dateautor: cols[FINESS_COLS.dateautor] || "",
      datemaj: cols[FINESS_COLS.datemaj] || "",
    };

    // Attach geo data if available
    const geo = geoMap.get(record.nofinesset);
    if (geo) {
      record.coordX = geo.x;
      record.coordY = geo.y;
    }

    records.push(record);
  }

  return records;
}

export function parseSoliguideCSV(filePath: string): SoliguideRecord[] {
  const content = readFileSync(filePath, "utf-8");

  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row: any) => ({
    rowId: row["rowId"] || "",
    ficheId: row["Numéro de la fiche"] || "",
    dateMaj: row["Dernière mise à jour"] || "",
    nom: row["Nom de la structure"] || "",
    adresse: row["Adresse postale"] || "",
    ville: row["Ville"] || "",
    codePostal: row["Code Postal"] || "",
    email: row["L'adresse email"] || "",
    telephone: row["Numéros de téléphone"] || "",
    services: row["Les services"] || "",
    lien: row["Le lien de la fiche soliguide"] || "",
    lat: row["Latitude"] ? parseFloat(row["Latitude"]) : null,
    lon: row["Longitude"] ? parseFloat(row["Longitude"]) : null,
  }));
}
