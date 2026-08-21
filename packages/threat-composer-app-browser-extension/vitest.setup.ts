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
import { beforeEach, vi } from 'vitest';

/**
 * The extension source reaches for a BARE `browser` global — declared as
 * `declare const browser: any` in core-utils.ts, content-script.ts and
 * codecatalyst-handler.ts, and with no declaration at all in background.ts and
 * popup/config.ts. WXT supplies it at build time; under vitest it does not exist,
 * so anything touching storage or runtime messaging throws
 * `ReferenceError: browser is not defined`.
 *
 * Deliberately hand-rolled rather than WXT's `fakeBrowser`.
 * `import { fakeBrowser } from 'wxt/testing'` pulls in esbuild, and esbuild asserts
 * `new TextEncoder().encode('') instanceof Uint8Array` on load — which is FALSE
 * under jsdom, because jsdom's TextEncoder produces values from another realm. The
 * result is a hard "your JavaScript environment is broken" failure that takes the
 * whole run with it. It cannot be repaired from a setup file either, since setup
 * files are themselves transformed by esbuild before any of their code runs.
 *
 * The same constraint is why every test file here uses STATIC imports: a dynamic
 * `await import(...)` inside a test is transformed while jsdom is active and trips
 * the identical failure.
 *
 * Only the surface the source actually calls is implemented. Anything missing
 * should fail loudly rather than silently no-op.
 */
const storage: Record<string, unknown> = {};

vi.stubGlobal('browser', {
  storage: {
    local: {
      get: async (keys: string[]) =>
        Object.fromEntries(
          keys.filter((key) => key in storage).map((key) => [key, storage[key]]),
        ),
      set: async (items: Record<string, unknown>) => {
        Object.assign(storage, items);
      },
      clear: async () => {
        for (const key of Object.keys(storage)) {
          delete storage[key];
        }
      },
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
    lastError: undefined as { message: string } | undefined,
  },
});

/** Storage is module-scoped, so wipe it between tests. */
beforeEach(() => {
  for (const key of Object.keys(storage)) {
    delete storage[key];
  }
});
