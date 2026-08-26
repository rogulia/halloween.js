import { vi } from 'vitest';

// jsdom has no matchMedia implementation at all. prefersReducedMotion()
// (src/dom.ts) reads it directly, so every test that touches element.ts or
// page-effects.ts needs this mocked — reducedMotion controls only the
// prefers-reduced-motion query, everything else reports no match.
//
// The prefers-reduced-motion MediaQueryList is a stateful, controllable
// fake (not just a static snapshot): watchReducedMotion() (src/dom.ts)
// subscribes to it via addEventListener/addListener, and tests need a way
// to flip .matches and fire a real "change" callback afterwards to exercise
// that live-update path — without production code knowing this mock exists.
export function mockMatchMedia(reducedMotion: boolean) {
  let matches = reducedMotion;
  const changeListeners = new Set<(ev: { matches: boolean }) => void>();

  const reducedMotionMql = {
    get matches() {
      return matches;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn((cb: (ev: { matches: boolean }) => void) => changeListeners.add(cb)),
    removeListener: vi.fn((cb: (ev: { matches: boolean }) => void) => changeListeners.delete(cb)),
    addEventListener: vi.fn((type: string, cb: (ev: { matches: boolean }) => void) => {
      if (type === 'change') changeListeners.add(cb);
    }),
    removeEventListener: vi.fn((type: string, cb: (ev: { matches: boolean }) => void) => {
      if (type === 'change') changeListeners.delete(cb);
    }),
    dispatchEvent: vi.fn(),
  };

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    if (query.includes('prefers-reduced-motion')) return reducedMotionMql;
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

  return {
    // Flips .matches and synchronously notifies every registered listener,
    // simulating the OS-level preference changing while the page is open.
    setReducedMotion(value: boolean) {
      matches = value;
      changeListeners.forEach((cb) => cb({ matches: value }));
    },
    reducedMotionListenerCount: () => changeListeners.size,
  };
}

// src/config.ts captures document.currentScript (and its query string)
// synchronously at module top level — real browsers only populate
// currentScript while a classic <script> is actively executing, which
// jsdom never does for a test file's own dynamic import(). Call this
// BEFORE `await import("../src/config")` (or anything that imports it,
// e.g. "../src/index") — combined with vi.resetModules() beforeEach, this
// is what lets tests exercise every classic-script query-param scenario.
// Returns a restore function that removes the shadowing own-property,
// letting jsdom's real (always-null-outside-a-script-tag) getter show
// through again for later tests.
export function mockCurrentScript(query: string | null): () => void {
  const script = document.createElement('script');
  script.src = query
    ? `https://example.test/halloween.iife.js${query}`
    : 'https://example.test/halloween.iife.js';
  Object.defineProperty(document, 'currentScript', { value: script, configurable: true });
  return () => {
    delete (document as unknown as { currentScript?: unknown }).currentScript;
  };
}
