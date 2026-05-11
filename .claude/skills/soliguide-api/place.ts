import type { BanAddress } from "../geocodage/ban-address.js";

/**
 * Type unique et simplifié pour les fiches Soliguide.
 * Champs en anglais, plats, prêts pour matching/affichage.
 *
 * Source : `ApiPlace` de l'API Soliguide (vendor/soliguide/.../ApiPlace.interface.ts).
 * Utilisé par tous les projets de la toolbox qui consomment Soliguide.
 *
 * `banAddress` est ajouté par la skill `geocodage` (Géoplateforme/BAN).
 */
export interface SoliguidePlace {
  id: string;                    // lieu_id
  name: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  department: string;
  region: string;
  country: string;
  lat: number | null;
  lon: number | null;
  phones: string[];
  email: string;
  website: string;
  categories: string[];          // slugs des services tagués sur la fiche
  url: string;                   // URL publique soliguide.<tld>
  updatedAt: string;             // ISO date
  placeType: "LIEU" | "PARCOURS_MOBILE";
  banAddress?: BanAddress | null; // populé par `geocode.ts` (Géoplateforme)
}

/**
 * Mappe un `ApiPlace` brut vers le type simplifié.
 * - Coords GeoJSON [lon, lat] → champs lat/lon séparés
 * - entity.phones[].phoneNumber → string[]
 * - services_all[].category → string[]
 */
export function toSoliguidePlace(p: any, country: string): SoliguidePlace {
  const coords: [number, number] | undefined = p.position?.location?.coordinates;
  const tld = country === "fr" ? "fr" : country === "es" ? "es" : "ad";
  return {
    id: String(p.lieu_id ?? ""),
    name: p.name ?? "",
    description: p.description ?? "",
    address: p.position?.address ?? p.position?.adresse ?? "",
    city: p.position?.city ?? p.position?.ville ?? "",
    postalCode: p.position?.postalCode ?? p.position?.codePostal ?? "",
    department: p.position?.department ?? p.position?.departement ?? "",
    region: p.position?.region ?? "",
    country: p.position?.country ?? p.country ?? country,
    lat: coords ? coords[1] : null,
    lon: coords ? coords[0] : null,
    phones: (p.entity?.phones ?? [])
      .map((ph: any) => ph?.phoneNumber)
      .filter((s: any): s is string => Boolean(s)),
    email: p.entity?.mail ?? "",
    website: p.entity?.website ?? "",
    categories: (p.services_all ?? [])
      .map((s: any) => s?.category)
      .filter((s: any): s is string => Boolean(s)),
    url: p.seo_url ? `https://soliguide.${tld}/${country}/fiche/${p.seo_url}` : "",
    updatedAt: p.updatedAt ?? "",
    placeType: p.placeType ?? "LIEU",
  };
}
