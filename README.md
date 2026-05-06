# Soliguide Tools

Boîte à outils interne pour Soliguide. Chaque outil est un mini-projet autonome qui combine des **scripts de traitement de données** et un **dashboard de visualisation**.

## Comment ça marche

Ce repo est conçu pour être utilisé avec **Claude Code**. Ouvre un terminal dans ce dossier et lance Claude Code : il comprendra automatiquement le contexte et te guidera en français.

```bash
# Installer Claude Code (si pas déjà fait)
npm install -g @anthropic-ai/claude-code

# Ouvrir Claude Code dans le repo
cd soliguide-tools
claude
```

Ensuite, décris simplement ce que tu veux faire. Par exemple :
- "Je veux créer un outil pour calculer le score de qualité des fiches"
- "Lance le téléchargement des données FINESS"
- "Aide-moi à comprendre le projet integration-sante"

## Projets disponibles

| Projet | Description | Lien |
|--------|-------------|------|
| **integration-sante** | Matching FINESS ↔ Soliguide | [Voir le projet](projects/integration-sante/) |

## Structure

```
soliguide-tools/
├── CLAUDE.md              # Instructions pour Claude Code
├── README.md              # Ce fichier
├── assets/                # Ressources partagées (CSS, fonts, images)
└── projects/
    └── integration-sante/ # Premier outil
        ├── src/           # Scripts de traitement
        ├── dashboard/     # Interface de visualisation
        └── data/          # Données (non committées)
```

### Structure d'un projet

Chaque projet a deux parties :
1. **`src/`** — Scripts TypeScript numérotés (`01-download.ts`, `02-transform.ts`…) pour le traitement de données
2. **`dashboard/`** — Application web statique (HTML/CSS/JS) pour visualiser les résultats, déployable sur GitHub Pages

## Prérequis

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (gestionnaire de paquets)
- [Claude Code](https://claude.com/claude-code) (recommandé pour l'utilisation guidée)
