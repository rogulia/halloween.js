// Parent page controller. Never loads halloween.js itself — the library
// only runs inside preview.html, so the fixed ambient-effects layer never
// overlaps this configurator's own UI. All state lives here; the iframe is
// a dumb renderer driven entirely by postMessage.
(() => {
  "use strict";

  const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const SEASON_DEFAULTS = { start: "18-10", end: "02-11" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Feb=29 (leap-safe) — no year is specified, so a fixed calendar table is
  // used rather than checking a specific year's leap-ness.
  const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // The only public halloween.js body classes this demo ever generates or
  // forwards to the preview — a single allowlist shared by class-building
  // and the postMessage payload, so nothing element-level or made up can
  // slip in from either path.
  const CORNER_CLASSES = {
    lt: "halloween-screen-left-top",
    rt: "halloween-screen-right-top",
    lb: "halloween-screen-left-bottom",
    rb: "halloween-screen-right-bottom",
  };
  const EFFECT_CLASSES = {
    eyes: "halloween-eyes",
    witches: "halloween-witches",
    spiderDrop: "halloween-spider-drop",
    tombstones: "halloween-tombstones",
  };
  const INTENSITY_CLASSES = {
    subtle: "halloween-intensity-subtle",
    party: "halloween-intensity-party",
    // "normal" intentionally has no class — it's the library default.
  };

  const pad2 = (n) => String(n).padStart(2, "0");

  function el(id) {
    return document.getElementById(id);
  }

  const cfg = {
    cornerLt: el("cfg-corner-lt"),
    cornerRt: el("cfg-corner-rt"),
    cornerLb: el("cfg-corner-lb"),
    cornerRb: el("cfg-corner-rb"),
    eyes: el("cfg-eyes"),
    witches: el("cfg-witches"),
    spiderDrop: el("cfg-spider-drop"),
    tombstones: el("cfg-tombstones"),
    intensitySubtle: el("cfg-intensity-subtle"),
    intensityNormal: el("cfg-intensity-normal"),
    intensityParty: el("cfg-intensity-party"),
    colorEnabled: el("cfg-color-enabled"),
    colorPicker: el("cfg-color-picker"),
    colorText: el("cfg-color"),
    sDay: el("cfg-season-start-day"),
    sMonth: el("cfg-season-start-month"),
    eDay: el("cfg-season-end-day"),
    eMonth: el("cfg-season-end-month"),
  };

  const colorError = el("cfg-color-error");
  const scriptExample = el("script-example");
  const bodyExample = el("body-example");
  const copyStatus = el("copy-status");
  const previewFrame = el("preview-frame");

  // ---- season day/month selects ----

  function populateMonthSelect(select) {
    MONTHS.forEach((name, i) => {
      const opt = document.createElement("option");
      opt.value = pad2(i + 1);
      opt.textContent = name;
      select.appendChild(opt);
    });
  }

  function populateDaySelect(select, maxDay) {
    const prev = select.value;
    select.innerHTML = "";
    for (let d = 1; d <= maxDay; d++) {
      const opt = document.createElement("option");
      opt.value = pad2(d);
      opt.textContent = String(d);
      select.appendChild(opt);
    }
    if (prev && Number(prev) <= maxDay) select.value = prev;
  }

  function setupDatePair(daySelect, monthSelect, defaultDay, defaultMonth) {
    populateMonthSelect(monthSelect);
    monthSelect.value = pad2(defaultMonth);
    populateDaySelect(daySelect, DAYS_IN_MONTH[defaultMonth - 1]);
    daySelect.value = pad2(defaultDay);
    monthSelect.addEventListener("change", () => {
      populateDaySelect(daySelect, DAYS_IN_MONTH[Number(monthSelect.value) - 1]);
      render();
    });
  }

  setupDatePair(cfg.sDay, cfg.sMonth, 18, 10);
  setupDatePair(cfg.eDay, cfg.eMonth, 2, 11);

  // ---- read state from controls ----

  function getIntensity() {
    if (cfg.intensityParty.checked) return "party";
    if (cfg.intensitySubtle.checked) return "subtle";
    return "normal";
  }

  function normalizedColor() {
    const raw = cfg.colorText.value.trim();
    if (!HEX_PATTERN.test(raw)) return null;
    return raw.toLowerCase();
  }

  function readState() {
    return {
      corners: {
        lt: cfg.cornerLt.checked,
        rt: cfg.cornerRt.checked,
        lb: cfg.cornerLb.checked,
        rb: cfg.cornerRb.checked,
      },
      effects: {
        eyes: cfg.eyes.checked,
        witches: cfg.witches.checked,
        spiderDrop: cfg.spiderDrop.checked,
        tombstones: cfg.tombstones.checked,
      },
      intensity: getIntensity(),
      seasonStart: `${cfg.sDay.value}-${cfg.sMonth.value}`,
      seasonEnd: `${cfg.eDay.value}-${cfg.eMonth.value}`,
      colorEnabled: cfg.colorEnabled.checked,
      color: cfg.colorEnabled.checked ? normalizedColor() : null,
    };
  }

  // ---- build the public class list (single source for preview + generated body) ----

  function buildClasses(state) {
    const classes = ["halloween"];
    if (state.corners.lt) classes.push(CORNER_CLASSES.lt);
    if (state.corners.rt) classes.push(CORNER_CLASSES.rt);
    if (state.corners.lb) classes.push(CORNER_CLASSES.lb);
    if (state.corners.rb) classes.push(CORNER_CLASSES.rb);
    if (state.effects.eyes) classes.push(EFFECT_CLASSES.eyes);
    if (state.effects.witches) classes.push(EFFECT_CLASSES.witches);
    if (state.effects.spiderDrop) classes.push(EFFECT_CLASSES.spiderDrop);
    if (state.effects.tombstones) classes.push(EFFECT_CLASSES.tombstones);
    if (INTENSITY_CLASSES[state.intensity]) classes.push(INTENSITY_CLASSES[state.intensity]);
    return classes;
  }

  // ---- build the generated <body> markup text ----

  function buildBodyMarkup(state, classes) {
    const attrs = [`class="${classes.join(" ")}"`];
    if (state.seasonStart !== SEASON_DEFAULTS.start) {
      attrs.push(`data-halloween-start="${state.seasonStart}"`);
    }
    if (state.seasonEnd !== SEASON_DEFAULTS.end) {
      attrs.push(`data-halloween-end="${state.seasonEnd}"`);
    }
    if (state.colorEnabled && state.color) {
      attrs.push(`style="--halloween-color: ${state.color}"`);
    }
    return `<body ${attrs.join(" ")}>`;
  }

  // ---- iframe messaging ----

  const PREVIEW_ORIGIN = window.location.origin;
  // sendStateToPreview() is always safe to call; it just skips the actual
  // postMessage until "ready" arrives, at which point the ready handler
  // below sends whatever the current state is at that moment (never a
  // stale pre-ready snapshot).
  let previewReady = false;

  function sendStateToPreview(state) {
    if (!previewReady) return;
    const payload = {
      corners: state.corners,
      effects: state.effects,
      intensity: state.intensity,
      color: state.colorEnabled ? state.color : null,
      theme: document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark",
    };
    previewFrame.contentWindow.postMessage({ type: "halloween-preview:state", payload }, PREVIEW_ORIGIN);
  }

  // Two-way ready handshake, immune to load order — this is the actual
  // protection against the lost-ready race, not a timer. The iframe can
  // finish loading (e.g. served from cache) before this deferred script
  // even runs and attaches its own listener, so a "ready" sent from inside
  // the iframe at that exact moment would be lost with nothing to receive
  // it. Instead the PARENT pings from two points that between them cover
  // both possible orderings:
  //  1. immediately, right after the listener below is attached — catches
  //     "the iframe was already fully loaded by the time we got here";
  //  2. on the iframe element's own `load` event — catches "the iframe
  //     finishes loading after we started listening". By the time `load`
  //     fires, preview.js's message listener (registered as its very first
  //     statement) is guaranteed to already be attached, since `load` only
  //     fires once every script in the iframe, deferred or not, has run.
  // preview.js answers every valid ping with "ready", and separately still
  // sends one proactive "ready" of its own on its own load as a second,
  // independent safety net. Both a repeated ping and a repeated ready are
  // harmless no-ops: sendStateToPreview() just re-sends the current state,
  // which the iframe applies idempotently (plain classList.toggle / style
  // property writes, nothing additive).
  function pingPreview() {
    if (!previewFrame.contentWindow) return;
    previewFrame.contentWindow.postMessage({ type: "halloween-preview:ping" }, PREVIEW_ORIGIN);
  }
  pingPreview();
  previewFrame.addEventListener("load", pingPreview);

  window.addEventListener("message", (event) => {
    if (event.source !== previewFrame.contentWindow) return;
    if (event.origin !== PREVIEW_ORIGIN) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "halloween-preview:ready") {
      previewReady = true;
      sendStateToPreview(currentState);
    }
  });

  // ---- body textarea auto-resize ----

  // Grows the readonly body textarea to fit its wrapped content, so it never
  // shows its own internal scrollbar. Resetting height to "auto" first is
  // required before reading scrollHeight — otherwise scrollHeight would just
  // reflect the previous (already-grown) height and the box could never
  // shrink back down when the body markup gets shorter. This only ever
  // *measures* height and writes it back once, so it can't retrigger itself
  // and cannot loop.
  function resizeBodyTextarea() {
    bodyExample.style.height = "auto";
    bodyExample.style.height = `${bodyExample.scrollHeight}px`;
  }

  window.addEventListener("resize", resizeBodyTextarea);

  // ---- render: single update path ----

  let currentState = readState();

  function render() {
    currentState = readState();
    const classes = buildClasses(currentState);

    scriptExample.textContent =
      '<script src="https://cdn.jsdelivr.net/npm/halloween.js@1.0.1/dist/halloween.iife.js"><\/script>';
    const bodyMarkup = buildBodyMarkup(currentState, classes);
    bodyExample.value = bodyMarkup;
    resizeBodyTextarea();

    // currentState.color is already null for anything that doesn't match
    // HEX_PATTERN — including an empty field. With Custom color on, an
    // empty field means no override actually applies despite the switch
    // being enabled, so it's invalid too, not just a non-empty malformed
    // value.
    const colorInvalid = currentState.colorEnabled && !currentState.color;
    cfg.colorText.setAttribute("aria-invalid", String(colorInvalid));
    colorError.textContent = colorInvalid ? "Enter a valid hex color, e.g. #f4b342 or #f60." : "";

    sendStateToPreview(currentState);
  }

  Object.values(cfg).forEach((control) => {
    control.addEventListener("input", render);
  });

  // Keep the native color picker and the hex text field in sync without
  // fighting each other: the picker always writes a full 6-digit value into
  // the text field; the text field (3- or 6-digit) only pushes into the
  // picker when it's valid, since <input type="color"> can't hold shorthand.
  cfg.colorPicker.addEventListener("input", () => {
    cfg.colorText.value = cfg.colorPicker.value;
    render();
  });
  cfg.colorText.addEventListener("input", () => {
    const value = cfg.colorText.value.trim();
    if (HEX_PATTERN.test(value) && value.length === 7) {
      cfg.colorPicker.value = value;
    }
  });

  render();

  // ---- replay ----

  el("replay-btn").addEventListener("click", () => {
    if (!previewReady) return;
    previewFrame.contentWindow.postMessage({ type: "halloween-preview:replay" }, PREVIEW_ORIGIN);
  });

  // ---- theme ----

  const themeToggle = el("theme-toggle");
  const html = document.documentElement;
  themeToggle.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    themeToggle.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
    themeToggle.querySelector("span").textContent = next === "dark" ? "🌙" : "☀️";
    sendStateToPreview(currentState);
  });

  // ---- tabs (Script tag / npm) ----

  const tabs = [el("tab-script"), el("tab-npm")];
  const panels = { "tab-script": el("panel-script"), "tab-npm": el("panel-npm") };

  function selectTab(tab) {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      panels[t.id].hidden = !selected;
    });
    tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const next = event.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
        event.preventDefault();
        selectTab(tabs[next]);
      } else if (event.key === "Home") {
        event.preventDefault();
        selectTab(tabs[0]);
      } else if (event.key === "End") {
        event.preventDefault();
        selectTab(tabs[tabs.length - 1]);
      }
    });
  });

  // ---- copy buttons ----

  function setCopyStatus(message) {
    copyStatus.textContent = message;
  }

  function flashCopied(button) {
    const original = button.dataset.label || button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1600);
  }

  function setupCopyButton(buttonId, getText, label) {
    const button = el(buttonId);
    button.addEventListener("click", () => {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        setCopyStatus(`Clipboard isn't available — copy the ${label.toLowerCase()} manually.`);
        return;
      }
      navigator.clipboard.writeText(getText()).then(
        () => {
          setCopyStatus(`${label} copied`);
          flashCopied(button);
        },
        () => {
          setCopyStatus(`Couldn't copy the ${label.toLowerCase()} — copy it manually.`);
        },
      );
    });
  }

  setupCopyButton("copy-script-btn", () => scriptExample.textContent, "Script tag");
  setupCopyButton("copy-npm-install-btn", () => el("npm-install-example").textContent, "npm install command");
  setupCopyButton("copy-npm-import-btn", () => el("npm-import-example").textContent, "npm import line");
  setupCopyButton("copy-body-btn", () => bodyExample.value, "Body markup");
})();
