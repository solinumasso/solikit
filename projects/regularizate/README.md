# Regularízate.es

Site public multilingue d'aide à la régularisation des étrangers en Espagne. Conçu pour des utilisateurs vulnérables sur mobile bas/moyen de gamme.

## Sources officielles vérifiées (mai 2026)

| Source         | URL                                                                                                                              | Données                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| RD 316/2026    | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-8284                                                                         | DA 20ª (EX-31), DA 21ª (EX-32), deadline 30/06/2026, habilitation provisoire au travail |
| RD 1155/2024   | https://www.boe.es/buscar/act.php?id=BOE-A-2024-24099                                                                            | 5 arraigos, art. 124/127/128                                                            |
| RD 126/2026    | https://www.boe.es/buscar/act.php?id=BOE-A-2026-3815                                                                             | SMI 2026 = 1.221 €/mois, 14 pagas                                                       |
| 436 points     | https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/paginas/2026/210426-atencion-presencial-regularizacion.aspx | 371 Correos + 60 SS + 5 Extranjería                                                     |
| Formulaires EX | https://www.inclusion.gob.es/web/migraciones/modelos-generales                                                                   | EX-07, EX-31, EX-32                                                                     |

## Stack technique

- **Framework**: Astro 5.x
- **Styles**: Tailwind CSS 4.x
- **Carte**: Leaflet 1.9.x (CDN) + OpenStreetMap + OSRM
- **i18n**: 8 langues (es, ca, fr, en, ar, pt, wo, bm)
- **JS client**: vanilla uniquement

## Commandes

```bash
# Installation
npm install

# Développement
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview
```

## Enrichir les données de la carte

Le fichier `src/data/oficinas.json` contient les 5 officines d'Extranjería + des exemples de Correos et Seguridad Social. Pour l'enrichir avec les 436 points officiels :

```bash
# Sans géocodage (rapide, coordonnées à 0,0 pour les nouvelles entrées)
python scripts/scrape_offices.py

# Avec géocodage Nominatim (lent, ~1 req/sec, compte 52+ requêtes)
python scripts/scrape_offices.py --geocode
```

Après le scraping, le fichier est automatiquement copié dans `public/data/oficinas.json`.

Pour mettre à jour manuellement les coordonnées d'un bureau, ouvrez `src/data/oficinas.json` et modifiez les champs `lat` et `lng`.

## Valider les traductions

```bash
python scripts/validate_translations.py
```

Vérifie que toutes les clés de `es.json` existent dans les 7 autres fichiers de langue.

## Ajouter une langue

1. Créer `src/i18n/{code}.json` en copiant `es.json` et en traduisant
2. Ajouter `{code}` dans `SUPPORTED_LANGS` et `LANG_LABELS` dans `src/i18n/utils.ts`
3. Ajouter `{code}` dans `locales` dans `astro.config.mjs`
4. Marquer les clés non revues par un locuteur natif avec `"// TODO: native review"` (en commentaire ou dans le `_meta`)

## Architecture i18n

- `src/i18n/es.json` : source de vérité (espagnol)
- Fallback automatique vers `es` si une clé manque
- `dir: "rtl"` pour l'arabe — géré automatiquement dans `Base.astro`
- Sélection de langue par query param `?lang=XX` + localStorage
- Fichier `src/i18n/utils.ts` : `t()`, `getLang()`, `useTranslations()`

## Dates critiques

- **30 juin 2026** : date limite pour déposer EX-32 (DA 21ª) et EX-31 (DA 20ª)
- **1er juillet 2026** : le bandeau bascule automatiquement vers le message "a cerrado"
- Le compte à rebours est géré en JS vanilla côté client dans `Countdown.astro`

## Informations juridiques clés

Toutes vérifiées mai 2026 :

- SMI 2026 : **1.221 €/mois** (RD 126/2026, 14 pagas, 17.094 €/an)
- IPREM : **600 €/mois**
- Tasa 790-052 arraigo : **~10,72 €**
- Tasa 790-012 TIE : **~16,08 €**
- Absences max (arraigo ordinaire) : **90 jours** sur 2 ans
- Délai résolution : **3 mois maximum**
- 5 arraigos ordinaires : segunda oportunidad (127.a), sociolaboral (127.b), social (127.c), socioformativo (128), familiar (124)

## Mise à jour du contenu juridique

En cas de modification législative :

1. Vérifier sur https://www.boe.es les nouveaux décrets
2. Mettre à jour les chiffres dans `src/i18n/es.json`
3. Répercuter dans les 7 autres fichiers JSON
4. Taguer les modifications avec `// VERIFIED YYYY-MM`

## Déploiement

Le site est statique (output: `dist/`). Compatible avec Netlify, Vercel, Cloudflare Pages, GitHub Pages.

```bash
npm run build
# Déployer le dossier dist/
```
