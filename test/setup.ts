// jsdom implements neither the Web Animations API nor requestAnimationFrame.
// Minimal shims so page-effects.ts's witch/spider-drop code (which calls
// element.animate()) and the eyes fade-in (rAF) don't throw — tests only
// assert on scheduling/DOM lifecycle, never on real animation playback.

if (!Element.prototype.animate) {
  Element.prototype.animate = function animate(keyframes, options) {
    return {
      onfinish: null,
      oncancel: null,
      cancel() {},
      finish() {},
      effect: {
        getKeyframes: () => keyframes,
        getTiming: () => options,
      },
    } as unknown as Animation;
  };
}

if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number) as typeof requestAnimationFrame;
}
