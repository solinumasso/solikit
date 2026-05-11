/**
 * Type simplifié pour une structure de l'Annuaire Service-Public (DILA).
 * Source : https://api-lannuaire.service-public.fr/
 * Champs en anglais, plats, à plat. Conserve toutes les infos utiles à un matching/enrichissement.
 */
export interface DilaPlace {
  id: string;                  // UUID DILA
  siret: string | null;        // 14 chars — clé de jointure avec FINESS/Sirene
  siren: string | null;        // 9 chars
  name: string;
  description: string;         // `mission` DILA
  category: string;            // pivot[0].type_service_local — ex: "ccas", "mdph", "france_services"
  pivots: string[];            // tous les pivot[].type_service_local
  address: string;             // adresse[0].numero_voie + complements
  postalCode: string;
  city: string;
  cityCode: string;            // INSEE
  country: string;
  lat: number | null;
  lon: number | null;
  phones: string[];            // format E.164 (DILA renvoie déjà "+33...")
  email: string;
  websites: string[];
  hours: any | null;            // raw plage_ouverture (à parser plus tard)
  hoursComment: string;
  partenaire: string;          // origine de la donnée DILA ("data_inclusion", "Ma Boussole Aidants"…)
  url: string;                 // url canonique service-public.gouv.fr
  updatedAt: string;           // ISO
}

/**
 * Mappe un record brut DILA vers DilaPlace simplifié.
 * Les champs DILA sont souvent encodés JSON-en-string (ex: site_internet) ou null.
 */
export function toDilaPlace(raw: any): DilaPlace {
  const parse = <T>(v: any, fallback: T): T => {
    if (v == null) return fallback;
    if (typeof v === "string") {
      try { return JSON.parse(v) as T; } catch { return fallback; }
    }
    return v as T;
  };
  const addresses: any[] = parse(raw.adresse, []);
  const telephones: any[] = parse(raw.telephone, []);
  const websites: any[] = parse(raw.site_internet, []);
  const pivots: any[] = parse(raw.pivot, []);

  const addr = addresses[0] ?? {};
  const lat = parseFloat(addr.latitude);
  const lon = parseFloat(addr.longitude);

  return {
    id: raw.id ?? "",
    siret: raw.siret ?? null,
    siren: raw.siren ?? null,
    name: raw.nom ?? "",
    description: raw.mission ?? "",
    category: pivots[0]?.type_service_local ?? "",
    pivots: pivots.map((p) => p?.type_service_local).filter(Boolean),
    address: [addr.numero_voie, addr.complement1, addr.complement2, addr.service_distribution]
      .filter(Boolean).join(" ").trim(),
    postalCode: addr.code_postal ?? "",
    city: addr.nom_commune ?? "",
    cityCode: raw.code_insee_commune ?? "",
    country: addr.pays ?? "France",
    lat: isNaN(lat) ? null : lat,
    lon: isNaN(lon) ? null : lon,
    phones: telephones.map((t) => t?.valeur).filter(Boolean),
    email: raw.adresse_courriel ?? "",
    websites: websites.map((w) => w?.valeur).filter(Boolean),
    hours: raw.plage_ouverture,        // gardé brut pour parsing futur
    hoursComment: raw.commentaire_plage_ouverture ?? "",
    partenaire: raw.partenaire ?? "",
    url: raw.url_service_public ?? "",
    updatedAt: raw.date_modification_datetime ?? "",
  };
}
