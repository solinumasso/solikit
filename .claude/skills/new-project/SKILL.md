---
name: new-project
description: Créer un nouveau projet dans la toolbox Soliguide. Utiliser cette skill dès que l'utilisateur veut créer un nouvel outil, un nouveau projet, une nouvelle analyse, ou dit quelque chose comme "je veux faire un truc pour...", "j'ai besoin d'un outil pour...", "on pourrait analyser...", "crée-moi un projet".
---

# Nouveau projet Soliguide Tools

Cette skill guide la création d'un nouveau projet de A à Z. Elle pose les bonnes questions, crée la structure, et lance le dashboard.

**Toujours répondre en français. Tutoyer l'utilisateur.**

---

## Phase 1 — Comprendre le besoin (OBLIGATOIRE)

Avant d'écrire la moindre ligne de code, poser ces questions **une par une** dans l'ordre. Ne pas toutes les poser d'un coup. Attendre la réponse avant de passer à la suite.

### 1. L'objectif global

> "Décris-moi en une phrase ce que tu veux faire. Quel est le problème que tu veux résoudre ?"

Reformuler la réponse pour confirmer. Aider l'utilisateur à garder un cap clair et simple. Si le périmètre est trop large, proposer de découper :

> "C'est un projet ambitieux ! Je te propose de commencer par [partie la plus simple]. On pourra ajouter [le reste] ensuite. Ça te va ?"

### 2. Les données source

> "D'où viennent les données que tu veux traiter ?"

Proposer des choix concrets :
- **A)** Un fichier CSV/JSON que tu as déjà → "Place-le dans `projects/<nom>/data/` et dis-moi son nom"
- **B)** Une API publique (data.gouv.fr, etc.) → "Je peux chercher le dataset pour toi avec le serveur MCP DataGouv"
- **C)** Un export Soliguide → "Tu peux faire un export depuis l'admin Soliguide et le mettre dans `data/`"
- **D)** Autre source → "Décris-moi la source, je t'expliquerai comment récupérer les données"

Si la donnée n'est pas fetchable automatiquement, donner des instructions claires étape par étape pour que l'utilisateur la télécharge et la place dans le bon dossier.

### 3. Le traitement voulu

> "Qu'est-ce que tu veux faire avec ces données ? Par exemple :"
> - Comparer deux sources (matching, déduplication)
> - Calculer des scores ou des statistiques
> - Filtrer et trier selon des critères
> - Croiser avec d'autres données

### 4. Les conditions d'affichage

> "Comment veux-tu voir les résultats dans le dashboard ?"

Proposer des options :
- **Tableau** avec tri et filtres
- **Carte** (si données géolocalisées)
- **Graphiques** (barres, camembert, courbes)
- **Fiches individuelles** (détail par élément)
- **Stats résumées** (compteurs, moyennes, scores)
- **Comparaison** côte à côte

### 5. Les propriétés du dashboard

> "Quelques dernières précisions pour le dashboard :"
> - Quel titre pour l'outil ?
> - Faut-il des filtres ? (par département, par catégorie, par date…)
> - Faut-il pouvoir exporter les résultats ?

---

## Phase 2 — Créer la structure

Une fois les réponses obtenues, créer la structure complète du projet.

### Nom du projet
Dériver un nom en kebab-case depuis l'objectif. Proposer le nom et demander confirmation.

### Fichiers à créer

```
projects/<nom>/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   └── (scripts numérotés selon le pipeline)
├── dashboard/
│   ├── index.html      # Depuis le template obligatoire
│   ├── app.js
│   └── style.css
└── data/
    ├── raw/
    └── output/
```

### package.json type

```json
{
  "name": "soliguide-<nom>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dashboard": "npx -y serve . -p 5555"
  },
  "dependencies": {},
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  }
}
```

Ajouter les scripts numérotés au fur et à mesure (ex: `"download": "tsx src/01-download.ts"`).

### tsconfig.json type

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

### Dashboard HTML

**OBLIGATOIRE** : utiliser le template défini dans CLAUDE.md (thème partagé, logo, favicon). HTML/CSS/JS pur uniquement — pas de React, pas de framework, pas de build step.

**Assets** : copier les assets nécessaires dans `dashboard/assets/` :
```bash
mkdir -p dashboard/assets
cp ../../assets/soliguide-theme.css dashboard/assets/
cp ../../assets/images/themes/soliguide-inline.svg dashboard/assets/
cp ../../assets/images/themes/soliguide-symbol.svg dashboard/assets/
cp ../../assets/images/icons/favicon.ico dashboard/assets/
```

**Header** : navbar fond blanc, logo Soliguide en couleurs naturelles, texte `text-primary`, menu hamburger à gauche avec **lien 🏠 Accueil vers l'index en premier** + liens vers les autres projets + navigation locale, filtres globaux à droite.
**Footer** : fond `bg-primary`, symbole Soliguide inversé, crédits données, et **lien "← Retour à l'accueil"** aligné à droite.
**Onglets** : toujours avec un emoji descriptif (ex: 🗺️ Carte, 📋 Tableau, 📊 Stats).
**Tableaux** : toujours triables par clic sur les en-têtes et recherchables via un champ de recherche. Utiliser la structure DaisyUI `.table` avec wrapper `overflow-x-auto rounded-box border border-base-content/5 bg-base-100`.
**Couleurs** : titres en `text-primary-content`, liens cliquables en `text-accent-content`. Minimiser le CSS custom — utiliser les classes DaisyUI en priorité.

Voir la skill `new-dashboard` pour le détail des composants.

---

## Phase 3 — Développer le pipeline

### Scripts de traitement
1. Créer les scripts numérotés (`01-download.ts`, `02-transform.ts`, etc.)
2. Chaque script produit du **JSON** dans `data/output/`
3. Le JSON doit être prêt à être consommé tel quel par le dashboard
4. Installer les dépendances nécessaires avec `pnpm add`

### Dashboard
1. Le `app.js` charge le JSON avec `fetch("../data/output/fichier.json")`
2. Affiche les données selon les choix de l'utilisateur (tableau, carte, graphiques)
3. HTML/CSS/JS pur — Tailwind pour le layout, `themes.css` pour les couleurs DaisyUI
4. Pas de framework JS — vanilla JS uniquement
5. **Tableaux triables** par clic sur les en-têtes (ascendant/descendant)
6. **Champ de recherche** au-dessus de chaque tableau
7. **Emojis** devant chaque onglet
8. **Error-handling obligatoire** — voir skill `new-dashboard` pour le pattern :
   - Logs de diagnostic en haut de `app.js` (Leaflet, Chart.js, DaisyUI)
   - `try/catch` autour de `init()` avec message d'erreur visible dans le DOM
   - Vérification `resp.ok` sur tous les `fetch()`
   - Vérification `typeof L !== "undefined"` avant d'utiliser Leaflet
9. **Fix Tailwind/Leaflet** — `.leaflet-container img { max-width: none !important; }` dans `style.css`

---

## Phase 4 — Lancer

1. Installer les dépendances : `cd projects/<nom> && pnpm install`
2. Lancer les scripts de traitement dans l'ordre
3. Lancer le dashboard : `pnpm dashboard`
4. Annoncer à l'utilisateur : "Le dashboard est prêt ! Ouvre http://localhost:5555/dashboard/"

## Phase 5 — Mettre à jour l'index (OBLIGATOIRE)

**Chaque nouveau projet DOIT être ajouté à `index.html` à la racine du repo.**

1. Déterminer la section : **📊 Dashboards**, **🌐 Mini-sites** ou **🛠️ Outils**
2. Ajouter une card dans la bonne section avec : emoji, titre, description, tags, lien
3. Utiliser le tag `Actif` ou `À venir` selon l'état du projet

Un projet non référencé dans l'index n'existe pas.

---

## Rappels importants

- **Toujours** utiliser le thème partagé `assets/soliguide-theme.css`
- **Toujours** afficher le logo Soliguide dans la navbar
- **Toujours** utiliser le favicon Soliguide
- **Toujours** produire du JSON en sortie des scripts (jamais de CSV pour le dashboard)
- **Toujours** HTML/CSS/JS pur pour le dashboard (pas de React/Vue/Svelte)
- **Toujours** ajouter le script `"dashboard"` dans package.json
- **Toujours** mettre à jour `index.html` à la racine pour référencer le nouveau projet
- Données dans `data/` — jamais committées
- Garder le cap simple — un projet = un objectif clair
