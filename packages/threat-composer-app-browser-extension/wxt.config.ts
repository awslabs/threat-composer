import { defineConfig, type UserManifest } from 'wxt';
import react from '@vitejs/plugin-react';
import copy from 'rollup-plugin-copy';

const tcScriptInjectForThreatComposer = 'scriptInjectForThreatComposer.js'

function generateManifest(env: ConfigEnv): UserManifest {

  const manifest: UserManifest = {
    name: 'Threat Composer Viewer',
    description: "View a Threat Composer JSON export in Threat Composer",
    version_name: "0.0.4-alpha",
    content_scripts: [
      {
        matches: ["*://*/*.tc.json*", "*://*.github.com/*"],
        js: ['content-script.js'],
        run_at: "document_end"
      }
    ],
    permissions: ["storage", "tabs"],
    icons: {
      128: '/icon-128.png',
    },
  }

  if (env.manifestVersion === 2) {
    manifest.permissions?.push("*://*.github.com/*")
    manifest.permissions?.push("*://code.amazon.com/*")
  }

  const webAccessibleResources = [
    {
      "resources": ["scriptInjectForCodeCatalyst.js"],
      "matches": ["https://codecatalyst.aws/*"]
    }
  ];

  if (env.browser === 'firefox') {
    manifest.web_accessible_resources = webAccessibleResources.flatMap(entry => entry.resources)
  } else {
    manifest.web_accessible_resources = webAccessibleResources
  }
  return manifest

}

export default defineConfig({
  vite: (env) => ({
    build: {
      emptyOutDir: false
    },
    plugins: [
      react(),
      copy({
        targets: [
          {
            src: ['../threat-composer-app/build/browser-extension/*'],
            dest: env.browser === 'chrome' ? ['./.output/chrome-mv3'] : ['./.output/firefox-mv2'],
          },
          {
            src: '../threat-composer-app/build/browser-extension/index.html',
            dest: env.browser === 'chrome' ? ['./.output/chrome-mv3'] : ['./.output/firefox-mv2'],
            transform: (contents) => contents.toString().replace('<\/body><\/html>', '<script src=\"' + tcScriptInjectForThreatComposer + '\"><\/script><\/body><\/html>')
          },
          {
            src: '../threat-composer-app/build/browser-extension/*.js',
            dest: env.browser === 'chrome' ? ['./.output/chrome-mv3'] : ['./.output/firefox-mv2'],
            transform: (contents) =>
              contents.toString().replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/html5shiv\/[0-9]+\.[0-9]+\.[0-9]+\/html5shiv[a-zA-Z-]*.min.js"><\\\/script>/g, '')
          },
          {
            src: '../threat-composer-app/build/browser-extension/static/js/*.js',
            dest: env.browser === 'chrome' ? ['./.output/chrome-mv3/static/js/'] : ['./.output/firefox-mv2/static/js/'],
            transform: (contents) =>
              contents.toString().replace(/\|\|"https:\/\/cdn.jsdelivr.net\/npm\/browser-image-compression@[0-9]+\.[0-9]+\.[0-9]+\/dist\/browser-image-compression\.js"/g, '')
          },
        ],
        copySync: true
      })
    ]
  }),
  srcDir: 'src',
  manifest: generateManifest
});