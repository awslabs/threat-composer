/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
 ******************************************************************************************************************** */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import nxPackage from 'nx/package.json' with { type: 'json' };

const workspace = path.resolve(import.meta.dirname, '..');
const nx = path.join(workspace, 'node_modules/nx', nxPackage.bin.nx);
const app = '@aws/threat-composer-app';
const extension = '@aws/threat-composer-app-browser-extension';

// Exercise the real target settings with tiny producers, rather than bundling the
// entire app. Each fixture has its own Git ignore rules, Nx cache and outputs.
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'threat-composer-nx-cache-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const write = async (file, contents) => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), contents);
  };
  await write('package.json', JSON.stringify({ name: 'nx-cache-fixture', private: true }));
  await write('nx.json', await readFile(path.join(workspace, 'nx.json')));
  await write('.gitignore', 'node_modules/\n.nx/\n**/build/\n**/storybook.out/\n**/.output/\n**/.wxt/\n');
  await symlink(path.join(workspace, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  execFileSync('git', ['init', '--quiet'], { cwd: root });

  const buildScript = `
const fs = require('node:fs');
const path = require('node:path');
const step = process.argv[2];
const emit = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
if (step === 'clean') {
  for (const dir of ['build', 'storybook.out', '.output', '.wxt']) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
} else if (step === 'storybook') {
  emit('storybook.out/index.html', fs.readFileSync('src/version.txt'));
} else if (step === 'copy-storybook') {
  emit('build/storybook/index.html', fs.readFileSync('../threat-composer/storybook.out/index.html'));
} else if (step === 'prepare') {
  emit('.wxt/fixture.txt', 'prepared');
} else if (step === 'chrome' || step === 'firefox') {
  emit('.output/' + (step === 'chrome' ? 'chrome-mv3' : 'firefox-mv2') + '/index.html',
    fs.readFileSync('../threat-composer-app/build/browser-extension/index.html'));
} else {
  emit('build/' + step + '/index.html', (process.env.PUBLIC_URL || '/') + fs.readFileSync('src/version.txt', 'utf8'));
}
`;
  for (const [name, steps, buildDependencies] of [
    ['threat-composer', { clean: 'clean', 'storybook:build': 'storybook' }, ['storybook:build']],
    ['threat-composer-app', {
      clean: 'clean',
      'compile:website': 'website',
      'compile:browser-extension': 'browser-extension',
      'compile:ide-extension': 'ide-extension',
      'copy-storybook': 'copy-storybook',
      compile: null,
    }, ['compile', 'copy-storybook']],
    ['threat-composer-app-browser-extension', {
      clean: 'clean', prepare: 'prepare', 'compile:chrome': 'chrome', 'compile:firefox': 'firefox', compile: null,
    }, ['compile']],
  ]) {
    const projectRoot = `packages/${name}`;
    const original = JSON.parse(await readFile(path.join(workspace, projectRoot, 'project.json'), 'utf8'));
    const targets = Object.fromEntries(Object.entries(steps).map(([target, step]) => [target, {
      ...original.targets[target],
      ...(step ? { command: `node fixture-build.cjs ${step}` } : {}),
    }]));
    targets.build = { ...original.targets.build, dependsOn: buildDependencies };
    await write(`${projectRoot}/project.json`, JSON.stringify({ ...original, targets }));
    await write(`${projectRoot}/fixture-build.cjs`, buildScript);
    await write(`${projectRoot}/src/version.txt`, 'version-one');
  }

  return {
    write,
    read: (file) => readFile(path.join(root, file), 'utf8'),
    run: (target, env = {}) => execFileSync(process.execPath, [nx, 'run', target, '--output-style=static'], {
      cwd: root,
      env: {
        ...process.env,
        // The fixture invokes Node directly and must not inherit pnpm/Corepack discovery.
        npm_config_user_agent: '',
        PUBLIC_URL: '/',
        NX_DAEMON: 'false',
        NX_NO_CLOUD: 'true',
        NX_SKIP_NX_CACHE: 'false',
        NX_DISABLE_NX_CACHE: 'false',
        NX_WORKSPACE_ROOT_PATH: root,
        NX_CACHE_DIRECTORY: path.join(root, '.nx/cache'),
        NX_WORKSPACE_DATA_DIRECTORY: path.join(root, '.nx/workspace-data'),
        ...env,
      },
      encoding: 'utf8',
      timeout: 60_000,
    }),
  };
}

test('aggregate compile/build caches cannot overwrite a changed website base', async (t) => {
  const f = await fixture(t);
  f.run(`${app}:build`, { PUBLIC_URL: '/first/' });
  assert.match(f.run(`${app}:build`, { PUBLIC_URL: '/first/' }), /read the output from the cache/);
  f.run(`${app}:build`, { PUBLIC_URL: '/second/' });
  assert.equal(await f.read('packages/threat-composer-app/build/website/index.html'), '/second/version-one');
});

test('Chrome and Firefox invalidate their caches when the embedded app changes', async (t) => {
  const f = await fixture(t);
  f.run(`${extension}:build`);
  assert.match(f.run(`${extension}:build`), /read the output from the cache/);
  await f.write('packages/threat-composer-app/src/version.txt', 'version-two');
  f.run(`${extension}:build`);
  for (const browser of ['chrome-mv3', 'firefox-mv2']) {
    assert.equal(await f.read(`packages/threat-composer-app-browser-extension/.output/${browser}/index.html`), '/version-two');
  }
});

test('Storybook copying invalidates its cache when the generated site changes', async (t) => {
  const f = await fixture(t);
  f.run(`${app}:copy-storybook`);
  assert.match(f.run(`${app}:copy-storybook`), /read the output from the cache/);
  await f.write('packages/threat-composer/src/version.txt', 'version-two');
  f.run(`${app}:copy-storybook`);
  assert.equal(await f.read('packages/threat-composer-app/build/storybook/index.html'), 'version-two');
});
