import fs from 'node:fs';
import path from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const outDir = path.resolve(import.meta.dirname, 'dist');

/**
 * The web build ships a Netlify-style `_redirects` (`/* /index.html 200`)
 * that Cloudflare rejects as an infinite loop. SPA routing is handled by
 * `not_found_handling` in wrangler.jsonc instead. Wrangler reads
 * `_redirects` from the assets directory even when it is listed in
 * `.assetsignore`, so the file has to be removed from the output.
 */
function removeNetlifyRedirects(): Plugin {
  return {
    name: 'actual:remove-netlify-redirects',
    closeBundle() {
      fs.rmSync(path.join(outDir, 'client', '_redirects'), { force: true });
    },
  };
}

// Select the Cloudflare implementations here so package.json imports keep
// pointing to the Node defaults. Native modules and filesystem storage are
// excluded from the Worker bundle.
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      '#db': path.resolve(import.meta.dirname, '../src/db.workerd.js'),
      '#storage': path.resolve(
        import.meta.dirname,
        '../src/storage/workerd.ts',
      ),
      '#password-hash': path.resolve(
        import.meta.dirname,
        '../src/accounts/password-hash.workerd.js',
      ),
    },
  },
  // The prebuilt web app (yarn build:browser) becomes the Worker's static
  // assets; the Cloudflare plugin ignores wrangler's assets.directory.
  publicDir: path.resolve(import.meta.dirname, '../../desktop-client/build'),
  build: {
    outDir,
    emptyOutDir: true,
  },
  plugins: [
    cloudflare({
      configPath: path.resolve(import.meta.dirname, 'wrangler.jsonc'),
    }),
    removeNetlifyRedirects(),
  ],
});
