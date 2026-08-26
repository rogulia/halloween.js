// Runs only inside preview.html, in its own iframe document. Talks to the
// parent (demo.js) over postMessage — never trusts the message shape or
// origin without checking, since this document is reachable by anything
// that can load it in an iframe, not just our own parent page.
(() => {
  'use strict';

  const PARENT_ORIGIN = window.location.origin;

  // Mirrors demo.js's own class allowlist — kept in sync by hand since this
  // is a dependency-free static site with no module system to share it
  // through. Every class this document will ever add/remove is listed here;
  // nothing outside this set is ever touched, no matter what a message
  // claims.
  const CORNER_CLASSES = {
    lt: 'halloween-screen-left-top',
    rt: 'halloween-screen-right-top',
    lb: 'halloween-screen-left-bottom',
    rb: 'halloween-screen-right-bottom',
  };
  const EFFECT_CLASSES = {
    eyes: 'halloween-eyes',
    witches: 'halloween-witches',
    spiderDrop: 'halloween-spider-drop',
    tombstones: 'halloween-tombstones',
  };
  const INTENSITY_CLASSES = {
    subtle: 'halloween-intensity-subtle',
    party: 'halloween-intensity-party',
  };
  const ALL_MANAGED_CLASSES = [
    ...Object.values(CORNER_CLASSES),
    ...Object.values(EFFECT_CLASSES),
    ...Object.values(INTENSITY_CLASSES),
  ];

  const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const VALID_INTENSITIES = new Set(['subtle', 'normal', 'party']);
  const VALID_THEMES = new Set(['dark', 'light']);

  function isBoolMap(value, keys) {
    if (!value || typeof value !== 'object') return false;
    return keys.every((key) => typeof value[key] === 'boolean');
  }

  // Strict shape check — every field required, no extra trust extended to
  // anything not explicitly listed. A message that fails this is dropped
  // silently rather than partially applied.
  function isValidStatePayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!isBoolMap(payload.corners, ['lt', 'rt', 'lb', 'rb'])) return false;
    if (!isBoolMap(payload.effects, ['eyes', 'witches', 'spiderDrop', 'tombstones'])) return false;
    if (!VALID_INTENSITIES.has(payload.intensity)) return false;
    if (
      payload.color !== null &&
      !(typeof payload.color === 'string' && HEX_PATTERN.test(payload.color))
    ) {
      return false;
    }
    if (!VALID_THEMES.has(payload.theme)) return false;
    return true;
  }

  function applyState(payload) {
    const desired = new Set();
    if (payload.corners.lt) desired.add(CORNER_CLASSES.lt);
    if (payload.corners.rt) desired.add(CORNER_CLASSES.rt);
    if (payload.corners.lb) desired.add(CORNER_CLASSES.lb);
    if (payload.corners.rb) desired.add(CORNER_CLASSES.rb);
    if (payload.effects.eyes) desired.add(EFFECT_CLASSES.eyes);
    if (payload.effects.witches) desired.add(EFFECT_CLASSES.witches);
    if (payload.effects.spiderDrop) desired.add(EFFECT_CLASSES.spiderDrop);
    if (payload.effects.tombstones) desired.add(EFFECT_CLASSES.tombstones);
    if (INTENSITY_CLASSES[payload.intensity]) desired.add(INTENSITY_CLASSES[payload.intensity]);

    // Only ever toggles classes from ALL_MANAGED_CLASSES — "halloween"
    // itself and the season data attributes (both set once in preview.html)
    // are never touched here, and no other class or attribute is ever
    // written based on message content.
    ALL_MANAGED_CLASSES.forEach((cls) => {
      document.body.classList.toggle(cls, desired.has(cls));
    });

    if (payload.color) {
      document.body.style.setProperty('--halloween-color', payload.color);
    } else {
      document.body.style.removeProperty('--halloween-color');
    }

    document.documentElement.setAttribute('data-theme', payload.theme);
  }

  // Forces a full stop-then-restart of every ambient effect and screen
  // corner without duplicating anything: removing "halloween" lets the
  // library's own MutationObserver tear everything down on the next
  // microtask, and re-adding it one animation frame later (a real yield,
  // not a same-tick flicker) lets it rebuild from a clean, empty state.
  function replay() {
    document.body.classList.remove('halloween');
    requestAnimationFrame(() => {
      document.body.classList.add('halloween');
    });
  }

  function sendReady() {
    window.parent.postMessage({ type: 'halloween-preview:ready' }, PARENT_ORIGIN);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    if (event.origin !== PARENT_ORIGIN) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

    if (data.type === 'halloween-preview:state') {
      if (isValidStatePayload(data.payload)) applyState(data.payload);
      return;
    }
    if (data.type === 'halloween-preview:replay') {
      replay();
      return;
    }
    // Half of the lost-ready handshake (see demo.js for the full picture):
    // the parent pings whenever it can't be sure this listener was already
    // attached, and every valid ping just gets answered with "ready" again
    // — safe to receive any number of times, since the parent's response to
    // "ready" is just re-sending its current state, applied idempotently.
    if (data.type === 'halloween-preview:ping') {
      sendReady();
    }
  });

  // The other half: an unprompted "ready" the moment this script runs, for
  // the common case where the parent's own listener is already attached
  // before this iframe finishes loading.
  sendReady();
})();
