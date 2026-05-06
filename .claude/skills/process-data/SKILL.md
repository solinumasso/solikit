---
name: process-data
description: Créer ou améliorer un pipeline de traitement de données pour un projet Soliguide. Utiliser cette skill quand l'utilisateur veut télécharger des données, transformer un CSV, nettoyer des données, croiser des sources, calculer des scores, exporter en JSON, ou dit "traite les données", "transforme le fichier", "prépare les données pour le dashboard", "télécharge depuis data.gouv".
---

# Pipeline de traitement de données

Cette skill guide la création de scripts TypeScript qui téléchargent, nettoient, transforment et exportent des données en JSON pour le dashboard.

**Toujours répondre en français. Tutoyer l'utilisateur.**

---

## Phase 1 — Comprendre la source de données (OBLIGATOIRE)

### 1. Identifier la source

> "D'où viennent les données ?"

Options possibles :
- **A) Fichier local** (CSV, JSON, Excel) → "Comment s'appelle le fichier ? Place-le dans `projects/<nom>/data/raw/`"
- **B) API publique** (data.gouv.fr) → "Je vais chercher le dataset avec le serveur MCP DataGouv. Donne-moi des mots-clés."
- **C) Export Soliguide** → "Fais un export CSV depuis l'admin Soliguide et place-le dans `data/raw/`"
- **D) URL directe** → "Donne-moi l'URL, je vais créer un script de téléchargement"
- **E) Autre** → "Décris-moi la source"

Si la donnée ne peut pas être téléchargée automatiquement, guider l'utilisateur pas à pas :

> "Voici comment récupérer les données :"
> 1. Va sur [URL]
> 2. Clique sur [bouton]
> 3. Télécharge le fichier
> 4. Place-le dans `projects/<nom>/data/raw/`
> 5. Dis-moi quand c'est fait

### 2. Comprendre la structure

Une fois le fichier accessible :
- Lire les premières lignes pour identifier les colonnes
- Identifier le séparateur (`,`, `;`, `\t`)
- Identifier l'encodage (UTF-8, Latin-1)
- Repérer les colonnes utiles vs ignorables
- Compter les lignes, détecter les valeurs manquantes

Présenter un résumé à l'utilisateur :

> "Voici ce que je vois dans ton fichier :"
> - X lignes, Y colonnes
> - Colonnes intéressantes : [liste]
> - Valeurs manquantes : [détail]
> - Encodage : UTF-8

### 3. Définir le traitement

> "Qu'est-ce que tu veux obtenir en sortie ? Par exemple :"
> - Un fichier JSON nettoyé avec les colonnes utiles
> - Un croisement avec une autre source (Soliguide, FINESS, etc.)
> - Des scores calculés (qualité, complétude, distance, etc.)
> - Des agrégations (par département, par catégorie, etc.)
> - Un filtrage selon des critères

---

## Phase 2 — Créer le pipeline

### Principes

1. **Un script = une étape** — numéroté (`01-download.ts`, `02-parse.ts`, `03-transform.ts`, `04-export.ts`)
2. **Entrée flexible, sortie JSON** — les scripts peuvent lire du CSV, XML, API, etc. Mais ils écrivent **toujours du JSON** dans `data/output/`
3. **Idempotent** — relancer un script produit le même résultat
4. **Autonome** — chaque script peut tourner indépendamment (il lit depuis `data/raw/` ou `data/output/` du script précédent)

### Structure type

```
src/
├── 01-download.ts       # Télécharge les données brutes → data/raw/
├── 02-parse.ts          # Parse CSV/XML → data/output/parsed.json
├── 03-transform.ts      # Nettoie, enrichit, calcule → data/output/transformed.json
├── 04-export.ts         # Format final pour le dashboard → data/output/dashboard.json
└── utils/
    └── csv-parser.ts    # Utilitaires réutilisables
```

### Script type

```typescript
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import Papa from "papaparse";

const INPUT = "data/raw/source.csv";
const OUTPUT = "data/output/result.json";

async function main() {
  mkdirSync("data/output", { recursive: true });

  console.log("Lecture du fichier source...");
  const content = readFileSync(INPUT, "utf-8");

  const { data } = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`${data.length} lignes lues`);

  // Transformation ici...
  const result = data.map((row: any) => ({
    // Mapper les champs
  }));

  writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`Résultat écrit dans ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
```

### Ajouter au package.json

Pour chaque script, ajouter une entrée dans `scripts` :

```json
{
  "scripts": {
    "download": "tsx src/01-download.ts",
    "parse": "tsx src/02-parse.ts",
    "transform": "tsx src/03-transform.ts",
    "export": "tsx src/04-export.ts",
    "pipeline": "tsx src/01-download.ts && tsx src/02-parse.ts && tsx src/03-transform.ts && tsx src/04-export.ts",
    "dashboard": "npx -y serve . -p 5555"
  }
}
```

### Dépendances courantes

- **PapaParse** — parsing CSV (`pnpm add papaparse @types/papaparse`)
- **fast-levenshtein** — distance entre chaînes (`pnpm add fast-levenshtein @types/fast-levenshtein`)
- **proj4** — conversion de coordonnées (`pnpm add proj4 @types/proj4`)

---

## Phase 3 — Exécuter et vérifier

1. Installer : `pnpm install`
2. Lancer chaque script dans l'ordre
3. Vérifier le JSON produit :
   - Structure correcte ?
   - Nombre d'éléments cohérent ?
   - Pas de valeurs null inattendues ?
4. Annoncer :

> "Le traitement est terminé ! Voici ce qui a été produit :"
> - `data/output/fichier.json` — X éléments
> - Champs : [liste]
> "Tu veux qu'on crée le dashboard maintenant ?"

---

## Rappels

- **Sortie toujours en JSON** — le dashboard ne lit que du JSON
- **Données dans `data/`** — jamais committées (gitignore)
- **Scripts numérotés** — `01-xxx.ts`, `02-xxx.ts`, etc.
- **TypeScript strict** — ES2022, ESNext modules, exécution avec tsx
- **Noms de fichiers en kebab-case**
- Si données publiques françaises → proposer le MCP DataGouv pour la recherche
