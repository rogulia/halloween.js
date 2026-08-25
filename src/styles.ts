export const STYLE_ID = "halloween-styles";

export const CSS = `
.halloween-web { width: 100%; height: 100%; display: block; }

.halloween-page-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  /* User-overridable so this can sit under a modal/cookie-banner z-index
     instead of always winning; --halloween-page-z-index defaults to 999. */
  z-index: var(--halloween-page-z-index, 999);
  /* Overall dimming for the "subtle" intensity preset — see
     halloween-intensity-* below. Applies to the whole layer (ambient nodes AND
     screen corners, both live inside it), on top of each node's own opacity
     animation, not instead of it.

     --halloween-page-opacity is the public override; --halloween-preset-* (set
     only by halloween-intensity-* below) is the preset fallback. Nesting them
     this way means a user-set public var always wins over a preset, since
     the preset classes never touch the public var name itself. */
  opacity: var(--halloween-page-opacity, var(--halloween-preset-page-opacity, 1));
}

.halloween-eyes-item {
  position: absolute;
  width: var(--halloween-eyes-width, var(--halloween-preset-eyes-width, 64px));
  height: var(--halloween-eyes-height, var(--halloween-preset-eyes-height, 26px));
  opacity: 0;
  transition: opacity 0.7s ease;
  /* dark halo for contrast on light backgrounds, amber glow for the
     glowing-in-the-dark look on dark ones — needs both, see EYES_SVG stroke too.
     Kept small and tight on purpose — a bigger blur reads as a blob, not eyes. */
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 5px rgba(242, 164, 65, 0.5));
}
.halloween-eyes-item.halloween-visible { opacity: 1; }
.halloween-eyes-svg { display: block; width: 100%; height: 100%; }
.halloween-eyes-item .halloween-eye { animation: halloween-blink 3.2s ease-in-out infinite; transform-origin: center; }
.halloween-eyes-item .halloween-eye + .halloween-eye { animation-delay: 0.15s; }

@keyframes halloween-blink {
  0%, 88%, 100% { transform: scaleY(1); }
  92% { transform: scaleY(0.08); }
}

.halloween-witch-item {
  position: absolute;
  width: var(--halloween-witch-width, var(--halloween-preset-witch-width, 104px));
  height: var(--halloween-witch-height, var(--halloween-preset-witch-height, 130px));
  color: var(--halloween-color, currentColor);
  transform-origin: center;
  /* trajectory (direction, angle, scale pulse) is computed per instance via
     the Web Animations API in page-effects.ts, since it's randomized every
     spawn — a static @keyframes can't vary per element. */
}
.halloween-witch-svg { display: block; width: 100%; height: 100%; }
.halloween-witch-item--rtl .halloween-witch-svg { transform: scaleX(-1); }

/* Screen-corner webs — static, visibility toggled purely via CSS from
   body.halloween-screen-{corner}, so it's instant with no JS involved. */
.halloween-screen-corner {
  position: fixed;
  /* Square, so one public var covers both dimensions. */
  width: var(--halloween-screen-corner-size, var(--halloween-preset-screen-corner-size, 120px));
  height: var(--halloween-screen-corner-size, var(--halloween-preset-screen-corner-size, 120px));
  color: var(--halloween-color, currentColor);
  opacity: 0.75;
  pointer-events: none;
  display: none;
}
.halloween-screen-corner .halloween-web { width: 100%; height: 100%; display: block; }

.halloween-screen-corner--left-top { top: -14px; left: -14px; }
.halloween-screen-corner--right-top { top: -14px; right: -14px; }
.halloween-screen-corner--left-bottom { bottom: -14px; left: -14px; }
.halloween-screen-corner--right-bottom { bottom: -14px; right: -14px; }

.halloween-screen-corner--left-top .halloween-web { transform: scaleX(-1); }
.halloween-screen-corner--right-bottom .halloween-web { transform: scaleY(-1); }
.halloween-screen-corner--left-bottom .halloween-web { transform: scale(-1, -1); }

body.halloween-screen-left-top .halloween-screen-corner--left-top,
body.halloween-screen-right-top .halloween-screen-corner--right-top,
body.halloween-screen-left-bottom .halloween-screen-corner--left-bottom,
body.halloween-screen-right-bottom .halloween-screen-corner--right-bottom {
  display: block;
}

/* Dropping spider — descends from the top of the viewport on a thread to
   75% of viewport height, holds, then retracts. Timeline (drop/hold/rise,
   random horizontal position) is computed per instance via the Web
   Animations API in page-effects.ts.

   top is the negative of the spider's own effective height (same var/preset
   fallback chain as .halloween-drop-spider below, so it always matches
   regardless of intensity preset or a user override) so that at height:0
   the whole assembly — thread AND spider — sits entirely above the
   viewport, fully hidden. The spider hangs from top:100% (the thread's
   tip), so it's never clipped mid-body the way a negative bottom offset on
   a zero-height container would leave it.

   page-effects.ts's WAAPI keyframes (see spawnDroppingSpider) build the
   drop distance from this exact same var()/preset/default expression, not
   a measurement — so the animated "75vh + height" endpoint and this
   element's own hidden offset always agree on what "height" resolves to,
   whatever that currently is, instead of a second hardcoded number that
   could drift out of sync. */
.halloween-spider-drop-item {
  position: absolute;
  top: calc(0px - var(--halloween-spider-drop-height, var(--halloween-preset-spider-drop-height, 90px)));
  width: 20px;
  height: 0;
  overflow: visible;
  color: var(--halloween-color, currentColor);
  pointer-events: none;
}
.halloween-thread-line {
  display: block;
  width: 1px;
  height: 100%;
  margin: 0 auto;
  background: currentColor;
  opacity: 0.7;
}
.halloween-drop-spider {
  position: absolute;
  top: 100%;
  left: 50%;
  /* The spider's own artwork has empty space above its body inside the
     viewBox (legs/head start ~20% down) — pull it up so the body itself
     touches the thread tip instead of leaving a visible gap. */
  transform: translate(-50%, -18px);
  width: var(--halloween-spider-drop-width, var(--halloween-preset-spider-drop-width, 90px));
  height: var(--halloween-spider-drop-height, var(--halloween-preset-spider-drop-height, 90px));
}

/* Rising tombstone — climbs out of a random horizontal spot at the bottom of
   the viewport, holds, then sinks back down. The rise/hold/sink transform
   (translateY, plus a per-instance random tilt/scale baked into the SAME
   transform value) is computed per instance via the Web Animations API in
   page-effects.ts, since both the horizontal spot and the rise distance are
   randomized every spawn — a static @keyframes can't vary per element.
   bottom: 0 + transform-origin: bottom center means translateY(100%) (the
   node's own animation start/end point) sits it fully below the viewport,
   hidden, matching the same "start/end point is a function of the node's
   own current size" approach spider-drop's height:0 uses. */
.halloween-tombstone-item {
  position: absolute;
  bottom: 0;
  width: var(--halloween-tombstone-width, var(--halloween-preset-tombstone-width, 76px));
  height: var(--halloween-tombstone-height, var(--halloween-preset-tombstone-height, 96px));
  color: var(--halloween-color, currentColor);
  transform-origin: bottom center;
  pointer-events: none;
}
.halloween-tombstone-svg { display: block; width: 100%; height: 100%; }

/* Ambient intensity presets — only size/opacity custom properties, scheduling
   (delay/maxActive multipliers) lives in page-effects.ts. Existing nodes pick
   these up immediately on class change via ordinary CSS inheritance, no JS
   involved. Declared subtle-then-party so that if both classes end up on
   body at once, party's values win (later same-specificity rule wins) —
   matching the party > subtle > normal priority used in page-effects.ts.

   These set ONLY the internal --halloween-preset-* variables, never the public
   --halloween-* ones consumers are meant to override — every consumer above
   reads var(--halloween-x, var(--halloween-preset-x, default)), so a user's own
   --halloween-x always wins regardless of which (if any) preset is active. */
body.halloween-intensity-subtle {
  --halloween-preset-eyes-width: 48px;
  --halloween-preset-eyes-height: 20px;
  --halloween-preset-witch-width: 78px;
  --halloween-preset-witch-height: 98px;
  --halloween-preset-spider-drop-width: 68px;
  --halloween-preset-spider-drop-height: 68px;
  --halloween-preset-tombstone-width: 58px;
  --halloween-preset-tombstone-height: 73px;
  --halloween-preset-screen-corner-size: 90px;
  --halloween-preset-page-opacity: 0.65;
}

body.halloween-intensity-party {
  --halloween-preset-eyes-width: 72px;
  --halloween-preset-eyes-height: 30px;
  --halloween-preset-witch-width: 120px;
  --halloween-preset-witch-height: 150px;
  --halloween-preset-spider-drop-width: 104px;
  --halloween-preset-spider-drop-height: 104px;
  --halloween-preset-tombstone-width: 88px;
  --halloween-preset-tombstone-height: 112px;
  --halloween-preset-screen-corner-size: 140px;
  --halloween-preset-page-opacity: 1;
}
`;

export function injectStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * Every decoration — spiders, threads, webs and the witch — reads
 * `color: var(--halloween-color, currentColor)`, so setting this one custom
 * property recolors all of them at once. Set on <body> so it sits next to
 * the rest of the library's state.
 *
 * Only ever SETS the property, never clears it. trySync() (index.ts) calls
 * this on every body class mutation, not just once — if it cleared the
 * property whenever CONFIG.color is empty, it would stomp over any color
 * applied through another means (the CSS custom property directly, a
 * bundler consumer's own JS) on the very next unrelated class change.
 * "No color configured" means "don't touch it", not "clear whatever's there".
 */
export function applyColorOverride(color: string) {
  if (typeof document === "undefined" || !color) return;
  document.body.style.setProperty("--halloween-color", color);
}
