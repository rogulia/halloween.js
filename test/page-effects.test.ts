import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockMatchMedia } from "./test-utils";

// page-effects.ts keeps mutable module-level state (timers, activeNodes),
// and index.ts keeps its own (bodyObserved, the MutationObserver). Both must
// be fresh per test, or state leaks across tests — vi.resetModules() +
// re-importing dynamically inside each test is what achieves that; a static
// top-level import would share one instance across the whole file.
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML = "";
  document.body.className = "";
  document.head.innerHTML = "";
  mockMatchMedia(false);
});

afterEach(() => {
  vi.useRealTimers();
  // Restore the prototype getter shadowed by any per-test document.hidden override.
  delete (document as unknown as { hidden?: boolean }).hidden;
});

// Ported from the now-removed test/element.test.ts (element-level decoration
// was retired ahead of the 1.0 API freeze — see the task report) — these
// assertions cover general CSS custom-property plumbing (page z-index,
// public-var-over-preset-var-over-default fallback chains, the spider-drop
// height expression, and the intensity presets themselves), none of which is
// element-specific.
describe("styles.ts CSS — public/preset custom-property plumbing", () => {
  it("page layer z-index is a user-overridable custom property, not a fixed max value", async () => {
    const { CSS } = await import("../src/styles");
    expect(CSS).toContain("var(--halloween-page-z-index, 999)");
    expect(CSS).not.toContain("2147483000");
  });

  it("ambient effect sizes/opacity use a public-var-over-preset-var-over-default fallback chain", async () => {
    const { CSS } = await import("../src/styles");
    // Public vars (--halloween-x) must appear as the FIRST var() argument, so a
    // user-set value always wins — the preset classes (below) only ever set
    // the --halloween-preset-x fallback, never the public var itself.
    expect(CSS).toContain("width: var(--halloween-eyes-width, var(--halloween-preset-eyes-width, 64px));");
    expect(CSS).toContain("height: var(--halloween-eyes-height, var(--halloween-preset-eyes-height, 26px));");
    expect(CSS).toContain("width: var(--halloween-witch-width, var(--halloween-preset-witch-width, 104px));");
    expect(CSS).toContain("height: var(--halloween-witch-height, var(--halloween-preset-witch-height, 130px));");
    expect(CSS).toContain(
      "width: var(--halloween-spider-drop-width, var(--halloween-preset-spider-drop-width, 90px));",
    );
    expect(CSS).toContain(
      "height: var(--halloween-spider-drop-height, var(--halloween-preset-spider-drop-height, 90px));",
    );
    expect(CSS).toContain(
      "width: var(--halloween-screen-corner-size, var(--halloween-preset-screen-corner-size, 120px));",
    );
    expect(CSS).toContain(
      "height: var(--halloween-screen-corner-size, var(--halloween-preset-screen-corner-size, 120px));",
    );
    expect(CSS).toContain("opacity: var(--halloween-page-opacity, var(--halloween-preset-page-opacity, 1));");
    expect(CSS).toContain(
      "width: var(--halloween-tombstone-width, var(--halloween-preset-tombstone-width, 76px));",
    );
    expect(CSS).toContain(
      "height: var(--halloween-tombstone-height, var(--halloween-preset-tombstone-height, 96px));",
    );
  });

  it("the drop-spider's hidden top offset uses the same public/preset/default chain, not a fixed 90px", async () => {
    const { CSS } = await import("../src/styles");
    expect(CSS).toContain(
      "top: calc(0px - var(--halloween-spider-drop-height, var(--halloween-preset-spider-drop-height, 90px)));",
    );
    expect(CSS).not.toContain("top: -90px;");
  });

  it("preset classes set only the internal --halloween-preset-* variables, never the public ones", async () => {
    const { CSS } = await import("../src/styles");
    const subtleBlock = CSS.slice(CSS.indexOf("body.halloween-intensity-subtle"), CSS.indexOf("body.halloween-intensity-party"));
    const partyBlock = CSS.slice(CSS.indexOf("body.halloween-intensity-party"));
    for (const block of [subtleBlock, partyBlock]) {
      expect(block).not.toMatch(
        /--halloween-(?!preset-)(eyes|witch|spider-drop|tombstone|screen-corner|page-opacity)/,
      );
    }
  });

  it("halloween-intensity-subtle sets the ~75% preset sizes and dimmed preset page opacity", async () => {
    const { CSS } = await import("../src/styles");
    expect(CSS).toContain("body.halloween-intensity-subtle");
    expect(CSS).toContain("--halloween-preset-eyes-width: 48px;");
    expect(CSS).toContain("--halloween-preset-eyes-height: 20px;");
    expect(CSS).toContain("--halloween-preset-witch-width: 78px;");
    expect(CSS).toContain("--halloween-preset-witch-height: 98px;");
    expect(CSS).toContain("--halloween-preset-spider-drop-width: 68px;");
    expect(CSS).toContain("--halloween-preset-spider-drop-height: 68px;");
    expect(CSS).toContain("--halloween-preset-tombstone-width: 58px;");
    expect(CSS).toContain("--halloween-preset-tombstone-height: 73px;");
    expect(CSS).toContain("--halloween-preset-screen-corner-size: 90px;");
    expect(CSS).toContain("--halloween-preset-page-opacity: 0.65;");
  });

  it("halloween-intensity-party sets the ~115% preset sizes at full preset page opacity", async () => {
    const { CSS } = await import("../src/styles");
    expect(CSS).toContain("body.halloween-intensity-party");
    expect(CSS).toContain("--halloween-preset-eyes-width: 72px;");
    expect(CSS).toContain("--halloween-preset-eyes-height: 30px;");
    expect(CSS).toContain("--halloween-preset-witch-width: 120px;");
    expect(CSS).toContain("--halloween-preset-witch-height: 150px;");
    expect(CSS).toContain("--halloween-preset-spider-drop-width: 104px;");
    expect(CSS).toContain("--halloween-preset-spider-drop-height: 104px;");
    expect(CSS).toContain("--halloween-preset-tombstone-width: 88px;");
    expect(CSS).toContain("--halloween-preset-tombstone-height: 112px;");
    expect(CSS).toContain("--halloween-preset-screen-corner-size: 140px;");
    expect(CSS).toContain("--halloween-preset-page-opacity: 1;");
  });

  it("party's preset block is declared after subtle's, so it wins when both classes are present", async () => {
    const { CSS } = await import("../src/styles");
    expect(CSS.indexOf(".halloween-intensity-party")).toBeGreaterThan(CSS.indexOf(".halloween-intensity-subtle"));
  });
});

// Mirrors src/page-effects.ts's internal witch delay upper bound — not
// exported from production code (no need to expose it beyond tests), just
// needs to be at least as long as the real max so a single advance is
// guaranteed to cover one full scheduling cycle.
const WITCH_DELAY_MAX_MS = 14000;

function setHidden(value: boolean) {
  Object.defineProperty(document, "hidden", { value, configurable: true });
}

// A controllable Animation mock, distinct from the inert one in test/setup.ts —
// captures each animate() call so a test can manually fire onfinish() to
// simulate a witch/spider-drop finishing its flight, instead of waiting on
// real animation playback (which jsdom doesn't implement anyway).
function mockControllableAnimate() {
  const created: {
    onfinish: (() => void) | null;
    oncancel: (() => void) | null;
    cancel: () => void;
    effect: { getKeyframes: () => unknown; getTiming: () => unknown };
  }[] = [];
  const original = Element.prototype.animate;
  Element.prototype.animate = function mockAnimate(keyframes, options) {
    const anim = {
      onfinish: null as (() => void) | null,
      oncancel: null as (() => void) | null,
      cancel() {
        anim.oncancel?.();
      },
      finish() {
        anim.onfinish?.();
      },
      effect: { getKeyframes: () => keyframes, getTiming: () => options },
    };
    created.push(anim);
    return anim as unknown as Animation;
  };
  return {
    created,
    restore: () => {
      Element.prototype.animate = original;
    },
  };
}

describe("page-effects.ts — direct start/stop", () => {
  it("starting an already-started effect does not spawn a second independent scheduler", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    pe.startPageEffect("eyes"); // must be a no-op (timers already has "eyes")
    pe.stopPageEffect("eyes"); // a single stop should fully halt it
    document.querySelectorAll(".halloween-eyes-item").forEach((n) => n.remove());

    await vi.advanceTimersByTimeAsync(30_000); // well past any interval
    // If start() had created a second scheduler, stop() (Map, keyed by name)
    // could only ever clear one of them — the other would keep firing.
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  it("stop() clears the scheduler and removes active nodes immediately", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);

    pe.stopPageEffect("eyes");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  it("stopAllPageEffects clears every effect type", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    pe.startPageEffect("witches");
    pe.startPageEffect("spider-drop");
    pe.startPageEffect("tombstones");
    const layer = document.querySelector(".halloween-page-layer")!;
    expect(layer.children.length).toBeGreaterThan(0);

    pe.stopAllPageEffects();
    expect(layer.children.length).toBe(0);
  });

  it("does not start when prefers-reduced-motion is set", async () => {
    mockMatchMedia(true);
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });
});

describe("page-effects.ts — tombstones", () => {
  const TOMBSTONE_DELAY_MAX_MS = 16000;

  it("start() spawns a tombstone node; stop() clears it and the scheduler immediately", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("tombstones");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);

    pe.stopPageEffect("tombstones");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
  });

  it("starting an already-started tombstones scheduler is a no-op (no second scheduler)", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("tombstones");
    pe.startPageEffect("tombstones");
    pe.stopPageEffect("tombstones");
    document.querySelectorAll(".halloween-tombstone-item").forEach((n) => n.remove());

    await vi.advanceTimersByTimeAsync(30_000);
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
  });

  it("re-enabling after stop() spawns a fresh tombstone again", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("tombstones");
    pe.stopPageEffect("tombstones");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);

    pe.startPageEffect("tombstones");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);
  });

  it("normal intensity: never exceeds 1 active tombstone across repeated ticks", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("tombstones");
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(TOMBSTONE_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);
    }
  });

  it("halloween-intensity-party: allows up to 2, never 3", async () => {
    document.body.classList.add("halloween-intensity-party");
    const pe = await import("../src/page-effects");
    pe.startPageEffect("tombstones");
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(TOMBSTONE_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBeLessThanOrEqual(2);
    }
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(2);
  });

  it("halloween-intensity-subtle: cap stays at 1 and the cadence is slower (delay x2.5)", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      document.body.classList.add("halloween-intensity-subtle");
      const pe = await import("../src/page-effects");
      pe.startPageEffect("tombstones"); // spawns now; next tick at base min (8000ms) * 2.5 = 20000ms
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);

      // Simulate the first tombstone's animation never finishing (inert mock from setup.ts) —
      // repeated ticks under the slower subtle cadence must still respect maxActive 1.
      await vi.advanceTimersByTimeAsync(20_000);
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("finishing a tombstone's rise/hold/sink animation removes the node and frees the slot", async () => {
    const animateMock = mockControllableAnimate();
    try {
      const pe = await import("../src/page-effects");
      pe.startPageEffect("tombstones");
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);
      expect(animateMock.created.length).toBe(1);

      animateMock.created[0].onfinish?.();
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);

      await vi.advanceTimersByTimeAsync(TOMBSTONE_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);
      expect(animateMock.created.length).toBe(2);
    } finally {
      animateMock.restore();
    }
  });

  it("cancelling a tombstone's animation also removes the node and frees the slot", async () => {
    const animateMock = mockControllableAnimate();
    try {
      const pe = await import("../src/page-effects");
      pe.startPageEffect("tombstones");
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);

      animateMock.created[0].oncancel?.();
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
    } finally {
      animateMock.restore();
    }
  });

  it("the rise/hold/sink transform bakes tilt and scale into every keyframe, not a separate transform write", async () => {
    const animateMock = mockControllableAnimate();
    try {
      const pe = await import("../src/page-effects");
      pe.startPageEffect("tombstones");
      const keyframes = animateMock.created[0].effect.getKeyframes() as { transform: string; offset: number }[];
      expect(keyframes).toHaveLength(4);
      expect(keyframes[0].transform).toMatch(/translateY\(100%\) rotate\(-?[\d.]+deg\) scale\([\d.]+\)/);
      expect(keyframes[3].transform).toBe(keyframes[0].transform);
      expect(keyframes[1].transform).toContain("translateY(calc(100% - ");
      expect(keyframes[1].transform).toBe(keyframes[2].transform);
    } finally {
      animateMock.restore();
    }
  });

  it("does not spawn a tombstone when prefers-reduced-motion is set", async () => {
    mockMatchMedia(true);
    const pe = await import("../src/page-effects");
    pe.startPageEffect("tombstones");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
  });

  it("hidden tab suppresses the spawn, then resumes once visible", async () => {
    setHidden(true);
    const pe = await import("../src/page-effects");
    pe.startPageEffect("tombstones");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);

    setHidden(false);
    await vi.advanceTimersByTimeAsync(TOMBSTONE_DELAY_MAX_MS);
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);
  });
});

describe("page-effects.ts — maxActive cap", () => {
  it("witches: never exceeds 1 active node across repeated ticks while the first is still flying", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("witches");
    expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);

    // Several scheduling cycles pass; the inert animate() mock from
    // test/setup.ts never fires onfinish, so the first witch never leaves —
    // every later spawn attempt in this window must be skipped.
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(WITCH_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);
    }
  });

  it("spider-drop: never exceeds 1 active node across repeated ticks while the first is still active", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("spider-drop");
    expect(document.querySelectorAll(".halloween-spider-drop-item").length).toBe(1);

    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(9000);
      expect(document.querySelectorAll(".halloween-spider-drop-item").length).toBe(1);
    }
  });

  it("eyes: never exceeds 1 active node across repeated ticks", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(5000);
      expect(document.querySelectorAll(".halloween-eyes-item").length).toBeLessThanOrEqual(1);
    }
  });

  it("finishing/cleaning up a witch frees the slot for the next scheduled spawn", async () => {
    const animateMock = mockControllableAnimate();
    try {
      const pe = await import("../src/page-effects");
      pe.startPageEffect("witches");
      expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);

      // A tick lands while the slot is still occupied — must be skipped.
      await vi.advanceTimersByTimeAsync(WITCH_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);
      expect(animateMock.created.length).toBe(1);

      // Simulate the first witch's flight finishing — cleanup() removes the
      // node and untracks it, freeing the slot.
      animateMock.created[0].onfinish?.();
      expect(document.querySelectorAll(".halloween-witch-item").length).toBe(0);

      await vi.advanceTimersByTimeAsync(WITCH_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);
      expect(animateMock.created.length).toBe(2);
    } finally {
      animateMock.restore();
    }
  });
});

describe("page-effects.ts — spider-drop height is CSS-driven, not a hardcoded 90", () => {
  it("the WAAPI keyframes reference the same public/preset/default var chain as styles.ts, not a fixed 90px", async () => {
    const animateMock = mockControllableAnimate();
    try {
      const pe = await import("../src/page-effects");
      pe.startPageEffect("spider-drop");
      const keyframes = animateMock.created[0].effect.getKeyframes() as { height: string; offset: number }[];
      const heldFrame = keyframes.find((k) => k.offset !== 0 && k.offset !== 1)!;
      expect(heldFrame.height).toBe(
        "calc(75vh + var(--halloween-spider-drop-height, var(--halloween-preset-spider-drop-height, 90px)))",
      );
      expect(heldFrame.height).not.toContain("+ 90px)");
      // Verified separately in a real browser (jsdom has no WAAPI/CSS cascade
      // of its own) that this resolves correctly for every preset and a
      // custom override — see the task report.
    } finally {
      animateMock.restore();
    }
  });
});

describe("page-effects.ts — intensity presets", () => {
  // nextDelayMs() for eyes is a fixed 5000ms, no Math.random involved, which
  // makes it the cleanest effect for asserting the delay multiplier itself.
  // Math.random is still mocked (per the task's own instruction) so the
  // eye's own visibleFor/fade timing is deterministic too — it must fully
  // clear (well under any preset's interval) before the next tick is due, or
  // an earlier eye lingering around would be indistinguishable from a
  // "new" one and make the boundary check meaningless.
  let randomSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("no intensity class: normal cadence (5000ms)", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);

    await vi.advanceTimersByTimeAsync(4999);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0); // prior eye already faded out
    await vi.advanceTimersByTimeAsync(1);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1); // next tick spawned
  });

  it("explicit halloween-intensity-normal matches the no-class default", async () => {
    document.body.classList.add("halloween-intensity-normal");
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");

    await vi.advanceTimersByTimeAsync(4999);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
  });

  it("halloween-intensity-subtle: delay multiplied by 2.5 (12500ms)", async () => {
    document.body.classList.add("halloween-intensity-subtle");
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");

    await vi.advanceTimersByTimeAsync(12499);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
  });

  it("halloween-intensity-party: delay multiplied by 0.5 (2500ms)", async () => {
    document.body.classList.add("halloween-intensity-party");
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);

    // Party's 2500ms tick is faster than an eye's own ~3100ms visible+fade
    // lifetime, so the first eye is still around when the next tick lands —
    // party's maxActive x2 is what allows a second one in alongside it.
    await vi.advanceTimersByTimeAsync(2499);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(2);
  });

  it("halloween-intensity-subtle: witch cap stays at 1", async () => {
    document.body.classList.add("halloween-intensity-subtle");
    const pe = await import("../src/page-effects");
    pe.startPageEffect("witches");
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(WITCH_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);
    }
  });

  it("halloween-intensity-party: witch cap allows 2, never 3", async () => {
    document.body.classList.add("halloween-intensity-party");
    const pe = await import("../src/page-effects");
    pe.startPageEffect("witches");
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(WITCH_DELAY_MAX_MS);
      expect(document.querySelectorAll(".halloween-witch-item").length).toBeLessThanOrEqual(2);
    }
    expect(document.querySelectorAll(".halloween-witch-item").length).toBe(2);
  });

  it("conflicting intensity classes: party wins over subtle", async () => {
    document.body.classList.add("halloween-intensity-subtle", "halloween-intensity-party");
    const pe = await import("../src/page-effects");
    pe.startPageEffect("witches");
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(WITCH_DELAY_MAX_MS);
    }
    // party's cap (2) applies, not subtle's (1) — proves priority order.
    expect(document.querySelectorAll(".halloween-witch-item").length).toBe(2);
  });

  it("an already-pending timeout is not rescheduled; the new preset applies starting the next cycle", async () => {
    const pe = await import("../src/page-effects");
    pe.startPageEffect("witches"); // normal: spawns now, next tick in 6000ms (random=0)
    expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);

    document.body.classList.add("halloween-intensity-party"); // changed mid-cycle

    await vi.advanceTimersByTimeAsync(5999);
    // The pending timer was set under "normal" (6000ms) before the class
    // changed — it must fire on its original schedule, not early.
    expect(document.querySelectorAll(".halloween-witch-item").length).toBe(1);

    await vi.advanceTimersByTimeAsync(1); // total 6000ms: the timer fires now
    // This cycle re-reads intensity and sees "party" — its higher cap (2)
    // is what allows this second witch through.
    expect(document.querySelectorAll(".halloween-witch-item").length).toBe(2);
  });
});

describe("page-effects.ts — hidden tab suppresses new spawns", () => {
  it("starting an effect in a hidden tab creates no node but keeps the scheduler running", async () => {
    setHidden(true);
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);

    setHidden(false);
    await vi.advanceTimersByTimeAsync(5000); // next scheduled tick
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
  });

  it("stopping an effect while the tab is hidden fully clears the scheduler", async () => {
    setHidden(true);
    const pe = await import("../src/page-effects");
    pe.startPageEffect("eyes");
    pe.stopPageEffect("eyes");

    setHidden(false);
    await vi.advanceTimersByTimeAsync(30_000); // well past any interval
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  // Base eyes delay (5000ms) times each preset's own delayMultiplier — kept
  // local to this test, mirrors nothing exported from production code.
  const INTENSITY_TICK_MS: Record<string, number> = {
    "halloween-intensity-subtle": 12500,
    "halloween-intensity-normal": 5000,
    "halloween-intensity-party": 2500,
  };

  it.each(Object.keys(INTENSITY_TICK_MS))(
    "%s: hidden tab suppresses the initial spawn, then resumes on the next tick",
    async (intensityClass) => {
      // Math.random mocked so the tick delay is the exact deterministic
      // value above — this is the very first spawn ever for this effect, so
      // it can't collide with the maxActive cap regardless of preset.
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
      try {
        document.body.classList.add(intensityClass);
        setHidden(true);
        const pe = await import("../src/page-effects");
        pe.startPageEffect("eyes");
        expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);

        setHidden(false);
        await vi.advanceTimersByTimeAsync(INTENSITY_TICK_MS[intensityClass]);
        expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
      } finally {
        randomSpy.mockRestore();
      }
    },
  );

  it.each(["halloween-intensity-subtle", "halloween-intensity-normal", "halloween-intensity-party"])(
    "%s: stop() during a hidden tab fully clears the scheduler",
    async (intensityClass) => {
      document.body.classList.add(intensityClass);
      setHidden(true);
      const pe = await import("../src/page-effects");
      pe.startPageEffect("eyes");
      pe.stopPageEffect("eyes");

      setHidden(false);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    },
  );
});

describe("index.ts — master/season gate (class-driven)", () => {
  // Fixed inside the default season window (18 Oct .. 2 Nov), set before
  // importing index.ts so its initial trySync() (run at import time) sees a
  // date inside the window — tests never depend on the real current date.
  const insideSeason = new Date(2026, 9, 20);

  it("removing the master class stops ambient effects and removes screen corners", async () => {
    vi.setSystemTime(insideSeason);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    await import("../src/index");

    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);

    document.body.classList.remove("halloween");
    await Promise.resolve(); // MutationObserver callback runs as a microtask

    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  it("re-adding the master class restarts body-class effects and corners", async () => {
    vi.setSystemTime(insideSeason);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    await import("../src/index");

    document.body.classList.remove("halloween");
    await Promise.resolve();
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);

    document.body.classList.add("halloween");
    await Promise.resolve();

    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
  });

  it("halloween-tombstones body class is class-driven: adding/removing it starts/stops the effect", async () => {
    vi.setSystemTime(insideSeason);
    document.body.className = "halloween";
    await import("../src/index");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);

    document.body.classList.add("halloween-tombstones");
    await Promise.resolve();
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);

    document.body.classList.remove("halloween-tombstones");
    await Promise.resolve();
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
  });

  it("removing the master class also stops halloween-tombstones", async () => {
    vi.setSystemTime(insideSeason);
    document.body.className = "halloween halloween-tombstones";
    await import("../src/index");
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(1);

    document.body.classList.remove("halloween");
    await Promise.resolve();
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
  });

  it("public pageEffects.start() ensures styles are injected, even without the master class", async () => {
    vi.setSystemTime(insideSeason);
    document.body.className = ""; // no master class at all
    const { pageEffects } = await import("../src/index");

    expect(document.getElementById("halloween-styles")).toBeNull();
    pageEffects.start("eyes");
    expect(document.getElementById("halloween-styles")).not.toBeNull();
  });

  it("multiple body class mutations do not duplicate the page layer or screen corners", async () => {
    vi.setSystemTime(insideSeason);
    document.body.className = "halloween halloween-screen-left-top";
    await import("../src/index");
    await Promise.resolve();

    document.body.classList.add("halloween-eyes");
    await Promise.resolve();
    document.body.classList.remove("halloween-eyes");
    await Promise.resolve();
    document.body.classList.add("halloween-witches");
    await Promise.resolve();

    expect(document.querySelectorAll(".halloween-page-layer").length).toBe(1);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
  });
});

describe("index.ts — season window from data-halloween-start/-end body attributes", () => {
  // Well outside the default 18-10..02-11 window, so these tests can tell
  // "active because of a custom attribute window" apart from "active
  // because it happens to be inside the default one".
  const outsideDefaultSeason = new Date(2026, 5, 15); // 15 Jun

  beforeEach(() => {
    document.body.removeAttribute("data-halloween-start");
    document.body.removeAttribute("data-halloween-end");
  });

  it("a non-empty but invalid data-halloween-start fails open, same as an invalid ?s= query", async () => {
    vi.setSystemTime(outsideDefaultSeason);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    document.body.setAttribute("data-halloween-start", "not-a-date");
    await import("../src/index");

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
  });

  it("adding wide-open season attributes (no class change) starts effects that the default window kept off", async () => {
    vi.setSystemTime(outsideDefaultSeason);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    await import("../src/index");

    // Outside the default window: inactive at import time.
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);

    // Attribute-only mutation — body's class list never changes here — must
    // still reach the MutationObserver and trigger a sync.
    document.body.setAttribute("data-halloween-start", "01-01");
    document.body.setAttribute("data-halloween-end", "31-12");
    await Promise.resolve();

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
  });

  it("removing season attributes that were holding the window open stops effects immediately, and timers don't resurrect them", async () => {
    vi.setSystemTime(outsideDefaultSeason);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    document.body.setAttribute("data-halloween-start", "01-01");
    document.body.setAttribute("data-halloween-end", "31-12");
    await import("../src/index");

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);

    document.body.removeAttribute("data-halloween-start");
    document.body.removeAttribute("data-halloween-end");
    await Promise.resolve();

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);

    // The eyes scheduler's own timer, if it somehow survived, would spawn a
    // new node on its next tick (5000ms) — it must not have survived.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  it("repeated attribute toggling never duplicates the page layer, screen corners or the ambient scheduler", async () => {
    vi.setSystemTime(outsideDefaultSeason);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    await import("../src/index");

    for (let i = 0; i < 3; i++) {
      document.body.setAttribute("data-halloween-start", "01-01");
      document.body.setAttribute("data-halloween-end", "31-12");
      await Promise.resolve();
      expect(document.querySelectorAll(".halloween-page-layer").length).toBe(1);
      expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);

      document.body.removeAttribute("data-halloween-start");
      document.body.removeAttribute("data-halloween-end");
      await Promise.resolve();
      expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);
      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    }

    // Still exactly one (harmless, always-present) page layer element after
    // all that — never duplicated, never removed.
    expect(document.querySelectorAll(".halloween-page-layer").length).toBe(1);
  });

  it("without the master class, even wide-open season attributes start nothing", async () => {
    vi.setSystemTime(outsideDefaultSeason);
    document.body.className = ""; // no "halloween" master class
    document.body.setAttribute("data-halloween-start", "01-01");
    document.body.setAttribute("data-halloween-end", "31-12");
    await import("../src/index");

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);
  });

  it("halloween() manual sync picks up the current season attributes, not a stale snapshot", async () => {
    vi.setSystemTime(outsideDefaultSeason);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    const { halloween } = await import("../src/index");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);

    document.body.setAttribute("data-halloween-start", "01-01");
    document.body.setAttribute("data-halloween-end", "31-12");
    halloween(); // manual sync, not waiting for the MutationObserver microtask

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
  });
});

describe("index.ts — prefers-reduced-motion live updates", () => {
  const insideSeason = new Date(2026, 9, 20);

  it("initial load with reduce already on: no ambient effects, but static screen corners still work and no element decoration is expected", async () => {
    vi.setSystemTime(insideSeason);
    mockMatchMedia(true);
    document.body.className =
      "halloween halloween-eyes halloween-witches halloween-spider-drop halloween-tombstones halloween-screen-left-top";
    // Element-level decoration was removed ahead of the 1.0 API freeze — this
    // button, carrying what used to be a corner-modifier class, must come
    // through completely untouched (see the "leftover corner classes" guard
    // in rename-guard.test.ts for the fuller assertion).
    const btn = document.createElement("button");
    btn.id = "btn";
    btn.className = "halloween-right-top";
    document.body.appendChild(btn);

    await import("../src/index");

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-witch-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-spider-drop-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
    expect(btn.outerHTML).toBe('<button id="btn" class="halloween-right-top"></button>');

    await vi.advanceTimersByTimeAsync(30_000); // no scheduler was ever started
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  it("normal -> reduce: running ambient effects are torn down immediately, and stay down", async () => {
    vi.setSystemTime(insideSeason);
    const mm = mockMatchMedia(false);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    await import("../src/index");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);

    mm.setReducedMotion(true);

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
    expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4); // static, untouched

    // The scheduler was stopped, not just refused a spawn — a tick landing
    // later must not resurrect it.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  it("reduce -> normal: body-enabled ambient effects restart", async () => {
    vi.setSystemTime(insideSeason);
    const mm = mockMatchMedia(true);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    await import("../src/index");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);

    mm.setReducedMotion(false);

    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
  });

  it("repeated toggling never leaves duplicate timers or nodes running", async () => {
    vi.setSystemTime(insideSeason);
    const mm = mockMatchMedia(false);
    document.body.className = "halloween halloween-eyes halloween-screen-left-top";
    await import("../src/index");

    for (let i = 0; i < 3; i++) {
      mm.setReducedMotion(true);
      mm.setReducedMotion(false);
    }

    // If toggling had stacked up extra schedulers, more than one eye (or
    // more than one pending timer firing independently) would show up here.
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
    await vi.advanceTimersByTimeAsync(5000); // one normal-cadence tick
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBeLessThanOrEqual(1);
  });

  it("direct pageEffects.start() still refuses to start anything while reduce is on", async () => {
    vi.setSystemTime(insideSeason);
    mockMatchMedia(true);
    document.body.className = "halloween";
    const { pageEffects } = await import("../src/index");

    pageEffects.start("eyes");
    expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
  });

  it("subscribes to the MediaQueryList exactly once, even across several body class mutations", async () => {
    vi.setSystemTime(insideSeason);
    const mm = mockMatchMedia(false);
    document.body.className = "halloween halloween-screen-left-top";
    await import("../src/index");
    expect(mm.reducedMotionListenerCount()).toBe(1);

    document.body.classList.add("halloween-eyes");
    await Promise.resolve();
    document.body.classList.remove("halloween-eyes");
    await Promise.resolve();
    document.body.classList.add("halloween-witches");
    await Promise.resolve();

    expect(mm.reducedMotionListenerCount()).toBe(1);
  });
});
