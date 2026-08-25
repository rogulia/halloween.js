// document.currentScript is only valid synchronously while this classic
// <script src> is executing, so it must be captured at module top level —
// by the time any later callback runs (DOMContentLoaded, a timer) it's null.
const scriptParams: URLSearchParams | null = (() => {
  if (typeof document === "undefined") return null;
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script?.src) return null;
  try {
    return new URL(script.src, document.baseURI).searchParams;
  } catch {
    return null;
  }
})();

function str(key: string, fallback: string): string {
  const raw = scriptParams?.get(key);
  return raw && raw.length > 0 ? raw : fallback;
}

export const CONFIG = {
  // Season window, DD-MM. ?s=18-10&e=02-11 — defaults span ~2 weeks around
  // Halloween so the script can stay in the page year-round. This is the
  // classic-script fallback layer only; getSeasonWindow() below is what
  // actually resolves the effective window at each sync (body data
  // attributes take priority over these captured query params).
  seasonStart: str("s", "18-10"),
  seasonEnd: str("e", "02-11"),
  // Spider/web color override, any valid CSS color. ?color=%23ff6b00 — empty
  // means "no override", spiders and webs inherit currentColor as before.
  color: str("color", ""),
};

// Reads a single non-empty, non-whitespace-only body attribute, or falls
// back — used by getSeasonWindow() below for data-halloween-start/-end.
function bodyAttrOr(name: string, fallback: string): string {
  if (typeof document === "undefined" || !document.body) return fallback;
  const raw = document.body.getAttribute(name);
  if (raw === null) return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Resolves the *effective* season window fresh on every call — unlike
 * CONFIG.seasonStart/seasonEnd (captured once, at module load, from the
 * classic script's own query string), this re-reads <body>'s
 * data-halloween-start/data-halloween-end attributes every time, since
 * those can change at runtime after a page has already loaded.
 *
 * start and end are resolved independently, each with its own 3-step
 * precedence: body attribute -> captured script query param -> library
 * default. Only presence/emptiness is decided here — an attribute that's
 * missing, empty, or whitespace-only falls through to the next layer, but a
 * non-empty value (valid or not) is passed straight to isWithinSeason(),
 * which is the sole owner of calendar parsing/validation and its existing
 * fail-open policy. This function never touches calendar rules itself, so
 * there's exactly one place (isWithinSeason/parseDDMM) that knows what a
 * valid DD-MM looks like, including the 29-02 special case.
 */
export function getSeasonWindow(): { start: string; end: string } {
  return {
    start: bodyAttrOr("data-halloween-start", CONFIG.seasonStart),
    end: bodyAttrOr("data-halloween-end", CONFIG.seasonEnd),
  };
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 29-02 is accepted as a valid calendar date year-round, not just in leap
 * years — resolveDate() below clamps it to 28-02 for non-leap years, the
 * same rule applied to both ends of the range.
 */
function parseDDMM(value: string): { day: number; month: number } | null {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || day < 1) return null;
  const maxDay = month === 2 ? 29 : DAYS_IN_MONTH[month - 1];
  if (day > maxDay) return null;
  return { day, month };
}

function resolveDate(year: number, month: number, day: number, endOfDay: boolean): Date {
  const actualDay = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return endOfDay
    ? new Date(year, month - 1, actualDay, 23, 59, 59, 999)
    : new Date(year, month - 1, actualDay, 0, 0, 0, 0);
}

/**
 * Malformed config fails open (returns true) — a typo in the season params
 * should never silently disable the whole library.
 */
export function isWithinSeason(now: Date, startStr: string, endStr: string): boolean {
  const start = parseDDMM(startStr);
  const end = parseDDMM(endStr);
  if (!start || !end) return true;

  const year = now.getFullYear();
  const startDate = resolveDate(year, start.month, start.day, false);
  const endDate = resolveDate(year, end.month, end.day, true);

  if (startDate <= endDate) {
    return now >= startDate && now <= endDate;
  }
  // Range wraps across the new year, e.g. 25-12 .. 05-01.
  return now >= startDate || now <= endDate;
}
