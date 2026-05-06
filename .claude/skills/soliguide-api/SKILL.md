---
name: soliguide-api
description: Construire et exécuter une recherche dans l'API Soliguide en mode tunnel guidé (vérification du token, lecture des `areas` autorisées, choix du pays, de la zone géographique, des catégories). À utiliser dès qu'un projet a besoin de récupérer des fiches Soliguide (lieux, services solidaires) ou que l'utilisateur dit "récupère les lieux Soliguide", "fiches Soliguide", "API Soliguide", "appelle Soliguide".
---

# 🔌 Soliguide API — assistant guidé

Tu es l'assistant qui aide à construire une requête Soliguide **sans tâtonner**. La skill suit un **tunnel** numéroté : check du token → lecture du scope → choix du pays → de la zone → des catégories → exécution.

> ⚠️ **Règles clés**
> - Toujours répondre en **français**, **tutoyer**, ton chaleureux.
> - **Une étape à la fois** dans le tunnel. Pas de formulaire de 5 questions d'un coup.
> - **Toujours commencer par l'étape 1** — sans token validé, rien ne marche.
> - Source de vérité du code : `vendor/soliguide/packages/common/src/`
> - Doc officielle (Notion privée) : https://solinum.notion.site/Technical-Documentation-of-the-Solidarity-API-59cb0fe101274d74b9a7c3729cf473b2

---

## 🚪 Étape 1 — Quel pays + check du token

**Demander d'abord le pays** (un token JWT par pays — un user ne peut pas agir sur la France ET l'Espagne avec un seul token) :

> 🌍 "On cherche dans quel pays ? **🇫🇷 fr** / **🇪🇸 es** / **🇦🇩 ad**"

Le `.env` à la racine du repo doit contenir une variable par pays :

```env
SOLIGUIDE_TOKEN_FR=eyJhbGci...
SOLIGUIDE_TOKEN_ES=eyJhbGci...
SOLIGUIDE_TOKEN_AD=eyJhbGci...
```

Lancer le check pour le pays choisi :

```bash
pnpm dlx tsx .claude/skills/soliguide-api/check-token.ts <fr|es|ad>
```

Il fait **3 vérifications** :

1. **Lit `SOLIGUIDE_TOKEN_<PAYS>`** depuis `.env` (en remontant depuis le cwd) et décode le payload JWT (`_id`, `exp`).
2. **Tente `GET /users/me`** pour récupérer nom, email, rôle, statut, et surtout le champ **`areas`** (zones où le user a le droit d'agir).
3. Si `/users/me` répond `403 FORBIDDEN_ACCESS` (cas typique d'un token `API_USER`), **fait un POST `/new-search/<pays>` minimal** pour vérifier que l'auth marche.

Trois résultats possibles :

| Sortie | Diagnostic | Action |
|---|---|---|
| ✅ `/users/me` OK | Token web/admin riche | On lit `areas` pour savoir où on peut chercher |
| ✅ `/new-search/fr` OK (mais `/users/me` 403) | Token API_USER, scope inconnu côté `areas` | On peut chercher mais on ne connaît pas la liste des pays autorisés |
| ❌ HTTP 401 `INVALID_TOKEN` | Mauvais format de header | Vérifier `Authorization: JWT <token>` (PAS `Bearer`) |
| ❌ HTTP 403 `FORBIDDEN_API_USER` | Token reconnu mais user sans rôle | Demander à Soliguide d'attribuer `API_USER` au compte |
| ❌ Aucune réponse | Pas de `.env`, mauvaise variable, réseau | Vérifier `.env` à la racine + `SOLIGUIDE_TOKEN_<PAYS>=...` |

> 💡 **Si l'utilisateur n'a pas de token pour le pays voulu** : lui dire de demander à l'équipe Soliguide une clé API partenaire avec le rôle `API_USER` et les `areas` qui couvrent le pays.

---

## 🌍 Étape 2 — Lire les `areas` (scope géographique du token)

Le champ **`areas`** retourné par `/users/me` définit les pays / régions / départements / villes où le token a le droit d'agir.

Format type :
```json
"areas": {
  "fr": { "departments": ["75", "92", ...], "regions": [], "cities": [] },
  "es": { "departments": [...], "regions": [...], "cities": [] }
}
```

**Lecture** :
- Les **clés** de `areas` sont les pays autorisés (`fr`, `es`, `ad`).
- Si une clé contient des `departments`/`regions`/`cities` non vides → scope limité à ces zones.
- Si toutes les listes sont vides → accès **complet** au pays.
- Si la clé du pays cible est **absente** → aucun lieu ne remontera, peu importe le payload.

**Si on a accès à `/users/me`** : on peut afficher au user les pays autorisés. Si le pays choisi n'est PAS dans `areas` → arrêt avec message clair (« demande à Soliguide d'élargir tes `areas` à `<pays>` »).

**Si on est sur un token API_USER** (pas d'accès à `/users/me`) : on ne connaît pas les `areas`. On tente la recherche, et si **0 résultat** sur **toutes les catégories** d'un pays → c'est très probablement un manque de scope (mais l'auth marche).

> 🧠 **À retenir** : un token = un pays. Si on doit faire des projets dans plusieurs pays, on stocke `SOLIGUIDE_TOKEN_FR`, `SOLIGUIDE_TOKEN_ES`, etc. dans le même `.env` et on choisit selon le projet.

---

## 🚀 Étape 3 — Tunnel de recherche

(Le pays a déjà été choisi à l'étape 1, on charge le bon `SOLIGUIDE_TOKEN_<PAYS>`.)

### 3a — Zone géographique

> 📍 "Tu cherches sur quelle zone ?
>
> - 🅰️ **Tout le pays** (geoType `pays`)
> - 🅱️ **Une région** (geoType `region`)
> - 🅲️ **Un département / une province** (geoType `departement`)
> - 🅳️ **Une ville** (geoType `ville`)
> - 🅴️ **Un code postal** (geoType `codePostal`)
> - 🅵️ **Autour d'un point** (geoType `position`, distance en km)"

Voir [geoType / geoValue](#-geotype--geovalue) ci-dessous pour les valeurs exactes.

### 3b — Catégorie(s)

> 🗂️ "Quel(s) type(s) de service tu cherches ? Voici les grands thèmes :
>
> - 🏥 **Santé** (`health`, `mental_health`, `dental_care`, `pregnancy_care`…)
> - 🍽️ **Alimentation** (`food_distribution`, `food_packages`, `social_grocery_stores`…)
> - 🏠 **Hébergement / logement** (`emergency_accommodation`, `long_term_accomodation`…)
> - 📋 **Démarches & accès aux droits** (`administrative_assistance`, `public_writer`, `legal_advice`, `domiciliation`, `regularization`…)
> - 🚿 **Hygiène** (`shower`, `laundry`, `toilets`…)
> - 👕 **Vestiaire** (`clothing`, `solidarity_store`…)
> - 💼 **Formation & emploi** (`french_course`, `spanish_course`, `job_coaching`…)
> - 🚌 **Mobilité** (`transportation_mobility`, `driving_license`…)
> - 💻 **Numérique** (`computers_at_your_disposal`, `wifi`, `digital_safe`…)
> - 🎨 **Activités** (`sport_activities`, `museums`, `libraries`…)
> - 🐶 **Animaux** (`animal_assitance`)
> - 🛟 **Accueil** (`day_hosting`, `rest_area`, `information_point`…)
>
> Tu veux quel(s) slug(s) précis ?"

Liste exhaustive des 132 catégories : voir [`categories.md`](categories.md) à côté de cette skill.

⚠️ **Une seule catégorie** → `category: "<slug>"`. **Plusieurs** → `categories: ["<slug1>", "<slug2>"]` (OR logique).

### 3c — Filtres optionnels

> 🎛️ "Tu veux filtrer en plus ? (sinon on saute)
>
> - 🚪 **Ouvert aujourd'hui** (`openToday: true`)
> - 👥 **Public cible** (`publics: { women: true, minors: true, ... }`)
> - 🤝 **Modalités** (`modalities: { appointment: true, free: true, ... }`)
> - 🗣️ **Langue parlée par le lieu** (`languages: "ar"`, etc.)"

Si rien : envoyer `publics: {}`, `modalities: {}`, `languages: null`.

### 3d — Pagination & exécution

> 📄 "On veut combien de résultats par page ? (défaut **20**, max ~200) Et on récupère **toutes les pages** ou juste la première ?"

→ `options: { limit, page }`. Pour tout récupérer : boucler tant que `places.length < nbResults`.

---

## 📡 Format de la requête

```http
POST https://api.soliguide.fr/new-search/{lang}
Authorization: JWT {SOLIGUIDE_API_KEY}
Content-Type: application/json
```

- `{lang}` est la **langue de la réponse** (`fr`, `es`, `ca`, `en`). Ne filtre pas le contenu.
- Le filtre **géographique** est dans le body, pas dans l'URL.
- ⚠️ Le préfixe est **`JWT`** (pas `Bearer`).

### Payload type — Espagne, toute le pays, conseil administratif

```json
{
  "category": "administrative_assistance",
  "label": "Conseil administratif",
  "word": null,
  "country": "es",
  "location": {
    "label": "España",
    "coordinates": [-3.705510666436781, 40.41668503452932],
    "geoType": "pays",
    "geoValue": "es",
    "country": "es",
    "slugs": { "pays": "es", "country": "es" },
    "areas": { "pays": "es", "country": "es" },
    "distance": 10
  },
  "publics": {},
  "modalities": {},
  "languages": null,
  "placeType": "LIEU",
  "close": null,
  "options": { "limit": 20, "page": 1 }
}
```

### Payload type — Espagne, province de Barcelone

```json
{
  "category": "administrative_assistance",
  "country": "es",
  "location": {
    "label": "Barcelona",
    "name": "Barcelona",
    "coordinates": [2.1774322, 41.3828939],
    "geoType": "departement",
    "geoValue": "provincia-barcelona",
    "department": "Barcelona",
    "departmentCode": "08",
    "country": "es",
    "region": "Catalunya",
    "regionCode": "09",
    "timeZone": "Europe/Madrid",
    "slugs": { "departement": "barcelona", "department": "barcelona", "pays": "es", "country": "es", "region": "catalunya" },
    "areas": { "departement": "Barcelona", "departementCode": "08", "pays": "es", "country": "es" },
    "distance": 50
  },
  "publics": {},
  "modalities": {},
  "languages": null,
  "placeType": "LIEU",
  "close": null,
  "options": { "limit": 20, "page": 1 }
}
```

### `placeType` — deux valeurs utiles

| Valeur | Description |
|---|---|
| `LIEU` | Lieu fixe avec adresse (le standard) |
| `PARCOURS_MOBILE` | Maraude, dispositif mobile, permanence sans adresse fixe |

Pour ne rien rater, **itérer sur les deux** et déduplique sur `lieu_id`.

---

## 🗺️ geoType / geoValue

L'**enum officiel** est en français (`pays`, `ville`…), pas en anglais. La valeur de `geoValue` est un **slug** (kebab-case).

| `geoType` | Filtre | Exemple `geoValue` | Champs additionnels nécessaires |
|---|---|---|---|
| `pays` | Tout un pays | `es`, `fr`, `ad` | `country`, `coordinates` (centre du pays) |
| `region` | Une région | `catalunya`, `ile-de-france` | `regionCode`, `country`, `coordinates` |
| `departement` | Département (FR) ou province (ES) | `provincia-barcelona`, `paris` | `department`, `departmentCode`, `region`, `regionCode`, `country`, `slugs`, `areas` |
| `ville` | Une ville | `barcelona`, `paris` | `city`, `cityCode`, `postalCode`, `coordinates` |
| `codePostal` | Code postal (FR : arr. de Paris/Lyon/Marseille) | `75011`, `08001` | `postalCode`, `coordinates` |
| `position` | Autour d'un point | (vide ou nom du POI) | `coordinates: [lon, lat]` + `distance` (km) |
| `citiesGroup` | Intercommunalité (FR) | slug EPCI | spécifique FR |

### 💡 Astuces

- **Coordonnées au format GeoJSON** : `[longitude, latitude]` (lon en premier !).
- Pour **toute l'Espagne** : `geoType: "pays"`, `geoValue: "es"`, `coordinates: [-3.7055, 40.4167]`, `country: "es"`.
- Pour **toute la France** : `geoType: "pays"`, `geoValue: "fr"`, `coordinates: [2.3438, 48.8506]`, `country: "fr"`.
- Pour construire un `location` complet d'une ville/département, le plus simple : utiliser l'**autocomplete Soliguide** depuis l'app Web et copier l'objet retourné. La constante `COUNTRIES_LOCATION` dans `vendor/soliguide/packages/common/src/location/constants/COUNTRIES_LOCATION.const.ts` donne déjà le format complet pour les pays.

---

## 📤 Réponse

```typescript
{ nbResults: number; places: ApiPlace[] }
```

### Champs principaux d'un `ApiPlace`

| Champ | Description |
|---|---|
| `lieu_id` | ID numérique unique (PK pour dédupliquer) |
| `seo_url` | URL publique (soliguide.fr / soliguia.es) |
| `name`, `description` | Nom + description (langue = `:lang` de l'URL) |
| `position.address`, `.city`, `.postalCode` | Adresse |
| `position.location.coordinates` | `[lon, lat]` GeoJSON (**inverser** pour Leaflet !) |
| `position.country` | Code pays |
| `services_all[]` | Liste des services (chacun a `category` + horaires + modalités) |
| `entity.phones`, `.mail`, `.website` | Contacts |
| `newhours` | Horaires d'ouverture |
| `modalities`, `publics` | Modalités et publics ciblés |
| `isOpenToday` | Booléen |
| `distance` | Présent uniquement avec `geoType: "position"` |

> ⚠️ **Coordonnées Leaflet** : Soliguide renvoie `[lon, lat]` (GeoJSON). Leaflet attend `[lat, lon]`. Inverser : `L.marker([coords[1], coords[0]])`.

---

## 🚧 Pièges courants

| Erreur | Cause | Solution |
|---|---|---|
| `401 INVALID_TOKEN` | Header `Authorization: Bearer ...` | Utiliser **`Authorization: JWT ...`** |
| `403 FORBIDDEN_API_USER` | Token sans rôle `API_USER` | Demander à Soliguide d'activer ce rôle |
| `403 FORBIDDEN_ACCESS` sur `/users/me` | Token API_USER sans accès au profil | Normal — fallback sur `/new-search` témoin |
| `400 location.geoType: Invalid value` | Valeur en anglais (`country`) | Utiliser le slug FR : `pays`, `ville`, `departement`… |
| `400 category: Invalid value` | Slug inexistant | Vérifier dans `Categories.enum.ts` ou `categories.md` |
| `nbResults: 0` partout sur un pays | Manque de scope `areas` sur ce pays | Demander à Soliguide d'élargir les `areas` |
| `nbResults: 0` sur une seule catégorie | Catégorie sans lieu dans la zone | Élargir la zone, ou tester `placeType: "PARCOURS_MOBILE"` |
| Coordonnées inversées sur la carte | `[lat, lon]` vs `[lon, lat]` | Soliguide = `[lon, lat]`, Leaflet = `[lat, lon]` |

---

## 🧰 Snippet TypeScript prêt à l'emploi

```typescript
import { readFileSync } from "node:fs";

const country = "es" as const; // ← le pays cible du projet
const env = readFileSync(".env", "utf-8");
const TOKEN = env.match(new RegExp(`^SOLIGUIDE_TOKEN_${country.toUpperCase()}=(.+)$`, "m"))![1].trim();
const API = "https://api.soliguide.fr";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `JWT ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// /users/me retourne 403 sur les tokens API_USER → on ignore proprement
const me = await call<{ areas: Record<string, any> }>("/users/me").catch(() => null);

async function searchAll(basePayload: any) {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const r = await call<{ nbResults: number; places: any[] }>(`/new-search/${country}`, {
      method: "POST",
      body: JSON.stringify({ ...basePayload, options: { limit: 100, page } }),
    });
    all.push(...r.places);
    if (all.length >= r.nbResults || r.places.length === 0) break;
    page++;
  }
  return all;
}
```

---

## 📚 Pour aller plus loin

- **Liste exhaustive des catégories** par thème : [`categories.md`](categories.md)
- **Script de check du token** : [`check-token.ts`](check-token.ts)
- **Code source du package `common`** : `vendor/soliguide/packages/common/src/`
  - `categories/enums/Categories.enum.ts` → enum + slugs
  - `categories/constants/LEGACY_CATEGORIES.const.ts` → IDs numériques + descriptions FR
  - `location/enums/GeoTypes.enum.ts` → types de zone
  - `location/constants/COUNTRIES_LOCATION.const.ts` → objets location prêts pour les pays
  - `place/interfaces/ApiPlace.interface.ts` → schéma de réponse
  - `search-places/interfaces/PlaceSearchForAdmin.interface.ts` → tous les filtres possibles
- **Recherche rapide** :
  ```bash
  grep -ril "<terme>" vendor/soliguide/packages/common/src --include="*.ts"
  ```
