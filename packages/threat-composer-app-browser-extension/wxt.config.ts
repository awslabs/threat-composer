import { defineConfig, TargetManifestVersion } from 'wxt';
import react from '@vitejs/plugin-react';
import copy from 'rollup-plugin-copy';

const tcScriptInjectForThreatComposer = 'scriptInjectForThreatComposer.js'

const baseManifest = {
  name: 'Threat Composer Viewer',
  description: "View a Threat Composer JSON export in Threat Composer",
  version_name: "0.0.3-alpha",
  content_scripts: [
    {
      matches: ["*://*/*.tc.json*", "*://*.github.com/*"],
      js: ['content-script.js'],
      run_at: "document_end"
    }
  ],
  permissions: ["storage", "tabs", "*://*.github.com/*", "*://code.amazon.com/*"],
}

const webAccessibleResources = [
  {
    "resources": ["scriptInjectForCodeCatalyst.js"],
    "matches": ["https://codecatalyst.aws/*"]
  }
];

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
  manifest: ({ manifestVersion }) => ({
    ...baseManifest,
    web_accessible_resources: manifestVersion === 3
      ? webAccessibleResources
      : webAccessibleResources.flatMap(entry => entry.resources),
  })
});