---
name: new-dashboard
description: Créer ou améliorer un dashboard de visualisation pour un projet existant. Utiliser cette skill quand l'utilisateur veut ajouter un dashboard à un projet, refaire l'interface, ajouter des graphiques, des tableaux, une carte, ou dit "montre-moi les résultats", "fais un dashboard", "affiche les données", "visualise ça".
---

# Nouveau dashboard Soliguide Tools

Cette skill crée un dashboard HTML/CSS/JS pur pour visualiser des données JSON pré-traitées. Pas de React, pas de framework, pas de build — juste des fichiers statiques déployables sur GitHub Pages.

**Toujours répondre en français. Tutoyer l'utilisateur.**

---

## Phase 1 — Comprendre les besoins d'affichage (OBLIGATOIRE)

### 1. Identifier le projet et les données

> "Pour quel projet veux-tu créer le dashboard ?"

Vérifier que le projet existe dans `projects/`. Lire les fichiers JSON dans `data/output/` pour comprendre la structure des données. Si pas de JSON disponible :

> "Je ne vois pas encore de données JSON dans `data/output/`. Il faut d'abord lancer les scripts de traitement pour produire le JSON. Tu veux qu'on fasse ça d'abord ?"

### 2. Conditions d'affichage et comparaison

> "Comment veux-tu voir les données ?"

Proposer les options en fonction des données disponibles :

- **Tableau interactif** — tri par colonnes, recherche, pagination
  - "Quelles colonnes afficher ? Dans quel ordre ?"
  - "Faut-il pouvoir trier ou filtrer ?"
- **Carte géographique** — si lat/lon présents dans les données
  - "Que montrer dans les popups au clic sur un point ?"
  - "Faut-il des clusters pour les zones denses ?"
- **Graphiques** — barres, camemberts, courbes
  - "Quel axe X / axe Y ?"
  - "Faut-il comparer plusieurs séries ?"
- **Compteurs / stats résumées** — KPIs en haut du dashboard
  - "Quels chiffres clés mettre en avant ?"
- **Comparaison** — vue côte à côte
  - "Quels éléments comparer ? Sur quels critères ?"

### 3. Filtres et interactions

> "Faut-il des filtres ? Par exemple :"
> - Par zone géographique (département, ville)
> - Par catégorie ou type
> - Par date ou période
> - Par score ou seuil
> - Recherche textuelle

### 4. Titre et identité

> "Quel titre pour le dashboard ? (il apparaîtra dans la navbar à côté du logo Soliguide)"

---

## Phase 2 — Créer le dashboard

### Structure obligatoire

```
projects/<nom>/dashboard/
├── index.html      # Page principale
├── app.js          # Logique vanilla JS
├── style.css       # Styles spécifiques
└── assets/         # Assets Soliguide copiés
```

### index.html — Template obligatoire

Partir du template défini dans CLAUDE.md. Points clés :
- `data-theme="soliguide"` sur `<html>`
- `body` avec `class="min-h-screen bg-base-100 flex flex-col"` (flex column pour coller le footer en bas)
- CDN officiel DaisyUI 5 : `<link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />` + `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`
- Thème Soliguide partagé

### Assets locaux (OBLIGATOIRE)

Copier les assets nécessaires dans `dashboard/assets/` pour simplifier les chemins :

```bash
mkdir -p dashboard/assets
cp ../../assets/soliguide-theme.css dashboard/assets/
cp ../../assets/images/themes/soliguide-inline.svg dashboard/assets/
cp ../../assets/images/themes/soliguide-symbol.svg dashboard/assets/
cp ../../assets/images/icons/favicon.ico dashboard/assets/
```

Ensuite dans le HTML, utiliser des chemins simples : `assets/favicon.ico`, `assets/soliguide-theme.css`, etc.

### Header — Navbar (OBLIGATOIRE)

Navbar fond blanc avec logo Soliguide en couleurs naturelles, texte primary. Le menu hamburger contient **toujours** un lien vers l'accueil (index) en premier, puis les liens vers les autres projets, puis les onglets locaux :

```html
<header class="bg-white shadow-md border-b border-base-300">
  <div class="max-w-7xl mx-auto flex items-center justify-between px-4 h-16">
    <!-- Left: hamburger menu -->
    <div class="relative">
      <button id="menu-btn" class="p-2 rounded-full hover:bg-base-200 transition-colors text-primary" aria-label="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
      <div id="menu-dropdown" class="hidden absolute left-0 top-full mt-2 w-52 bg-white text-gray-800 rounded-lg shadow-xl py-2 z-[9999]">
        <!-- 1. Lien vers l'accueil (TOUJOURS en premier, en gras, séparé) -->
        <a href="CHEMIN_VERS_INDEX" class="block px-4 py-2 hover:bg-gray-100 text-sm font-semibold border-b border-gray-100">🏠 Accueil</a>
        <!-- 2. Liens vers les autres projets -->
        <a href="CHEMIN_VERS_AUTRE_PROJET" class="block px-4 py-2 hover:bg-gray-100 text-sm">🏥 Autre projet</a>
        <!-- 3. Navigation locale (onglets du dashboard) -->
        <div class="border-t border-gray-100 mt-1 pt-1">
          <a href="#" data-tab-link="carte" class="block px-4 py-2 hover:bg-gray-100 text-sm">🗺️ Carte</a>
          <a href="#" data-tab-link="tableau" class="block px-4 py-2 hover:bg-gray-100 text-sm">📋 Tableau</a>
        </div>
      </div>
    </div>
    <!-- Center: logo (couleurs naturelles, PAS de brightness-0 invert) -->
    <div class="flex items-center gap-3">
      <img src="assets/soliguide-inline.svg" alt="Soliguide" class="h-6" />
      <span class="font-bold opacity-20 text-lg hidden sm:inline text-primary">|</span>
      <span class="text-sm font-semibold tracking-tight hidden sm:inline text-primary">Nom de l'outil</span>
    </div>
    <!-- Right: filtres globaux -->
    <div class="flex items-center gap-2">
      <!-- Sélecteur d'année, de territoire, etc. -->
    </div>
  </div>
</header>
```

Le chemin vers l'index dépend de la profondeur du dashboard :
- Dashboard dans `projects/<nom>/dashboard/` → `../../../`
- Dashboard dans `projects/<nom>/` (sans sous-dossier) → `../../`

Le dropdown est géré en JS (toggle `hidden` au clic, fermer au clic extérieur).

### Footer (OBLIGATOIRE)

Footer fond primary avec symbole Soliguide, crédits données, et **lien retour vers l'accueil** aligné à droite :

```html
<footer class="bg-primary text-white">
  <div class="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
    <div class="flex items-center gap-4">
      <img src="assets/soliguide-symbol.svg" alt="Soliguide" class="h-7 brightness-0 invert opacity-50" />
      <div>
        <p class="font-semibold text-sm">Soliguide Tools</p>
        <p class="text-xs opacity-60">
          Données : <a href="URL_SOURCE" class="underline hover:opacity-100" target="_blank">Source — data.gouv.fr</a>
        </p>
      </div>
    </div>
    <a href="CHEMIN_VERS_INDEX" class="text-xs opacity-60 hover:opacity-100 underline">← Retour à l'accueil</a>
  </div>
</footer>
```

### Onglets avec emojis (OBLIGATOIRE)

Chaque onglet DOIT avoir un emoji descriptif devant le texte :

```html
<div class="flex gap-1 border-b border-base-300">
  <button class="tab-btn tab-btn-active" data-tab="carte">🗺️ Carte</button>
  <button class="tab-btn" data-tab="tableau">📋 Tableau</button>
  <button class="tab-btn" data-tab="stats">📊 Statistiques</button>
</div>
```

Les onglets sont stylés en CSS custom (pas de composant DaisyUI) et gérés en JS.

### Tableaux — Triables et recherchables (OBLIGATOIRE)

Chaque tableau DOIT être :
1. **Triable** par clic sur les en-têtes de colonnes (tri ascendant/descendant)
2. **Recherchable** via un champ de recherche au-dessus du tableau

Champ de recherche (style DaisyUI search input) :

```html
<label class="input w-full max-w-md">
  <svg class="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <g stroke-linejoin="round" stroke-linecap="round" stroke-width="2.5" fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </g>
  </svg>
  <input type="search" placeholder="Rechercher…" id="search-xxx" />
</label>
```

En-têtes de colonnes triables :

```html
<th class="cursor-pointer select-none hover:bg-base-300/50" data-sort="nomColonne">
  Nom de colonne <span class="sort-indicator">↕</span>
</th>
```

Logique JS de tri :

```javascript
// État du tri
let sortColumn = null;
let sortDirection = "asc";

function initSortableHeaders() {
  document.querySelectorAll("[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        sortColumn = col;
        sortDirection = "asc";
      }
      renderTable(); // re-render avec le tri appliqué
    });
  });
}
```

### app.js — Vanilla JS avec error-handling (OBLIGATOIRE)

Chaque `app.js` DOIT commencer par des **logs de diagnostic** et inclure un **try/catch** autour de l'initialisation :

```javascript
// --- Diagnostic (OBLIGATOIRE en haut de chaque app.js) ---
console.log("[init] DaisyUI theme:", document.documentElement.dataset.theme || "non défini");
// Ajouter selon les libs utilisées :
// console.log("[init] Leaflet:", typeof L !== "undefined" ? "OK (v" + L.version + ")" : "MANQUANT");
// console.log("[init] Chart.js:", typeof Chart !== "undefined" ? "OK (v" + Chart.version + ")" : "MANQUANT");

// --- Chargement des données avec vérification ---
async function loadData() {
  const urls = ["../data/output/fichier.json"];
  const results = await Promise.all(
    urls.map(async (url) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Fetch ${url} → ${resp.status}`);
      return resp.json();
    })
  );
  console.log("[data] Données chargées:", results.map((r, i) => `${urls[i]} OK`).join(", "));
  return results;
}

// --- Initialisation avec error-handling (OBLIGATOIRE) ---
async function init() {
  try {
    const [data] = await loadData();
    // Affichage ici
    console.log("[init] Dashboard prêt");
  } catch (err) {
    console.error("[init] Erreur d'initialisation:", err);
    document.querySelector("main").innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6 mt-4">
        <h3 class="font-bold mb-2">Erreur de chargement</h3>
        <p class="text-sm">Impossible de charger les données. Vérifiez que le serveur est lancé avec <code>pnpm dashboard</code> et que les fichiers JSON existent dans <code>data/output/</code>.</p>
        <pre class="text-xs mt-2 bg-red-100 rounded p-2">${err.message}</pre>
      </div>`;
  }
}

init();
```

**Vérifier la dispo des libs avant usage** — toujours tester `typeof L !== "undefined"` avant d'utiliser Leaflet, `typeof Chart !== "undefined"` avant Chart.js, etc.

Règles :
- **Vanilla JS uniquement** — pas de React, Vue, Svelte, jQuery
- Charger les données avec `fetch()` depuis `../data/output/`
- **Toujours** vérifier `resp.ok` sur les fetch
- **Toujours** un try/catch autour de `init()`
- **Toujours** des logs `console.log("[section] message")` pour le diagnostic
- **Toujours** un message d'erreur visible dans le DOM si l'init échoue
- Utiliser les classes Tailwind pour le layout (grid, flex, spacing, etc.)
- Utiliser `themes.css` pour les couleurs DaisyUI (`bg-primary`, `text-secondary`, etc.)

### Cartes Leaflet

Si le dashboard inclut une carte :
- Tuiles CartoDB Positron (fond clair et épuré) : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
- Design minimal : pas de zoom control sauf si nécessaire
- Marqueurs aux couleurs Soliguide (primary `#f84b32` ou secondary `#503b5c`)
- Popups sobres : fond blanc, texte minimal
- Leaflet.markercluster si beaucoup de points

**Imports Leaflet** — CSS dans le `<head>`, JS en bas du `<body>` avant `app.js` :

```html
<!-- Dans <head> : CSS uniquement -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1/dist/MarkerCluster.Default.css" />

<!-- En bas du <body> : JS uniquement, avant app.js -->
<script src="https://unpkg.com/leaflet@1/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1/dist/leaflet.markercluster.js"></script>
```

**Fix Tailwind/Leaflet (OBLIGATOIRE dans style.css)** — Tailwind CSS 4 casse les tuiles Leaflet :

```css
.leaflet-container img {
  max-width: none !important;
  max-height: none !important;
}
.leaflet-container { z-index: 0; }
.leaflet-popup-close-button { border: none !important; }
```

**Vérification dans app.js** — toujours tester avant d'initialiser la carte :

```javascript
if (typeof L === "undefined") {
  console.error("[map] Leaflet non chargé");
  return;
}
```

### Conventions de couleurs CSS (OBLIGATOIRE)

- **Titres** (h1, h2, h3, card-title) → `text-primary-content` (violet foncé `#271332`)
- **Liens cliquables** → `text-accent-content` (rouge `#ed3215`)
- **Navbar labels** (nom de l'outil à côté du logo) → `text-primary` (rouge `#f84b32`)
- **Tags/badges** → `text-primary` avec `bg-primary/10`
- **Hover sur les en-têtes triables** → `hover:text-accent-content`

Toujours utiliser les classes DaisyUI ou `var(--color-xxx)` plutôt que des hex hardcodés.

### Tableaux DaisyUI (OBLIGATOIRE)

Toujours utiliser la structure DaisyUI `.table` avec le wrapper standard :

```html
<div class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
  <table class="table">
    <thead>
      <tr>
        <th>Colonne</th>
        <th>Autre</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Valeur</td>
        <td>Autre</td>
      </tr>
    </tbody>
  </table>
</div>
```

Ne pas créer de styles custom pour les tableaux — la classe `.table` de DaisyUI gère le padding, les bordures, le zebra, etc.

### style.css — Styles spécifiques

Minimiser le CSS custom au strict minimum. Utiliser les classes DaisyUI et Tailwind en priorité. Ne jamais redéfinir les couleurs du thème.

---

## Phase 3 — Lancer le dashboard

1. Copier les assets dans `dashboard/assets/` (voir section Assets locaux)
2. S'assurer que `"dashboard": "npx -y serve . -p 5555"` est dans package.json
3. Lancer `pnpm dashboard`
4. Annoncer :

> "Le dashboard est prêt ! Ouvre http://localhost:5555/dashboard/"

---

## Rappels

- **HTML/CSS/JS pur** — pas de framework, pas de build, pas de node côté client
- **Le dashboard ne fait que de l'affichage** — jamais de parsing CSV ou de calculs lourds côté navigateur
- **Les données arrivent en JSON** depuis `data/output/`, pré-traitées par les scripts TypeScript
- **Toujours** utiliser le thème partagé, le logo et le favicon Soliguide
- **Toujours** des emojis sur les onglets
- **Toujours** des tableaux triables et recherchables
- Le dashboard doit être déployable tel quel sur GitHub Pages
