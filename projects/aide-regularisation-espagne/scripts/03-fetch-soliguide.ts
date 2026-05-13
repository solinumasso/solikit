// Récupère les fiches Soliguide d'un pays avec service "Conseil administratif".
// Pipeline en 3 étapes :
//   1. Check token (lit SOLIGUIDE_TOKEN_<PAYS> + JWT décodé + auth via /users/me ou /new-search témoin)
//   2. Check scope (le pays cible est-il dans `areas` quand /users/me marche ?)
//   3. Fetch (paginé, sur LIEU et PARCOURS_MOBILE, dédupliqué par lieu_id)
//
// Usage : pnpm soliguide [es|fr|ad]   (défaut : es pour ce projet)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, "../../.env");

const API = "https://api.soliguide.fr";
const CATEGORY = "administrative_assistance";
const CATEGORY_LABEL = "Conseil administratif";
const PLACE_TYPES = ["LIEU", "PARCOURS_MOBILE"] as const;
const PAGE_SIZE = 100;
const SUPPORTED_COUNTRIES = ["fr", "es", "ad"] as const;
type Country = (typeof SUPPORTED_COUNTRIES)[number];

const COUNTRY_LOCATION: Record<Country, any> = {
  fr: {
    label: "France",
    coordinates: [2.343837, 48.85059],
    geoType: "pays",
    geoValue: "fr",
    country: "fr",
    slugs: { pays: "fr", country: "fr" },
    areas: { pays: "fr", country: "fr" },
    distance: 10,
  },
  es: {
    label: "España",
    coordinates: [-3.705510666436781, 40.41668503452932],
    geoType: "pays",
    geoValue: "es",
    country: "es",
    slugs: { pays: "es", country: "es" },
    areas: { pays: "es", country: "es" },
    distance: 10,
  },
  ad: {
    label: "Andorra",
    coordinates: [1.5255804423331272, 42.50583018383308],
    geoType: "pays",
    geoValue: "andorra",
    country: "ad",
    slugs: { pays: "ad", country: "ad" },
    areas: { pays: "ad", country: "ad" },
    distance: 10,
  },
};

type JwtPayload = { _id?: string; iat?: number; exp?: number };
type UsersMe = {
  _id: string;
  name?: string;
  lastname?: string;
  mail?: string;
  role?: string;
  status?: string;
  areas?: Record<string, { departments?: string[]; regions?: string[]; cities?: string[] }>;
};
type ApiPlace = Record<string, any>;
type SearchResponse = { nbResults: number; places: ApiPlace[] };

function parseCountryArg(): Country {
  const arg = (process.argv[2] ?? "es").toLowerCase();
  if (!SUPPORTED_COUNTRIES.includes(arg as Country)) {
    console.error(`Pays invalide : "${arg}". Utiliser : ${SUPPORTED_COUNTRIES.join(" | ")}`);
    process.exit(2);
  }
  return arg as Country;
}

function loadToken(country: Country): string {
  const env = readFileSync(ENV_PATH, "utf-8");
  const varName = `SOLIGUIDE_TOKEN_${country.toUpperCase()}`;
  const m = env.match(new RegExp(`^${varName}=(.+)$`, "m"));
  if (!m) throw new Error(`${varName} introuvable dans ${ENV_PATH}`);
  return m[1].trim();
}

function decodeJwt(token: string): JwtPayload {
  const part = token.split(".")[1];
  const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
  const json = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  return JSON.parse(json);
}

async function api(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `JWT ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

// ---------- Étape 1 : check du token ----------

async function step1CheckToken(token: string, country: Country): Promise<UsersMe | null> {
  console.log("\n━━━ Étape 1 — Check du token ━━━");
  const payload = decodeJwt(token);
  console.log(`  🆔 user _id : ${payload._id}`);
  if (payload.exp) {
    const remaining = payload.exp - Math.floor(Date.now() / 1000);
    if (remaining < 0) throw new Error(`Token EXPIRÉ depuis ${Math.abs(Math.round(remaining / 86400))} jours`);
    console.log(`  ⏳ expire dans ${Math.round(remaining / 86400)} jours`);
  }

  const meRes = await api("/users/me", token);
  if (meRes.ok) {
    const me = (await meRes.json()) as UsersMe;
    console.log(`  ✅ /users/me OK — ${me.name ?? "?"} ${me.lastname ?? ""} <${me.mail ?? "?"}> (${me.role}/${me.status})`);
    return me;
  }
  console.log(`  ⚠️  /users/me HTTP ${meRes.status} (typique d'un token API_USER)`);

  const probe = await api(`/new-search/${country}`, token, {
    method: "POST",
    body: JSON.stringify({
      category: CATEGORY,
      country,
      location: COUNTRY_LOCATION[country],
      publics: {}, modalities: {}, languages: null, placeType: "LIEU", close: null,
      options: { limit: 1, page: 1 },
    }),
  });
  if (!probe.ok) throw new Error(`Auth-check ${country.toUpperCase()} a échoué : HTTP ${probe.status} ${await probe.text()}`);
  const data = (await probe.json()) as SearchResponse;
  console.log(`  ✅ /new-search/${country} OK — ${data.nbResults} résultats témoins`);
  return null;
}

// ---------- Étape 2 : check du scope ----------

function step2CheckScope(me: UsersMe | null, country: Country): void {
  console.log("\n━━━ Étape 2 — Check du scope ━━━");
  if (!me) {
    console.log(`  ℹ️  Pas d'accès à /users/me → on ignore les \`areas\` et on tente la recherche directement.`);
    return;
  }
  const areas = me.areas ?? {};
  const countries = Object.keys(areas);
  console.log(`  🌍 Pays accessibles : ${countries.length ? countries.join(", ") : "(aucun)"}`);
  if (!countries.includes(country)) {
    throw new Error(
      `Le token n'a pas accès au pays "${country}" (areas: ${JSON.stringify(countries)}). ` +
      `Demande à Soliguide d'élargir tes \`areas\` à "${country}".`,
    );
  }
  const a = areas[country]!;
  console.log(`  ✅ "${country}" autorisé (${a.departments?.length ?? 0} dept, ${a.regions?.length ?? 0} reg, ${a.cities?.length ?? 0} cities)`);
}

// ---------- Étape 3 : fetch paginé ----------

async function searchPage(token: string, country: Country, placeType: string, page: number): Promise<SearchResponse> {
  const body = {
    category: CATEGORY,
    label: CATEGORY_LABEL,
    word: null,
    location: COUNTRY_LOCATION[country],
    country,
    publics: {}, modalities: {}, languages: null,
    placeType,
    close: null,
    options: { limit: PAGE_SIZE, page },
  };
  const res = await api(`/new-search/${country}`, token, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<SearchResponse>;
}

async function step3Fetch(token: string, country: Country): Promise<ApiPlace[]> {
  console.log("\n━━━ Étape 3 — Fetch des fiches ━━━");
  console.log(`  📂 ${CATEGORY} | 🌍 ${country.toUpperCase()} | 🏢 ${PLACE_TYPES.join(" + ")}`);
  const seen = new Set<number>();
  const all: ApiPlace[] = [];

  for (const placeType of PLACE_TYPES) {
    let page = 1;
    let pageNbResults = 0;
    while (true) {
      const res = await searchPage(token, country, placeType, page);
      pageNbResults = res.nbResults;
      const newOnes = res.places.filter((p) => !seen.has(p.lieu_id));
      newOnes.forEach((p) => seen.add(p.lieu_id));
      all.push(...newOnes);
      console.log(`  ▸ ${placeType} p${page}: ${res.places.length} reçus (${newOnes.length} nouveaux) — total cumulé ${all.length}`);
      if (res.places.length === 0 || res.places.length < PAGE_SIZE) break;
      page++;
    }
    if (pageNbResults === 0) console.log(`     (rien sur ${placeType})`);
  }
  return all;
}

// ---------- main ----------

async function main() {
  const country = parseCountryArg();
  console.log(`🔌 Soliguide — pipeline aide-regularisation-${country === "es" ? "espagne" : country}`);
  const token = loadToken(country);

  const me = await step1CheckToken(token, country);
  step2CheckScope(me, country);
  const places = await step3Fetch(token, country);

  const outputFile = join(ROOT, `data/output/soliguide-conseil-administratif-${country}.json`);
  const out = {
    metadata: {
      title: `Lieux Soliguide — ${CATEGORY_LABEL} (${country.toUpperCase()})`,
      source: `${API}/new-search/${country}`,
      category: CATEGORY,
      country,
      place_types: PLACE_TYPES,
      fetched_at: new Date().toISOString().slice(0, 10),
      total: places.length,
    },
    places,
  };
  writeFileSync(outputFile, JSON.stringify(out, null, 2), "utf-8");

  console.log(`\n✅ ${places.length} lieux sauvegardés`);
  console.log(`💾 ${outputFile}`);
}

main().catch((e: Error) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
