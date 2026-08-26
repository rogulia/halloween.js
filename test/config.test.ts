import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isWithinSeason } from '../src/config';
import { mockCurrentScript } from './test-utils';

describe('isWithinSeason — normal range 18-10..02-11', () => {
  it('18 Oct is inside', () => {
    expect(isWithinSeason(new Date(2026, 9, 18, 0, 0, 0, 0), '18-10', '02-11')).toBe(true);
  });
  it('2 Nov 23:59:59.999 is inside (end day fully included, to the last ms)', () => {
    expect(isWithinSeason(new Date(2026, 10, 2, 23, 59, 59, 999), '18-10', '02-11')).toBe(true);
  });
  it('3 Nov is outside', () => {
    expect(isWithinSeason(new Date(2026, 10, 3, 0, 0, 0, 0), '18-10', '02-11')).toBe(false);
  });
});

describe('isWithinSeason — cross-new-year range 25-12..05-01', () => {
  it('28 Dec is inside', () => {
    expect(isWithinSeason(new Date(2026, 11, 28), '25-12', '05-01')).toBe(true);
  });
  it('3 Jan is inside', () => {
    expect(isWithinSeason(new Date(2027, 0, 3), '25-12', '05-01')).toBe(true);
  });
  it('6 Jan is outside', () => {
    expect(isWithinSeason(new Date(2027, 0, 6), '25-12', '05-01')).toBe(false);
  });
});

describe('isWithinSeason — invalid calendar dates fail open', () => {
  const invalidDates = [
    '31-02',
    '30-02',
    '31-04',
    '31-06',
    '31-09',
    '31-11',
    '00-10',
    '10-00',
    '32-10',
    '10-13',
    'not-a-date',
  ];

  it.each(invalidDates)('fails open (true) when start="%s"', (bad) => {
    expect(isWithinSeason(new Date(2026, 5, 15), bad, '02-11')).toBe(true);
  });

  it.each(invalidDates)('fails open (true) when end="%s"', (bad) => {
    expect(isWithinSeason(new Date(2026, 5, 15), '18-10', bad)).toBe(true);
  });
});

describe('isWithinSeason — one- and two-digit DD-MM', () => {
  it('"2-11" and "02-11" behave identically as a range end', () => {
    const insideEnd = new Date(2026, 10, 2, 12, 0, 0);
    const justPastEnd = new Date(2026, 10, 3, 0, 0, 0);
    expect(isWithinSeason(insideEnd, '18-10', '2-11')).toBe(
      isWithinSeason(insideEnd, '18-10', '02-11'),
    );
    expect(isWithinSeason(justPastEnd, '18-10', '2-11')).toBe(
      isWithinSeason(justPastEnd, '18-10', '02-11'),
    );
    expect(isWithinSeason(insideEnd, '18-10', '2-11')).toBe(true);
    expect(isWithinSeason(justPastEnd, '18-10', '2-11')).toBe(false);
  });
});

describe('isWithinSeason — 29 Feb policy', () => {
  it('29 Feb (leap year 2028) at noon is inside a 29-02..29-02 window', () => {
    expect(isWithinSeason(new Date(2028, 1, 29, 12, 0, 0), '29-02', '29-02')).toBe(true);
  });
  it('1 Mar (leap year 2028) is outside a 29-02..29-02 window', () => {
    expect(isWithinSeason(new Date(2028, 2, 1, 0, 0, 0), '29-02', '29-02')).toBe(false);
  });

  it('29-02 clamps to 28 Feb in a non-leap year (2026): 00:00:00.000 is inside', () => {
    expect(isWithinSeason(new Date(2026, 1, 28, 0, 0, 0, 0), '29-02', '29-02')).toBe(true);
  });
  it('29-02..29-02 in a non-leap year covers all of 28 Feb, including the last ms', () => {
    expect(isWithinSeason(new Date(2026, 1, 28, 23, 59, 59, 999), '29-02', '29-02')).toBe(true);
  });
  it('29-02..29-02 in a non-leap year excludes 27 Feb', () => {
    expect(isWithinSeason(new Date(2026, 1, 27, 23, 59, 59, 999), '29-02', '29-02')).toBe(false);
  });
  it('29-02..29-02 in a non-leap year excludes 1 Mar', () => {
    expect(isWithinSeason(new Date(2026, 2, 1, 0, 0, 0, 0), '29-02', '29-02')).toBe(false);
  });
});

// getSeasonWindow() resolves the *effective* window fresh each call: body
// data-halloween-start/-end attribute -> captured classic-script ?s=/?e=
// query param -> library default. Each end is resolved independently.
// vi.resetModules() + a fresh dynamic import per test isolates config.ts's
// module-top-level document.currentScript capture, which mockCurrentScript()
// must be set up BEFORE that import for the script-query layer to apply.
describe('getSeasonWindow — precedence between body attributes, script query params and defaults', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.removeAttribute('data-halloween-start');
    document.body.removeAttribute('data-halloween-end');
  });

  it('no body attributes, no script query: library defaults', async () => {
    const restore = mockCurrentScript(null);
    const { getSeasonWindow } = await import('../src/config');
    expect(getSeasonWindow()).toEqual({ start: '18-10', end: '02-11' });
    restore();
  });

  it('no body attributes, classic script has ?s=/?e=: query values win over the default', async () => {
    const restore = mockCurrentScript('?s=01-06&e=15-06');
    const { getSeasonWindow } = await import('../src/config');
    expect(getSeasonWindow()).toEqual({ start: '01-06', end: '15-06' });
    restore();
  });

  it('both body attributes and a conflicting script query are set: body attributes win', async () => {
    const restore = mockCurrentScript('?s=01-06&e=15-06');
    document.body.setAttribute('data-halloween-start', '01-01');
    document.body.setAttribute('data-halloween-end', '31-12');
    const { getSeasonWindow } = await import('../src/config');
    expect(getSeasonWindow()).toEqual({ start: '01-01', end: '31-12' });
    restore();
  });

  it('only data-halloween-start is set: start comes from body, end falls through to the query', async () => {
    const restore = mockCurrentScript('?s=01-06&e=15-06');
    document.body.setAttribute('data-halloween-start', '01-01');
    const { getSeasonWindow } = await import('../src/config');
    expect(getSeasonWindow()).toEqual({ start: '01-01', end: '15-06' });
    restore();
  });

  it('only data-halloween-start is set, no query: start comes from body, end falls through to the default', async () => {
    const restore = mockCurrentScript(null);
    document.body.setAttribute('data-halloween-start', '01-01');
    const { getSeasonWindow } = await import('../src/config');
    expect(getSeasonWindow()).toEqual({ start: '01-01', end: '02-11' });
    restore();
  });

  it('an empty or whitespace-only body attribute is treated as not set', async () => {
    const restore = mockCurrentScript('?s=01-06&e=15-06');
    document.body.setAttribute('data-halloween-start', '');
    document.body.setAttribute('data-halloween-end', '   ');
    const { getSeasonWindow } = await import('../src/config');
    expect(getSeasonWindow()).toEqual({ start: '01-06', end: '15-06' });
    restore();
  });

  it("a non-empty but invalid body attribute is passed through as-is — validation stays isWithinSeason()'s job", async () => {
    const restore = mockCurrentScript(null);
    document.body.setAttribute('data-halloween-start', 'not-a-date');
    const { getSeasonWindow } = await import('../src/config');
    expect(getSeasonWindow().start).toBe('not-a-date');
    restore();
  });
});
