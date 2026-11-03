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

function src(file: string) {
  return path.resolve(import.meta.dirname, 'src', file);
}

// Replace sync-server's platform modules (its package.json `imports`) with
// the Cloudflare implementations in src/. Anchored so that e.g.
// `#storage/types` still resolves to sync-server's own file.
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    // These replace another package's private imports, which subpath
    // imports in this package can't do.
    // oxlint-disable-next-line actual/enforce-boundaries
    alias: [
      { find: /^#db$/, replacement: src('db.js') },
      { find: /^#storage$/, replacement: src('storage.ts') },
      { find: /^#password-hash$/, replacement: src('password-hash.js') },
    ],
  },
  // The prebuilt web app (yarn build:browser) becomes the Worker's static
  // assets; the Cloudflare plugin ignores wrangler's assets.directory.
  publicDir: path.resolve(import.meta.dirname, '../desktop-client/build'),
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
