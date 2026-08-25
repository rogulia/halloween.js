import { WEB_SVG } from "./svg";
import { fromHTML } from "./dom";
import { getLayer } from "./layer";

const CORNERS = ["left-top", "right-top", "left-bottom", "right-bottom"] as const;

let created = false;
let cornerNodes: HTMLElement[] = [];

/**
 * Four fixed-position spider webs, one per viewport corner. All four are always
 * in the DOM once created; visibility per corner is driven purely by CSS
 * (body.halloween-screen-{corner}), so toggling is instant with no JS involved.
 */
export function ensureScreenCorners() {
  if (created || typeof document === "undefined") return;
  created = true;
  const layer = getLayer();
  cornerNodes = CORNERS.map((corner) => {
    const node = fromHTML(`<div class="halloween-screen-corner halloween-screen-corner--${corner}">${WEB_SVG}</div>`);
    layer.appendChild(node);
    return node;
  });
}

// Removes the four corner nodes and resets `created` so ensureScreenCorners()
// builds them again the next time the master switch turns on. Leaves the
// shared page layer itself in place — other ambient effects use it too, and
// getLayer() has no way to "un-create" it short of complicating every
// effect's re-init path for no real benefit (an empty, position:fixed,
// pointer-events:none div is harmless to leave behind).
export function removeScreenCorners() {
  cornerNodes.forEach((node) => node.remove());
  cornerNodes = [];
  created = false;
}
