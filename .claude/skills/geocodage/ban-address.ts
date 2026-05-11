/**
 * Type unique pour une adresse normalisée via la BAN (Géoplateforme).
 * Source : https://data.geopf.fr/geocodage/search
 *
 * Utilisé par tous les projets qui ont besoin d'une adresse propre + géocodée.
 */
export interface BanAddress {
  label: string;          // "25 Boulevard de Picpus 75012 Paris"
  score: number;          // 0..1 — confiance du géocodage
  housenumber: string;    // "25"
  street: string;         // "Boulevard de Picpus"
  postcode: string;       // "75012"
  city: string;           // "Paris"
  citycode: string;       // INSEE — "75112"
  context: string;        // "75, Paris, Île-de-France"
  lat: number;
  lon: number;
}

/**
 * Réponse Géoplateforme : GeoJSON FeatureCollection.
 * Mappe la 1re feature vers un BanAddress, ou null si pas de résultat.
 */
export function pickBestBanAddress(geojson: any): BanAddress | null {
  const feat = geojson?.features?.[0];
  if (!feat) return null;
  const p = feat.properties ?? {};
  const coords = feat.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  return {
    label: p.label ?? "",
    score: typeof p.score === "number" ? p.score : 0,
    housenumber: p.housenumber ?? "",
    street: p.street ?? p.name ?? "",
    postcode: p.postcode ?? "",
    city: p.city ?? "",
    citycode: p.citycode ?? "",
    context: p.context ?? "",
    lat: coords[1],
    lon: coords[0],
  };
}
