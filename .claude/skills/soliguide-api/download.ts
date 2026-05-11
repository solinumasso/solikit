/**
 * 📡 Script CLI générique pour télécharger des fiches Soliguide.
 *
 * Usage :
 *   pnpm dlx tsx .claude/skills/soliguide-api/download.ts \
 *     --country fr \
 *     --categories health,mental_health,sexual_health \
 *     --out projects/integration-sante/data/raw/soliguide.json
 *
 * Le token JWT est lu depuis `.env` (variable `SOLIGUIDE_TOKEN_<PAYS>`).
 * Le fichier de sortie contient un tableau de `SoliguidePlace` (place.ts).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { toSoliguidePlace, type SoliguidePlace } from "./place.js";

// ── Args ──────────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    country: { type: "string" },
    categories: { type: "string" },
    out: { type: "string" },
    limit: { type: "string", default: "200" },
    placeType: { type: "string", default: "both" }, // LIEU | PARCOURS_MOBILE | both
  },
});

const country = values.country;
const categoriesArg = values.categories;
const outPath = values.out;
const pageLimit = Number(values.limit);
const placeTypeArg = values.placeType as "LIEU" | "PARCOURS_MOBILE" | "both";

if (!country || !categoriesArg || !outPath) {
  console.error("❌ Args requis : --country <fr|es|ad> --categories <slug1,slug2,...> --out <path>");
  console.error("   Optionnels : --limit <n=200> --placeType <LIEU|PARCOURS_MOBILE|both=both>");
  process.exit(1);
}

const categories = categoriesArg.split(",").map((s) => s.trim()).filter(Boolean);
const placeTypes: Array<"LIEU" | "PARCOURS_MOBILE"> =
  placeTypeArg === "both" ? ["LIEU", "PARCOURS_MOBILE"] : [placeTypeArg];

// ── Token ─────────────────────────────────────────────────────────────────────

function findEnvFile(): string {
  let dir = process.cwd();
  while (dir !== "/") {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error(".env introuvable (cherché en remontant depuis " + process.cwd() + ")");
}

const envPath = findEnvFile();
const env = readFileSync(envPath, "utf-8");
const tokenVar = `SOLIGUIDE_TOKEN_${country.toUpperCase()}`;
const tokenMatch = env.match(new RegExp(`^${tokenVar}=(.+)$`, "m"));
if (!tokenMatch) {
  console.error(`❌ ${tokenVar} manquant dans ${envPath}`);
  process.exit(1);
}
const TOKEN = tokenMatch[1].trim();

// ── Location pays (centre + slugs) ───────────────────────────────────────────

const COUNTRY_LOCATIONS: Record<string, any> = {
  fr: { label: "France", coordinates: [2.3438, 48.8506] },
  es: { label: "España", coordinates: [-3.7055, 40.4167] },
  ad: { label: "Andorra", coordinates: [1.5218, 42.5063] },
};
const cl = COUNTRY_LOCATIONS[country];
if (!cl) {
  console.error(`❌ Pays inconnu : ${country}`);
  process.exit(1);
}
const location = {
  ...cl,
  geoType: "pays",
  geoValue: country,
  country,
  slugs: { pays: country, country },
  areas: { pays: country, country },
  distance: 10,
};

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchPage(page: number, limit: number, placeType: "LIEU" | "PARCOURS_MOBILE") {
  const r = await fetch(`https://api.soliguide.fr/new-search/${country}`, {
    method: "POST",
    headers: { Authorization: `JWT ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      categories,
      country,
      location,
      publics: {},
      modalities: {},
      languages: null,
      placeType,
      close: null,
      options: { limit, page },
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} : ${await r.text()}`);
  return r.json() as Promise<{ nbResults: number; places: any[] }>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`📡 Soliguide API — ${country} — ${categories.length} catégorie(s)`);
  console.log(`   ${categories.join(", ")}`);
  console.log("");

  const seen = new Set<string>();
  const out: SoliguidePlace[] = [];

  for (const placeType of placeTypes) {
    console.log(`▶ ${placeType}`);
    let page = 1;
    let total = 0;
    while (true) {
      const r = await fetchPage(page, pageLimit, placeType);
      total = r.nbResults;
      const totalPages = Math.max(1, Math.ceil(total / pageLimit));

      let added = 0;
      for (const p of r.places) {
        const place = toSoliguidePlace({ ...p, placeType }, country);
        if (place.id && !seen.has(place.id)) {
          seen.add(place.id);
          out.push(place);
          added++;
        }
      }

      const pct = total > 0 ? Math.round((Math.min(page * pageLimit, total) / total) * 100) : 100;
      const bar = "█".repeat(Math.floor(pct / 5)).padEnd(20, "░");
      const fetchedSoFar = Math.min(page * pageLimit, total);
      console.log(
        `  Page ${String(page).padStart(2)}/${totalPages} ${bar} ${pct.toString().padStart(3)}%  ` +
        `+${added.toString().padStart(3)} fiches  (cumul ${out.length}/${total} ${placeType})`
      );

      if (r.places.length === 0 || fetchedSoFar >= total) break;
      page++;
    }
    console.log(`  ✅ ${total} fiches ${placeType}\n`);
  }

  mkdirSync(dirname(outPath!), { recursive: true });
  writeFileSync(outPath!, JSON.stringify(out, null, 2));
  console.log(`🎉 ${out.length} fiches uniques écrites → ${outPath}`);
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
