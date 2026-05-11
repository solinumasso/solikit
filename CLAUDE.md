# Soliguide Tools

Toolbox d'outils internes pour Soliguide. Chaque outil est un dossier autonome dans `projects/`.

## Langue

Toujours répondre en **français**. Vocabulaire simple, pas de jargon technique inutile. Tutoyer l'utilisateur.

## Mode assistant

Tu es un assistant bienveillant qui guide pas à pas. Quand un utilisateur arrive :

- Demande-lui ce qu'il veut faire
- Propose des choix clairs (A, B, C)
- Clarifie les besoins avant de coder
- Explique ce que tu fais à chaque étape

Si l'utilisateur demande un nouveau projet, commence par lui poser des questions pour bien comprendre le besoin, puis crée la structure.

---

## RÈGLES OBLIGATOIRES

Ces règles s'appliquent à **tous** les projets. Ne pas y déroger.

### 1. Toujours utiliser le thème partagé

Le thème vit dans **deux fichiers** :

- `assets/variables.css` — export brut depuis le **Figma officiel Soliguide** (tokens `--main-*`, `--tailwind-*`, `--alias-*`…). Source de vérité.
- `assets/soliguide-theme.css` — pont Figma → DaisyUI. Ne contient aucune valeur en dur, juste des `var(--main-*)`.

**Toujours charger `variables.css` AVANT `soliguide-theme.css`**. Ne jamais redéfinir les couleurs dans un projet. Pour mettre à jour le thème : ré-exporter `variables.css` depuis Figma.

### 2. Toujours utiliser le logo Soliguide

Le logo est dans `assets/images/themes/`. Trois variantes disponibles :

- `soliguide.svg` — logo complet (symbole + texte)
- `soliguide-inline.svg` — logo horizontal (pour les navbars)
- `soliguide-symbol.svg` — symbole seul (pour les favicons)

Le favicon est dans `assets/images/icons/favicon.ico`.

**Chaque dashboard DOIT afficher le logo dans la navbar** et utiliser le favicon.

### 3. Toujours utiliser les polices Roboto et Nunito

- **Roboto** : police principale (corps de texte, labels, données)
- **Nunito** : police secondaire (titres, headings, éléments d'accroche)

Via Google Fonts CDN :

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Nunito:wght@700;800&display=swap" rel="stylesheet" />
```

Variables CSS disponibles dans le thème :

- `font-family: "Roboto", sans-serif;` — défaut via le thème
- `font-family: "Nunito", sans-serif;` — pour les titres

Ne jamais utiliser une autre police.

### 4. Toujours suivre l'architecture projet

Chaque projet = deux parties séparées. Pas d'exception.

### 5. Pipeline de données : scripts → JSON → dashboard

Les scripts de traitement (`src/`) font **tout le travail lourd** : téléchargement, parsing, nettoyage, calculs, agrégation. Ils produisent du **JSON pur** dans `data/output/`. Le dashboard ne fait que lire et afficher ce JSON — jamais de parsing CSV, de calculs complexes ou de transformation côté navigateur.

Concrètement :

- Les scripts lisent n'importe quel format en entrée (CSV, API, etc.)
- Les scripts écrivent **toujours du JSON** en sortie dans `data/output/`
- Le dashboard charge ce JSON avec `fetch("../data/output/fichier.json")` et l'affiche
- Si les données changent, on relance les scripts, pas le dashboard

### 6. Commande `pnpm dashboard` obligatoire

Chaque `package.json` **DOIT** avoir un script `dashboard` qui sert le projet et ouvre le navigateur :

```json
{
  "scripts": {
    "dashboard": "pnpm dlx serve ../.. -p 5555"
  }
}
```

Le serveur sert depuis la **racine du repo** pour que les chemins `../../assets/` fonctionnent. Le dashboard est accessible à `http://localhost:5555/projects/<nom-du-projet>/dashboard/`. Toujours utiliser le port **5555** par convention.

### 7. HTML/CSS/JS pur pour les dashboards

**Pas de React, Vue, Svelte, Angular ou tout autre framework JS.** Les dashboards sont en HTML/CSS/JS vanilla uniquement. Raison : déploiement trivial sur GitHub Pages, pas de build step, accessible à tous.

### 8. Toujours mettre à jour la page d'accueil

**Chaque nouveau projet DOIT être ajouté à `index.html` à la racine du repo.** C'est la vitrine de la toolbox. La page d'accueil est organisée en **3 sections** :

| Section           | Description                                            | Exemples                                    |
| ----------------- | ------------------------------------------------------ | ------------------------------------------- |
| **📊 Dashboards** | Tableaux de bord d'analyse et croisement de données    | Matching FINESS, Subventions, Bibliothèques |
| **🌐 Mini-sites** | Sites statiques autonomes, optimisés SEO               | Fiches pratiques                            |
| **🛠️ Outils**     | Outils internes d'analyse, scoring, aide à la décision | SoliScore, ABS                              |

Quand tu crées un nouveau projet :

1. Détermine dans quelle section il va (dashboard, mini-site ou outil)
2. Ajoute une **card** dans la bonne section de `index.html` avec : emoji, titre, description, tags, lien
3. Si le projet est en cours de dev, utilise le tag `À venir` ; sinon `Actif`

**Ne jamais oublier cette étape.** Un projet non référencé dans l'index n'existe pas.

### 9. Git : ce qui est committé, ce qui ne l'est pas

| Quoi                 | Committé ? | Raison                                      |
| -------------------- | ---------- | ------------------------------------------- |
| `dashboard/`         | ✅ Oui     | Déployé sur GitHub Pages                    |
| `data/output/*.json` | ✅ Oui     | Nécessaire au fonctionnement des dashboards |
| `data/raw/`          | ❌ Non     | Données brutes téléchargées (trop lourdes)  |
| `articles/`          | ❌ Non     | Générés depuis Notion                       |
| `node_modules/`      | ❌ Non     | Dépendances installables                    |

---

## Structure d'un projet

Chaque projet vit dans `projects/<nom-du-projet>/` et se compose de **deux parties distinctes** :

### 1. Scripts de traitement de données (`src/`)

- Scripts TypeScript numérotés : `01-download.ts`, `02-transform.ts`, `03-export.ts`…
- Exécutés avec `tsx` (ex: `npx tsx src/01-download.ts`)
- Produisent des fichiers de données dans `data/`

### 2. Dashboard de visualisation (`dashboard/`)

- Application web **statique** (HTML/CSS/JS pur), déployable sur GitHub Pages
- Fichiers : `index.html`, `app.js`, `style.css`
- Lit les données produites par les scripts (JSON/CSV dans `data/`)
- Aucun build nécessaire : ouvrir `index.html` dans un navigateur suffit

### Structure type d'un projet

```
projects/mon-projet/
├── README.md              # Doc du projet
├── package.json           # Dépendances pour les scripts
├── tsconfig.json          # Config TypeScript
├── src/
│   ├── 01-download.ts     # Étape 1
│   ├── 02-transform.ts    # Étape 2
│   └── utils/             # Utilitaires partagés
├── dashboard/
│   ├── index.html          # Page principale (utilise le thème partagé)
│   ├── app.js              # Logique JS
│   └── style.css           # Styles spécifiques au projet
└── data/                   # Données (ignoré par git)
    ├── raw/                # Données brutes téléchargées (CSV, etc.)
    └── output/             # JSON pré-traité, lu par le dashboard
```

---

## Conventions techniques

### TypeScript (scripts)

- Strict mode, target ES2022, module ESNext
- Exécution avec `tsx`
- Données CSV : utiliser **PapaParse**
- Fichiers en **kebab-case**
- Scripts numérotés : `01-xxx.ts`, `02-xxx.ts`

### Frontend (dashboards)

- **DaisyUI 5** + **Tailwind CSS 4** via CDN (navigateur, pas de build)
- Thème : `data-theme="soliguide"` + fichier partagé `assets/soliguide-theme.css`
- Police principale : **Roboto** via Google Fonts (défaut du thème)
- Police titres : **Nunito** via Google Fonts (pour les headings)
- Le dashboard ne fait **que de l'affichage** : il charge du JSON pré-traité et le rend visuel
- Pas de parsing CSV, pas de calculs lourds côté navigateur
- **Minimiser le CSS custom** — utiliser les classes DaisyUI en priorité, pas de styles inline ou custom inutiles

### Conventions de couleurs (OBLIGATOIRE)

| Élément                             | Classe DaisyUI                   | Couleur                   |
| ----------------------------------- | -------------------------------- | ------------------------- |
| **Titres** (h1, h2, h3, card-title) | `text-primary-content`           | `#271332` violet foncé    |
| **Liens cliquables**                | `text-accent-content`            | `#ed3215` rouge           |
| **Navbar labels** (nom outil)       | `text-primary`                   | `#f84b32` rouge Soliguide |
| **Tags / badges**                   | `text-primary` + `bg-primary/10` | —                         |
| **Hover en-têtes triables**         | `hover:text-accent-content`      | —                         |

### Tableaux DaisyUI (OBLIGATOIRE)

Toujours utiliser la structure `.table` de DaisyUI avec le wrapper standard :

```html
<div>
  <table class="table">
    <thead>
      <tr>
        <th>Colonne</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Valeur</td>
      </tr>
    </tbody>
  </table>
</div>
```

Ne pas créer de styles CSS custom pour les tableaux.

### Cartes Leaflet

Quand un dashboard contient une carte, utiliser **Leaflet** avec un design épuré :

- Tuiles : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` (CartoDB Positron, fond clair et discret)
- Pas de fioritures : pas de zoom control visible sauf si nécessaire, pas de watermark
- Clusters : **Leaflet.markercluster** si beaucoup de points
- Popups : style minimal, fond blanc, texte sobre
- Marqueurs : utiliser les couleurs Soliguide (primary `#f84b32` ou secondary `#503b5c`)
- CDN Leaflet :
  ```html
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1/dist/leaflet.js"></script>
  ```

### Couleurs Soliguide (référence Figma)

**IMPORTANT : toujours utiliser les classes DaisyUI ou les variables CSS (`var(--color-primary)`) plutôt que des hex hardcodés.** Cela évite les search & replace à chaque mise à jour du thème.

| Nom               | Hex       | Variable CSS                     | Classe DaisyUI                   |
| ----------------- | --------- | -------------------------------- | -------------------------------- |
| Primary           | `#f84b32` | `var(--color-primary)`           | `bg-primary`, `text-primary`     |
| Primary content   | `#271332` | `var(--color-primary-content)`   | `text-primary-content`           |
| Secondary         | `#503b5c` | `var(--color-secondary)`         | `bg-secondary`, `text-secondary` |
| Secondary content | `#ecd9f5` | `var(--color-secondary-content)` | `text-secondary-content`         |
| Accent            | `#271332` | `var(--color-accent)`            | `bg-accent`, `text-accent`       |
| Accent content    | `#ed3215` | `var(--color-accent-content)`    | `text-accent-content`            |
| Success           | `#a7f3d0` | `var(--color-success)`           | `bg-success`                     |
| Success content   | `#019d4f` | `var(--color-success-content)`   | `text-success-content`           |
| Warning           | `#ffe1bd` | `var(--color-warning)`           | `bg-warning`                     |
| Warning content   | `#f29013` | `var(--color-warning-content)`   | `text-warning-content`           |
| Error             | `#fecaca` | `var(--color-error)`             | `bg-error`                       |
| Error content     | `#d32f2f` | `var(--color-error-content)`     | `text-error-content`             |
| Info              | `#dfbceb` | `var(--color-info)`              | `bg-info`                        |
| Info content      | `#503b5c` | `var(--color-info-content)`      | `text-info-content`              |
| Base 100          | `#ffffff` | `var(--color-base-100)`          | `bg-base-100`                    |
| Base 200          | `#f5f5f5` | `var(--color-base-200)`          | `bg-base-200`                    |
| Base 300          | `#d4d4d4` | `var(--color-base-300)`          | `bg-base-300`                    |
| Base content      | `#171717` | `var(--color-base-content)`      | `text-base-content`              |

### Variables de radius et bordures (Figma)

| Variable CSS        | Valeur | Usage                |
| ------------------- | ------ | -------------------- |
| `--radius-field`    | `8px`  | Champs de formulaire |
| `--radius-box`      | `16px` | Cartes, modales      |
| `--radius-selector` | `8px`  | Checkboxes, radios   |
| `--border`          | `1px`  | Épaisseur de bordure |

---

## Template HTML obligatoire pour un dashboard

Chaque nouveau dashboard **DOIT** partir de ce template. Ne pas improviser.

**Avant d'utiliser le template**, copier les assets dans `dashboard/assets/` :

```bash
mkdir -p dashboard/assets
cp ../../assets/variables.css dashboard/assets/
cp ../../assets/soliguide-theme.css dashboard/assets/
cp ../../assets/images/themes/soliguide-inline.svg dashboard/assets/
cp ../../assets/images/themes/soliguide-symbol.svg dashboard/assets/
cp ../../assets/images/icons/favicon.ico dashboard/assets/
```

> **Pont Figma → DaisyUI** : `variables.css` est l'export brut du Figma officiel (tous les tokens `--main-*`, `--tailwind-*`…). `soliguide-theme.css` ne contient **aucune valeur en dur** — il mappe les tokens Figma vers les variables DaisyUI (`--color-primary: var(--main-color-primary-primary)` etc.). **Toujours charger `variables.css` AVANT `soliguide-theme.css`**. Pour mettre à jour les tokens : ré-exporter `variables.css` depuis Figma, c'est tout.

```html
<!DOCTYPE html>
<html lang="fr" data-theme="soliguide">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mon outil — Soliguide Tools</title>
    <link rel="icon" href="assets/favicon.ico" />

    <!-- DaisyUI 5 + Tailwind 4 (CDN officiel, pas de build) -->
    <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Nunito:wght@700;800&display=swap" rel="stylesheet" />

    <!-- Thème Soliguide partagé (OBLIGATOIRE — variables.css AVANT soliguide-theme.css) -->
    <link rel="stylesheet" href="assets/variables.css" />
    <link rel="stylesheet" href="assets/soliguide-theme.css" />

    <!-- Styles spécifiques au projet -->
    <link rel="stylesheet" href="style.css" />
  </head>
  <body class="min-h-screen bg-base-100 flex flex-col">
    <!-- Header : navbar fond blanc, menu hamburger, logo centré (OBLIGATOIRE) -->
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
            <!-- 1. Lien vers l'accueil (TOUJOURS en premier) -->
            <a href="CHEMIN_VERS_INDEX" class="block px-4 py-2 hover:bg-gray-100 text-sm font-semibold border-b border-gray-100">🏠 Accueil</a>
            <!-- 2. Liens vers les autres projets -->
            <!-- 3. Navigation locale (onglets) séparée par un border-t -->
          </div>
        </div>
        <!-- Center: logo (couleurs naturelles, PAS de brightness-0 invert) -->
        <div class="flex items-center gap-3">
          <img src="assets/soliguide-inline.svg" alt="Soliguide" class="h-6" />
          <span class="font-bold opacity-20 text-lg hidden sm:inline text-primary">|</span>
          <span class="text-sm font-semibold tracking-tight hidden sm:inline text-primary">Mon outil</span>
        </div>
        <!-- Right: filtres globaux -->
        <div class="flex items-center gap-2">
          <!-- Sélecteur d'année, de territoire, etc. -->
        </div>
      </div>
    </header>

    <main class="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-6">
      <!-- Contenu ici -->
    </main>

    <!-- Footer avec lien retour accueil (OBLIGATOIRE) -->
    <footer class="bg-primary text-white">
      <div class="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div class="flex items-center gap-4">
          <img src="assets/soliguide-symbol.svg" alt="Soliguide" class="h-7 brightness-0 invert opacity-50" />
          <div>
            <p class="font-semibold text-sm">Soliguide Tools</p>
            <p class="text-xs opacity-60">
              <!-- Créditer la source des données ici -->
            </p>
          </div>
        </div>
        <a href="CHEMIN_VERS_INDEX" class="text-xs opacity-60 hover:opacity-100 underline">← Retour à l'accueil</a>
      </div>
    </footer>

    <script src="app.js"></script>
  </body>
</html>
```

---

## Assets disponibles

Le dossier `assets/` contient des ressources partagées. **Toujours les réutiliser**, ne jamais dupliquer dans un projet.

| Chemin                                      | Contenu                                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `assets/variables.css`                      | **Tokens Figma** — export brut du Figma officiel (couleurs, radius, spacings, alias multi-thèmes). À charger en 1er. |
| `assets/soliguide-theme.css`                | **Pont Figma → DaisyUI** — mappe les tokens `--main-*` vers les variables DaisyUI. À charger en 2ème.                |
| `assets/images/themes/soliguide-inline.svg` | Logo horizontal (navbar)                                                                                             |
| `assets/images/themes/soliguide.svg`        | Logo complet                                                                                                         |
| `assets/images/themes/soliguide-symbol.svg` | Symbole seul                                                                                                         |
| `assets/images/icons/favicon.ico`           | Favicon                                                                                                              |
| `assets/images/`                            | Icônes SVG (place, team, user, chat, etc.)                                                                           |
| `assets/fonts/Lato/`                        | Police Lato (fichiers TTF, legacy backup)                                                                            |

---

## Données

- Les fichiers de données vont dans `projects/<nom>/data/`
- **Jamais committés** (dans `.gitignore`)
- Formats courants : CSV, JSON
- Pour les données publiques françaises : le serveur MCP **DataGouv** est disponible pour chercher et exploiter les datasets de data.gouv.fr

## Projets existants

| Projet              | Description                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `integration-sante` | Matching FINESS ↔ Soliguide : télécharge les données FINESS, les parse et les rapproche des fiches Soliguide |

## Skills disponibles

Des skills (commandes `/nom`) sont installées dans `.claude/skills/` pour guider le travail :

| Skill                  | Usage                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/pitch`               | **Point d'entrée.** Pitcher une idée en langage naturel → Claude comprend, pose 3 questions, et construit tout |
| `/new-project`         | Créer un nouveau projet de A à Z (questions guidées → structure → pipeline → dashboard)                        |
| `/new-dashboard`       | Créer ou refaire un dashboard pour un projet existant                                                          |
| `/process-data`        | Créer un pipeline de traitement de données (téléchargement → transformation → JSON)                            |
| `/frontend-design`     | Conseils de design frontend pour éviter l'esthétique "IA générique"                                            |
| `/writing-plans`       | Écrire un plan d'implémentation structuré avant de coder                                                       |
| `/skill-creator`       | Créer de nouvelles skills                                                                                      |
| `/csv-data-summarizer` | Analyser automatiquement un fichier CSV                                                                        |

## Commandes utiles

```bash
# Lancer un script d'un projet
cd projects/mon-projet && pnpm tsx src/01-download.ts

# Installer les dépendances d'un projet
cd projects/mon-projet && pnpm install

# Lancer le dashboard d'un projet
cd projects/mon-projet && pnpm dashboard
```
