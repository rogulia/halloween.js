import {
  startPageEffect,
  stopPageEffect,
  stopAllPageEffects,
  syncPageEffectsFromBody,
  type PageEffectName,
} from './page-effects';
import { injectStyles, applyColorOverride } from './styles';
import { watchReducedMotion } from './dom';
import { CONFIG, isWithinSeason, getSeasonWindow } from './config';
import { ensureScreenCorners, removeScreenCorners } from './screen-corners';

// Optional manual sync: re-runs the same class-driven logic trySync() runs
// automatically (on load, on body class changes, on reduced-motion changes).
// Two real uses: (1) syncing immediately after changing body classes,
// instead of waiting for the MutationObserver callback to fire as a
// microtask; (2) forcing a fresh season-gate check with no class change at
// all — isWithinSeason() depends on the current date, not on any DOM
// mutation, so nothing else re-evaluates it once a season boundary has
// passed while the page sits open. Takes no selector/options: there is
// nothing element-level left to configure.
export function halloween() {
  trySync();
}

// Wraps the low-level startPageEffect so a direct pageEffects.start() call
// (bypassing the class-driven system entirely) still gets styles and the
// configured color override applied first, same as the class-driven path in
// trySync() below — otherwise a bare start() could spawn effect nodes before
// the library's own <style> tag exists.
function startPageEffectPublic(name: PageEffectName) {
  injectStyles();
  applyColorOverride(CONFIG.color);
  startPageEffect(name);
}

export const pageEffects = {
  start: startPageEffectPublic,
  stop: stopPageEffect,
};

export type { PageEffectName } from './page-effects';

const MASTER_CLASS = 'halloween';
let bodyObserved = false;
let reducedMotionWatched = false;

// <body class="halloween"> is the master switch, and the season window is
// the second gate — so the script can stay on the page year-round and only
// actually do anything near Halloween. The window itself can come from
// three places, resolved independently per edge by getSeasonWindow(): a
// data-halloween-start/-end attribute on <body> (highest priority, and the
// only one that works after the page has already loaded), a classic
// script's own ?s=/?e= query params, or the library default.
//
// Neither gate is polled or watched continuously: isWithinSeason() is only
// re-evaluated when trySync() runs, i.e. on initial load and whenever this
// MutationObserver sees body's class or season-attribute change. If the
// season boundary passes at midnight while the page just sits open with no
// mutation in between, the library will NOT notice until something touches
// one of the watched attributes again (a page reload, another trySync()
// caller, etc.) — there's no automatic "it's midnight, recheck the date"
// detection.
//
// Both gates are re-checked together on every mutation: if either is off
// (halloween removed, or outside the season window), every ambient effect
// (timers + visible nodes) and the screen-corner webs are torn down
// immediately, not left running from before.
function trySync() {
  if (typeof document === 'undefined') return;
  const season = getSeasonWindow();
  const active =
    document.body.classList.contains(MASTER_CLASS) &&
    isWithinSeason(new Date(), season.start, season.end);

  if (!active) {
    stopAllPageEffects();
    removeScreenCorners();
    return;
  }

  injectStyles();
  applyColorOverride(CONFIG.color);
  syncPageEffectsFromBody();
  ensureScreenCorners();
}

function autoInit() {
  trySync();

  if (!bodyObserved) {
    bodyObserved = true;
    const observer = new MutationObserver(trySync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-halloween-start', 'data-halloween-end'],
    });
  }

  // Reduced motion isn't part of the master/season active flag on purpose —
  // static screen corners should stay exactly as available as before.
  // Re-running trySync() on change is enough: it re-invokes
  // syncPageEffectsFromBody() (see page-effects.ts), which now checks the
  // preference itself and stops every ambient effect immediately when it's
  // on, without a second parallel lifecycle to keep in sync.
  if (!reducedMotionWatched) {
    reducedMotionWatched = true;
    watchReducedMotion(trySync);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

export default halloween;
