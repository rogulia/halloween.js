import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockMatchMedia } from "./test-utils";

// Guards the critical halloween.js identifiers against an accidental rename
// regression. Deliberately scoped to what's reachable from source at test
// time (module exports, CSS text, DOM state after init) rather than
// grepping the whole repository or reading dist/ — `npm test` runs BEFORE
// `npm run build` in `npm run check`, so a dist-dependent check here would
// be either unbuildable or fragile depending on run order. Bundle filenames
// and the IIFE global are verified separately, post-build, by
// scripts/check-exports.mjs (part of `npm run check`'s test:exports step);
// a full-repo text audit is documented separately in the task report.
//
// Absence of the previous brand's identifiers is proven structurally (exact
// key-set / global-diff checks) rather than by asserting a specific old
// name is undefined — that would mean spelling the retired name out in
// source just to test for it, which is exactly what this guard exists to
// prevent from lingering.
//
// Element-level decoration (initElements/refreshElements/destroyElements,
// data-halloween-init, .halloween-host/-decor/-trigger-*, corner classes)
// was removed entirely ahead of the 1.0 API freeze — this file also guards
// that removal: the exact remaining export set, and that a leftover
// halloween-{corner} class on an element is never touched.
describe("rename guard — critical halloween.js identifiers", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    document.body.className = "";
    document.head.innerHTML = "";
    mockMatchMedia(false);
  });

  it("master class is halloween", async () => {
    // Fixed inside the default season window so trySync() (run at import
    // time) sees an active date without depending on today's real date.
    vi.setSystemTime(new Date(2026, 9, 20));
    document.body.className = "halloween";
    await import("../src/index");
    expect(document.body.classList.contains("halloween")).toBe(true);
  });

  it("color override custom property is --halloween-color", async () => {
    const { applyColorOverride } = await import("../src/styles");
    applyColorOverride("#ff6600");
    expect(document.body.style.getPropertyValue("--halloween-color")).toBe("#ff6600");
  });

  it("CSS text's custom properties all share the --halloween- prefix", async () => {
    const { CSS } = await import("../src/styles");
    expect(CSS).toContain("--halloween-color");
    expect(CSS).toContain("--halloween-page-z-index");
    // Every custom property declared (--name: value;) or read (var(--name)
    // anywhere in the stylesheet must start with --halloween- — a single
    // shared prefix, not a mix of an old one and a new one. Scoped to these
    // two syntactic shapes rather than a loose "--[a-z-]+" scan, which also
    // matches unrelated BEM "--modifier" class-name suffixes elsewhere in
    // the same stylesheet (e.g. .halloween-screen-corner--left-top).
    function allMatches(re: RegExp): string[] {
      const found: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(CSS)) !== null) found.push(m[1]);
      return found;
    }
    const declared = allMatches(/^\s*(--[a-z-]+):/gm);
    const used = allMatches(/var\((--[a-z-]+)/g);
    for (const prop of new Set([...declared, ...used])) {
      expect(prop.startsWith("--halloween-")).toBe(true);
    }
  });

  it("the public runtime export set is exactly default/halloween/pageEffects", async () => {
    const mod = await import("../src/index");
    expect(Object.keys(mod).sort()).toEqual(["default", "halloween", "pageEffects"].sort());
    expect(mod.default).toBe(mod.halloween);
  });

  it("CSS text contains no element-only identifiers left over from the removed element-level API", async () => {
    const { CSS } = await import("../src/styles");
    const retired = [
      "halloween-decor",
      "halloween-host",
      "halloween-host-position",
      "halloween-trigger-hover",
      "halloween-trigger-focus",
      "halloween-corner-",
      "halloween-runtime-active",
      "halloween-static",
    ];
    for (const identifier of retired) {
      expect(CSS).not.toContain(identifier);
    }
  });

  describe("element-level decoration is gone: a leftover halloween-{corner} class is inert", () => {
    it("halloween() does not touch an element carrying the old halloween-right-top class", async () => {
      vi.setSystemTime(new Date(2026, 9, 20));
      document.body.className = "halloween";
      const btn = document.createElement("button");
      btn.id = "btn";
      btn.className = "halloween-right-top";
      document.body.appendChild(btn);

      const { halloween } = await import("../src/index");
      halloween(); // manual sync — must not scan for or decorate this element

      expect(btn.outerHTML).toBe('<button id="btn" class="halloween-right-top"></button>');
      expect(btn.hasAttribute("data-halloween-init")).toBe(false);
      expect(btn.classList.contains("halloween-host")).toBe(false);
      expect(btn.classList.contains("halloween-trigger-hover")).toBe(false);
      expect(btn.classList.contains("halloween-trigger-focus")).toBe(false);
      expect(btn.querySelector(".halloween-decor")).toBeNull();
    });

    it("automatic init on load does not touch a halloween-left-top/-right-bottom element either", async () => {
      vi.setSystemTime(new Date(2026, 9, 20));
      document.body.className = "halloween";
      const link = document.createElement("a");
      link.id = "link";
      link.className = "halloween-left-top halloween-right-bottom";
      document.body.appendChild(link);

      await import("../src/index"); // auto-init runs at import time

      expect(link.outerHTML).toBe('<a id="link" class="halloween-left-top halloween-right-bottom"></a>');
      expect(link.hasAttribute("data-halloween-init")).toBe(false);
    });
  });

  it("halloween-runtime-active never appears anywhere in the DOM", async () => {
    vi.setSystemTime(new Date(2026, 9, 20));
    document.body.className = "halloween halloween-eyes";
    await import("../src/index");

    expect(document.body.classList.contains("halloween-runtime-active")).toBe(false);
    expect(document.querySelector(".halloween-runtime-active")).toBeNull();

    document.body.classList.remove("halloween");
    await Promise.resolve();
    expect(document.body.classList.contains("halloween-runtime-active")).toBe(false);

    document.body.classList.add("halloween");
    await Promise.resolve();
    expect(document.body.classList.contains("halloween-runtime-active")).toBe(false);
  });

  describe("halloween() manually syncs the current body classes", () => {
    it("with master + season active, starts the selected ambient effect and screen corners", async () => {
      vi.setSystemTime(new Date(2026, 9, 20));
      document.body.className = ""; // starts inactive so auto-init at import time does nothing yet
      const { halloween } = await import("../src/index");

      document.body.className = "halloween halloween-eyes halloween-screen-left-top";
      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
      expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);

      halloween();

      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
      expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
    });

    it("with the master class removed, stops and removes ambient effects and screen corners", async () => {
      vi.setSystemTime(new Date(2026, 9, 20));
      document.body.className = "halloween halloween-eyes halloween-screen-left-top";
      const { halloween } = await import("../src/index");
      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(1);
      expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);

      document.body.classList.remove("halloween");
      halloween();

      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
      expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(0);
    });
  });

  describe("reduced motion: ambient nodes are absent, static screen corners still render, no element decoration expected", () => {
    it("with reduce on: no ambient animation nodes, screen corners present", async () => {
      vi.setSystemTime(new Date(2026, 9, 20));
      mockMatchMedia(true);
      document.body.className =
        "halloween halloween-eyes halloween-witches halloween-spider-drop halloween-tombstones halloween-screen-left-top halloween-screen-right-bottom";
      await import("../src/index");

      expect(document.querySelectorAll(".halloween-eyes-item").length).toBe(0);
      expect(document.querySelectorAll(".halloween-witch-item").length).toBe(0);
      expect(document.querySelectorAll(".halloween-spider-drop-item").length).toBe(0);
      expect(document.querySelectorAll(".halloween-tombstone-item").length).toBe(0);
      expect(document.querySelectorAll(".halloween-screen-corner").length).toBe(4);
      expect(document.querySelector(".halloween-screen-corner--left-top")).not.toBeNull();
      expect(document.querySelector(".halloween-screen-corner--right-bottom")).not.toBeNull();
    });
  });
});
