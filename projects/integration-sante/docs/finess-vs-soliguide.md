# Comparatif FINESS ↔ Soliguide

> Ce document compare les **données disponibles dans FINESS** (le fichier officiel des établissements sanitaires & médico-sociaux français, mis à jour par les ARS) avec **les champs attendus par Soliguide** (organisés selon les 8 étapes du formulaire de saisie d'une fiche).
>
> Objectif : savoir ce qu'on peut **propager automatiquement depuis FINESS vers Soliguide** lors d'une mise à jour, et ce qui **reste à saisir manuellement**.

📅 Source FINESS : export ATLASANTÉ `extract_finess.csv` (96 colonnes, m.à.j. quotidienne)
🔗 Source Soliguide : `ApiPlace` + `PlaceStepsDone` du package `@soliguide/common`

---

## 🟢 Version résumée

| Section formulaire Soliguide | Couverture FINESS | Reste à saisir Soliguide |
|---|---|---|
| 📝 **Infos** (nom, description) | 🟢 Nom officiel ✅ | Description, photos |
| 📍 **Emplacement** (adresse, GPS, code postal) | 🟢 **100 %** ✅ (+ géocodage Lambert-93 fourni, INSEE commune) | — |
| ☎️ **Contacts** (tel, mail, web, réseaux) | 🟡 Téléphone + fax | Email, site web, Facebook, Instagram |
| 🕒 **Horaires** | ❌ Aucune info | Tous les jours/heures à saisir |
| 🛎️ **Services** (taxonomie Soliguide) | 🟡 Mapping indirect via catégorie FINESS | Liste fine des services, descriptions |
| 👥 **Publics** (genre, âge, situation admin…) | ❌ Aucune info | Tout à saisir |
| 🤝 **Conditions** (gratuit, RDV, PMR, docs requis) | ❌ Aucune info | Tout à saisir |
| 📸 **Photos** | ❌ Aucune info | Photos à uploader |
| 🛠️ **Méta** (statut juridique, type financement, SIRET) | 🟢 Disponible (hors formulaire) | — |

### Verdict global

- ✅ **FINESS = source d'autorité pour l'identité administrative** : nom officiel, adresse, SIRET, statut juridique, dates de création/MAJ.
- ❌ **FINESS ne couvre PAS l'opérationnel** : services rendus, horaires, modalités, publics, contacts numériques, médias.
- 🟡 **Recommandation** : utiliser FINESS pour **ouvrir une fiche pré-remplie** (étapes *Infos* + *Emplacement* automatiques, *Contacts* partiels) et laisser les équipes Soliguide compléter le reste.

---

## 🔬 Version détaillée

### 🗂️ Inventaire complet des 31 colonnes FINESS (structureet)

| # | Colonne | Description | Type | Exemple |
|---|---|---|---|---|
| 1 | `type` | Type de ligne (toujours "structureet") | string | `structureet` |
| 2 | `nofinesset` | Identifiant FINESS de l'établissement (PK) | string(9) | `010000024` |
| 3 | `nofinessej` | FINESS de l'entité juridique parente | string(9) | `010780054` |
| 4 | `rs` | Raison sociale courte | string | `CH DE FLEYRIAT` |
| 5 | `rslongue` | Raison sociale longue (officielle) | string | `CENTRE HOSPITALIER DE BOURG-EN-BRESSE FLEYRIAT` |
| 6 | `complrs` | Complément de raison sociale | string | (souvent vide) |
| 7 | `compldistrib` | Complément distribution postale | string | `BP 139` |
| 8 | `numvoie` | Numéro de voie | string | `900` |
| 9 | `typvoie` | Type de voie (abrégé BAN) | string | `RTE`, `AV`, `BD`, `R` |
| 10 | `voie` | Nom de voie | string | `DE PARIS` |
| 11 | `compvoie` | Complément de voie | string | (souvent vide) |
| 12 | `lieuditbp` | Lieu-dit / Boîte postale | string | `BP 139` |
| 13 | `commune` | Code commune (interne FINESS, ≠ INSEE) | string | `451` |
| 14 | `codedepartement` | Code département (2 caractères) | string | `01` |
| 15 | `departement` | Nom département | string | `AIN` |
| 16 | `ligneacheminement` | Code postal + commune (ligne 6 adresse) | string | `01440 VIRIAT` |
| 17 | `telephone` | Téléphone (10 chiffres sans séparateur) | string | `0474454647` |
| 18 | `telecopie` | Fax | string | `0474454114` |
| 19 | `categetab` | Code catégorie d'établissement | string | `355` |
| 20 | `categetablib` | Libellé catégorie d'établissement | string | `Centre Hospitalier (C.H.)` |
| 21 | `categagetab` | Code catégorie **agrégée** | string | `1102` |
| 22 | `categagetablib` | Libellé catégorie agrégée | string | `Centres Hospitaliers` |
| 23 | `siret` | SIRET (14 chiffres) | string | `26010004500012` |
| 24 | `codeape` | Code APE / NAF | string | `8610Z` |
| 25 | `codemft` | Code mode de fixation tarif | string | `03` |
| 26 | `libmft` | Libellé mode de fixation tarif | string | `ARS établissements Publics de santé dotation globale` |
| 27 | `codesph` | Code statut juridique | string | `1` |
| 28 | `libsph` | Libellé statut juridique | string | `Etablissement public de santé` |
| 29 | `dateouv` | Date d'ouverture | YYYY-MM-DD | `1979-02-13` |
| 30 | `dateautor` | Date d'autorisation | YYYY-MM-DD | `1979-02-13` |
| 31 | `datemaj` | Date de **dernière mise à jour** | YYYY-MM-DD | `2020-02-04` |

Et une seconde ligne par établissement : `geolocalisation` (coordX, coordY en Lambert-93 EPSG:2154, source ATLASANTE+BAN).

---

### 📝 Étape 1 — Infos (`stepsDone.infos`)

Soliguide attend : nom, description.

| Champ Soliguide | Source FINESS | Couverture | Notes |
|---|---|---|---|
| `name` | `rslongue` (priorité) sinon `rs` | 🟢 ✅ | Nom officiel — souvent plus à jour qu'à Soliguide |
| `description` | — | ❌ | À rédiger manuellement |

---

### 📍 Étape 2 — Emplacement (`stepsDone.emplacement`)

Soliguide attend : adresse complète, code postal, ville, département, région, coordonnées GPS.

| Champ Soliguide | Source FINESS | Couverture | Notes |
|---|---|---|---|
| `position.address` | concat(`numvoie` + `typvoie` + `voie` + `compvoie`) + `banAddress.street` | 🟢 ✅ | À enrichir via Géoplateforme (BAN) pour normalisation |
| `position.additionalInformation` | `lieuditbp`, `compldistrib` | 🟢 ✅ | Utile en zone rurale (lieu-dit, BP) |
| `position.postalCode` | extraction de `ligneacheminement` | 🟢 ✅ | Format 5 chiffres |
| `position.city` | extraction de `ligneacheminement` (après le CP) | 🟢 ✅ | |
| `position.cityCode` | via `banAddress.citycode` (Géoplateforme) | 🟢 ✅ | Code INSEE — utile pour jointures |
| `position.department` | `departement` | 🟢 ✅ | |
| `position.departmentCode` | `codedepartement` | 🟢 ✅ | |
| `position.region` / `regionCode` | déduit du dépt | 🟡 | Calcul côté pipeline |
| `position.location.coordinates` | conversion Lambert-93 → WGS84 de `coordX,coordY` | 🟢 ✅ | Ou via `banAddress.lat,lon` (plus précis) |

✅ **Couverture quasi totale** — la BAN/Géoplateforme complète ce qui manque.

---

### ☎️ Étape 3 — Contacts (`stepsDone.contacts`)

Soliguide attend (`CommonPlaceEntity`) : `phones[]`, `fax`, `mail`, `website`, `facebook`, `instagram`.

| Champ Soliguide | Source FINESS | Couverture | Notes |
|---|---|---|---|
| `entity.phones[].phoneNumber` | `telephone` | 🟢 ✅ | 1 seul numéro côté FINESS |
| `entity.fax` | `telecopie` | 🟢 ✅ | Peu utilisé en 2026 |
| `entity.mail` | — | ❌ | À saisir |
| `entity.website` | — | ❌ | À saisir |
| `entity.facebook` | — | ❌ | À saisir |
| `entity.instagram` | — | ❌ | À saisir |

---

### 🕒 Étape 4 — Horaires (`stepsDone.horaires`)

Soliguide attend (`CommonOpeningHours`) : structure jour-par-jour avec créneaux horaires + exceptions.

| Champ Soliguide | Source FINESS | Couverture |
|---|---|---|
| `newhours.{monday…sunday}.timeslot[]` | — | ❌ |
| `newhours.exceptions[]` (fermetures temporaires) | — | ❌ |

❌ **FINESS ne contient aucune information horaire.**

---

### 🛎️ Étape 5 — Services (`stepsDone.services`)

Soliguide attend `services_all[]` : chaque service a `category` (slug Soliguide), `description`, `hours`, `modalities`, `publics`, `saturated`, etc.

| Champ Soliguide | Source FINESS | Couverture | Notes |
|---|---|---|---|
| `services_all[].category` | mapping manuel `categetablib` → liste de slugs | 🟡 | Voir tableau de mapping ci-dessous |
| `services_all[].description` | — | ❌ | |
| `services_all[].hours` | — | ❌ | |
| `services_all[].modalities/publics/saturated` | — | ❌ | |

#### 🗺️ Mapping `categetablib` FINESS → slugs Soliguide (propositions)

| Catégorie FINESS | Services Soliguide probables |
|---|---|
| Centre Médico-Psychologique (C.M.P.) | `psychological_support`, `psychiatry` |
| Centre d'Accueil Thérapeutique à temps partiel (C.A.T.T.P.) | `psychological_support`, `therapeutic_activities` |
| Centre soins accompagnement prévention addictologie (CSAPA) | `addiction_care`, `addiction_prevention_and_material` |
| Ctre.Accueil/ Accomp.Réduc.Risq.Usag. Drogues (C.A.A.R.U.D.) | `addiction_prevention_and_material` |
| Lits Halte Soins Santé (L.H.S.S.) | `infirmary`, `general_practitioner`, `medical_accommodation` |
| Lits d'Accueil Médicalisés (L.A.M.) | `medical_accommodation`, `infirmary` |
| Protection Maternelle et Infantile (P.M.I.) | `child_care`, `pregnancy_care`, `vaccination` |
| Centre de Santé | `general_practitioner`, `infirmary` |
| Centre de Vaccination / BCG | `vaccination` |
| Centre de santé sexuelle | `sexual_health`, `gynecology`, `contraception`, `sti_prevention_testing` |
| Centre gratuit d'information de dépistage et de diagnostic | `std_testing`, `sti_prevention_testing`, `hiv_prevention` |
| Appartement de Coordination Thérapeutique (A.C.T.) | `medical_accommodation`, `psychological_support` |
| Maison de Santé pour Maladies Mentales | `mental_health`, `psychiatry` |
| Service d'Accompagnement à la Vie Sociale (S.A.V.S.) | (médico-social handicap — pas de slug santé direct) |
| Service d'accompagnement médico-social adultes handicapés | (médico-social handicap — idem) |
| Service de Soins Infirmiers A Domicile (S.S.I.A.D) | `infirmary` |
| EHPAD / Résidences autonomie | (hébergement âgés — pas de slug santé direct) |
| Equipe Mobile Médico-sociale Précarité (EMMSP) | `medical_accommodation`, `psychological_support` |

⚠️ Ce mapping est **un point de départ** — il doit être validé par les équipes métier Soliguide.

---

### 👥 Étape 6 — Publics (`stepsDone.publics`)

Soliguide attend (`Publics`) : `accueil` (inconditionnel ou non), `administrative[]`, `familialle[]`, `gender[]`, `other[]`, `age`.

| Champ Soliguide | Source FINESS | Couverture |
|---|---|---|
| `publics.accueil` (WelcomedPublics) | — | ❌ |
| `publics.administrative` (réfugiés, demandeurs d'asile, sans-papiers…) | — | ❌ |
| `publics.familialle` (familles, parents seuls…) | — | ❌ |
| `publics.gender` (femmes, hommes, LGBTQ+) | — | ❌ |
| `publics.other` (mineurs, jeunes, seniors, étudiants…) | — | ❌ |
| `publics.age` (min/max) | — | ❌ |

❌ **Aucune info publics dans FINESS.**

Toutefois, la `categetablib` donne des indications fortes :
- **P.M.I.** → public **enfants / parents**
- **EHPAD / Résidences autonomie** → public **personnes âgées**
- **S.A.V.S.** / handicap → public **personnes en situation de handicap**

→ pré-remplissage possible via mapping.

---

### 🤝 Étape 7 — Conditions (`stepsDone.conditions` ⇒ `Modalities`)

Soliguide attend : `inconditionnel`, `appointment` (RDV), `inscription`, `orientation`, `price` (gratuit ou non), `animal` (animaux acceptés), `pmr` (accessibilité), `docs[]` (docs requis), `other`.

| Champ Soliguide | Source FINESS | Couverture |
|---|---|---|
| `modalities.appointment` | — | ❌ |
| `modalities.inscription` | — | ❌ |
| `modalities.orientation` | — | ❌ |
| `modalities.price.checked` (gratuit) | — | ❌ |
| `modalities.pmr` | — | ❌ |
| `modalities.animal` | — | ❌ |
| `modalities.docs[]` | — | ❌ |

❌ **Aucune info modalités dans FINESS.**

---

### 📸 Étape 8 — Photos (`stepsDone.photos`)

| Champ Soliguide | Source FINESS | Couverture |
|---|---|---|
| `photos[]` | — | ❌ |

❌ **Pas de photos dans FINESS.**

---

### 🪪 Métadonnées hors formulaire (utiles côté backend / qualité)

| Info FINESS | Usage potentiel |
|---|---|
| `nofinesset` | Identifiant unique stable pour matching et audit |
| `nofinessej` | Lien vers l'entité juridique (organisme) |
| `siret` | Vérification existence légale, jointures données ouvertes (Insee, Annuaire des Entreprises) |
| `codeape` / NAF | Nature de l'activité (compl. catégorie) |
| `libsph` (statut juridique) | "Etablissement public de santé", "ESPIC", "Privé non lucratif", "Privé lucratif" — utile pour filtres |
| `libmft` (mode tarif) | "Dotation globale", "Tarif libre", etc. |
| `categagetablib` (catégorie agrégée) | Groupement pour stats (ex: "Centres Hospitaliers" = CH + CHR + CHU) |
| `dateouv` / `dateautor` | Vérifier que la fiche est encore valide |
| `datemaj` | Détecter quand FINESS a une info plus fraîche que Soliguide |

---

## 🎯 Reco d'usage

### Pipeline de pré-remplissage à partir de FINESS

```
FINESS (extract_finess.csv)
   └─> projects/integration-sante/data/raw/finess.json  (whitelist 34 catégories santé/médico-social)
   └─> + geocode Géoplateforme  →  banAddress sur chaque fiche
       │
       ├── 📝 Infos      : name (rslongue)
       ├── 📍 Emplacement : adresse complète + GPS + INSEE
       ├── ☎️ Contacts    : téléphone + fax (le reste à compléter)
       ├── 🛎️ Services    : pré-sélection via mapping categetablib → slugs
       └── 🪪 Métadonnées : SIRET, statut juridique, dates
   │
   └─> Saisie humaine Soliguide pour :
       🕒 Horaires · 👥 Publics · 🤝 Conditions · 📸 Photos · ✍️ Description · 🌐 Email/Web
```

### Onglet "À mettre à jour" du dashboard

Cibles prioritaires = matchs **certains** où :

- `finess.datemaj > soliguide.updatedAt` → potentielle nouvelle adresse / nouveau téléphone / nouveau nom
- ET `score ≥ 0.85` → match très fiable, peu de risque de fausse mise à jour

### Limites à connaître

- FINESS **ne dit pas si la structure accepte du public** ; certains établissements sont purement administratifs/juridiques.
- FINESS **ne distingue pas les services internes** (un CHU offre des dizaines de services qui mériteraient chacun une fiche Soliguide).
- FINESS **se met à jour quand un arrêté ARS est publié**, donc la fraîcheur d'un champ y est moins importante que la fraîcheur côté Soliguide pour les services/horaires.

---

📌 **Source de vérité du code** : `vendor/soliguide/packages/common/src/place/` (interfaces `ApiPlace`, `PlaceStepsDone`, classes `CommonPlacePosition`, `CommonPlaceEntity`, `Modalities`, `Publics`, `CommonNewPlaceService`, `CommonOpeningHours`).
