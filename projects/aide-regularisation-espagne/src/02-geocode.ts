import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INPUT_JSON = join(ROOT, "data/output/oficinas_regularizacion_2026.json");
const CACHE_FILE = join(ROOT, "data/raw/geocoding-cache.json");
const OUTPUT_JSON = INPUT_JSON;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "soliguide-tools/1.0 (yr.achats@gmail.com)";
const RATE_LIMIT_MS = 1100;

type Oficina = {
  id: string;
  tipo: string;
  tipo_label: string;
  nombre: string;
  direccion: string;
  codigo_postal: string;
  ciudad: string;
  provincia: string;
  comunidad_autonoma: string;
  lat?: number;
  lon?: number;
  geocoding_status?: "address" | "postcode" | "city" | "failed";
};

type CacheEntry = {
  lat: number;
  lon: number;
  display_name: string;
  status: "address" | "postcode" | "city" | "failed";
};

type Cache = Record<string, CacheEntry>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function nominatimQuery(q: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=es&addressdetails=0`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.error(`  ⚠️  Nominatim HTTP ${res.status} for "${q}"`);
    return null;
  }
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name };
}

async function geocodeWithFallback(of: Oficina, cache: Cache): Promise<CacheEntry> {
  const queries: { key: string; status: CacheEntry["status"] }[] = [
    { key: `${of.direccion}, ${of.codigo_postal} ${of.ciudad}, España`, status: "address" },
    { key: `${of.codigo_postal} ${of.ciudad}, España`, status: "postcode" },
    { key: `${of.ciudad}, ${of.provincia}, España`, status: "city" },
  ];

  for (const { key, status } of queries) {
    if (cache[key]) return cache[key];
    const result = await nominatimQuery(key);
    await sleep(RATE_LIMIT_MS);
    if (result) {
      const entry: CacheEntry = { ...result, status };
      cache[key] = entry;
      saveCache(cache);
      return entry;
    } else {
      cache[key] = { lat: 0, lon: 0, display_name: "", status: "failed" };
    }
  }
  return { lat: 0, lon: 0, display_name: "", status: "failed" };
}

function loadCache(): Cache {
  if (!existsSync(CACHE_FILE)) return {};
  return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
}

function saveCache(cache: Cache): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

async function main() {
  const json = JSON.parse(readFileSync(INPUT_JSON, "utf-8")) as { metadata: any; oficinas: Oficina[] };
  const oficinas = json.oficinas;
  const cache = loadCache();

  console.log(`📍 Géocodage de ${oficinas.length} oficinas via Nominatim...`);
  console.log(`💾 Cache : ${Object.keys(cache).length} entrées déjà en cache\n`);

  let counts = { address: 0, postcode: 0, city: 0, failed: 0, cached: 0 };
  const t0 = Date.now();

  for (let i = 0; i < oficinas.length; i++) {
    const of = oficinas[i];
    const primaryKey = `${of.direccion}, ${of.codigo_postal} ${of.ciudad}, España`;
    const wasCached = primaryKey in cache && cache[primaryKey].status !== "failed";

    const result = await geocodeWithFallback(of, cache);

    if (result.status === "failed") {
      of.geocoding_status = "failed";
      counts.failed++;
    } else {
      of.lat = result.lat;
      of.lon = result.lon;
      of.geocoding_status = result.status;
      counts[result.status]++;
      if (wasCached) counts.cached++;
    }

    if ((i + 1) % 25 === 0 || i === oficinas.length - 1) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  [${i + 1}/${oficinas.length}] ${elapsed}s — ${of.id} ${of.ciudad}: ${result.status}`);
    }
  }

  json.metadata.geocoded_at = new Date().toISOString().slice(0, 10);
  json.metadata.geocoding = {
    address: counts.address,
    postcode: counts.postcode,
    city: counts.city,
    failed: counts.failed,
  };
  writeFileSync(OUTPUT_JSON, JSON.stringify(json, null, 2), "utf-8");

  console.log(`\n✅ Géocodage terminé en ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`   📍 Adresse précise : ${counts.address}`);
  console.log(`   📮 Code postal     : ${counts.postcode}`);
  console.log(`   🏙️  Ville            : ${counts.city}`);
  console.log(`   ❌ Échec           : ${counts.failed}`);
  console.log(`   ♻️  Depuis cache    : ${counts.cached}`);
  console.log(`\n💾 JSON enrichi sauvegardé : ${OUTPUT_JSON}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
