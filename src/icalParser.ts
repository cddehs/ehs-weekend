// iCal (.ics) parser — cache-resilient, comma-safe, defensive tokenizer.
//
// Architectural rules enforced here:
//  1. Input is a raw .ics text string; no CSV-style comma splitting.
//  2. SUMMARY is extracted as a whole block before any field segmentation.
//  3. Manual time annotations ("Sat 7pm - Sun 7pm") are regex-pulled from
//     the SUMMARY before the title is stored.
//  4. Output is a flat CalendarEvent object ready for DB insertion.

export interface CalendarEvent {
  id: string;
  category: string;
  subCategory: string;
  titleBlock: string;
  timeToken: string;
  location: string;
  startDate: string | null;  // ISO string or null
  endDate:   string | null;
}

// Matches patterns like:
//   "Sat 7pm - Sun 7pm"   "Fri 3:30pm–Sat 10am"   "7pm-10pm"   "3:30 PM"
const TIME_TOKEN_RE =
  /\(?\b(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\s*[-–]\s*(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b\)?|\b\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b/gi;

// iCal date formats: 20240601T130000Z  or  20240601T130000  or  20240601
const ICAL_DATE_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

function parseIcalDate(raw: string): string | null {
  const m = raw.trim().match(ICAL_DATE_RE);
  if (!m) return null;
  const [, yr, mo, dy, hh = '00', mm = '00', ss = '00', z = ''] = m;
  return `${yr}-${mo}-${dy}T${hh}:${mm}:${ss}${z === 'Z' ? 'Z' : ''}`;
}

// Unfold iCal line continuations (CRLF + whitespace → single line).
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// Extract a property value robustly — handles value params like DTSTART;TZID=...
function extractProp(lines: string[], propName: string): string {
  const upperName = propName.toUpperCase();
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).toUpperCase();
    // key may be "DTSTART;TZID=America/New_York" — check prefix
    if (key === upperName || key.startsWith(upperName + ';')) {
      return line.slice(colonIdx + 1).trim();
    }
  }
  return '';
}

// Pull time annotations out of a summary string.
// Returns { cleanTitle, timeToken } — cleanTitle has the annotation removed.
function extractTimeToken(summary: string): { cleanTitle: string; timeToken: string } {
  const tokens: string[] = [];
  const clean = summary.replace(TIME_TOKEN_RE, (match) => {
    tokens.push(match.replace(/^\(|\)$/g, '').trim());
    return '';
  });
  const timeToken = tokens.join(' / ').trim();
  // Collapse extra whitespace and dangling parens left behind
  const cleanTitle = clean
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { cleanTitle, timeToken };
}

// Unescape iCal text: \\n → newline, \, → comma, \; → semicolon, \\ → backslash
function unescapeIcal(s: string): string {
  return s
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

// Derive category / subCategory from the CATEGORIES property or calendar name.
// Falls back to empty string — callers may override with file-level metadata.
function deriveCategories(
  categoriesProp: string,
  calnameProp: string,
): { category: string; subCategory: string } {
  if (categoriesProp) {
    const parts = categoriesProp.split(';').map(s => s.trim()).filter(Boolean);
    return { category: parts[0] ?? '', subCategory: parts[1] ?? '' };
  }
  if (calnameProp) {
    return { category: calnameProp.trim(), subCategory: '' };
  }
  return { category: '', subCategory: '' };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface ParseOptions {
  /** Override category for all events from this file (e.g. the filename). */
  defaultCategory?: string;
  /** Override subCategory for all events from this file. */
  defaultSubCategory?: string;
}

export function parseIcal(icsText: string, opts: ParseOptions = {}): CalendarEvent[] {
  const text = unfold(icsText);
  const lines = text.split('\n');

  // Grab calendar-level X-WR-CALNAME if present
  const calName = extractProp(lines, 'X-WR-CALNAME');

  const events: CalendarEvent[] = [];
  let insideEvent = false;
  let eventLines: string[] = [];

  for (const line of lines) {
    if (line.trimEnd() === 'BEGIN:VEVENT') {
      insideEvent = true;
      eventLines = [];
      continue;
    }
    if (line.trimEnd() === 'END:VEVENT') {
      insideEvent = false;

      const rawSummary  = unescapeIcal(extractProp(eventLines, 'SUMMARY'));
      const rawStart    = extractProp(eventLines, 'DTSTART');
      const rawEnd      = extractProp(eventLines, 'DTEND');
      const rawCats     = extractProp(eventLines, 'CATEGORIES');
      const rawLocation = unescapeIcal(extractProp(eventLines, 'LOCATION'));

      const { category, subCategory } = deriveCategories(rawCats, calName);
      const { cleanTitle, timeToken } = extractTimeToken(rawSummary);

      events.push({
        id:           crypto.randomUUID(),
        category:     opts.defaultCategory    ?? category,
        subCategory:  opts.defaultSubCategory ?? subCategory,
        titleBlock:   cleanTitle,
        timeToken,
        location:     rawLocation,
        startDate:    parseIcalDate(rawStart),
        endDate:      parseIcalDate(rawEnd),
      });

      eventLines = [];
      continue;
    }
    if (insideEvent) {
      eventLines.push(line);
    }
  }

  return events;
}
