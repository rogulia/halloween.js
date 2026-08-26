// Verifies the REAL npm tarball this package would publish — not just the
// source tree. Run as part of `npm run check` (test:package step), after
// build. Deliberately invoked with `npm pack --json --ignore-scripts`: this
// script itself runs as `prepack` -> `check` -> `test:package`, so packing
// again from *inside* that chain without --ignore-scripts would re-trigger
// prepack and recurse forever. --ignore-scripts breaks that cycle.
//
// Everything happens in a throwaway temp directory (mkdtemp), removed in a
// finally block on both success and failure — no tgz or scratch project is
// ever left in the repository, and no shell string-concatenation is used
// for any external command (spawnSync/execFileSync with argument arrays
// only).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TSC_BIN = join(REPO_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

const ESM_RUNTIME_FIXTURE = `import halloween, {
  halloween as namedHalloween,
  pageEffects,
} from "halloween.js";

console.log(JSON.stringify({
  defaultIsNamed: halloween === namedHalloween,
  halloweenIsFunction: typeof halloween === "function",
  pageEffectsStartIsFunction: typeof pageEffects.start === "function",
  pageEffectsStopIsFunction: typeof pageEffects.stop === "function",
}));
`;

const CJS_RUNTIME_FIXTURE = `const {
  default: halloween,
  halloween: namedHalloween,
  pageEffects,
} = require("halloween.js");

console.log(JSON.stringify({
  defaultIsNamed: halloween === namedHalloween,
  halloweenIsFunction: typeof halloween === "function",
  pageEffectsStartIsFunction: typeof pageEffects.start === "function",
  pageEffectsStopIsFunction: typeof pageEffects.stop === "function",
}));
`;

const TS_ESM_FIXTURE = `import halloween, {
  halloween as namedHalloween,
  pageEffects,
  type PageEffectName,
} from "halloween.js";

const effect: PageEffectName = "eyes";
const tombstoneEffect: PageEffectName = "tombstones";

halloween();
pageEffects.start(effect);
pageEffects.stop(effect);
void tombstoneEffect;

void namedHalloween;
`;

const TS_CJS_FIXTURE = `import halloween, {
  halloween as namedHalloween,
  pageEffects,
  type PageEffectName,
} from "halloween.js";

const effect: PageEffectName = "eyes";
const tombstoneEffect: PageEffectName = "tombstones";

halloween();
pageEffects.start(effect);
pageEffects.stop(effect);
void tombstoneEffect;

void namedHalloween;
`;

const failures = [];
function fail(label, detail) {
  failures.push(label);
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}
function ok(label, detail) {
  console.log(`OK   ${label}${detail ? ` — ${detail}` : ''}`);
}

// npm propagates its own CLI flags to child npm invocations via
// npm_config_* env vars — notably, when this script runs as `prepack`
// inside a real `npm pack --dry-run` (or `npm publish --dry-run`), the
// parent's dry-run setting leaks into any `npm pack`/`npm install` this
// script spawns, silently turning them into no-ops (no tgz gets written,
// though `npm pack --json` still *reports* the metadata as if it had).
// Every npm invocation below must produce real, on-disk artifacts
// regardless of how this script itself was invoked, so dry-run is always
// forced off here.
const CHILD_ENV = { ...process.env, npm_config_dry_run: 'false' };

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', env: CHILD_ENV, ...opts });
}

// --- 0. A fresh dist must already exist (built by an earlier `check` step;
// this script doesn't rebuild it — that's `npm run build`'s job). ---
const EXPECTED_DIST_FILES = [
  'halloween.js',
  'halloween.cjs',
  'halloween.iife.js',
  'halloween.d.ts',
  'halloween.d.cts',
];
// Read from the repo's own package.json rather than a hardcoded literal —
// otherwise every version bump has to remember to update this file too.
const EXPECTED_VERSION = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version;

const distDir = join(REPO_ROOT, 'dist');
const missingDist = EXPECTED_DIST_FILES.filter((f) => !existsSync(join(distDir, f)));
if (missingDist.length > 0) {
  console.error(
    `FAIL dist/ is missing expected files: ${missingDist.join(', ')} — run \`npm run build\` first.`,
  );
  process.exit(1);
}
ok('dist/ present', EXPECTED_DIST_FILES.join(', '));

const tmpRoot = mkdtempSync(join(tmpdir(), 'halloween-js-package-check-'));
try {
  // --- 1. Pack into the temp dir, never the repo root. ---
  const packDestination = join(tmpRoot, 'pack');
  mkdirSync(packDestination);
  const packJson = run(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', packDestination],
    {
      cwd: REPO_ROOT,
    },
  );
  const [packInfo] = JSON.parse(packJson);
  const tgzPath = join(packDestination, packInfo.filename);
  if (!existsSync(tgzPath)) {
    fail('tarball created', `expected ${tgzPath} to exist`);
  } else {
    ok('tarball created', packInfo.filename);
  }

  // --- 2. Package metadata from npm pack's own report. ---
  if (packInfo.name === 'halloween.js') ok('tarball name', packInfo.name);
  else fail('tarball name', `expected "halloween.js", got "${packInfo.name}"`);

  if (packInfo.version === EXPECTED_VERSION) ok('tarball version', packInfo.version);
  else fail('tarball version', `expected "${EXPECTED_VERSION}", got "${packInfo.version}"`);

  if (packInfo.size > 0) ok('packed size', `${packInfo.size} bytes`);
  else fail('packed size', `expected > 0, got ${packInfo.size}`);

  if (packInfo.unpackedSize > 0) ok('unpacked size', `${packInfo.unpackedSize} bytes`);
  else fail('unpacked size', `expected > 0, got ${packInfo.unpackedSize}`);

  // --- 3. Exact file allowlist — nothing missing, nothing extra. ---
  const EXPECTED_FILES = [
    'package.json',
    'README.md',
    'LICENSE',
    'dist/halloween.js',
    'dist/halloween.cjs',
    'dist/halloween.iife.js',
    'dist/halloween.d.ts',
    'dist/halloween.d.cts',
  ].sort();
  const actualFiles = packInfo.files.map((f) => f.path).sort();
  const missingFiles = EXPECTED_FILES.filter((f) => !actualFiles.includes(f));
  const unexpectedFiles = actualFiles.filter((f) => !EXPECTED_FILES.includes(f));
  if (missingFiles.length === 0 && unexpectedFiles.length === 0) {
    ok('tarball file allowlist', `exactly ${actualFiles.length} files, matches expected set`);
  } else {
    fail(
      'tarball file allowlist',
      `missing: [${missingFiles.join(', ')}], unexpected: [${unexpectedFiles.join(', ')}]`,
    );
  }

  // --- 4. Extract the real package.json from inside the tarball (not the
  // repo's copy) and check its declared runtime dependencies. ---
  const extractDir = join(tmpRoot, 'extracted');
  mkdirSync(extractDir);
  run('tar', ['-xzf', tgzPath, '-C', extractDir]);
  const packedPkg = JSON.parse(readFileSync(join(extractDir, 'package', 'package.json'), 'utf8'));
  const depCount = Object.keys(packedPkg.dependencies ?? {}).length;
  if (depCount === 0) ok('published dependency count', '0');
  else
    fail(
      'published dependency count',
      `expected 0, got ${depCount}: ${Object.keys(packedPkg.dependencies).join(', ')}`,
    );

  // --- 5. Install the tarball into throwaway consumer projects and run
  // real runtime + TypeScript fixtures against it, imported by package
  // name (never a local dist path). ---
  runRuntimeFixture(
    'runtime-esm',
    tgzPath,
    {
      type: 'module',
    },
    'fixture.mjs',
    ESM_RUNTIME_FIXTURE,
  );

  runRuntimeFixture(
    'runtime-cjs',
    tgzPath,
    {
      type: 'commonjs',
    },
    'fixture.cjs',
    CJS_RUNTIME_FIXTURE,
  );

  runTypeScriptFixture(
    'ts-esm',
    tgzPath,
    {
      type: 'module',
    },
    'fixture.ts',
    TS_ESM_FIXTURE,
    {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
    },
  );

  runTypeScriptFixture(
    'ts-cjs',
    tgzPath,
    {
      type: 'commonjs',
    },
    'fixture.cts',
    TS_CJS_FIXTURE,
    {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
    },
  );
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll package checks passed.');

// ---------------------------------------------------------------------------

function installTarball(dirName, tgzPath, extraPkgFields) {
  const dir = join(tmpRoot, dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      { name: `halloween-js-${dirName}`, private: true, version: '0.0.0', ...extraPkgFields },
      null,
      2,
    ),
  );
  run('npm', ['install', tgzPath, '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: dir });
  return dir;
}

function runRuntimeFixture(dirName, tgzPath, pkgFields, fixtureFilename, fixtureSource) {
  const dir = installTarball(dirName, tgzPath, pkgFields);
  const fixturePath = join(dir, fixtureFilename);
  writeFileSync(fixturePath, fixtureSource);
  let output;
  try {
    output = run(process.execPath, [fixturePath], { cwd: dir });
  } catch (err) {
    fail(`${dirName} runtime fixture`, `node exited with error: ${err.stderr || err.message}`);
    return;
  }
  let result;
  try {
    result = JSON.parse(output.trim());
  } catch {
    fail(`${dirName} runtime fixture`, `did not print valid JSON: ${output}`);
    return;
  }
  const checks = Object.entries(result);
  const bad = checks.filter(([, v]) => v !== true);
  if (bad.length === 0) {
    ok(`${dirName} runtime fixture`, `${checks.length} assertions passed`);
  } else {
    fail(`${dirName} runtime fixture`, `failing: ${bad.map(([k]) => k).join(', ')}`);
  }
}

function runTypeScriptFixture(
  dirName,
  tgzPath,
  pkgFields,
  fixtureFilename,
  fixtureSource,
  compilerOptionsExtra,
) {
  const dir = installTarball(dirName, tgzPath, pkgFields);
  writeFileSync(join(dir, fixtureFilename), fixtureSource);
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2019',
          lib: ['ES2019', 'DOM'],
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          ...compilerOptionsExtra,
        },
        include: [fixtureFilename],
      },
      null,
      2,
    ),
  );
  try {
    run(process.execPath, [TSC_BIN, '--project', join(dir, 'tsconfig.json')], { cwd: dir });
    ok(`${dirName} TypeScript fixture`, 'tsc --noEmit passed');
  } catch (err) {
    fail(`${dirName} TypeScript fixture`, (err.stdout || err.message || '').toString().trim());
  }
}
