/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ******************************************************************************************************************** */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const PACKAGE_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * `mode` selects the artifact being produced. It replaces the CRA-era
 * `BUILD_PATH` / `REACT_APP_APP_MODE` environment variables:
 *
 *   vite build                              -> build/website
 *   vite build --mode browser-extension     -> build/browser-extension
 *   vite build --mode ide-extension         -> build/ide-extension
 *
 * The matching `.env.<mode>` file supplies `VITE_APP_MODE`.
 */
const OUT_DIRS: Record<string, string> = {
  'browser-extension': 'build/browser-extension',
  'ide-extension': 'build/ide-extension',
};

/**
 * The website is published under a non-root path on GitHub Pages, so its asset
 * URLs need to be prefixed. Extension builds are always served from the root of
 * the extension bundle, so they must keep an absolute `/` base.
 */
const resolveBase = (isExtension: boolean) => {
  if (isExtension) {
    return '/';
  }

  const publicUrl = process.env.PUBLIC_URL;

  if (!publicUrl) {
    return '/';
  }

  return publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
};

export default defineConfig(({ mode }) => {
  const isExtension = mode === 'browser-extension' || mode === 'ide-extension';
  const outDir = OUT_DIRS[mode] ?? 'build/website';

  const plugins: PluginOption[] = [react()];

  // Only the hosted website is a PWA. The extension builds never register a
  // service worker (see src/utils/isMemoryRouterUsed), so generating one there
  // would just ship dead code into the extension bundle.
  if (!isExtension) {
    plugins.push(
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'service-worker.ts',
        // src/serviceWorkerRegistration.ts does the registration by hand.
        injectRegister: null,
        // public/manifest.json is maintained by hand.
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,gif,json,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        },
        devOptions: {
          enabled: false,
        },
      }),
    );
  }

  return {
    base: resolveBase(isExtension),
    plugins,
    define: {
      // create-react-app's webpack build defined the Node `global`. Some
      // browser-targeted dependencies still reference it -- `docx` and the
      // `buffer` polyfill it carries are the ones that reach this bundle.
      global: 'globalThis',
    },
    resolve: {
      alias: {
        // Keeps postcss's Node-only internals out of the browser bundle.
        // See src/stubs/postcss.ts.
        postcss: path.join(PACKAGE_DIR, 'src/stubs/postcss.ts'),
      },
    },
    optimizeDeps: {
      // Without this Vite's dependency scanner globs every HTML file under the
      // package, including previous build output in build/ (notably the copied
      // Storybook bundle), and tries to resolve imports out of already-built
      // assets. index.html is the only real entry point.
      entries: ['index.html'],
      // Vite 8 pre-bundles with Rolldown rather than esbuild and ignores the old
      // `optimizeDeps.esbuildOptions`. Its replacement, `optimizeDeps.rolldownOptions`,
      // rejects a `define` key outright ("Invalid key: Expected never but received
      // define"), so the CRA-era `global` shim for pre-bundled deps has no direct
      // equivalent here. The top-level `define` still covers application code.
      // tests/word-export.spec.ts is the guard for this: packing a .docx is the path
      // that actually needs `global`, so if that test passes, dep pre-bundling is
      // handling it and nothing more is required.
    },
    build: {
      outDir,
      emptyOutDir: true,
      // The Content-Security-Policy in index.html uses `script-src 'self'`, so
      // no script may end up inline. Vite never inlines entry chunks, and the
      // modulepreload polyfill is disabled to keep that guarantee explicit.
      modulePreload: {
        polyfill: false,
      },
      sourcemap: false,
      // Keep create-react-app's `static/{js,css,media}` layout. The browser
      // extension's wxt.config.ts copies and rewrites `static/js/*.js` by path.
      assetsDir: 'static',
      rollupOptions: {
        output: {
          entryFileNames: 'static/js/[name].[hash].js',
          chunkFileNames: 'static/js/[name].[hash].chunk.js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';

            if (name.endsWith('.css')) {
              return 'static/css/[name].[hash][extname]';
            }

            return 'static/media/[name].[hash][extname]';
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    preview: {
      port: 3000,
    },
  };
});
