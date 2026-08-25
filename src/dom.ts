export function fromHTML(html: string): HTMLElement {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const node = template.content.firstElementChild;
  if (!node) throw new Error("halloween.js: fromHTML received empty markup");
  return node as HTMLElement;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Subscribes to live changes in prefers-reduced-motion, so the preference is
// picked up while the page stays open, not just at load. Falls back to the
// older MediaQueryList.addListener for browsers without addEventListener
// support on MediaQueryList (e.g. Safari < 14). No-op outside a browser.
export function watchReducedMotion(onChange: () => void): void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
  } else if (typeof mql.addListener === "function") {
    mql.addListener(onChange);
  }
}
