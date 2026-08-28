# Contributing to halloween.js

Thanks for considering a contribution. This doc covers how the project is put together, what a PR needs to get merged, and what a new ambient effect actually costs to add — so you can pick a contribution that fits the time you have.

## Ways to contribute

Pick the level that matches what you want to do:

1. **Art / character idea** — you sketch or draw an SVG for a new character (ghost, pumpkin, bat, whatever fits the theme) and open it as an issue with the artwork attached. You don't need to touch any code — a maintainer can complete the integration (level 2) if the idea and art fit the project.
2. **A full new ambient effect** — art plus the code to spawn, animate, and theme it, wired into the library end-to-end. This is real integration work across several files (see [Adding a new effect](#adding-a-new-effect) below) — budget more than "one small PR" for it.
3. **Everything else** — bug fixes, accessibility improvements, docs, tests, new color/season presets, demo improvements. Usually the smallest and fastest kind of PR to review.

If you're not sure which bucket your idea falls into, open an issue first and ask.

## Before adding a new effect: read the acceptance criteria

A new ambient effect (level 2) is only merged if it meets all of these:

- **Fits the visual language.** Halloween-themed, reads clearly at small sizes, works as a silhouette/simple shape — not photorealistic or overly detailed.
- **Works on light and dark backgrounds.** The demo's theme toggle must not make the effect illegible or invisible in either mode.
- **Respects `prefers-reduced-motion`.** All existing effects stop spawning entirely when reduced motion is on (see `prefersReducedMotion()` in [`src/dom.ts`](src/dom.ts) and how `page-effects.ts` checks it) — a new effect must do the same, no exceptions.
- **No meaningful bundle size regression.** The library is zero-dependency and under 10 KB gzipped. `npm run test:package` only checks that the published bundle sizes are non-zero — it does not enforce a size budget. Staying under budget is judged manually in review; check the built size locally before opening a PR. A single reasonably-sized inline SVG plus a spawn/animate function is the expected footprint.
- **No external resources.** No network fetches, no external fonts/scripts/images, no dependencies added to `package.json`. Everything ships inline in the bundle, same as the four existing effects.
- **No SVG `id` collisions.** IDs inside the SVG markup (gradients, clip-paths, filters) must be unique across all effects, since multiple effects' markup can be live in the DOM at once.
- **Original or compatibly-licensed art.** You must own the artwork or it must be licensed in a way that permits inclusion in an MIT-licensed project (public domain, MIT, CC0, etc.). State the source/license in the PR description.
- **Maintainer discretion.** A technically solid effect can still be declined if it doesn't fit the project's direction (too many similar effects already, doesn't match the aesthetic, etc.). If you want to avoid wasted work, open an issue to check direction before investing time in a full implementation.

## Adding a new effect

This touches more than one file — there isn't a single "effects config" to drop a new entry into. As of this writing, a full ambient effect requires changes to:

- **`src/svg.ts`** — the inline SVG markup for the new character, exported as a constant (`currentColor` for anything that should follow the theme's accent/ink color, same pattern as `WITCH_SVG`).
- **`src/page-effects.ts`** — add the new name to the `PageEffectName` union type, write a `spawn*()` function (positioning, timing, Web Animations API keyframes — follow the pattern of `spawnTombstone`/`spawnWitch`), and register it in the `EFFECTS` map. Note: extending `PageEffectName` is a public API surface change (it's re-exported from `src/index.ts`) — flag this in your PR description so it gets the right semver treatment; it does not automatically mean a major version bump.
- **`src/styles.ts`** — CSS for the spawned element, sized via the existing `--halloween-<effect>-width/height` custom-property + preset-fallback pattern used by the other effects, plus entries in the intensity presets if the effect's default size should scale with `subtle`/`normal`/`party`.
- **`demo/demo.js`** — add the effect to `EFFECT_CLASSES` and wire its checkbox state into the class list, so it's toggleable in the live demo.
- **`demo/index.html`** — add the corresponding toggle row in the Ambient Effects section.
- **`test/page-effects.test.ts`** — cover spawn/cleanup/reduced-motion behavior, matching the existing tests for the other four effects.
- **`test/demo.test.ts`** and **`test/rename-guard.test.ts`** — both hardcode the current effect names/classes (e.g. `halloween-tombstones`, `.halloween-eyes-item`) rather than deriving them from a shared list, so they'll need a matching new case for the effect you add.
- **`README.md`** — mention the new effect wherever the existing four are listed.

If that's more than you want to take on, contributing just the art (level 1) and letting a maintainer finish the wiring is a legitimate and welcome way to help.

## Local development

```bash
npm ci
npm run demo:prepare   # build + copy dist into demo/dist for the local demo page
```

Then serve `demo/` with any static file server (`file://` won't work — module/script loading is blocked by the browser's CORS policy for local files).

While iterating on the library itself, run `npm run dev` (`tsup --watch`) in a separate terminal — it rebuilds `dist/` on change, but does not copy into `demo/dist`, so re-run `npm run demo:prepare` whenever you want the demo to pick up a new build.

## Before opening a PR

Run the same check CI runs:

```bash
npm run check
```

This runs, in order: Prettier format check, TypeScript typecheck, the Vitest suite, the production build, and package/export/CDN-version consistency checks. All of it must pass — CI runs the identical command on Node 22 and 24 for every PR.

In your PR description, include:

- What changed and why, in a sentence or two.
- A screenshot or short screen recording for anything visual.
- Whether the change touches the public API (new exports, new `PageEffectName` value, new config option).
- Confirmation you checked the demo with `prefers-reduced-motion` enabled, if the change affects an ambient effect.
- Art source/license, if you're contributing an SVG.

## Response times

We aim to give every new issue or PR a first response within a few days, and a direction decision (fits / needs changes / not a fit) on new-effect PRs within a week. If you haven't heard back in that window, it's fine to ping the issue/PR.

## License

By contributing, you agree your contribution is licensed under the project's [MIT License](LICENSE).
