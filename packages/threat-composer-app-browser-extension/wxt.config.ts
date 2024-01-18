import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import copy from 'rollup-plugin-copy';

const tcScriptInjectForThreatComposer = 'scriptInjectForThreatComposer.js'

export default defineConfig({
  vite: () => ({
    build: {
      emptyOutDir: false
    },
    plugins: [
      react(),
      copy({
        targets: [{
          src: '../threat-composer-app/build/browser-extension/index.html',
          dest: ['./.output/chrome-mv3', './.output/firefox-mv2'],
          transform: (contents, filename) => contents.toString().replace('<\/body><\/html>', '<script src=\"' + tcScriptInjectForThreatComposer + '\"><\/script><\/body><\/html>')
        }],
        copyOnce: true
      }),
      copy({
        targets: [{
          src: ['../threat-composer-app/build/browser-extension/**/*', '!../threat-composer-app/build/browser-extension/index.html'],
          dest: ['./.output/chrome-mv3', './.output/firefox-mv2'],
        }],
        copyOnce: true
      })
    ]
  }),
  srcDir: 'src',
  manifest: {
    name: 'Threat Composer Viewer',
    description: "View a Threat Composer JSON export in Threat Composer",
    version_name: "0.0.2-alpha",
    content_scripts: [
      {
        matches: ["*://*/*.tc.json*", "*://*.github.com/*"],
        js: ['content-script.js'],
        run_at: "document_end"
      }
    ],
    web_accessible_resources: [
      {
        "resources": ["scriptInjectForCodeCatalyst.js"],
        "matches": ["https://codecatalyst.aws/*"]
      }
    ],
    permissions: ["storage", "tabs"],
  }
});