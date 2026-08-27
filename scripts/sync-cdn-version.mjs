// Keeps every hardcoded `halloween.js@X.Y.Z` jsDelivr URL (demo install
// snippet, README, llms.txt) pinned to the version actually published to
// npm — those pins are intentional (jsDelivr caches a version forever), but
// that means nothing else keeps them in sync automatically. Run without
// flags to rewrite them to package.json's version (wired into `npm version`
// below); run with --check to fail CI/`npm run check` if a manual edit ever
// lets them drift.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PIN_PATTERN = /halloween\.js@\d+\.\d+\.\d+/g;

const FILES = ['demo/demo.js', 'README.md', 'demo/llms.txt', 'demo/llms-full.txt'];

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const target = `halloween.js@${version}`;
const isCheck = process.argv.includes('--check');

let drifted = false;

for (const relPath of FILES) {
  const absPath = new URL(relPath, `file://${ROOT}`);
  const source = readFileSync(absPath, 'utf8');
  const matches = source.match(PIN_PATTERN) ?? [];
  const stale = matches.filter((m) => m !== target);

  if (stale.length === 0) {
    console.log(
      `OK   ${relPath} — already pinned to ${version} (${matches.length} occurrence${matches.length === 1 ? '' : 's'})`,
    );
    continue;
  }

  if (isCheck) {
    console.error(
      `FAIL ${relPath} — pinned to ${[...new Set(stale)].join(', ')}, expected ${target}`,
    );
    drifted = true;
    continue;
  }

  writeFileSync(absPath, source.replaceAll(PIN_PATTERN, target));
  console.log(
    `FIX  ${relPath} — ${stale.length} occurrence${stale.length === 1 ? '' : 's'} updated to ${version}`,
  );
}

if (isCheck && drifted) {
  console.error('\nRun `node scripts/sync-cdn-version.mjs` to fix.');
  process.exit(1);
}
