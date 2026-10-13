import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { seoFiles } from './seo.config.js';

// Where the API runs in development (change it if port 5000 is taken by another app).
const api = process.env.API_URL || 'http://localhost:5000';

// robots.txt, sitemap.xml and llms.txt for the live domain; __SITE_URL__ in index.html.
function seo(siteUrl) {
  const files = seoFiles(siteUrl);
  return {
    name: 'swipehire-seo',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('__SITE_URL__', siteUrl) },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files[req.url?.split('?')[0].slice(1)];
        if (!file) return next();
        res.setHeader('Content-Type', `${file.type}; charset=utf-8`);
        res.end(file.body);
      });
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source: file.body });
    },
  };
}

export default defineConfig(({ mode }) => {
  // The public address of the site, e.g. https://swipehire.in (set VITE_SITE_URL in client/.env).
  const siteUrl = (loadEnv(mode, process.cwd()).VITE_SITE_URL || 'https://swipehire.in').replace(/\/+$/, '');
  return {
    plugins: [react(), tailwindcss(), seo(siteUrl)],
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl) },
    server: {
      port: 5173,
      // Lets the dev server read ../shared (lists used by both client and server).
      fs: { allow: ['..'] },
      proxy: {
        '/api': api,
        '/uploads': api,
      },
    },
  };
});
