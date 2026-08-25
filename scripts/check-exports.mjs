// Smoke test against the REAL built dist files (run after `npm run build`,
// not part of `npm test`) — checks the public export surface, the IIFE
// global and the bundle filenames themselves, not implementation details.
// This is deliberately a post-build script rather than a vitest test: the
// things it checks (dist/*, a fresh IIFE global) only exist after a build,
// and reading them from within the vitest run (which happens BEFORE build
// in `npm run check`) would either fail or require a fragile ad hoc build
// step of its own.
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const EXPECTED = ["halloween", "default", "pageEffects"];
const DIST_DIR = fileURLToPath(new URL("../dist", import.meta.url));

async function esmExports() {
  const mod = await import("../dist/halloween.js");
  return Object.keys(mod);
}

function cjsExports() {
  const require = createRequire(import.meta.url);
  const mod = require("../dist/halloween.cjs");
  return Object.keys(mod);
}

function check(label, keys) {
  const missing = EXPECTED.filter((name) => !keys.includes(name));
  const unexpected = keys.filter((name) => !EXPECTED.includes(name));
  if (missing.length > 0 || unexpected.length > 0) {
    console.error(
      `FAIL ${label} — missing: ${missing.join(", ") || "(none)"}; unexpected: ${unexpected.join(", ") || "(none)"} (actual: ${keys.sort().join(", ")})`,
    );
    process.exitCode = 1;
  } else {
    console.log(`OK   ${label} — exports exactly: ${keys.sort().join(", ")}`);
  }
}

check("ESM (dist/halloween.js)", await esmExports());
check("CJS (dist/halloween.cjs)", cjsExports());

// Rename guard: the dist directory contains exactly the expected bundle
// filenames — nothing missing, and (since tsup's `clean: true` wipes dist/
// before every build anyway) nothing stale left over from before a rename.
const EXPECTED_FILES = [
  "halloween.js",
  "halloween.cjs",
  "halloween.iife.js",
  "halloween.d.ts",
  "halloween.d.cts",
];
const actualFiles = readdirSync(DIST_DIR).sort();
const missingFiles = EXPECTED_FILES.filter((f) => !actualFiles.includes(f));
const unexpectedFiles = actualFiles.filter((f) => !EXPECTED_FILES.includes(f));
if (missingFiles.length > 0 || unexpectedFiles.length > 0) {
  console.error(
    `FAIL dist filenames — missing: ${missingFiles.join(", ") || "(none)"}; unexpected: ${unexpectedFiles.join(", ") || "(none)"}`,
  );
  process.exitCode = 1;
} else {
  console.log(`OK   dist filenames — exactly: ${actualFiles.join(", ")}`);
}

// Rename guard: the IIFE build defines exactly one new global, and its
// export surface matches EXPECTED. Diffing the sandbox's keys before/after
// running the script (rather than checking a specific old name) proves no
// other global — renamed or not — leaked out of the bundle.
const iifeSource = readFileSync(`${DIST_DIR}/halloween.iife.js`, "utf8");
const sandbox = { document: undefined, window: undefined };
vm.createContext(sandbox);
const keysBefore = new Set(Object.keys(sandbox));
vm.runInContext(iifeSource, sandbox);
const newGlobals = Object.keys(sandbox).filter((k) => !keysBefore.has(k));
if (newGlobals.length !== 1 || newGlobals[0] !== "Halloween") {
  console.error(`FAIL IIFE global — expected exactly ["Halloween"], got: ${JSON.stringify(newGlobals)}`);
  process.exitCode = 1;
} else {
  const iifeKeys = Object.keys(sandbox.Halloween).sort();
  const missingIife = EXPECTED.filter((name) => !iifeKeys.includes(name));
  const unexpectedIife = iifeKeys.filter((name) => !EXPECTED.includes(name));
  if (missingIife.length > 0 || unexpectedIife.length > 0) {
    console.error(
      `FAIL IIFE global — Halloween missing: ${missingIife.join(", ") || "(none)"}; unexpected: ${unexpectedIife.join(", ") || "(none)"} (actual: ${iifeKeys.join(", ")})`,
    );
    process.exitCode = 1;
  } else {
    console.log(`OK   IIFE global — window.Halloween exports exactly: ${iifeKeys.join(", ")}`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
