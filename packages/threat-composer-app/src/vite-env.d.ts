/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Selects the artifact variant being built. Empty for the hosted website,
   * `browser-extension` or `ide-extension` for the embedded builds.
   * Supplied by the matching `.env.<mode>` file.
   */
  readonly VITE_APP_MODE?: string;
  /** Default composer mode when the `mode` search param is absent. */
  readonly VITE_DEFAULT_MODE?: string;
  /** Router basename when the app is not served from the domain root. */
  readonly VITE_ROUTE_BASE_PATH?: string;
  /** `'true'` when the build targets GitHub Pages. */
  readonly VITE_GITHUB_PAGES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
