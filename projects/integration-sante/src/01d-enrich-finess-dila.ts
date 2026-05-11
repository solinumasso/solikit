/**
 * Enrichit data/raw/finess.json avec les données DILA (Annuaire Service-Public)
 * via une jointure exacte sur le SIRET.
 *
 * Apporte côté FINESS :
 *  - website(s), email, téléphones format E.164
 *  - mission (description longue)
 *  - horaires d'ouverture (raw, à parser plus tard)
 *  - URL canonique service-public.gouv.fr
 *
 * Pré-requis :
 *   pnpm finess:to-json    (data/raw/finess.json)
 *   pnpm download:dila     (data/raw/dila.json)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { FinessPlace } from "./01c-finess-to-json.js";
import type { DilaPlace } from "../../../.claude/skills/dila/place.js";

const FINESS_PATH = "data/raw/finess.json";
const DILA_PATH = "data/raw/dila.json";

if (!existsSync(FINESS_PATH)) {
  console.error(`❌ ${FINESS_PATH} manquant. Lance: pnpm finess:to-json`);
  process.exit(1);
}
if (!existsSync(DILA_PATH)) {
  console.error(`❌ ${DILA_PATH} manquant. Lance: pnpm download:dila`);
  process.exit(1);
}

interface FinessPlaceEnriched extends FinessPlace {
  dila?: DilaPlace | null;
}

console.log("📂 Lecture FINESS + DILA…");
const finess: FinessPlaceEnriched[] = JSON.parse(readFileSync(FINESS_PATH, "utf-8"));
const dila: DilaPlace[] = JSON.parse(readFileSync(DILA_PATH, "utf-8"));
console.log(`   FINESS : ${finess.length} fiches`);
console.log(`   DILA   : ${dila.length} fiches`);

// Index DILA par SIRET pour jointure O(1)
const dilaBySiret = new Map<string, DilaPlace>();
let dilaWithSiret = 0;
for (const d of dila) {
  if (d.siret) {
    dilaBySiret.set(d.siret, d);
    dilaWithSiret++;
  }
}
console.log(`   DILA avec SIRET : ${dilaWithSiret}/${dila.length}`);

// Jointure
let finessWithSiret = 0;
let joined = 0;
for (const f of finess) {
  if (!f.siret) continue;
  finessWithSiret++;
  const match = dilaBySiret.get(f.siret);
  if (match) {
    f.dila = match;
    joined++;
  } else if (f.dila === undefined) {
    f.dila = null;
  }
}

console.log("");
console.log(`🔗 Jointure SIRET :`);
console.log(`   FINESS avec SIRET : ${finessWithSiret}/${finess.length}`);
console.log(`   Matches DILA      : ${joined}`);

// Quelques stats utiles
let withWebsite = 0, withEmail = 0, withHours = 0, withPhones = 0, withMission = 0;
for (const f of finess) {
  if (!f.dila) continue;
  if (f.dila.websites.length > 0) withWebsite++;
  if (f.dila.email) withEmail++;
  if (f.dila.hours) withHours++;
  if (f.dila.phones.length > 0) withPhones++;
  if (f.dila.description && f.dila.description.length > 50) withMission++;
}
console.log("");
console.log(`📦 Champs DILA propagés (sur ${joined} matches) :`);
console.log(`   🌐 website   : ${withWebsite}`);
console.log(`   ✉️  email    : ${withEmail}`);
console.log(`   📞 phones    : ${withPhones}`);
console.log(`   🕒 hours     : ${withHours}`);
console.log(`   📝 mission   : ${withMission}`);

writeFileSync(FINESS_PATH, JSON.stringify(finess, null, 2));
console.log(`\n✅ ${FINESS_PATH} mis à jour.`);
