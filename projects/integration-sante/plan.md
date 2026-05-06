# Pipeline d'import FINESS → Soliguide

> Source : CSV FINESS etalab (~34 Mo, ~60k lignes, séparateur `;`)
> URL : `https://www.data.gouv.fr/api/1/datasets/r/2ce43ade-8d2c-4d1d-81da-ca06c82abc68`

---

## Phase 1 — Récupération et stockage brut

### Etape 1 · Téléchargement du fichier source

- Télécharger le CSV depuis data.gouv.fr (suivi de la redirection 302 → `static.data.gouv.fr`)
- Sauvegarder le fichier brut localement (`data/raw/finess-YYYY-MM-DD.csv`)
- Vérifier l'intégrité : taille non nulle, première ligne = `finess;etalab;...`

### Etape 2 · Parsing et structuration

- Parser le CSV (séparateur `;`, encoding UTF-8, pas de ligne d'en-tête — la ligne 1 est un métadonnée `finess;etalab;109;DATE`)
- Mapper les 30 colonnes aux noms connus du schéma FINESS etalab :

| # | Champ | Exemple |
|---|-------|---------|
| 0 | `typefiness` | `structureet` |
| 1 | `nofinesset` | `010000024` |
| 2 | `nofinessej` | `010780054` |
| 3 | `rs` (raison sociale) | `CH DE FLEYRIAT` |
| 4 | `rslongue` | `CENTRE HOSPITALIER DE BOURG-EN-BRESSE FLEYRIAT` |
| 5 | `complrs` | |
| 6 | `compldistrib` | |
| 7 | `numvoie` | `900` |
| 8 | `typvoie` | `RTE` |
| 9 | `voie` | `DE PARIS` |
| 10 | `compvoie` | |
| 11 | `lieuditbp` | |
| 12 | `commune` | `451` |
| 13 | `departement` | `01` |
| 14 | `libdepartement` | `AIN` |
| 15 | `ligneacheminement` | `01440 VIRIAT` |
| 16 | `telephone` | `0474454647` |
| 17 | `telecopie` | `0474454114` |
| 18 | `categetab` | `355` |
| 19 | `libcategetab` | `Centre Hospitalier (C.H.)` |
| 20 | `categagetab` | `1102` |
| 21 | `libcategagetab` | `Centres Hospitaliers` |
| 22 | `siret` | `26010004500012` |
| 23 | `codeape` | `8610Z` |
| 24 | `codemft` | `03` |
| 25 | `libmft` | `ARS établissements Publics de santé…` |
| 26 | `codesfr` | `1` |
| 27 | `libsfr` | `Etablissement public de santé` |
| 28 | `dateouv` | `1979-02-13` |
| 29 | `dateautor` | `1979-02-13` |
| 30 | `datemaj` | `2020-02-04` |

- Produire un tableau d'objets JSON structurés (1 objet = 1 établissement)

### Etape 3 · Sauvegarde brute en base

- Upsert chaque établissement dans la collection `import_raw` (clé : `nofinesset`)
- Conserver le fichier source et la date d'extraction pour traçabilité

---

## Phase 2 — Normalisation vers le format Soliguide

### Etape 4 · Conversion IA (Claude) vers le schéma Soliguide

- Pour chaque fiche FINESS, appeler Claude (Haiku) pour produire un objet au format Soliguide
- Mapper les champs principaux :
  - **Nom** ← `rs` / `rslongue`
  - **Adresse** ← `numvoie` + `typvoie` + `voie` + `compvoie` + `ligneacheminement`
  - **Téléphone** ← `telephone`
  - **SIRET** ← `siret`
  - **FINESS** ← `nofinesset`
  - **Catégorie** ← `libcategetab` / `libcategagetab`
  - **Statut juridique** ← `libsfr`
- Stocker le résultat dans `import_normalized` avec le score de confiance et la version du prompt
- Score < 0.5 → rejet + log

---

## Phase 3 — Déduplication

### Etape 5 · Détection des doublons dans Soliguide

Cascade de vérification (du plus fiable au moins fiable) :

1. **SIRET / FINESS identique** → doublon certain (confiance 1.0)
2. **Code postal + nom quasi-identique** (Levenshtein ≤ 2) → confiance 0.9
3. **Score pondéré géo** (rayon 5km, distance GPS + similarité adresse/nom) → score > 0.5
4. **Cas ambigus** → file de révision humaine

---

## Phase 4 — Appairage et comparaison

### Etape 6 · Appairage avec les fiches Soliguide existantes

- Matching fort (SIRET, FINESS, ID source connu) → appairage automatique
- Matching faible (score ≥ 0.9) → proposition automatique
- Score 0.6–0.9 → proposition manuelle dans `/admin/appairages`
- Score < 0.6 → structure inconnue, pipeline bloqué, notification Slack

### Etape 7 · Comparaison champ par champ

Pour chaque fiche appairée, comparer les 9 sections :
- Infos générales, Localisation, Contacts, Horaires, Publics accueillis, Modalités d'accès, Services, Visibilité, Statut

Règles de décision :
- Section **ignorée** si Soliguide plus récent ou plus complet
- Section **comparée** sinon → calcul d'un score d'intérêt par section
- Score global = moyenne pondérée (horaires et services pèsent plus)

---

## Phase 5 — Proposition et validation

### Etape 8 · Génération des propositions de mise à jour

- Créer un diff lisible par section (ex: "Téléphone : 01 23 → 06 78")
- Statut `pending_review`, stocké en base
- Notification Slack `#imports-updates`

### Etape 9 · Validation humaine

- Interface `/admin/mises-a-jour`
- Validation → `PATCH` section par section vers l'API Soliguide
- Rejet → log + raison
- Aucune écriture automatique dans Soliguide

---

## Résumé du flux

```
Téléchargement CSV
      ↓
Parsing + structuration (30 colonnes)
      ↓
Sauvegarde brute (import_raw)
      ↓
Normalisation IA → format Soliguide (import_normalized)
      ↓
Déduplication (SIRET → Levenshtein → géo → humain)
      ↓
Appairage fiche Soliguide  ──✕──→  File d'attente humaine
      ↓ ✓
Comparaison 9 sections
      ↓
Score d'intérêt global
      ↓
Proposition de mise à jour
      ↓
Validation humaine → PATCH API Soliguide
```
