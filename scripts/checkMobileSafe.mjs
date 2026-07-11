/**
 * Guard against the PR #101 mobile crash class: Obsidian mobile runs in a
 * WebView with no Node runtime, so any dependency that bundles
 * `node:async_hooks` / `AsyncLocalStorage` throws at plugin load.
 * Fails the production build if the bundle contains either marker.
 */
import fs from 'node:fs';

const BUNDLE_PATH = 'build/main.js';
const FORBIDDEN = [/async_hooks/, /AsyncLocalStorage/];

const bundle = fs.readFileSync(BUNDLE_PATH, 'utf8');
const offenders = FORBIDDEN.filter((pattern) => pattern.test(bundle));

if (offenders.length > 0) {
  console.error(
    `✖ Mobile-safety check failed: ${BUNDLE_PATH} contains ${offenders
      .map(String)
      .join(', ')}.\n` +
      'This will crash the plugin on Obsidian mobile (no Node runtime). ' +
      'A dependency is pulling in node:async_hooks — see PR #102 for history.',
  );
  process.exit(1);
}

console.log('✔ Mobile-safety check passed: no async_hooks/AsyncLocalStorage in bundle');
