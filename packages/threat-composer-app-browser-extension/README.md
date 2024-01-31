# Threat Composer Browser Extension

## Introduction

This extension/add-on allows you to view web accessible Threat Composer exports (.tc.json) with one click directly in your browser. The Threat Composer web-app is baked into the extension itself.

The extension supports the following integrations where a ‘View in Threat Composer’ button is added to the page:

- GitHub Code Browser
- Amazon Code Catalyst
- ‘View Raw’ anywhere online so long as the URL includes reference to `.tc.json` (Note: on Firefox it does not work on `githubusercontent.com` due to the `sandbox` CSP directive)

## Build

1. Clone this repo
1. Run the main build script (`./scripts/build.sh`) to build everything (including the browser extension)

For any other guidance see the [Development](../../README.md#development) section of the main [README](../../README.md)

## Load locally

### Google Chrome

1. Open Chrome, then goto `chrome://extensions`
1. Enable 'Developer mode'
1. Click on 'Load unpacked'
1. Point it at the `./.output/chrome-mv3` directory and click Open

### Mozilla Firefox

1. Open Firefox, then goto `about:debugging`
2. Click on 'This Firefox' then 'Load Temporary Add-on...'
3. Point it at any file with the `./.output/firefox-mv2` and click Open

## Create ZIP file

### Google Chrome

1. Go to the root of the extension package - `cd ./packages/threat-composer-app-browser-extension`
1. Run `yarn run zip` - look in `./.output/` for ZIP file
1. To load locally open Chrome, then goto `chrome://extensions`, enable developer mode, then drag-and-drop the ZIP file onto the page to load.

### Mozilla Firefox

1. Go to the root of the extension package - `cd ./packages/threat-composer-app-browser-extension`
1. Run `yarn run zip:firefox` - look in `./.output/` for ZIP file

## Development

### Google Chrome

1. Go to the root of the extension package - `cd ./packages/threat-composer-app-browser-extension`
1. Run `yarn run dev`
1. In your browser navigate to a hosted Threat Composer file on a supported integration - [example1](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/ThreatComposer.tc.json), [example2](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/GenAIChatbot.tc.json) and [example3](https://raw.githubusercontent.com/awslabs/threat-composer/main/packages/threat-composer/src/data/workspaceExamples/GenAIChatbot.tc.json)

### Mozilla Firefox

1. Go to the root of the extension package - `cd ./packages/threat-composer-app-browser-extension`
1. Run `yarn run dev:firefox`
1. In your browser navigate to a hosted Threat Composer file on a supported integration - [example1](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/ThreatComposer.tc.json) and [example2](https://github.com/awslabs/threat-composer/blob/main/packages/threat-composer/src/data/workspaceExamples/GenAIChatbot.tc.json). Note: on Firefox it does not work on `githubusercontent.com` due to the `sandbox` CSP directive.
