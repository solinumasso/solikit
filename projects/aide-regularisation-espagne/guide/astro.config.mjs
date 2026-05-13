import { defineConfig } from 'astro/config';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Default: works with `pnpm dlx serve ../.. -p 5555` from the solikit repo root.
// Override for GitHub Pages: BASE_PATH=/solikit/projects/aide-regularisation-espagne/guide/dist
const base = process.env.BASE_PATH ?? '/projects/aide-regularisation-espagne/guide/dist';

// Filesystem path to data/output/ (one level up from guide/)
const dataOutputDir = fileURLToPath(new URL('../data/output', import.meta.url));

// URL prefix for data requests (strip /guide/dist from base to get project root)
const dataUrlPrefix = base.replace(/\/guide\/dist$/, '') + '/data/output/';

export default defineConfig({
  output: 'static',
  outDir: './dist',
  base,
  trailingSlash: 'always',
  i18n: {
    locales: ['ca', 'es', 'fr', 'en', 'pt', 'ar', 'wo', 'bm'],
    defaultLocale: 'ca',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    server: {
      allowedHosts: ['refrain-washday-deflator.ngrok-free.dev'],
    },
    plugins: [{
      name: 'dev-data-server',
      // Middleware Vite (dev uniquement) : sert les fichiers data/output/
      // depuis le filesystem quand le dev server ne peut pas les atteindre.
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith(dataUrlPrefix)) return next();
          const filename = req.url.slice(dataUrlPrefix.length).split('?')[0];
          const filepath = join(dataOutputDir, filename);
          if (!existsSync(filepath)) return next();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(readFileSync(filepath));
        });
      },
    }],
  },
});
