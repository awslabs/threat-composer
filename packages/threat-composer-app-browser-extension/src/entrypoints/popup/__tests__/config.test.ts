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
import { describe, expect, it, vi } from 'vitest';
import {
  DefaultConfig,
  IntegrationTypes,
  getExtensionConfig,
  setExtensionConfig,
} from '../config';

/**
 * The shipped configuration is the extension's entire matching policy: which hosts
 * it activates on, which files it treats as threat models, and which URLs count as
 * raw views. A change here silently changes behaviour on real sites, so the values
 * are pinned rather than merely shape-checked.
 */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('DefaultConfig', () => {
  it('ships debug off', () => {
    // Debug logging writes to the console of every page the user visits.
    expect(DefaultConfig.debug).toBe(false);
  });

  it('recognises .tc.json files', () => {
    expect(DefaultConfig.fileExtension).toBe('.tc.json');
  });

  it('covers exactly the five known integrations, all enabled', () => {
    expect(Object.keys(DefaultConfig.integrations).sort()).toEqual([
      'bitbucket',
      'codeamazon',
      'codecatalyst',
      'github',
      'gitlab',
    ]);

    for (const [key, integration] of Object.entries(DefaultConfig.integrations)) {
      expect(integration.enabled, `${key} should ship enabled`).toBe(true);
      expect(integration.name, `${key} should have a display name`).toBeTruthy();
    }
  });

  it('pins the per-host URL patterns', () => {
    const { integrations } = DefaultConfig;

    expect(integrations[IntegrationTypes.GITHUB].urlRegexes).toEqual([
      'github.com',
      'raw.githubusercontent.com',
    ]);
    expect(integrations[IntegrationTypes.GITLAB].urlRegexes).toEqual(['gitlab.com']);
    expect(integrations[IntegrationTypes.BITBUCKET].urlRegexes).toEqual(['bitbucket.org']);
    expect(integrations[IntegrationTypes.CODEAMAZON].urlRegexes).toEqual(['code.amazon.com']);
    expect(integrations[IntegrationTypes.CODECATALYST].urlRegexes).toEqual(['codecatalyst.aws']);
  });

  it('pins the per-host raw patterns, including CodeCatalyst having none', () => {
    const { integrations } = DefaultConfig;

    expect(integrations[IntegrationTypes.GITHUB].rawUrlPatterns).toEqual([
      'githubusercontent.com',
    ]);
    expect(integrations[IntegrationTypes.GITLAB].rawUrlPatterns).toEqual(['/-/raw/']);
    expect(integrations[IntegrationTypes.BITBUCKET].rawUrlPatterns).toEqual(['/raw/']);
    expect(integrations[IntegrationTypes.CODEAMAZON].rawUrlPatterns).toEqual(['?raw=1']);
    // CodeCatalyst has no raw view; its content is scraped from the editor instead.
    expect(integrations[IntegrationTypes.CODECATALYST].rawUrlPatterns).toEqual([]);
  });
});

describe('getExtensionConfig', () => {
  it('falls back to the defaults when nothing is stored', async () => {
    await expect(getExtensionConfig()).resolves.toEqual(DefaultConfig);
  });

  it('falls back to the defaults for an empty stored object', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (globalThis as any).browser.storage.local.set({ tcConfig: {} });

    await expect(getExtensionConfig()).resolves.toEqual(DefaultConfig);
  });

  it('returns a stored config', async () => {
    const stored = { ...DefaultConfig, debug: true, fileExtension: '.threats.json' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (globalThis as any).browser.storage.local.set({ tcConfig: stored });

    await expect(getExtensionConfig()).resolves.toEqual(stored);
  });

  it('round-trips through setExtensionConfig', async () => {
    // setExtensionConfig logs on success, and debug is on in the config being saved.
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    setExtensionConfig({ ...DefaultConfig, debug: true });
    await flush();

    await expect(getExtensionConfig()).resolves.toMatchObject({ debug: true });
    log.mockRestore();
  });

  /**
   * KNOWN DEFECT, pinned rather than endorsed.
   *
   * The stored value is returned verbatim — there is no merge against
   * DefaultConfig and no migration. So a config written by an older version, or any
   * partial write, comes back missing keys. `ConfigView` then throws on
   * `config.integrations[TYPE].enabled` during render and the popup paints nothing
   * at all, with no console error. The matching end-to-end case is recorded in
   * e2e/tests-extension/extension-shell.spec.ts.
   *
   * The fix would be a defaults merge here. When that lands, this test should be
   * replaced with one asserting the merge.
   */
  it('returns a partial stored config unmerged, which is what breaks the popup', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (globalThis as any).browser.storage.local.set({ tcConfig: { debug: true } });

    const config = await getExtensionConfig();

    expect(config).toEqual({ debug: true });
    expect(
      config.integrations,
      'if this is now defined, a defaults merge has been added — assert that instead',
    ).toBeUndefined();
  });
});
