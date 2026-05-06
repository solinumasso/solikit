// Check du token Soliguide pour un pays donné.
// Usage : pnpm dlx tsx .claude/skills/soliguide-api/check-token.ts <fr|es|ad>
//
// Étape 1 — Lit SOLIGUIDE_TOKEN_<COUNTRY> depuis .env, décode le payload JWT.
// Étape 2 — Tente GET /users/me pour récupérer name, mail, role, status, areas.
// Étape 3 — Si /users/me refuse, tente un POST /new-search/<lang> minimal pour
//           vérifier que le token sait au moins faire des recherches.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const API = "https://api.soliguide.fr";
const SUPPORTED_COUNTRIES = ["fr", "es", "ad"] as const;
type Country = (typeof SUPPORTED_COUNTRIES)[number];

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

const COUNTRY_LOCATION: Record<Country, any> = {
  fr: { label: "France", coordinates: [2.343837, 48.85059], geoType: "pays", geoValue: "fr", country: "fr", slugs: { country: "fr", pays: "fr" } },
  es: { label: "España", coordinates: [-3.705510666436781, 40.41668503452932], geoType: "pays", geoValue: "es", country: "es", slugs: { country: "es", pays: "es" } },
  ad: { label: "Andorra", coordinates: [1.5255804423331272, 42.50583018383308], geoType: "pays", geoValue: "andorra", country: "ad", slugs: { country: "ad", pays: "ad" } },
};

function findEnv(start: string): string {
  let dir = resolve(start);
  while (dir !== "/") {
    const candidate = `${dir}/.env`;
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, "..");
  }
  throw new Error("Aucun .env trouvé en remontant l'arborescence.");
}

function loadToken(envPath: string, country: Country): string {
  const content = readFileSync(envPath, "utf-8");
  const varName = `SOLIGUIDE_TOKEN_${country.toUpperCase()}`;
  const m = content.match(new RegExp(`^${varName}=(.+)$`, "m"));
  if (!m) throw new Error(`${varName} absent dans ${envPath}`);
  return m[1].trim();
}

function decodeJwt(token: string): JwtPayload {
  const part = token.split(".")[1];
  const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
  const json = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  return JSON.parse(json);
}

async function tryUsersMe(token: string): Promise<{ ok: true; data: UsersMe } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${API}/users/me`, { headers: { Authorization: `JWT ${token}` } });
  if (!res.ok) return { ok: false, status: res.status, message: await res.text() };
  return { ok: true, data: (await res.json()) as UsersMe };
}

async function trySearch(token: string, country: Country): Promise<{ ok: true; nbResults: number } | { ok: false; status: number; message: string }> {
  const body = {
    category: "administrative_assistance",
    country,
    location: COUNTRY_LOCATION[country],
    publics: {}, modalities: {}, languages: null,
    placeType: "LIEU", close: null,
    options: { limit: 1, page: 1 },
  };
  const res = await fetch(`${API}/new-search/${country}`, {
    method: "POST",
    headers: { Authorization: `JWT ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, status: res.status, message: await res.text() };
  const data = (await res.json()) as { nbResults: number };
  return { ok: true, nbResults: data.nbResults };
}

async function main() {
  const country = (process.argv[2] ?? "").toLowerCase();
  if (!SUPPORTED_COUNTRIES.includes(country as Country)) {
    console.error(`Usage : pnpm dlx tsx check-token.ts <${SUPPORTED_COUNTRIES.join("|")}>`);
    process.exit(2);
  }
  const c = country as Country;

  console.log(`🔌 Soliguide API — check du token ${c.toUpperCase()}\n`);

  // Étape 1 — Token + JWT
  const envPath = findEnv(process.cwd());
  console.log(`📁 .env : ${envPath}`);
  const token = loadToken(envPath, c);
  const payload = decodeJwt(token);
  console.log(`🆔 user _id : ${payload._id}`);
  if (payload.exp) {
    const remaining = payload.exp - Math.floor(Date.now() / 1000);
    if (remaining < 0) {
      console.log(`❌ Token EXPIRÉ depuis ${Math.abs(Math.round(remaining / 86400))} jours`);
      process.exit(1);
    }
    console.log(`⏳ expire dans ${Math.round(remaining / 86400)} jours`);
  }
  console.log("");

  // Étape 2 — /users/me
  console.log("👤 GET /users/me");
  const me = await tryUsersMe(token);
  if (me.ok) {
    const u = me.data;
    console.log(`   ✅ ${u.name ?? "?"} ${u.lastname ?? ""} <${u.mail ?? "?"}>`);
    console.log(`      role=${u.role}  status=${u.status}`);
    const areas = u.areas ?? {};
    const countries = Object.keys(areas);
    if (countries.length === 0) {
      console.log("      ⚠️  areas vide — pas d'accès géographique.");
    } else {
      console.log(`      🌍 areas accessibles : ${countries.join(", ")}`);
      for (const k of countries) {
        const a = areas[k]!;
        console.log(`         ${k}: ${a.departments?.length ?? 0} dept, ${a.regions?.length ?? 0} reg, ${a.cities?.length ?? 0} cities`);
      }
      if (!countries.includes(c)) {
        console.log(`\n⚠️  Ce token n'a PAS \`areas.${c}\`. Les recherches sur "${c}" renverront 0.`);
        process.exit(1);
      }
    }
    console.log("\n✅ Token OK — accès complet (web/admin).");
    process.exit(0);
  }

  console.log(`   ⚠️  HTTP ${me.status} : ${me.message.slice(0, 120)}`);
  console.log("   (typique d'un token API_USER : /users/me lui est interdit)\n");

  // Étape 3 — /new-search témoin sur le pays cible
  console.log(`🔎 POST /new-search/${c} (témoin sur ${c.toUpperCase()})`);
  const search = await trySearch(token, c);
  if (search.ok) {
    console.log(`   ✅ Auth OK — ${search.nbResults} résultats sur 'administrative_assistance' en ${c.toUpperCase()}.`);
    if (search.nbResults === 0) {
      console.log(`\n⚠️  0 résultat sur cette catégorie en ${c.toUpperCase()}. Soit la base n'a aucun lieu pour ce service`);
      console.log(`   dans ce pays, soit le token n'a pas le scope ${c.toUpperCase()} (mais l'auth passe).`);
    } else {
      console.log(`\n✅ Token API OK pour ${c.toUpperCase()}.`);
    }
    process.exit(0);
  }

  console.log(`   ❌ HTTP ${search.status} : ${search.message.slice(0, 200)}\n`);
  if (search.status === 401) {
    console.log("💡 INVALID_TOKEN — header doit être 'Authorization: JWT <token>' (PAS 'Bearer').");
  } else if (search.status === 403) {
    console.log("💡 FORBIDDEN_API_USER — token sans rôle. Demander à Soliguide d'activer 'API_USER'.");
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
