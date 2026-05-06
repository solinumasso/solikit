# Integration Santé — Matching FINESS ↔ Soliguide

Outil de rapprochement entre les établissements de santé du répertoire FINESS (données publiques) et les fiches Soliguide existantes.

## Ce que fait ce projet

1. **Télécharge** le fichier CSV FINESS depuis data.gouv.fr (~34 Mo, ~60k établissements)
2. **Parse** les données FINESS (structures + géolocalisation)
3. **Rapproche** chaque établissement FINESS avec les fiches Soliguide (par SIRET, nom, proximité géographique)

## Scripts

| Script | Commande | Description |
|--------|----------|-------------|
| `01-download.ts` | `pnpm download` | Télécharge le CSV FINESS depuis data.gouv.fr |
| `02-match.ts` | `pnpm match` | Lance le matching FINESS ↔ Soliguide |

## Données requises

- **FINESS** : téléchargé automatiquement par le script `01-download.ts`
- **Soliguide** : export CSV des fiches Soliguide à placer dans `data/autoexport_soliguide.csv`

## Lancer le projet

```bash
# Installer les dépendances
pnpm install

# Étape 1 : télécharger les données FINESS
pnpm download

# Étape 2 : lancer le matching
pnpm match
```

## Dépendances

- **PapaParse** — Parsing CSV
- **fast-levenshtein** — Calcul de distance entre chaînes
- **proj4** — Conversion de coordonnées géographiques
- **tsx** — Exécution TypeScript
