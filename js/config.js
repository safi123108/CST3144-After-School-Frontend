/**
 * Centralized frontend runtime API configuration.
 *
 * Set `productionApiBaseUrl` to your deployed Render Express URL
 * (e.g. "https://<student-id>-after-school.onrender.com") before publishing to GitHub Pages.
 * Leave `productionApiBaseUrl` empty until the Render backend is live.
 */
(function initAppConfig(globalScope) {
  const existingConfig =
    globalScope.APP_CONFIG && typeof globalScope.APP_CONFIG === 'object'
      ? globalScope.APP_CONFIG
      : {};

  globalScope.APP_CONFIG = Object.freeze({
    localApiBaseUrl: 'http://localhost:3000',
    productionApiBaseUrl: '',
    ...existingConfig
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);

