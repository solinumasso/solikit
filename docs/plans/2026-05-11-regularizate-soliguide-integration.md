# Regularizate — Intégration charte graphique Soliguide

**Goal:** Adapter le mini-site Astro `regularizate` pour qu'il utilise le design system Soliguide (tokens Figma, polices, logos) et remplacer sa carte par l'implémentation complète de `aide-regularisation-espagne` (données riches + clustering + panneau latéral).

**Architecture:** On garde Astro (c'est un mini-site multilingue, pas un dashboard — la règle HTML-only ne s'applique pas). **Pas de DaisyUI** : `regularizate` utilise Tailwind v4 via le plugin Vite, pas le CDN navigateur. On charge `variables.css` + `soliguide-theme.css` via `<link>` (les CSS custom properties sont disponibles au runtime), et on expose les couleurs Soliguide à Tailwind via `@theme` dans `global.css`. Le layout (navbar Soliguide, footer, Countdown) est refondu. La logique contenu (tunnels i18n, ProgressBar, LangSwitcher) est conservée.

**Tech Stack:** Astro 5, Tailwind v4 (plugin Vite, conservé), **sans DaisyUI**, Leaflet 1 + MarkerCluster CDN, Roboto + Nunito (Google Fonts), tokens Figma Soliguide (variables.css / soliguide-theme.css).

---

## Périmètre et décisions clés

### Ce qui change
| Composant | Avant | Après |
|---|---|---|
| Font | Inter Variable (npm) | Roboto (corps) + Nunito (titres) via Google Fonts |
| Thème CSS | Variables custom (`--bg`, `--text-muted`, etc.) | DaisyUI 5 + tokens Figma (`var(--color-*)`) |
| Header | Wordmark "Regularízate.es" + dots décoratifs | Logo `soliguide-inline.svg` + nom projet |
| Footer | Fond `--bg-muted`, disclaimer légal | Fond `bg-primary`, style Soliguide Tools |
| Countdown | `bg-(--accent-coral)` | `bg-primary` |
| Favicon | `favicon.svg` SVG custom | `favicon.ico` Soliguide |
| Carte (mapa.astro) | Leaflet simple, 50 offices, pas de clustering | Leaflet + MarkerCluster, 624 lieux, panneau latéral |
| Données carte | `src/data/oficinas.json` (50 extranjeria) | `oficinas_regularizacion_2026.json` (438) + `soliguide.json` (186) |
| Tiles | OpenStreetMap | CartoDB Positron (fond clair, sobre) |

### Ce qui reste intact
- Structure Astro, pages, routes i18n
- Logique des tunnels (extraordinario, ordinario, proteccion-internacional)
- Composants ProgressBar, Tooltip
- LangSwitcher (restyled uniquement)
- 8 fichiers de traduction i18n
- Variables accent spécifiques au contenu (`--accent-coral`, `--accent-lilac`, `--accent-lime`, `--accent-amber`) — les couleurs des types de régularisation ne changent pas

### Stratégie CSS sans DaisyUI

`soliguide-theme.css` définit des CSS custom properties (`--color-primary`, `--color-base-100`, etc.) sans dépendre de DaisyUI. On les charge via `<link>` dans Base.astro — elles sont disponibles au runtime dans le navigateur.

Pour que Tailwind génère les classes utilitaires correspondantes (`bg-primary`, `text-primary`, `bg-base-100`, etc.), on les déclare dans `@theme` de `global.css` avec les valeurs Soliguide en dur. À la compilation, Tailwind émet `.bg-primary { background-color: var(--color-primary, #f84b32) }`. Au runtime, `soliguide-theme.css` redéfinit `--color-primary` — les deux convergent vers la même couleur.

### Mapping design tokens
```
Avant (regularizate custom)  →  Après (Soliguide via CSS vars)
--bg                         →  var(--color-base-100)        #ffffff
--bg-card                    →  var(--color-base-100)        #ffffff
--bg-muted                   →  var(--color-base-200)        #f5f5f5
--text                       →  var(--color-primary-content) #271332
--text-muted                 →  color-mix(in srgb, var(--color-base-content) 60%, transparent)
--text-light                 →  color-mix(in srgb, var(--color-base-content) 40%, transparent)
--border                     →  var(--color-base-300)        #d4d4d4
--border-focus               →  var(--color-secondary)       #503b5c
--accent-coral               →  CONSERVÉ #D94035 (couleur extranjeria)
--accent-lilac               →  CONSERVÉ #7B7CD4 (couleur correos)
--accent-lime                →  CONSERVÉ #6BAA37 (couleur SS)
--accent-amber               →  CONSERVÉ #D97706 (avertissements)
```

### Remplacement des classes DaisyUI dans mapa.astro
| Classe DaisyUI | Remplacement Tailwind |
|---|---|
| `checkbox checkbox-xs` | `w-4 h-4 cursor-pointer accent-primary` |
| `select select-bordered select-sm` | `py-1.5 px-3 text-sm border border-base-300 rounded-md bg-white focus:outline-none` |
| `input input-bordered input-sm` | `py-1.5 px-3 text-sm border border-base-300 rounded-md bg-white focus:outline-none` |
| `badge badge-lg` | classe `.badge` existante dans global.css + taille manuelle |
| `rounded-box` | `rounded-xl` |
| `divide-y divide-base-200` | `divide-y divide-base-300` |
| `checkbox-xs` dans filtres | `w-4 h-4 accent-primary` |

---

## Fichiers impactés

**Modifiés :**
- `src/layouts/Base.astro` — refonte complète du `<head>`, header, footer
- `src/styles/global.css` — remplacer les tokens de layout par des vars DaisyUI, garder les accents contenu
- `src/pages/[lang]/mapa.astro` — remplacement intégral de la logique carte
- `src/components/UI/Countdown.astro` — `bg-(--accent-coral)` → `bg-primary`
- `src/components/UI/LangSwitcher.astro` — restyler les classes pour utiliser tokens DaisyUI
- `package.json` — ajouter script `dashboard`
- `/index.html` (racine du repo) — ajouter card regularizate dans Mini-sites

**Créés / copiés :**
- `public/assets/variables.css` ← copie de `assets/variables.css`
- `public/assets/soliguide-theme.css` ← copie de `assets/soliguide-theme.css`
- `public/assets/soliguide-inline.svg` ← copie de `assets/images/themes/soliguide-inline.svg`
- `public/assets/soliguide-symbol.svg` ← copie de `assets/images/themes/soliguide-symbol.svg`
- `public/assets/favicon.ico` ← copie de `assets/images/icons/favicon.ico`
- `public/data/oficinas_regularizacion_2026.json` ← copie de `aide-regularisation-espagne/data/output/`
- `public/data/soliguide-conseil-administratif-es.json` ← copie de `aide-regularisation-espagne/data/output/`

**Supprimés :**
- `public/favicon.svg` (remplacé par `favicon.ico`)

---

## Tâche 1 — Copier les assets et données

**Fichiers :**
- Créer : `public/assets/` (dossier)
- Copier : 5 assets Soliguide + 2 fichiers JSON

- [ ] **Step 1 : Copier les assets Soliguide**
  ```bash
  mkdir -p projects/regularizate/public/assets
  cp assets/variables.css projects/regularizate/public/assets/
  cp assets/soliguide-theme.css projects/regularizate/public/assets/
  cp assets/images/themes/soliguide-inline.svg projects/regularizate/public/assets/
  cp assets/images/themes/soliguide-symbol.svg projects/regularizate/public/assets/
  cp assets/images/icons/favicon.ico projects/regularizate/public/assets/
  ```

- [ ] **Step 2 : Copier les données de la carte**
  ```bash
  mkdir -p projects/regularizate/public/data
  cp projects/aide-regularisation-espagne/data/output/oficinas_regularizacion_2026.json \
     projects/regularizate/public/data/
  cp projects/aide-regularisation-espagne/data/output/soliguide-conseil-administratif-es.json \
     projects/regularizate/public/data/
  ```

- [ ] **Step 3 : Supprimer l'ancien favicon SVG**
  ```bash
  rm projects/regularizate/public/favicon.svg
  ```

- [ ] **Step 4 : Vérifier**
  ```bash
  ls projects/regularizate/public/assets/
  # → favicon.ico  soliguide-inline.svg  soliguide-symbol.svg  soliguide-theme.css  variables.css
  ls projects/regularizate/public/data/
  # → oficinas_regularizacion_2026.json  soliguide-conseil-administratif-es.json
  ```

- [ ] **Step 5 : Commit**
  ```
  git add projects/regularizate/public/
  git commit -m "feat(regularizate): add Soliguide assets and map data files"
  ```

---

## Tâche 2 — `Base.astro` : layout principal

**Fichiers :**
- Modifier : `projects/regularizate/src/layouts/Base.astro`

### Objectifs
1. `<head>` : ajouter DaisyUI 5 CDN, Roboto+Nunito, variables.css, soliguide-theme.css, Leaflet+MarkerCluster CDN ; supprimer `@fontsource-variable/inter`
2. `<html>` : ajouter `data-theme="soliguide"`, garder `lang` et `dir`
3. Header : remplacer le wordmark "Regularízate.es" + dots par le logo Soliguide inline + nom projet, garder la nav + LangSwitcher
4. Footer : fond `bg-primary text-white`, logo symbol, lien retour accueil Soliguide Tools

- [ ] **Step 1 : Réécrire `Base.astro`**

  Remplacer l'intégralité du fichier par :

  ```astro
  ---
  import '../styles/global.css';
  import LangSwitcher from '../components/UI/LangSwitcher.astro';
  import Countdown from '../components/UI/Countdown.astro';
  import { getLang, useTranslations, type Lang } from '../i18n/utils';

  interface Props {
    title?: string;
    description?: string;
    lang?: Lang;
    noCountdown?: boolean;
  }

  const { title, description, lang: langProp, noCountdown = false } = Astro.props;
  const lang = getLang(langProp ?? Astro.currentLocale);
  const t = useTranslations(lang);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const pageTitle = title ? `${title} — ${t('site.name')}` : t('site.name');
  const pageDesc = description ?? t('site.description');
  ---

  <!doctype html>
  <html lang={lang} dir={dir}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={pageDesc} />
    <title>{pageTitle}</title>
    <link rel="icon" href="/assets/favicon.ico" />

    <!-- Polices Soliguide (Roboto corps + Nunito titres) -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Nunito:wght@700;800&display=swap" rel="stylesheet" />

    <!-- Thème Soliguide — CSS custom properties (variables.css AVANT soliguide-theme.css) -->
    <!-- Pas de DaisyUI : juste les tokens Figma disponibles comme CSS vars -->
    <link rel="stylesheet" href="/assets/variables.css" />
    <link rel="stylesheet" href="/assets/soliguide-theme.css" />

    <!-- Leaflet + MarkerCluster -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1/dist/MarkerCluster.Default.css" />
    <script src="https://unpkg.com/leaflet@1/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.markercluster@1/dist/leaflet.markercluster.js"></script>
  </head>
  <body class="min-h-screen bg-[--bg] flex flex-col">

    {!noCountdown && <Countdown lang={lang} />}

    <!-- Header : fond blanc, ombre, logo Soliguide centré -->
    <header class="bg-white shadow-md border-b border-[--border] sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">

        <!-- Hamburger menu -->
        <div class="relative">
          <button id="menu-btn" class="p-2 rounded-full hover:bg-[--bg-muted] transition-colors" style="color: var(--color-primary)" aria-label="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <div id="menu-dropdown" class="hidden absolute left-0 top-full mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl py-2 z-[9999]">
            <a href="/../../index.html" class="block px-4 py-2 hover:bg-gray-100 text-sm font-semibold border-b border-gray-100">🏠 Soliguide Tools</a>
            <a href={`/${lang}/`} class="block px-4 py-2 hover:bg-gray-100 text-sm">{t('nav.home')}</a>
            <a href={`/${lang}/mapa`} class="block px-4 py-2 hover:bg-gray-100 text-sm">{t('nav.map')}</a>
          </div>
        </div>

        <!-- Logo centré -->
        <a href={`/${lang}/`} class="flex items-center gap-3 no-underline">
          <img src="/assets/soliguide-inline.svg" alt="Soliguide" class="h-6" />
          <span class="font-bold opacity-20 text-lg hidden sm:inline" style="color: var(--color-primary)">|</span>
          <span class="text-sm font-semibold tracking-tight hidden sm:inline" style="color: var(--color-primary)">Regularízate</span>
        </a>

        <!-- LangSwitcher -->
        <LangSwitcher currentLang={lang} />
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer : fond primary Soliguide, blanc -->
    <footer class="text-white mt-16" style="background-color: var(--color-primary)">
      <div class="max-w-5xl mx-auto flex items-center justify-between px-6 py-5">
        <div class="flex items-center gap-4">
          <img src="/assets/soliguide-symbol.svg" alt="Soliguide" class="h-7 brightness-0 invert opacity-50" />
          <div>
            <p class="font-semibold text-sm">Soliguide Tools — Regularízate</p>
            <p class="text-xs opacity-60">Sources : Soliguide · Ministerio de Inclusión, Seguridad Social y Migraciones</p>
          </div>
        </div>
        <a href="/../../index.html" class="text-xs opacity-60 hover:opacity-100 underline">← Soliguide Tools</a>
      </div>
    </footer>

    <script is:inline define:vars={{ lang, dir }}>
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
      localStorage.setItem('regularizate_lang', lang);

      var btn = document.getElementById('menu-btn');
      var menu = document.getElementById('menu-dropdown');
      if (btn && menu) {
        btn.addEventListener('click', function(e) { e.stopPropagation(); menu.classList.toggle('hidden'); });
        document.addEventListener('click', function(e) {
          if (!btn.contains(e.target) && !menu.contains(e.target)) menu.classList.add('hidden');
        });
      }
    </script>
  </body>
  </html>
  ```

- [ ] **Step 2 : Lancer le dev server et vérifier la navbar**
  ```bash
  cd projects/regularizate && npm run dev
  # Ouvrir http://localhost:4321/es/
  # ✓ Logo Soliguide visible dans la navbar
  # ✓ Menu hamburger fonctionne
  # ✓ LangSwitcher présent à droite
  # ✓ Footer fond rouge Soliguide
  ```

- [ ] **Step 3 : Commit**
  ```
  git add projects/regularizate/src/layouts/Base.astro
  git commit -m "feat(regularizate): replace header/footer with Soliguide layout"
  ```

---

## Tâche 3 — `global.css` : tokens de design

**Fichiers :**
- Modifier : `projects/regularizate/src/styles/global.css`

### Objectifs
1. Supprimer `@import "@fontsource-variable/inter"` (Roboto/Nunito chargés via Google Fonts CDN dans Base.astro)
2. Exposer les couleurs Soliguide à Tailwind via `@theme` (sans DaisyUI, Tailwind ne sait pas ce qu'est `bg-primary`)
3. Remapper les variables custom du projet (`--bg`, `--text`, `--border`) vers les vars Soliguide de `soliguide-theme.css`
4. Conserver les variables d'accent contenu (`--accent-coral`, `--accent-lilac`, `--accent-lime`, `--accent-amber`)
5. Mettre à jour la font vers Roboto

- [ ] **Step 1 : Modifier la section variables dans `global.css`**

  Remplacer le bloc `@import "@fontsource-variable/inter"` + `@theme` + `:root` par :

  ```css
  @import "tailwindcss";

  /* ─── Tailwind v4 : exposer la palette Soliguide comme utilitaires ──────
     Sans DaisyUI, Tailwind ne connaît pas bg-primary, text-primary, etc.
     On les déclare ici avec les valeurs Soliguide (hex = source de vérité
     du Figma, identiques à ce que soliguide-theme.css définit via --main-*).
     Tailwind génère bg-primary → background-color: var(--color-primary, #f84b32)
     Au runtime, soliguide-theme.css redéfinit --color-primary depuis les
     tokens Figma — convergence garantie vers la même couleur.           ── */
  @theme {
    /* Palette principale */
    --color-primary:          #f84b32;
    --color-primary-content:  #271332;
    --color-secondary:        #503b5c;
    --color-secondary-content: #ecd9f5;
    --color-accent:           #271332;
    --color-accent-content:   #ed3215;

    /* Neutres */
    --color-base-100:    #ffffff;
    --color-base-200:    #f5f5f5;
    --color-base-300:    #d4d4d4;
    --color-base-content: #171717;

    /* États */
    --color-success:         #a7f3d0;
    --color-success-content: #019d4f;
    --color-warning:         #ffe1bd;
    --color-warning-content: #f29013;
    --color-error:           #fecaca;
    --color-error-content:   #d32f2f;

    /* Radius (conservés du projet) */
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-pill: 999px;
  }

  /* ─── Custom border utilities ───────────────────────────── */
  @utility border-line {
    border: 1.5px solid var(--border);
  }
  @utility border-t-line {
    border-top: 1.5px solid var(--border);
  }
  @utility border-b-line {
    border-bottom: 1.5px solid var(--border);
  }
  @utility border-r-line {
    border-right: 1.5px solid var(--border);
  }

  /* ─── Bridge Soliguide → variables custom du projet ────────
     Les vars de regularizate (--bg, --text, --border, etc.) sont
     remappées vers les CSS custom properties de soliguide-theme.css.
     Toutes les classes existantes du projet continuent de fonctionner.  ── */
  :root {
    --bg:        var(--color-base-100);
    --bg-card:   var(--color-base-100);
    --bg-muted:  var(--color-base-200);
    --bg-invert: var(--color-primary-content);

    --text:       var(--color-primary-content);
    --text-muted: color-mix(in srgb, var(--color-base-content) 60%, transparent);
    --text-light: color-mix(in srgb, var(--color-base-content) 40%, transparent);
    --text-invert: var(--color-base-100);

    --border:       var(--color-base-300);
    --border-focus: var(--color-secondary);

    /* Couleurs de contenu (types de régularisation) — inchangées */
    --accent-coral:    #D94035;
    --accent-lilac:    #7B7CD4;
    --accent-lime:     #6BAA37;
    --accent-amber:    #D97706;
    --accent-espresso: var(--color-primary-content);

    --shadow-sm: 0 1px 4px rgba(28,18,8,0.08);
    --shadow-md: 0 4px 16px rgba(28,18,8,0.1);
    --shadow-lg: 0 8px 32px rgba(28,18,8,0.12);
  }
  ```

- [ ] **Step 2 : Mettre à jour la règle `html`**

  Remplacer :
  ```css
  html {
    background-color: var(--bg);
    color: var(--text);
    font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
    scroll-behavior: smooth;
  }
  ```
  Par :
  ```css
  html {
    background-color: var(--bg);
    color: var(--text);
    font-family: 'Roboto', sans-serif;
    scroll-behavior: smooth;
  }
  ```

- [ ] **Step 3 : Mettre à jour les overrides Leaflet**

  Remplacer la référence à Inter dans `.leaflet-container` :
  ```css
  .leaflet-container {
    background: var(--bg-muted) !important;
    font-family: 'Roboto', sans-serif !important;
  }
  ```

- [ ] **Step 4 : Ajouter les styles pin de carte** (nécessaires pour la tâche 4)

  Ajouter en fin de fichier :
  ```css
  /* ─── Carte — marqueurs et liste ───────────────────────── */
  .pin {
    width: 22px;
    height: 22px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .pin-soliguide { background: var(--color-primary); }
  .pin-SS        { background: var(--color-success-content); }
  .pin-OEX       { background: var(--color-warning-content); }
  .pin-Correos   { background: var(--color-secondary); }

  .marker-cluster-small,
  .marker-cluster-medium,
  .marker-cluster-large {
    background-color: rgba(248, 75, 50, 0.15) !important;
  }
  .marker-cluster-small div,
  .marker-cluster-medium div,
  .marker-cluster-large div {
    background-color: var(--color-primary) !important;
    color: white !important;
    font-weight: 600;
  }

  .place-card { transition: background-color .15s; cursor: pointer; }
  .place-card:hover { background-color: var(--color-base-200); }
  .place-card.active {
    background-color: rgba(248, 75, 50, 0.06);
    border-left: 3px solid var(--color-primary);
  }

  .leaflet-popup-content-wrapper {
    border-radius: var(--radius-box, 12px) !important;
  }
  .leaflet-popup-content {
    margin: 12px 16px;
    font-family: 'Roboto', sans-serif;
  }
  .leaflet-popup-content h3 {
    font-family: 'Nunito', sans-serif;
    font-weight: 700;
    margin-bottom: 4px;
  }
  ```

- [ ] **Step 5 : Vérifier visuellement**
  ```
  # Ouvrir http://localhost:4321/es/ — vérifier :
  # ✓ Police Roboto (pas Inter)
  # ✓ Fond base-100 (blanc)
  # ✓ Textes en violet foncé (#271332)
  # ✓ Cards/badges gardent leurs couleurs coral/lilac/lime
  ```

- [ ] **Step 6 : Commit**
  ```
  git add projects/regularizate/src/styles/global.css
  git commit -m "feat(regularizate): bridge design tokens to Soliguide CSS vars, expose palette to Tailwind"
  ```

---

## Tâche 4 — `mapa.astro` : carte complète

**Fichiers :**
- Modifier : `projects/regularizate/src/pages/[lang]/mapa.astro`

### Objectifs
Remplacer la carte Leaflet simple (50 offices, pas de clustering) par l'implémentation de `aide-regularisation-espagne` :
- 2 sources de données : 438 offices d'État + 186 lieux Soliguide (624 total)
- Clustering avec MarkerCluster
- Panneau latéral (liste scrollable) synchronisé avec la carte
- Filtres par type (4 checkboxes) + filtre par province + recherche texte
- CartoDB Positron comme fond de carte
- Marqueurs colorés par type avec popup riche
- Compteurs dans le hero

Le texte UI reste i18n (titre, sous-titre de la page). Le contenu des popups et des filtres est en espagnol (données publiques espagnoles).

- [ ] **Step 1 : Réécrire `mapa.astro`**

  ```astro
  ---
  import Base from '../../layouts/Base.astro';
  import { SUPPORTED_LANGS, getLang, useTranslations } from '../../i18n/utils';

  export function getStaticPaths() {
    return SUPPORTED_LANGS.map(lang => ({ params: { lang } }));
  }

  const { lang: langParam } = Astro.params;
  const lang = getLang(langParam);
  const t = useTranslations(lang);
  ---

  <Base lang={lang} title={t('map.title')} noCountdown={false}>
    <div class="max-w-7xl mx-auto px-4 lg:px-6 pt-8 pb-20">

      <!-- Hero — compteurs par type -->
      <section class="mb-6">
        <h1 class="text-3xl md:text-4xl font-extrabold mb-2" style="font-family: 'Nunito', sans-serif; color: var(--text)">
          {t('map.title')}
        </h1>
        <p class="max-w-3xl mb-4 text-sm" style="color: var(--text-muted)">{t('map.subtitle')}</p>
        <div class="flex flex-wrap gap-2">
          <div class="badge inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full border" style="background: rgba(248,75,50,0.1); color: var(--color-primary); border-color: rgba(248,75,50,0.2)">
            <span class="font-semibold" id="count-soliguide">…</span> {t('map.type_soliguide')}
          </div>
          <div class="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full border" style="background: rgba(167,243,208,0.3); color: var(--color-success-content); border-color: rgba(167,243,208,0.6)">
            <span class="font-semibold" id="count-ss">…</span> Seguridad Social
          </div>
          <div class="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full border" style="background: rgba(255,225,189,0.4); color: var(--color-warning-content); border-color: rgba(255,225,189,0.8)">
            <span class="font-semibold" id="count-oex">…</span> Extranjería
          </div>
          <div class="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full border" style="background: rgba(80,59,92,0.1); color: var(--color-secondary); border-color: rgba(80,59,92,0.25)">
            <span class="font-semibold" id="count-correos">…</span> Correos
          </div>
        </div>
      </section>

      <!-- Filtres — Tailwind pur, pas de composants DaisyUI -->
      <section class="mb-4 rounded-xl p-4" style="background: rgba(245,245,245,0.5)">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex flex-wrap gap-2">
            <label class="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-[--border] hover:border-[--accent-coral] transition-colors">
              <input type="checkbox" class="w-4 h-4 cursor-pointer filter-type" data-type="soliguide" checked style="accent-color: var(--color-primary)" />
              <span class="w-3 h-3 rounded-full" style="background: var(--color-primary)"></span>
              <span class="text-sm">{t('map.type_soliguide')}</span>
            </label>
            <label class="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-[--border] hover:border-[--accent-lime] transition-colors">
              <input type="checkbox" class="w-4 h-4 cursor-pointer filter-type" data-type="SS" checked style="accent-color: var(--color-success-content)" />
              <span class="w-3 h-3 rounded-full" style="background: var(--color-success-content)"></span>
              <span class="text-sm">Seguridad Social</span>
            </label>
            <label class="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-[--border] hover:border-[--accent-amber] transition-colors">
              <input type="checkbox" class="w-4 h-4 cursor-pointer filter-type" data-type="OEX" checked style="accent-color: var(--color-warning-content)" />
              <span class="w-3 h-3 rounded-full" style="background: var(--color-warning-content)"></span>
              <span class="text-sm">Extranjería</span>
            </label>
            <label class="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-[--border] hover:border-[--accent-lilac] transition-colors">
              <input type="checkbox" class="w-4 h-4 cursor-pointer filter-type" data-type="Correos" checked style="accent-color: var(--color-secondary)" />
              <span class="w-3 h-3 rounded-full" style="background: var(--color-secondary)"></span>
              <span class="text-sm">Correos</span>
            </label>
          </div>

          <select id="filter-province"
            class="py-1.5 px-3 text-sm rounded-md bg-white focus:outline-none"
            style="border: 1.5px solid var(--border)">
            <option value="">Todas las provincias</option>
          </select>

          <input id="filter-search" type="search" placeholder={t('map.search_placeholder')}
            class="py-1.5 px-3 text-sm rounded-md bg-white flex-1 min-w-[200px] focus:outline-none"
            style="border: 1.5px solid var(--border)" />

          <span id="result-count" class="text-sm ml-auto" style="color: var(--text-muted)"></span>
        </div>
      </section>

      <!-- Carte + liste latérale -->
      <section class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <div id="map" class="rounded-xl overflow-hidden" style="height: 70vh; min-height: 500px; border: 1.5px solid var(--border)"></div>

        <div class="rounded-xl overflow-hidden flex flex-col bg-white" style="height: 70vh; min-height: 500px; border: 1.5px solid var(--border)">
          <div class="px-4 py-3 border-b" style="background: rgba(245,245,245,0.4); border-color: var(--border)">
            <h2 class="font-bold" style="font-family: 'Nunito', sans-serif; color: var(--text)">{t('map.list_title')}</h2>
          </div>
          <div id="place-list" class="overflow-y-auto flex-1 divide-y" style="border-color: var(--border)"></div>
        </div>
      </section>

    </div>
  </Base>

  <script is:inline>
  // ── Types et labels ────────────────────────────────────
  var TYPE_META = {
    soliguide: { label: "Aide aux dossiers", emoji: "📝" },
    SS:        { label: "Seguridad Social",  emoji: "🏛️" },
    OEX:       { label: "Extranjería",       emoji: "🛂" },
    Correos:   { label: "Correos",           emoji: "✉️" },
  };

  var state = {
    places: [],
    filteredPlaces: [],
    markers: new Map(),
    cluster: null,
    map: null,
    filters: { types: new Set(["soliguide","SS","OEX","Correos"]), province: "", search: "" },
    activeId: null,
  };

  // ── Chargement des données ─────────────────────────────
  async function loadAll() {
    var results = await Promise.all([
      fetch('/data/oficinas_regularizacion_2026.json').then(function(r) { return r.json(); }),
      fetch('/data/soliguide-conseil-administratif-es.json').then(function(r) { return r.json(); }),
    ]);
    var oficinasJson = results[0];
    var soliJson = results[1];

    for (var i = 0; i < oficinasJson.oficinas.length; i++) {
      var o = oficinasJson.oficinas[i];
      if (!o.lat || !o.lon) continue;
      state.places.push({
        id: o.id, type: o.tipo, name: o.nombre,
        address: o.direccion, city: o.ciudad, postalCode: o.codigo_postal,
        province: o.provincia, region: o.comunidad_autonoma,
        lat: o.lat, lon: o.lon, source: "estado",
        typeLabel: o.tipo_label,
      });
    }

    for (var j = 0; j < soliJson.places.length; j++) {
      var p = soliJson.places[j];
      var coords = p.position && p.position.location && p.position.location.coordinates;
      if (!coords || coords.length !== 2) continue;
      state.places.push({
        id: "sg-" + p.lieu_id, type: "soliguide",
        name: p.name,
        address: (p.position && (p.position.address || p.position.adresse)) || "",
        city: (p.position && (p.position.city || p.position.ville)) || "",
        postalCode: (p.position && (p.position.postalCode || p.position.codePostal)) || "",
        province: (p.position && (p.position.department || p.position.departement)) || "",
        region: (p.position && p.position.region) || "",
        lat: coords[1], lon: coords[0],
        source: "soliguide", typeLabel: "Aide aux dossiers",
        seoUrl: p.seo_url,
        phone: (p.entity && p.entity.phones && p.entity.phones[0] && p.entity.phones[0].phoneNumber) || "",
        mail: (p.entity && p.entity.mail) || "",
        website: (p.entity && p.entity.website) || "",
      });
    }
  }

  // ── Compteurs ──────────────────────────────────────────
  function updateCounts() {
    var counts = { soliguide: 0, SS: 0, OEX: 0, Correos: 0 };
    for (var i = 0; i < state.places.length; i++) {
      var t = state.places[i].type;
      counts[t] = (counts[t] || 0) + 1;
    }
    document.getElementById("count-soliguide").textContent = counts.soliguide;
    document.getElementById("count-ss").textContent = counts.SS;
    document.getElementById("count-oex").textContent = counts.OEX;
    document.getElementById("count-correos").textContent = counts.Correos;
  }

  // ── Filtre province ─────────────────────────────────────
  function buildProvinceOptions() {
    var set = new Set();
    state.places.forEach(function(p) { if (p.province) set.add(p.province); });
    var select = document.getElementById("filter-province");
    Array.from(set).sort(function(a,b) { return a.localeCompare(b, "es"); }).forEach(function(prov) {
      var opt = document.createElement("option");
      opt.value = prov;
      opt.textContent = prov;
      select.appendChild(opt);
    });
  }

  // ── Filtres et rendu ────────────────────────────────────
  function applyFilters() {
    var types = state.filters.types;
    var province = state.filters.province;
    var q = state.filters.search.trim().toLowerCase();
    state.filteredPlaces = state.places.filter(function(p) {
      if (!types.has(p.type)) return false;
      if (province && p.province !== province) return false;
      if (q && !(p.name + " " + p.city + " " + p.address).toLowerCase().includes(q)) return false;
      return true;
    });
    var count = state.filteredPlaces.length;
    document.getElementById("result-count").textContent = count + " lieu" + (count > 1 ? "x" : "");
    renderMarkers();
    renderList();
  }

  // ── Icônes carte ────────────────────────────────────────
  function makeIcon(type) {
    return L.divIcon({
      className: "",
      html: '<div class="pin pin-' + type + '"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 22],
    });
  }

  // ── Popup HTML ──────────────────────────────────────────
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function(c) {
      return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c];
    });
  }

  function popupHtml(p) {
    var meta = TYPE_META[p.type] || { label: p.type, emoji: "📍" };
    var parts = [
      '<h3 class="text-primary-content text-base font-bold">' + escapeHtml(p.name) + '</h3>',
      '<div class="text-xs text-gray-500 mb-1">' + meta.emoji + ' ' + meta.label + '</div>',
    ];
    if (p.address) parts.push('<p class="text-sm">' + escapeHtml(p.address) + '</p>');
    var cityLine = [p.postalCode, p.city].filter(Boolean).join(" ");
    if (cityLine) parts.push('<p class="text-sm text-gray-600">' + escapeHtml(cityLine) + '</p>');
    if (p.phone) parts.push('<p class="text-sm mt-1">📞 ' + escapeHtml(p.phone) + '</p>');
    if (p.mail) parts.push('<p class="text-sm">✉️ <a class="text-accent-content underline" href="mailto:' + escapeHtml(p.mail) + '">' + escapeHtml(p.mail) + '</a></p>');
    if (p.website) parts.push('<p class="text-sm">🌐 <a class="text-accent-content underline" href="' + escapeHtml(p.website) + '" target="_blank" rel="noopener">site web</a></p>');
    if (p.seoUrl) parts.push('<p class="text-sm mt-1"><a class="text-accent-content underline" href="https://soliguia.es/' + escapeHtml(p.seoUrl) + '" target="_blank" rel="noopener">Ver en Soliguia →</a></p>');
    return parts.join("");
  }

  // ── Couleurs liste ──────────────────────────────────────
  function typeBadgeColor(t) {
    return t === "soliguide" ? "primary" : t === "SS" ? "success" : t === "OEX" ? "warning" : "secondary";
  }
  function typeTextColor(t) {
    return t === "soliguide" ? "primary" : t === "SS" ? "success-content" : t === "OEX" ? "warning-content" : "secondary";
  }

  // ── Marqueurs ───────────────────────────────────────────
  function renderMarkers() {
    if (!state.cluster) return;
    state.cluster.clearLayers();
    state.markers.clear();
    state.filteredPlaces.forEach(function(p) {
      var marker = L.marker([p.lat, p.lon], { icon: makeIcon(p.type) });
      marker.bindPopup(popupHtml(p));
      marker.on("click", function() { focusOn(p.id, false); });
      state.markers.set(p.id, marker);
      state.cluster.addLayer(marker);
    });
  }

  // ── Liste latérale ──────────────────────────────────────
  // Les classes bg-primary, bg-success, text-primary, text-success-content, etc.
  // sont générées par Tailwind via @theme. Les variantes d'opacité (/60) sont
  // évitées ici car les strings JS ne sont pas toujours scannées fiablement :
  // on utilise des inline styles pour les couleurs atténuées.
  var TYPE_COLORS = {
    soliguide: "var(--color-primary)",
    SS:        "var(--color-success-content)",
    OEX:       "var(--color-warning-content)",
    Correos:   "var(--color-secondary)",
  };

  function renderList() {
    var container = document.getElementById("place-list");
    if (!container) return;
    if (state.filteredPlaces.length === 0) {
      container.innerHTML = '<div class="p-6 text-center text-sm" style="color: var(--text-muted)">Aucun lieu ne correspond aux filtres.</div>';
      return;
    }
    var shown = state.filteredPlaces.slice(0, 300);
    container.innerHTML = shown.map(function(p) {
      var color = TYPE_COLORS[p.type] || "var(--color-primary)";
      var meta = TYPE_META[p.type] || { label: p.type, emoji: "📍" };
      var addrLine = [p.address, [p.postalCode, p.city].filter(Boolean).join(" ")].filter(Boolean).join(" — ");
      return '<div class="place-card p-3" data-id="' + p.id + '">'
        + '<div class="flex items-start gap-2">'
        + '<span class="w-3 h-3 rounded-full mt-1.5 shrink-0" style="background:' + color + '"></span>'
        + '<div class="flex-1 min-w-0">'
        + '<div class="font-semibold text-sm truncate" style="color: var(--text)">' + escapeHtml(p.name) + '</div>'
        + '<div class="text-xs truncate" style="color: var(--text-muted)">' + escapeHtml(addrLine) + '</div>'
        + '<div class="text-xs mt-1" style="color:' + color + '">' + meta.emoji + ' ' + meta.label + '</div>'
        + '</div></div></div>';
    }).join("");
    if (state.filteredPlaces.length > 300) {
      container.insertAdjacentHTML("beforeend", '<div class="p-3 text-xs text-center" style="color: var(--text-muted)">+ ' + (state.filteredPlaces.length - 300) + ' autres (affine les filtres)</div>');
    }
    container.querySelectorAll(".place-card").forEach(function(el) {
      el.addEventListener("click", function() { focusOn(el.dataset.id, true); });
    });
  }

  // ── Focus carte / liste ─────────────────────────────────
  function focusOn(id, fromList) {
    state.activeId = id;
    document.querySelectorAll(".place-card").forEach(function(el) {
      el.classList.toggle("active", el.dataset.id === id);
    });
    var marker = state.markers.get(id);
    if (marker) {
      state.cluster.zoomToShowLayer(marker, function() {
        marker.openPopup();
        if (fromList) state.map.panTo(marker.getLatLng());
      });
    }
  }

  // ── Carte Leaflet ───────────────────────────────────────
  function setupMap() {
    state.map = L.map("map", { zoomControl: true }).setView([40.4, -3.7], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(state.map);
    state.cluster = L.markerClusterGroup({ disableClusteringAtZoom: 12, spiderfyOnMaxZoom: true });
    state.map.addLayer(state.cluster);
  }

  // ── Filtres UI ──────────────────────────────────────────
  function setupFilters() {
    document.querySelectorAll(".filter-type").forEach(function(cb) {
      cb.addEventListener("change", function() {
        var t = cb.dataset.type;
        cb.checked ? state.filters.types.add(t) : state.filters.types.delete(t);
        applyFilters();
      });
    });
    document.getElementById("filter-province").addEventListener("change", function(e) {
      state.filters.province = e.target.value;
      applyFilters();
    });
    var timer;
    document.getElementById("filter-search").addEventListener("input", function(e) {
      clearTimeout(timer);
      timer = setTimeout(function() { state.filters.search = e.target.value; applyFilters(); }, 200);
    });
  }

  // ── Init ────────────────────────────────────────────────
  (async function init() {
    setupMap();
    await loadAll();
    updateCounts();
    buildProvinceOptions();
    setupFilters();
    applyFilters();
  })();
  </script>
  ```

- [ ] **Step 2 : Vérifier la carte**
  ```
  # Ouvrir http://localhost:4321/es/mapa
  # ✓ Hero avec 4 compteurs (186 + 60 + 5 + 373 ≈ 624 total)
  # ✓ Fond CartoDB Positron (clair, sobre)
  # ✓ Clusters s'affichent
  # ✓ Cliquer un cluster → zoom + séparation des marqueurs
  # ✓ Cliquer un marqueur → popup avec nom/adresse/type
  # ✓ Liste latérale scrollable synchronisée
  # ✓ Filtres par type fonctionnels (cacher SS cache leurs marqueurs)
  # ✓ Select province filtre la carte et la liste
  # ✓ Recherche texte fonctionne (ex: "Madrid")
  # ✓ Lien "Ver en Soliguia" visible dans les popups Soliguide
  ```

- [ ] **Step 3 : Vérifier les autres langues**
  ```
  # Ouvrir http://localhost:4321/fr/mapa
  # ✓ Titre en français (map.title)
  # ✓ Placeholder recherche en français
  ```

- [ ] **Step 4 : Commit**
  ```
  git add projects/regularizate/src/pages/[lang]/mapa.astro
  git commit -m "feat(regularizate): replace map with full Soliguide implementation (624 places, clustering, list panel)"
  ```

---

## Tâche 5 — Composants UI : Countdown + LangSwitcher

**Fichiers :**
- Modifier : `projects/regularizate/src/components/UI/Countdown.astro`
- Modifier : `projects/regularizate/src/components/UI/LangSwitcher.astro`

### Countdown

- [ ] **Step 1 : Remplacer `countdown-banner` par CSS inline**

  Dans `Countdown.astro`, la classe `.countdown-banner` dans `global.css` est `background: var(--accent-coral)`. Maintenant que `--accent-coral` reste inchangé (`#D94035`), la bannière garde son rouge. Mais pour utiliser la couleur Soliguide primary (`#f84b32`), remplacer :

  ```html
  <!-- Avant -->
  <div id="countdown-banner" class="countdown-banner">
  ```
  par :
  ```html
  <!-- Après : primary Soliguide via CSS var -->
  <div id="countdown-banner" style="background-color: var(--color-primary); color: white;">
  ```

  Et adapter le script inline (état "fermé") :
  ```js
  // Remplacer
  if (bannerEl) bannerEl.style.background = '#6B7280';
  // Par
  if (bannerEl) bannerEl.style.backgroundColor = '#6B7280';
  ```

  Supprimer `.countdown-banner { background: var(--accent-coral); color: white; }` de `global.css`.

### LangSwitcher

- [ ] **Step 2 : Vérifier le LangSwitcher sans modification**

  Les classes du composant utilisent des CSS vars custom (`bg-(--bg-muted)`, `text-(--text)`, etc.) via la syntaxe Tailwind v4 `bg-(--var)`. Puisque le bridge `:root` dans `global.css` remmappe ces vars vers les valeurs Soliguide, le LangSwitcher devrait s'afficher correctement sans aucune modification.

  Test : ouvrir le LangSwitcher → vérifier que le dropdown a le bon fond (`--bg-muted` = `#f5f5f5`) et les bons textes (`--text` = `#271332`).

- [ ] **Step 3 : Commit**
  ```
  git add projects/regularizate/src/components/
  git commit -m "feat(regularizate): update Countdown and LangSwitcher to Soliguide theme"
  ```

---

## Tâche 6 — `package.json` : script dashboard

**Fichiers :**
- Modifier : `projects/regularizate/package.json`

- [ ] **Step 1 : Ajouter le script `dashboard`**

  Dans `scripts`, ajouter :
  ```json
  "dashboard": "astro build && pnpm dlx serve dist -p 5555"
  ```

  Résultat final de `scripts` :
  ```json
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "dashboard": "astro build && pnpm dlx serve dist -p 5555"
  }
  ```

- [ ] **Step 2 : Vérifier**
  ```bash
  cd projects/regularizate && pnpm dashboard
  # Build Astro puis serve sur http://localhost:5555
  # ✓ http://localhost:5555/es/ fonctionne
  # ✓ http://localhost:5555/es/mapa fonctionne avec la carte
  ```

- [ ] **Step 3 : Commit**
  ```
  git add projects/regularizate/package.json
  git commit -m "feat(regularizate): add dashboard script (build + serve port 5555)"
  ```

---

## Tâche 7 — `index.html` racine : ajouter la card regularizate

**Fichiers :**
- Modifier : `/index.html` (racine du repo)

- [ ] **Step 1 : Localiser la section Mini-sites**

  Chercher `🌐 Mini-sites` dans `/index.html`.

- [ ] **Step 2 : Ajouter la card**

  Insérer dans la grille de la section Mini-sites :
  ```html
  <!-- Card: Regularizate -->
  <a href="projects/regularizate/dist/es/" class="project-card block bg-white rounded-2xl border border-base-300 overflow-hidden">
    <div class="p-6">
      <div class="flex items-start justify-between mb-3">
        <span class="text-3xl">🇪🇸</span>
        <span class="tag bg-success/15 text-success-content">Actif</span>
      </div>
      <h3 class="font-bold text-primary-content text-lg mb-1" style="font-family:'Nunito',sans-serif;">Regularízate</h3>
      <p class="text-sm text-base-content/70 mb-4">
        Mini-site multilingue (8 langues) pour aider les personnes à régulariser leur situation en Espagne.
        Tunnels de décision, carte des 620+ points d'aide, compte à rebours.
      </p>
      <div class="flex flex-wrap gap-2">
        <span class="tag bg-primary/10 text-primary">Mini-site</span>
        <span class="tag bg-base-200 text-base-content/70">Espagne</span>
        <span class="tag bg-base-200 text-base-content/70">i18n</span>
        <span class="tag bg-base-200 text-base-content/70">Leaflet</span>
      </div>
    </div>
  </a>
  ```

- [ ] **Step 3 : Vérifier**
  ```
  # Ouvrir http://localhost:5555/ (racine du repo)
  # ✓ Card "Regularízate" visible dans la section Mini-sites
  # ✓ Lien pointe vers projects/regularizate/dist/es/
  ```

- [ ] **Step 4 : Commit**
  ```
  git add index.html
  git commit -m "feat: add Regularizate to Soliguide Tools homepage"
  ```

---

## Tâche 8 — Vérification finale

- [ ] **Build complet**
  ```bash
  cd projects/regularizate && pnpm build
  # Doit se terminer sans erreur
  # dist/ contient les 8 langues × 5 pages
  ```

- [ ] **Checklist visuelle (chaque item dans la langue es)**

  | Page | Ce qu'on vérifie |
  |---|---|
  | `/es/` | Logo Soliguide navbar, Countdown rouge, cards tunnel avec couleurs accent, footer bg-primary |
  | `/es/mapa` | 4 compteurs chargés, carte CartoDB, clustering, liste latérale, filtres fonctionnels |
  | `/es/tunnel/extraordinario` | Roboto + Nunito, fond base-100, badges colors, ProgressBar visible |
  | `/fr/` | Traduction FR appliquée, LangSwitcher à "FR" |
  | `/ar/` | Direction RTL, textes arabes |

- [ ] **Commit final**
  ```
  git add -A
  git commit -m "feat(regularizate): complete Soliguide design system integration"
  ```

---

## Pièges connus

1. **`@theme` et `soliguide-theme.css` définissent les mêmes vars** : `@theme { --color-primary: #f84b32 }` émet `--color-primary` sur `:root` dans le CSS Tailwind. `soliguide-theme.css` (chargé via `<link>`) écrase ensuite `--color-primary` avec `var(--main-color-primary-primary)`. Si l'ordre de chargement est incorrect (CSS Tailwind après `soliguide-theme.css`), les couleurs Tailwind l'emportent sur les tokens Figma. Vérifier en dev : inspecter `:root` dans les DevTools → `--color-primary` doit afficher `#f84b32` (la valeur finale est identique dans les deux sources, donc peu de risque en pratique).

2. **Astro et scripts `is:inline` avec Leaflet** : Leaflet est chargé en CDN dans `<head>` → il est disponible avant le `<script is:inline>` dans le body. Mais si Astro réordonne les balises `<script>` pendant le build, `L` peut être indéfini. Vérifier en mode dev et en build que la console ne montre pas `L is not defined`.

3. **Chemins des assets en mode build** : Les assets dans `public/` sont copiés à la racine de `dist/`. Les chemins `/assets/variables.css`, `/data/oficinas_regularizacion_2026.json` fonctionnent en dev ET en build sans modification.

4. **Lien "Soliguide Tools" dans le menu** : En production sur GitHub Pages, `href="/../../index.html"` ne fonctionnera pas. Pour un usage local via `pnpm dashboard` (serve depuis `dist/`), `../../index.html` est correct si la racine du repo est servie deux niveaux au-dessus. À valider selon le déploiement cible.

5. **Police Nunito pour les titres** : Le projet regularizate n'applique pas Nunito aux `h1`/`h2` globalement (il n'en avait pas besoin avec Inter). Ajouter dans `global.css` : `h1, h2, h3 { font-family: 'Nunito', sans-serif; }` — ou utiliser `style="font-family: 'Nunito', sans-serif"` inline sur les titres principaux dans chaque page.
