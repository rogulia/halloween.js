import { fromHTML } from "./dom";

let layer: HTMLElement | null = null;

export function getLayer(): HTMLElement {
  if (layer) return layer;
  layer = fromHTML('<div class="halloween-page-layer" aria-hidden="true"></div>');
  document.body.appendChild(layer);
  return layer;
}
