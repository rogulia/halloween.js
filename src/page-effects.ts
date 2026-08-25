import { EYES_SVG, WITCH_SVG, DROP_SPIDER_SVG, TOMBSTONE_SVG } from "./svg";
import { fromHTML, prefersReducedMotion } from "./dom";
import { getLayer } from "./layer";

export type PageEffectName = "eyes" | "witches" | "spider-drop" | "tombstones";

// Random delay range between witch spawns, in milliseconds. Internal-only —
// not configurable via script URL params.
const WITCH_DELAY_MIN_MS = 6000;
const WITCH_DELAY_MAX_MS = 14000;

interface EffectDef {
  spawn: () => void;
  nextDelayMs: () => number;
  // Max ambient nodes of this effect visible at once. Declared here, per
  // effect, so schedule() has one place to check — no separate list to keep
  // in sync.
  maxActive: number;
}

type IntensityName = "subtle" | "normal" | "party";

interface IntensityPreset {
  delayMultiplier: number;
  maxActiveMultiplier: number;
}

// Internal only — not part of the public API. Body class -> multipliers
// applied on top of each EffectDef's own nextDelayMs()/maxActive.
const INTENSITY_PRESETS: Record<IntensityName, IntensityPreset> = {
  normal: { delayMultiplier: 1, maxActiveMultiplier: 1 },
  subtle: { delayMultiplier: 2.5, maxActiveMultiplier: 1 },
  party: { delayMultiplier: 0.5, maxActiveMultiplier: 2 },
};

// party > subtle > normal/default when classes conflict, per body class
// checked fresh on every call — never cached, so a class change is picked
// up by the next scheduling cycle without any extra wiring.
function currentIntensity(): IntensityName {
  if (typeof document === "undefined") return "normal";
  const cl = document.body.classList;
  if (cl.contains("halloween-intensity-party")) return "party";
  if (cl.contains("halloween-intensity-subtle")) return "subtle";
  return "normal";
}

const timers = new Map<PageEffectName, number>();
const activeNodes = new Map<PageEffectName, Set<HTMLElement>>();

function track(name: PageEffectName, node: HTMLElement) {
  if (!activeNodes.has(name)) activeNodes.set(name, new Set());
  activeNodes.get(name)!.add(node);
}

function untrack(name: PageEffectName, node: HTMLElement) {
  activeNodes.get(name)?.delete(node);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnEyes() {
  const l = getLayer();
  // "halloween-eyes-item", not "halloween-eyes" — that name is reserved for
  // the opt-in class on <body> and must never also style the spawned
  // element.
  const node = fromHTML(`<div class="halloween-eyes-item">${EYES_SVG}</div>`);
  node.style.left = `${5 + Math.random() * 85}%`;
  node.style.top = `${10 + Math.random() * 70}%`;
  l.appendChild(node);
  track("eyes", node);
  requestAnimationFrame(() => node.classList.add("halloween-visible"));
  const visibleFor = 2400 + Math.random() * 1600;
  setTimeout(() => {
    node.classList.remove("halloween-visible");
    setTimeout(() => {
      node.remove();
      untrack("eyes", node);
    }, 700);
  }, visibleFor);
}

/**
 * Each witch gets its own random direction (left-to-right or right-to-left),
 * flight angle (-30..30deg, driving a vertical drift so the path isn't a flat
 * pan), and a scale pulse (small -> large -> small) to read as approaching
 * and receding rather than sliding past at a constant distance. Computed per
 * instance via the Web Animations API rather than a static CSS @keyframes,
 * since the direction/angle vary every spawn.
 */
function spawnWitch() {
  const l = getLayer();
  const ltr = Math.random() < 0.5;
  // "halloween-witch-item", distinct from the body class "halloween-witches".
  const node = fromHTML(
    `<div class="halloween-witch-item${ltr ? "" : " halloween-witch-item--rtl"}">${WITCH_SVG}</div>`,
  );
  node.style.top = `${5 + Math.random() * 35}%`;
  if (ltr) {
    node.style.left = "-180px";
  } else {
    node.style.right = "-180px";
  }
  l.appendChild(node);
  track("witches", node);

  const angleDeg = randomBetween(-30, 30);
  const verticalDrift = Math.tan((angleDeg * Math.PI) / 180) * 220;
  const travel = (typeof window !== "undefined" ? window.innerWidth : 1200) + 360;
  const dxEnd = ltr ? travel : -travel;
  const duration = randomBetween(7000, 12000);

  const animation = node.animate(
    [
      { transform: "translate(0px, 0px) scale(0.5)", opacity: 0.55 },
      { transform: `translate(${dxEnd * 0.46}px, ${-verticalDrift * 0.5}px) scale(1.3)`, opacity: 1 },
      { transform: `translate(${dxEnd}px, ${-verticalDrift}px) scale(0.4)`, opacity: 0.5 },
    ],
    { duration, easing: "linear", fill: "forwards" },
  );

  const cleanup = () => {
    node.remove();
    untrack("witches", node);
  };
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
}

/**
 * Drops from a random horizontal position at the top of the screen down to
 * 75% of viewport height on a thread, holds briefly, then retracts back up.
 */
function spawnDroppingSpider() {
  const l = getLayer();
  // "halloween-spider-drop-item", distinct from the body class
  // "halloween-spider-drop".
  const node = fromHTML(
    `<div class="halloween-spider-drop-item"><span class="halloween-thread-line"></span>${DROP_SPIDER_SVG}</div>`,
  );
  node.style.left = `${2 + Math.random() * 92}%`;
  l.appendChild(node);
  track("spider-drop", node);

  const dropMs = 1800 + Math.random() * 1200;
  const holdMs = 1200 + Math.random() * 1600;
  const riseMs = 1400 + Math.random() * 1000;
  const total = dropMs + holdMs + riseMs;

  // Same var()/preset/default fallback chain as .halloween-drop-spider's and
  // .halloween-spider-drop-item's "top" in styles.ts — the container's
  // height needs to cover that same initial hidden offset too, or the
  // thread's tip (and the spider hanging from it) would fall short of the
  // intended 75vh drop by however tall the spider currently renders.
  // Verified in a real browser that the Web Animations API resolves
  // calc()+var() with a nested fallback inside keyframes correctly, so this
  // stays a single CSS-driven source of truth instead of a second
  // hardcoded number that could drift.
  const dropHeight =
    "calc(75vh + var(--halloween-spider-drop-height, var(--halloween-preset-spider-drop-height, 90px)))";
  const animation = node.animate(
    [
      { height: "0px", offset: 0 },
      { height: dropHeight, offset: dropMs / total },
      { height: dropHeight, offset: (dropMs + holdMs) / total },
      { height: "0px", offset: 1 },
    ],
    { duration: total, easing: "ease-in-out", fill: "forwards" },
  );

  const cleanup = () => {
    node.remove();
    untrack("spider-drop", node);
  };
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
}

// Random delay range between tombstone spawns, in milliseconds — 8-16s per
// the task's own ambient-cadence target for this effect.
const TOMBSTONE_DELAY_MIN_MS = 8000;
const TOMBSTONE_DELAY_MAX_MS = 16000;

/**
 * Rises from a random horizontal spot at the bottom of the viewport,
 * holds, then sinks back down. Tilt (-6..6deg) and a small scale variance
 * are baked into the SAME per-keyframe transform string as the rise
 * distance (translateY) — transform is a single CSS property, so setting
 * rotate/scale separately and animating transform on top would just
 * overwrite them, the same reasoning spawnWitch's own comment documents
 * for its angle/scale pulse.
 */
function spawnTombstone() {
  const l = getLayer();
  // "halloween-tombstone-item", distinct from the body class
  // "halloween-tombstones".
  const node = fromHTML(`<div class="halloween-tombstone-item">${TOMBSTONE_SVG}</div>`);
  node.style.left = `${4 + Math.random() * 84}%`;
  l.appendChild(node);
  track("tombstones", node);

  const tiltDeg = randomBetween(-6, 6);
  const scale = randomBetween(0.92, 1.08);
  const riseAmountPx = randomBetween(80, 120);

  const riseMs = 1200 + Math.random() * 600;
  const holdMs = 2000 + Math.random() * 1000;
  const sinkMs = 1200 + Math.random() * 600;
  const total = riseMs + holdMs + sinkMs;

  const hidden = `translateY(100%) rotate(${tiltDeg}deg) scale(${scale})`;
  const risen = `translateY(calc(100% - ${riseAmountPx}px)) rotate(${tiltDeg}deg) scale(${scale})`;

  const animation = node.animate(
    [
      { transform: hidden, opacity: 0, offset: 0 },
      { transform: risen, opacity: 1, offset: riseMs / total },
      { transform: risen, opacity: 1, offset: (riseMs + holdMs) / total },
      { transform: hidden, opacity: 0, offset: 1 },
    ],
    { duration: total, easing: "ease-in-out", fill: "forwards" },
  );

  const cleanup = () => {
    node.remove();
    untrack("tombstones", node);
  };
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
}

const EFFECTS: Record<PageEffectName, EffectDef> = {
  eyes: { spawn: spawnEyes, nextDelayMs: () => 5000, maxActive: 1 },
  witches: {
    spawn: spawnWitch,
    nextDelayMs: () => randomBetween(WITCH_DELAY_MIN_MS, WITCH_DELAY_MAX_MS),
    maxActive: 1,
  },
  "spider-drop": {
    spawn: spawnDroppingSpider,
    nextDelayMs: () => randomBetween(4000, 9000),
    maxActive: 1,
  },
  tombstones: {
    spawn: spawnTombstone,
    nextDelayMs: () => randomBetween(TOMBSTONE_DELAY_MIN_MS, TOMBSTONE_DELAY_MAX_MS),
    maxActive: 1,
  },
};

// Re-evaluated on every tick rather than latched by a listener: a tab that's
// hidden when this fires just skips the spawn and tries again next tick, so
// visibility returning to normal is picked up automatically without a
// dedicated visibilitychange handler.
//
// The reduced-motion check here is defensive, not the primary mechanism —
// syncPageEffectsFromBody() already stops every scheduler the moment the
// preference changes (see watchReducedMotion() in index.ts). This just makes
// sure a tick already in flight at the exact moment the preference flips
// can't sneak a node in before that stop takes effect.
function canSpawnNow(name: PageEffectName, preset: IntensityPreset): boolean {
  if (typeof document !== "undefined" && document.hidden) return false;
  if (prefersReducedMotion()) return false;
  const activeCount = activeNodes.get(name)?.size ?? 0;
  return activeCount < EFFECTS[name].maxActive * preset.maxActiveMultiplier;
}

function schedule(name: PageEffectName) {
  const effect = EFFECTS[name];
  // Read fresh each cycle: an already-pending timeout isn't rescheduled when
  // intensity changes, but this line runs again the moment it fires, so the
  // new preset applies starting with the very next cycle.
  const preset = INTENSITY_PRESETS[currentIntensity()];
  if (canSpawnNow(name, preset)) effect.spawn();
  const id = window.setTimeout(() => schedule(name), effect.nextDelayMs() * preset.delayMultiplier);
  timers.set(name, id);
}

export function startPageEffect(name: PageEffectName) {
  if (typeof document === "undefined" || prefersReducedMotion() || timers.has(name)) return;
  schedule(name);
}

// Removes every currently visible instance of the effect immediately —
// unchecking a page-effect toggle should not leave stragglers fading out on
// their own schedule.
export function stopPageEffect(name: PageEffectName) {
  const id = timers.get(name);
  if (id !== undefined) window.clearTimeout(id);
  timers.delete(name);

  const nodes = activeNodes.get(name);
  if (nodes) {
    nodes.forEach((node) => node.remove());
    nodes.clear();
  }
}

export function syncPageEffectsFromBody() {
  if (typeof document === "undefined") return;
  // startPageEffect() alone would just refuse to (re)start anything here —
  // it doesn't stop a scheduler already running from before the preference
  // changed. This is what actually tears down ambient effects the moment
  // reduced-motion turns on mid-session.
  if (prefersReducedMotion()) {
    stopAllPageEffects();
    return;
  }
  (Object.keys(EFFECTS) as PageEffectName[]).forEach((name) => {
    const active = document.body.classList.contains(`halloween-${name}`);
    if (active) startPageEffect(name);
    else stopPageEffect(name);
  });
}

// Stops every ambient effect regardless of which body classes are present —
// used when the master switch (or the season window) turns off, so nothing
// is left running or visible. Derives the effect list from EFFECTS rather
// than a separately maintained array, so there's only one place that lists
// page effect names.
export function stopAllPageEffects() {
  (Object.keys(EFFECTS) as PageEffectName[]).forEach(stopPageEffect);
}
