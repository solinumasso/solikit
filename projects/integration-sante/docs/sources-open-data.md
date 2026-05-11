# 🗺️ Sources open data publiques pour enrichir Soliguide

> Panorama des **sources publiques retenues** pour pré-remplir / mettre à jour une fiche Soliguide.
>
> Décision de scope (2026-05-10) :
> - ✅ **3 sources prioritaires** : FINESS, Annuaire Santé Ameli, Annuaire Service-Public (DILA)
> - 🕓 **À venir dans quelques mois** : data·inclusion (gros chantier d'intégration)
> - ❌ **Hors scope** : OSM, RNA, Sirene, RPPS, Ordre des Pharmaciens, Aidants Connect, Sites COVID

🔧 **Tooling déjà branché** : BAN / Géoplateforme (géocodage des adresses).

---

## 🎯 Les 3 sources retenues

| # | Source | Format | Fréquence | Volume | Périmètre |
|---|---|---|---|---|---|
| 1 | [**FINESS**](#1-finess) | CSV | Quotidienne | ~100 k établissements | Sanitaire & médico-social |
| 2 | [**Annuaire Santé Ameli**](#2-annuaire-santé-ameli-cnam) | CSV | Hebdomadaire | 15 800 lignes CDS · 500 k PS | Pros libéraux + centres de santé |
| 7 | [**Annuaire Service-Public (DILA)**](#7-annuaire-service-public-dila) | API REST | Hebdomadaire | ~25 k structures | Administrations & services publics |

Les numéros sont conservés depuis le doc initial pour traçabilité (ne pas se laisser surprendre par les "trous" 3-6, 8-12).

---

## 📊 Matrice de couverture (par champ Soliguide)

Légende : 🟢 source officielle / 🟡 partiel / ❌ non couvert

| Champ Soliguide | FINESS | Annuaire Ameli | Service-Public | 🛠️ BAN (géocodage) |
|---|:---:|:---:|:---:|:---:|
| **name** | 🟢 | 🟢 | 🟢 | — |
| **description / mission** | ❌ | ❌ | 🟢 | — |
| **address** | 🟢 | 🟢 | 🟢 | 🟢 (normalise) |
| **postalCode + city** | 🟢 | 🟢 | 🟢 | 🟢 |
| **citycode INSEE** | ❌ | ❌ | 🟢 | 🟢 |
| **lat/lon** | 🟢 (Lambert) | ❌ | 🟡 | 🟢 |
| **phones** | 🟢 (1) | 🟢 (1) | 🟢 (plusieurs) | — |
| **mail** | ❌ | ❌ | 🟢 | — |
| **website** | ❌ | ❌ | 🟢 | — |
| **🕒 newhours** | ❌ | ❌ | 🟢 (texte + structuré) | — |
| **services_all (catégories)** | 🟡 (mapping) | 🟢 (spécialités) | 🟡 (`pivot[]`) | — |
| **publics** | ❌ | ❌ | 🟡 | — |
| **modalities.price (gratuit)** | ❌ | 🟡 (carte vitale) | ❌ | — |
| **modalities.pmr** | ❌ | ❌ | 🟡 (`accessibilite`) | — |
| **siret** | 🟢 | ❌ | 🟡 | — |
| **statut juridique** | 🟢 (libsph) | ❌ | ❌ | — |
| **catégorie / type** | 🟢 | 🟢 | 🟢 | — |

### Conclusion

- **FINESS** : identité administrative complète, mais aveugle sur l'opérationnel.
- **Ameli** : ajoute les **spécialités médicales** détaillées (1 ligne par spé × centre) → enrichit `services_all`.
- **Service-Public** : seule source ici qui a les **horaires** + email + site web. Indispensable pour CCAS, MDPH, France Services, mairies.
- **BAN** : déjà branché, normalise toutes les adresses.

### Stratégie de croisement

Les 3 sources partagent toutes une clé de jointure stable :

| Source A | Source B | Clé commune |
|---|---|---|
| FINESS ↔ Ameli | `nofinesset` ↔ `etab_finess` | 9 chars |
| FINESS ↔ DILA | `siret` ↔ `siret` | **14 chars** |
| Ameli ↔ DILA | (via FINESS ou SIRET) | indirect |

```
                 ┌─────────── FINESS (nofinesset + siret) ──────────────┐
                 │                                                      │
        ┌────────┴────────┐                                  ┌──────────┴────────┐
        │ jointure Ameli  │                                  │  jointure DILA    │
        │ sur nofinesset  │                                  │  sur SIRET        │
        └────────┬────────┘                                  └──────────┬────────┘
                 │                                                      │
                 ▼                                                      ▼
   ┌──────────────────────────────┐                ┌──────────────────────────────────┐
   │ + spécialités médicales      │                │ + horaires + email + site web    │
   │   (Médecin gén., Sage-femme) │                │ + mission (description)          │
   │   par centre de santé        │                │ + accessibilité PMR              │
   └──────────────┬───────────────┘                └─────────────┬────────────────────┘
                  │                                              │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                    Match avec Soliguide (déjà en place)
                                         │
                                         ▼
                         Diffs → dashboard "À mettre à jour"
```

---

## 1) FINESS

🏥 Établissements sanitaires & médico-sociaux français.

| | |
|---|---|
| **Producteur** | ARS / ATLASANTÉ (DREES) |
| **URL** | https://www.data.gouv.fr/datasets/finess-extraction-du-fichier-des-etablissements/ |
| **Format** | CSV (1 fichier, 2 types de lignes : `structureet` + `geolocalisation`) |
| **Volume** | ~ 100 000 établissements |
| **Fréquence** | **Quotidienne** |
| **Licence** | LOV2 |
| **Identifiant** | `nofinesset` (9 chars) — la PK pour croiser avec Ameli |

✅ **Couvre** : nom, adresse, téléphone, catégorie, SIRET, statut juridique, dates (ouverture/autorisation/MAJ), coordonnées Lambert-93
❌ **Manque** : services détaillés, horaires, contacts numériques, publics, modalités

→ Voir [`finess-vs-soliguide.md`](finess-vs-soliguide.md) pour le détail.
→ **Pipeline déjà en place** : `pnpm download:finess` + `pnpm finess:to-json`.

---

## 2) Annuaire Santé Ameli (CNAM)

👨‍⚕️ Professionnels de santé libéraux + centres de santé conventionnés.

| | |
|---|---|
| **Producteur** | Caisse Nationale Assurance Maladie |
| **URL** | https://www.data.gouv.fr/datasets/annuaire-sante-ameli/ |
| **Dataset ID** | `68e51e04c4258097a201a3cc` |
| **Format** | 2 CSV (PS = professionnels, CDS = centres de santé) + 2 PDF schémas |
| **Volume** | PS : 146 Mo (~ 500 k pros) · CDS : 15 800 lignes (1 ligne par spécialité × centre) |
| **Fréquence** | **Hebdomadaire** |
| **Licence** | LOV2 |

### Schéma CDS (centres de santé)

| Colonne | Description | Mapping Soliguide |
|---|---|---|
| `etab_finess` | **🔗 Clé de jointure avec FINESS** | — |
| `etab_raison_sociale` | Nom officiel | `name` |
| `etab_carte_vitale` | Accepte la Carte Vitale | hint `modalities.price` |
| `etab_apcv` | Auto-Présentation Carte Vitale | — |
| `specialite_code` + `specialite_libelle` | **Spécialité offerte** (1 ligne par spé) | `services_all[].category` ✨ |
| `type_etab_code` + `type_etab_libelle` | Type d'établissement | catégorie |
| `coordonnees_num_tel`, `coordonnees_voie`, `coordonnees_complement`, `coordonnees_lieu_dit`, `coordonnees_code_postal`, `coordonnees_ville` | Coordonnées | `position.*`, `entity.phones` |

### Spécialités disponibles dans Ameli (échantillon)

`Médecin généraliste`, `Sage-femme`, `Infirmier·e`, `Masseur-kinésithérapeute`, `Dentiste`, `Orthophoniste`, `Médecin spécialiste (cardiologie/dermatologie/…)`, etc.

### Cas d'usage typique

Pour un même `etab_finess`, on retrouve N lignes Ameli avec N spécialités → **agréger en un seul `services_all[]`** côté Soliguide.

Exemple : `nofinesset = 010010593` (Centre d'Échographie du Marais) → 2 lignes Ameli :
- `specialite_libelle = "Médecin généraliste"` → slug Soliguide `general_practitioner`
- `specialite_libelle = "Sage-femme"` → slug Soliguide `pregnancy_care` ou `gynecology`

🟡 Reste à faire : **mapping `specialite_libelle` Ameli → slugs Soliguide** (60-80 spécialités à mapper, à valider métier).

---

## 7) Annuaire Service-Public (DILA)

🇫🇷 Annuaire de l'administration française (mairies, préfectures, sous-préfectures, CCAS, CAF, MDPH, France Services, Pôle Emploi, etc.).

| | |
|---|---|
| **Producteur** | DILA (Direction de l'Information Légale et Administrative) |
| **URL data.gouv** | https://www.data.gouv.fr/datasets/api-de-lannuaire-de-ladministration/ |
| **API REST** | https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records |
| **Fréquence** | Hebdomadaire |
| **Licence** | Etalab v2 |
| **Auth** | Aucune (publique) |
| **Volume** | ~25 000 structures |

### Endpoint type

```http
GET /api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records?where=pivot LIKE 'ccas' AND adresse_code_postal LIKE '75%'&limit=20
```

### Champs principaux

| Champ DILA | Mapping Soliguide |
|---|---|
| `id` (UUID) | identifiant stable → `external_ids.dila` |
| **`siret`** (14 chars) | 🔗 **clé de jointure avec FINESS et Sirene** |
| `siren` (9 chars) | identifiant organisme parent |
| `code_insee_commune` | géo + jointure INSEE |
| `nom` | `name` |
| `adresse` (objet structuré : `numero_voie`, `complement1/2`, `service_distribution`, `code_postal`, `nom_commune`, `pays`, **`longitude`**, **`latitude`**) | `position.*` + GPS direct (pas de re-géocodage nécessaire) |
| `telephone[]` (array `{valeur, description}`, **format E.164** `+33...`) | `entity.phones` |
| `adresse_courriel` | `entity.mail` |
| `site_internet[]` (array `{libelle, valeur}`) | `entity.website` |
| **`plage_ouverture[]`** (objet structuré jour-par-jour) | `newhours` ✨ (quand renseigné — souvent `null`) |
| `commentaire_plage_ouverture` | `newhours.comments` |
| `mission` (texte libre) | `description` |
| `pivot[]` (array `{type_service_local, code_insee_commune}`) — type : `mairie`, `ccas`, `mdph`, `france_services`, `caf`, `cpam`, `prefecture`, etc. | catégorie + filtre |
| `categorie` | catégorie |
| `partenaire` (`data_inclusion`, `Ma Boussole Aidants`…) | provenance |
| `date_modification_datetime` (ISO) | `updatedAt` |
| `url_service_public` | URL canonique sur lannuaire.service-public.gouv.fr |

🔑 **Le SIRET** dans DILA permet de joindre **directement avec FINESS** (qui a aussi le SIRET) sans recourir au matching nom+adresse. Couverture probable : tous les CCAS, CIAS, MDPH, France Services (orgs publics avec SIRET stable).

🎁 **Bonus** : DILA importe déjà certaines structures depuis `partenaire: data_inclusion` → on goûte au futur référentiel sans l'intégrer en direct.

### Cas d'usage typique

Pour une fiche Soliguide d'un **CCAS** ou **France Services** :
- On a probablement déjà le nom + adresse → recherche DILA via `pivot=ccas` + `adresse_code_postal=<cp>`
- DILA renvoie `plage_ouverture` structuré → conversion directe vers `newhours` Soliguide
- DILA renvoie `email[]` + `site_internet[]` → enrichit `entity`
- DILA renvoie `mission` → pré-remplit `description`

🎯 **Très gros gain horaires + contacts numériques sur le segment "services publics"** — qui représente une part importante du référentiel social.

---

## 🛠️ BAN / Géoplateforme (tooling déjà branché)

📍 Normalisation et géocodage d'adresses françaises.

| | |
|---|---|
| **Producteur** | IGN (Géoplateforme — remplace `api-adresse.data.gouv.fr` en dépréciation) |
| **API** | `https://data.geopf.fr/geocodage/search?q=...` |
| **Rate limit** | 40 appels/s |
| **Pipeline** | `pnpm geocode:soliguide` + `pnpm geocode:finess` (skill `.claude/skills/geocodage/`) |

✅ **Déjà branché** — normalise les adresses des 3 sources avant matching.

---

## 🕓 Phase future — data·inclusion (≈ Q3 2026)

🛟 Référentiel français des **services d'insertion sociale & professionnelle** (Plateforme de l'inclusion / GIP Inclusion).

| | |
|---|---|
| **API** | https://data.inclusion.gouv.fr/api/v1 (OpenAPI) |
| **Schéma** | https://gip-inclusion.github.io/data-inclusion-schema/latest/ (v1 depuis oct 2025) |
| **Quoi** | Structure (place) + services rattachés, avec horaires, accessibilité, publics, modalités — **schéma structurellement identique à Soliguide** |

**À garder à l'œil pour quand on attaquera** :
- L'intégration est conséquente (mapping de taxonomie thématique + gestion des doublons)
- Le ROI sera massif sur les sections que ni FINESS ni Ameli ni Service-Public ne couvrent : `publics`, `modalities`, `services` détaillés
- Probable refonte de la pipeline de matching à ce moment-là

---

## 🎯 Reco d'usage immédiate

### Étape 1 — Croisement FINESS ↔ Ameli (jointure sur `nofinesset` / `etab_finess`)

```bash
# À construire
pnpm download:ameli       # télécharge le CSV CDS depuis data.gouv
pnpm enrich:ameli         # joint FINESS+Ameli, ajoute specialites[] aux FinessPlace
pnpm match                # le matcher utilise maintenant les spécialités pour services_all
```

→ Gain attendu : `services_all` pré-renseigné sur ~10 000 fiches de type "Centre de Santé" / "CMP" / "PMI".

### Étape 2 — Croisement Soliguide ↔ Service-Public DILA (sur `pivot` + nom + CP)

```bash
# À construire
pnpm enrich:dila          # pour chaque match Soliguide-CCAS/MDPH/France Services,
                          # appelle l'API DILA et propage horaires + email + site
```

→ Gain attendu : `newhours` + `email` + `website` sur les fiches services publics (~3 000 fiches).

### Étape 3 — Dashboard

- Onglet **"À mettre à jour"** déjà branché : peut détecter ce qui diverge.
- Ajouter un onglet **"À enrichir"** : fiches certaines pour lesquelles une source externe a une info que Soliguide n'a pas (horaires, email, spécialités) → diff visible côte à côte avant push API.

---

## 📝 Identifiants à conserver côté Soliguide pour traçabilité

| Champ Soliguide à ajouter | Format | Source |
|---|---|---|
| `external_ids.finess` | string(9) | FINESS — `nofinesset` |
| `external_ids.ameli_specialites[]` | array codes | Annuaire Ameli — `specialite_code` |
| `external_ids.dila` | string | Annuaire Service-Public — `id` |

(Quand on attaquera data·inclusion, on ajoutera `external_ids.data_inclusion`.)

---

📌 **Cf. aussi** : [`finess-vs-soliguide.md`](finess-vs-soliguide.md) pour le détail FINESS ↔ Soliguide section par section.
