// Structural + behavioral coverage for the demo/ configurator page (not part
// of the published package — demo/ is a static site that ships the library
// via a plain <script>, so it's exercised here by loading the real
// demo/index.html markup into jsdom and running the real demo/demo.js
// against it, rather than re-implementing its logic against mocks.
// ?raw (a Vite/Vitest built-in, see test/vite-raw.d.ts) loads these as plain
// text without going through Node's fs — the project has no @types/node
// dependency, and this avoids adding one just for two file reads in tests.
import html from '../demo/index.html?raw';
import demoJsSource from '../demo/demo.js?raw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// demo.js is a plain browser IIFE script (not an ES module) that reaches for
// `document`/`window`/`navigator` as ambient globals, exactly as it does
// when loaded via <script src="./demo.js" defer>. Running its source through
// `new Function` executes it against vitest's jsdom globals the same way a
// real <script> tag would, without needing a bundler-friendly rewrite.
function loadDemo() {
  const bodyMarkup = html.slice(html.indexOf('<body'), html.indexOf('</body>') + '</body>'.length);
  document.documentElement.innerHTML = `<head></head>${bodyMarkup}`;
  new Function(demoJsSource)();
}

function byId<T extends Element = Element>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} not found`);
  return node as unknown as T;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('demo install/body block structure', () => {
  it('has exactly one #install landmark', () => {
    loadDemo();
    expect(document.querySelectorAll('#install')).toHaveLength(1);
  });

  it('has exactly one generated body output and it is a textarea', () => {
    loadDemo();
    const outputs = document.querySelectorAll('#body-example');
    expect(outputs).toHaveLength(1);
    expect(outputs[0].tagName).toBe('TEXTAREA');
  });

  it('has exactly one Copy body button', () => {
    loadDemo();
    expect(document.querySelectorAll('#copy-body-btn')).toHaveLength(1);
  });

  it('no longer has the old duplicate live-body output or its copy button', () => {
    loadDemo();
    expect(document.getElementById('live-body-example')).toBeNull();
    expect(document.getElementById('copy-live-body-btn')).toBeNull();
  });

  it('places the script/npm tabs and their panels before the body output in document order', () => {
    loadDemo();
    const tabs = document.querySelector('.tabs');
    const bodyOutput = byId('body-example');
    expect(tabs).not.toBeNull();
    // DOCUMENT_POSITION_FOLLOWING means bodyOutput comes after tabs.
    const relation = tabs!.compareDocumentPosition(bodyOutput);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the body output inside the same configurator card as the controls, not a bordered sub-block', () => {
    loadDemo();
    const bodyOutput = byId('body-example');
    const controlsCard = document.querySelector('.controls-card');
    expect(controlsCard).not.toBeNull();
    expect(controlsCard!.contains(bodyOutput)).toBe(true);
    // The old bordered "Live <body> tag" fieldset is gone entirely.
    expect(document.querySelector('fieldset.live-body-group')).toBeNull();
  });

  it('textarea is readonly, wraps softly, and does not allow spellcheck', () => {
    loadDemo();
    const textarea = byId<HTMLTextAreaElement>('body-example');
    expect(textarea.readOnly).toBe(true);
    expect(textarea.getAttribute('wrap')).toBe('soft');
    expect(textarea.getAttribute('spellcheck')).toBe('false');
  });

  it('textarea has an accessible name via aria-labelledby pointing at a heading', () => {
    loadDemo();
    const textarea = byId<HTMLTextAreaElement>('body-example');
    const labelId = textarea.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const label = document.getElementById(labelId!);
    expect(label).not.toBeNull();
    expect(label!.textContent).toMatch(/body/i);
  });
});

describe('demo control -> body textarea reactivity', () => {
  it('reflects tombstone toggle in the body textarea', () => {
    loadDemo();
    const textarea = byId<HTMLTextAreaElement>('body-example');
    const tombstones = byId<HTMLInputElement>('cfg-tombstones');
    expect(textarea.value).toContain('halloween-tombstones');
    tombstones.checked = false;
    tombstones.dispatchEvent(new Event('input', { bubbles: true }));
    expect(textarea.value).not.toContain('halloween-tombstones');
  });

  it('reflects intensity changes in the body textarea', () => {
    loadDemo();
    const textarea = byId<HTMLTextAreaElement>('body-example');
    const party = byId<HTMLInputElement>('cfg-intensity-party');
    party.checked = true;
    party.dispatchEvent(new Event('input', { bubbles: true }));
    expect(textarea.value).toContain('halloween-intensity-party');
  });

  it('reflects corner changes in the body textarea', () => {
    loadDemo();
    const textarea = byId<HTMLTextAreaElement>('body-example');
    const rt = byId<HTMLInputElement>('cfg-corner-rt');
    rt.checked = true;
    rt.dispatchEvent(new Event('input', { bubbles: true }));
    expect(textarea.value).toContain('halloween-screen-right-top');
  });

  it('reflects a valid custom color in the body textarea', () => {
    loadDemo();
    const textarea = byId<HTMLTextAreaElement>('body-example');
    const colorEnabled = byId<HTMLInputElement>('cfg-color-enabled');
    const colorText = byId<HTMLInputElement>('cfg-color');
    colorEnabled.checked = true;
    colorText.value = '#123abc';
    colorEnabled.dispatchEvent(new Event('input', { bubbles: true }));
    expect(textarea.value).toContain('--halloween-color: #123abc');
  });

  it('reflects a non-default season window in the body textarea', () => {
    loadDemo();
    const textarea = byId<HTMLTextAreaElement>('body-example');
    const sDay = byId<HTMLSelectElement>('cfg-season-start-day');
    sDay.value = '05';
    sDay.dispatchEvent(new Event('input', { bubbles: true }));
    expect(textarea.value).toContain('data-halloween-start="05-10"');
  });

  it('never changes the script tag when controls change', () => {
    loadDemo();
    const scriptExample = byId('script-example');
    const before = scriptExample.textContent;
    const tombstones = byId<HTMLInputElement>('cfg-tombstones');
    tombstones.checked = false;
    tombstones.dispatchEvent(new Event('input', { bubbles: true }));
    expect(scriptExample.textContent).toBe(before);
    expect(before).toContain('halloween.iife.js');
  });
});

describe('demo copy body button', () => {
  it("copies the textarea's current .value, not stale markup", () => {
    loadDemo();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const textarea = byId<HTMLTextAreaElement>('body-example');
    const tombstones = byId<HTMLInputElement>('cfg-tombstones');
    tombstones.checked = false;
    tombstones.dispatchEvent(new Event('input', { bubbles: true }));

    byId<HTMLButtonElement>('copy-body-btn').click();

    expect(writeText).toHaveBeenCalledWith(textarea.value);
    expect(textarea.value).not.toContain('halloween-tombstones');
  });
});

describe('demo install tabs keyboard navigation', () => {
  it('moves selection and focus with ArrowRight/ArrowLeft and updates aria-selected/hidden', () => {
    loadDemo();
    const tabScript = byId<HTMLButtonElement>('tab-script');
    const tabNpm = byId<HTMLButtonElement>('tab-npm');
    const panelScript = byId<HTMLElement>('panel-script');
    const panelNpm = byId<HTMLElement>('panel-npm');

    expect(tabScript.getAttribute('aria-selected')).toBe('true');
    expect(panelNpm.hidden).toBe(true);

    tabScript.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(tabNpm.getAttribute('aria-selected')).toBe('true');
    expect(tabScript.getAttribute('aria-selected')).toBe('false');
    expect(panelScript.hidden).toBe(true);
    expect(panelNpm.hidden).toBe(false);
    expect(document.activeElement).toBe(tabNpm);

    tabNpm.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(tabScript.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabScript);
  });
});
