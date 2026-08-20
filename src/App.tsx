import React, { useState, useEffect, useCallback } from 'react';
import eLogoSrc from './assets/image.png';
import { Phone, MessageCircle, X, AlertTriangle, ChevronDown, ChevronUp, Settings, Info, Plus, Trash2, Loader2, Check, Calendar, Sparkles, RefreshCw, Link, Upload, FileText, Maximize2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import CalendarView from './CalendarView';
import { parseIcal } from './icalParser';

// ---------------------------------------------------------------------------
// Staff roster — canonical "F. Lastname" format.
// Add new staff here; the fuzzy resolver and autocomplete both use this list.
// ---------------------------------------------------------------------------
const STAFF_RAW: Array<{ first: string; last: string; display: string }> = [
  { first: "A", last: "Collins",       display: "A. Collins" },
  { first: "A", last: "Robinson",      display: "A. Robinson" },
  { first: "A", last: "Blunt",         display: "A. Blunt" },
  { first: "B", last: "Carmody",       display: "B. Carmody" },
  { first: "B", last: "Daniels",       display: "B. Daniels" },
  { first: "C", last: "Austin",        display: "C. Austin" },
  { first: "C", last: "Davies",        display: "C. Davies" },
  { first: "C", last: "DeVoe",         display: "C. DeVoe" },
  { first: "C", last: "Fryar",         display: "C. Fryar" },
  { first: "C", last: "Hyland",        display: "C. Hyland" },
  { first: "C", last: "Moore",         display: "C. Moore" },
  { first: "D", last: "Collins",       display: "D. Collins" },
  { first: "E", last: "Albers",        display: "E. Albers" },
  { first: "E", last: "Bodnar",        display: "E. Bodnar" },
  { first: "E", last: "Eldred",        display: "E. Eldred" },
  { first: "E", last: "Howard",        display: "E. Howard" },
  { first: "E", last: "Moore",         display: "E. Moore" },
  { first: "G", last: "Bennett",       display: "G. Bennett" },
  { first: "G", last: "Koeze",         display: "G. Koeze" },
  { first: "H", last: "Abdul-Jalaal",  display: "H. Abdul-Jalaal" },
  { first: "H", last: "Ellington",     display: "H. Ellington" },
  { first: "H", last: "Griffin",       display: "H. Griffin" },
  { first: "J", last: "Amos",          display: "J. Amos" },
  { first: "J", last: "Bastos",        display: "J. Bastos" },
  { first: "J", last: "Biondi",        display: "J. Biondi" },
  { first: "J", last: "Caballero",     display: "J. Caballero" },
  { first: "J", last: "Eldred",        display: "J. Eldred" },
  { first: "J", last: "George",        display: "J. George" },
  { first: "J", last: "Pippin",        display: "J. Pippin" },
  { first: "J", last: "Wang",          display: "J. Wang" },
  { first: "K", last: "Potter",        display: "K. Potter" },
  { first: "K", last: "Rodgers",       display: "K. Rodgers" },
  { first: "K", last: "Scott-Smith",   display: "K. Scott-Smith" },
  { first: "L", last: "Goldstein",     display: "L. Goldstein" },
  { first: "L", last: "Peterson",      display: "L. Peterson" },
  { first: "M", last: "McGowan",       display: "M. McGowan" },
  { first: "M", last: "McKeachie Smith", display: "M. McKeachie Smith" },
  { first: "M", last: "Plaines",       display: "M. Plaines" },
  { first: "M", last: "Schmidt",       display: "M. Schmidt" },
  { first: "M", last: "Thompson",      display: "M. Thompson" },
  { first: "M", last: "Viola",         display: "M. Viola" },
  { first: "N", last: "Davies",        display: "N. Davies" },
  { first: "P", last: "Brennan",       display: "P. Brennan" },
  { first: "P", last: "Spears",        display: "P. Spears" },
  { first: "S", last: "Castle",        display: "S. Castle" },
  { first: "S", last: "Galiger",       display: "S. Galiger" },
  { first: "S", last: "Slack",         display: "S. Slack" },
  { first: "T", last: "Pratt",         display: "T. Pratt" },
  { first: "T", last: "Rogers",        display: "T. Rogers" },
  { first: "W", last: "Blunt",         display: "W. Blunt" },
  { first: "W", last: "Kridel",        display: "W. Kridel" },
];

// Full first names → initial. Used to resolve "jessie" → "J", "george" → "G", etc.
const FIRST_NAME_MAP: Record<string, string> = {
  adrienne:"A", alan:"A", alex:"A", alexis:"A", alice:"A", allison:"A", amanda:"A", andrew:"A", anna:"A",
  ben:"B", benjamin:"B", beth:"B", bill:"B", bob:"B", brad:"B", brett:"B", brian:"B",
  cameron:"C", carl:"C", charles:"C", charlie:"C", charlotte:"C", chris:"C", claire:"C",
  dan:"D", daniel:"D", dave:"D", david:"D", diana:"D", don:"D",
  ed:"E", elizabeth:"E", ellen:"E", emily:"E", emma:"E", eric:"E",
  frank:"F", fred:"F",
  george:"G", gina:"G", grace:"G", grant:"G", greg:"G",
  hannah:"H", harold:"H", harry:"H", heather:"H", helen:"H", henry:"H",
  james:"J", jane:"J", janet:"J", jason:"J", jeff:"J", jennifer:"J", jenny:"J",
  jesse:"J", jessie:"J", jim:"J", joan:"J", john:"J", jon:"J", joseph:"J", josh:"J", julia:"J",
  kadeem:"K", kate:"K", katherine:"K", katie:"K", kelly:"K", ken:"K", kevin:"K", kim:"K", kirsten:"K",
  laura:"L", lauren:"L", lee:"L", lily:"L", linda:"L", lisa:"L", lucy:"L",
  maggie:"M", mark:"M", matt:"M", matthew:"M", meg:"M", megan:"M", michael:"M", michelle:"M", mike:"M", morgan:"M",
  nancy:"N", natalie:"N", nick:"N", noah:"N",
  olivia:"O", omar:"O",
  pat:"P", patricia:"P", paul:"P", peter:"P", phil:"P",
  rachel:"R", rebecca:"R", richard:"R", rob:"R", robert:"R", ryan:"R",
  sam:"S", samantha:"S", sarah:"S", sean:"S", sophia:"S", sophie:"S", steve:"S", steven:"S",
  tara:"T", taylor:"T", thomas:"T", tim:"T", timothy:"T", tom:"T", toby:"T",
  victor:"V", victoria:"V",
  will:"W", william:"W", wendy:"W",
};

// Lookup map: various informal keys → canonical display string.
// e.g. "george" → "J. George", "jessie george" → "J. George", "jessie g" → "J. George"
const STAFF_LOOKUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const s of STAFF_RAW) {
    const init = s.first.toLowerCase();
    const last = s.last.toLowerCase();
    map[`${init}. ${last}`] = s.display;   // "j. george"
    map[`${init} ${last}`]  = s.display;   // "j george"
    if (!map[last]) map[last] = s.display; // "george" (first occurrence wins for ambiguous)
  }
  for (const [fullFirst, init] of Object.entries(FIRST_NAME_MAP)) {
    const matches = STAFF_RAW.filter(s => s.first.toLowerCase() === init.toLowerCase());
    if (matches.length === 1 && !map[fullFirst]) {
      map[fullFirst] = matches[0].display; // "jessie" → unambiguous
    }
    for (const s of matches) {
      const last = s.last.toLowerCase();
      map[`${fullFirst} ${last}`]      = s.display; // "jessie george"
      map[`${fullFirst} ${last[0]}`]   = s.display; // "jessie g"
    }
  }
  // Spelling aliases — common misspellings / alternate spellings mapped to canonical
  const ALIASES: Record<string, string> = {
    "rogers":        "K. Rodgers",
    "k. rogers":     "K. Rodgers",
    "kadeem rogers": "K. Rodgers",
  };
  for (const [alias, display] of Object.entries(ALIASES)) {
    map[alias] = display;
  }
  return map;
})();

function resolveStaffName(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\.$/, '');
  return STAFF_LOOKUP[key] ?? raw.trim();
}

const STAFF: string[] = [
  "A. & D. Collins",
  ...STAFF_RAW.map(s => s.display),
].sort((a, b) => {
  const lastA = a.split('. ')[1] ?? a;
  const lastB = b.split('. ')[1] ?? b;
  return lastA.localeCompare(lastB);
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const DORM_NAMES = ["Anderson", "Berkeley", "Dalrymple", "Evans", "Harrison", "Hoxton", "Hummel", "McGuire", "North", "West"] as const;

interface DayShift {
  ado: string;
  campusSupervisor: { name: string; phone: string };
  activitiesLead: { name: string; phone: string };
  dorms: string[];
}

interface Activity {
  id: string;
  time: string;
  event: string;
}

interface WeekendData {
  weekendId: string;
  dates: string;
  ado: { current: string };
  dutyTeam: { friday: DayShift; saturday: DayShift; sunday: DayShift };
  contacts: {
    adoPhone: string;
    other: { name: string; phone: string }[];
    dorms: { name: string; phone: string }[];
  };
  signInTimes: { day: string; details: string }[];
  specialActivities: Activity[];
  campusHours: {
    label: string;
    friday: string;
    saturday: string;
    sunday: string;
    note: string;
  }[];
  fridayDate: string;
  saturdayDate: string;
  sundayDate: string;
}

// ---------------------------------------------------------------------------
// Static / hardcoded data that never changes week to week
// ---------------------------------------------------------------------------
const STATIC_CONTACTS = {
  other: [
    { name: "CS Duty Phone", phone: "703-517-6766" },
    { name: "CS 2 Phone", phone: "703-517-6979" },
    { name: "Security", phone: "703-946-0359" },
    { name: "Health Center", phone: "703-635-6439" },
  ],
  dorms: [
    { name: "Anderson", phone: "571-271-1771" },
    { name: "Berkeley", phone: "571-271-2696" },
    { name: "Dalrymple", phone: "571-271-1769" },
    { name: "Evans", phone: "571-271-1770" },
    { name: "Harrison", phone: "571-271-2254" },
    { name: "Hoxton", phone: "571-271-4007" },
    { name: "Hummel", phone: "571-271-4381" },
    { name: "McGuire", phone: "571-271-4382" },
    { name: "North", phone: "571-271-7285" },
    { name: "West", phone: "571-271-8574" },
  ],
};

const STATIC_SIGN_IN_TIMES = [
  { day: "Friday", details: "Seniors: 11:30 PM | Underclassmen: 10:30 PM" },
  { day: "Saturday", details: "All Students: 5:00–5:45 PM & 11:00 PM" },
  { day: "Sunday", details: "All Students: 8:00 PM" },
];

const STATIC_CAMPUS_HOURS = [
  { label: "Sign-ins", friday: "Seniors: 11:30 PM | Underclassmen: 10:30 PM", saturday: "All Students: 5:00–5:45 PM & 11:00 PM", sunday: "All Students: 8:00 PM", note: "" },
  { label: "Library", friday: "7:30 AM – 5:00 PM", saturday: "12:00 PM – 8:00 PM", sunday: "8:00 AM – 10:00 PM", note: "" },
  { label: "Post Office", friday: "9:00 AM – 4:00 PM", saturday: "10:00 AM – 1:00 PM", sunday: "10:00 AM – 1:00 PM", note: "" },
  { label: "Center", friday: "5:30 PM – Sign-in", saturday: "11:00 AM – Sign-in", sunday: "8:00 AM – Sign-in", note: "" },
  { label: "Food Deliveries", friday: "6:00 PM – 10:00 PM", saturday: "8:00 AM – 10:30 PM", sunday: "8:00 AM – 7:00 PM", note: "" },
  { label: "Coed Visi (9th)", friday: "9:00 PM – 10:15 PM", saturday: "7:30 PM – 10:45 PM", sunday: "None", note: "One guest; 9th graders only" },
  { label: "Coed Visi (10th–12th)", friday: "9:00 PM – 10:15 PM", saturday: "7:30 PM – 10:45 PM", sunday: "None", note: "" },
];

// ---------------------------------------------------------------------------
// Admin password (simple client-side gate)
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD = "ehs2026";

// ---------------------------------------------------------------------------
// DB row → WeekendData
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToWeekendData(row: any): WeekendData {
  const makeDayShift = (prefix: string): DayShift => ({
    ado: row[`${prefix}_ado`] ?? '',
    campusSupervisor: { name: row[`${prefix}_cs_name`] ?? '', phone: row[`${prefix}_cs_phone`] ?? '' },
    activitiesLead: { name: row[`${prefix}_activities_lead_name`] ?? '', phone: row[`${prefix}_activities_lead_phone`] ?? '' },
    dorms: (row[`${prefix}_dorms`] as string[]) ?? Array(10).fill(''),
  });

  return {
    weekendId: row.weekend_id ?? '',
    dates: row.dates ?? '',
    ado: { current: row.friday_ado ?? '' },
    dutyTeam: {
      friday: makeDayShift('friday'),
      saturday: makeDayShift('saturday'),
      sunday: makeDayShift('sunday'),
    },
    contacts: {
      adoPhone: row.ado_phone ?? '',
      ...STATIC_CONTACTS,
    },
    signInTimes: STATIC_SIGN_IN_TIMES,
    specialActivities: ((row.special_activities as Activity[]) ?? []).map(a => ({ id: a.id ?? crypto.randomUUID(), time: a.time, event: a.event })),
    campusHours: STATIC_CAMPUS_HOURS,
    fridayDate: row.friday_date ?? '',
    saturdayDate: row.saturday_date ?? '',
    sundayDate: row.sunday_date ?? '',
  };
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------
function parseDayDates(data: WeekendData) {
  const parse = (d: string) => {
    if (!d) return null;
    const [year, month, day] = d.split('-').map(Number);
    return { year, month, date: day };
  };
  return {
    friday: parse(data.fridayDate),
    fri: parse(data.fridayDate),
    saturday: parse(data.saturdayDate),
    sat: parse(data.saturdayDate),
    sunday: parse(data.sundayDate),
    sun: parse(data.sundayDate),
  };
}

function parseTimeOnDay(timeStr: string, dayKey: string, dayDates: ReturnType<typeof parseDayDates>): Date | null {
  const d = dayDates[dayKey.toLowerCase() as keyof typeof dayDates];
  if (!d) return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return new Date(d.year, d.month - 1, d.date, hours, minutes, 0, 0);
}

function extractTimes(str: string): string[] {
  return (str.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi) ?? []);
}

function activityCutoff(item: Activity, dayDates: ReturnType<typeof parseDayDates>): Date | null {
  const dayMatch = item.time.match(/^(Sat|Sun|Fri)/i);
  if (!dayMatch) return null;
  const times = extractTimes(item.time);
  if (!times.length) return null;
  const end = parseTimeOnDay(times[times.length - 1], dayMatch[1], dayDates);
  return end ? new Date(end.getTime() + 30 * 60 * 1000) : null;
}

function isPast(cutoff: Date | null, now: Date): boolean {
  return cutoff !== null && now > cutoff;
}

function currentAdoName(data: WeekendData, now: Date): string {
  const dayDates = parseDayDates(data);
  const sat = dayDates.saturday;
  const sun = dayDates.sunday;
  const fri = dayDates.friday;
  if (!sat || !sun || !fri) return data.dutyTeam.friday.ado;
  const satNoon = new Date(sat.year, sat.month - 1, sat.date, 12, 0, 0);
  const sunNoon = new Date(sun.year, sun.month - 1, sun.date, 12, 0, 0);
  const friStart = new Date(fri.year, fri.month - 1, fri.date, 0, 0, 0);
  if (now >= sunNoon) return data.dutyTeam.sunday.ado;
  if (now >= satNoon) return data.dutyTeam.saturday.ado;
  if (now >= friStart) return data.dutyTeam.friday.ado;
  return data.dutyTeam.friday.ado;
}

// ---------------------------------------------------------------------------
// Name formatting helpers
// ---------------------------------------------------------------------------
function stripTiming(s: string): string {
  return s.replace(/\s*(until|after)\s+[\w:.]+(?:pm|am)?/gi, '').trim();
}

function initLast(raw: string): string {
  // Try fuzzy resolution first — "jessie george" → "J. George"
  const resolved = resolveStaffName(raw.trim());
  if (resolved !== raw.trim()) return resolved;
  // Fallback: derive "F. Lastname" from whatever was typed
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const rest = parts.slice(1).join(' ');
  if (/^[A-Z]\.$/.test(first)) return `${first} ${rest}`;
  return `${first[0].toUpperCase()}. ${rest}`;
}

function formatName(raw: string): string {
  return raw.split('/').map(s => initLast(stripTiming(s.trim()))).join(' / ');
}

// ---------------------------------------------------------------------------
// Day Leave status helpers
// ---------------------------------------------------------------------------

interface DayLeaveSlot {
  day: number; // 0=Sun, 5=Fri, 6=Sat
  startH: number; startM: number;
  endH: number;   endM: number;
  location: string;
}

// Full schedule keyed by location. Times in 24h for easy comparison.
const DAY_LEAVE_SLOTS: DayLeaveSlot[] = [
  // Stewart Day Leave Desk
  { day: 5, startH: 18, startM: 0,  endH: 21, endM: 0,  location: 'Stewart Desk' },
  { day: 6, startH: 10, startM: 0,  endH: 16, endM: 0,  location: 'Stewart Desk' },
  { day: 6, startH: 18, startM: 0,  endH: 21, endM: 0,  location: 'Stewart Desk' },
  { day: 0, startH: 10, startM: 0,  endH: 18, endM: 0,  location: 'Stewart Desk' },
  // On Dorm
  { day: 5, startH: 21, startM: 0,  endH: 22, endM: 30, location: 'On Dorm' },
  { day: 6, startH: 17, startM: 0,  endH: 17, endM: 45, location: 'On Dorm' },
  { day: 6, startH: 21, startM: 0,  endH: 22, endM: 30, location: 'On Dorm' },
  // Dean's Office
  { day: 5, startH: 12, startM: 0,  endH: 16, endM: 0,  location: "Dean's Office" },
];

function toMinutes(h: number, m: number) { return h * 60 + m; }

function fmtSlotTime(h: number, m: number) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${hh} ${ampm}` : `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

function findNextSlot(dow: number, afterMin: number): { location: string; timeText: string } | null {
  const dayOrder = [5, 6, 0];
  const todayIdx = dayOrder.indexOf(dow);
  if (todayIdx === -1) return null;
  const dayLabels: Record<number, string> = { 5: 'Fri', 6: 'Sat', 0: 'Sun' };
  for (let i = 0; i < dayOrder.length - todayIdx; i++) {
    const d = dayOrder[todayIdx + i];
    const candidates = DAY_LEAVE_SLOTS
      .filter(s => s.day === d && (i > 0 || toMinutes(s.startH, s.startM) > afterMin))
      .sort((a, b) => toMinutes(a.startH, a.startM) - toMinutes(b.startH, b.startM));
    if (candidates.length > 0) {
      const s = candidates[0];
      const dayPrefix = i > 0 ? `${dayLabels[d]} ` : '';
      return { location: s.location, timeText: `${dayPrefix}${fmtSlotTime(s.startH, s.startM)}` };
    }
  }
  return null;
}

function findNextSlotAcrossWeekend(dow: number, nowMin: number): { location: string; timeText: string } | null {
  // For non-weekend days, find the next upcoming weekend slot
  const dayOrder = [5, 6, 0];
  const dayLabels: Record<number, string> = { 5: 'Fri', 6: 'Sat', 0: 'Sun' };
  for (const d of dayOrder) {
    const candidates = DAY_LEAVE_SLOTS
      .filter(s => s.day === d)
      .sort((a, b) => toMinutes(a.startH, a.startM) - toMinutes(b.startH, b.startM));
    if (candidates.length > 0) {
      const s = candidates[0];
      return { location: s.location, timeText: `${dayLabels[d]} ${fmtSlotTime(s.startH, s.startM)}` };
    }
  }
  return null;
}

function getDayLeaveInfo(now: Date): {
  available: boolean;
  location: string;
  untilText: string;
  nextLocation: string;
  nextTimeText: string;
} {
  const dow = now.getDay();

  if (dow !== 0 && dow !== 5 && dow !== 6) {
    const next = findNextSlotAcrossWeekend(dow, 0);
    return {
      available: false,
      location: '',
      untilText: '',
      nextLocation: next?.location ?? '',
      nextTimeText: next?.timeText ?? '',
    };
  }

  const nowMin = toMinutes(now.getHours(), now.getMinutes());

  const current = DAY_LEAVE_SLOTS.find(s =>
    s.day === dow &&
    nowMin >= toMinutes(s.startH, s.startM) &&
    nowMin <  toMinutes(s.endH,   s.endM)
  );

  if (current) {
    const untilText = `until ${fmtSlotTime(current.endH, current.endM)}`;
    const after = findNextSlot(dow, toMinutes(current.endH, current.endM));
    return {
      available: true,
      location: current.location,
      untilText,
      nextLocation: after?.location ?? '',
      nextTimeText: after?.timeText ?? '',
    };
  }

  const next = findNextSlot(dow, nowMin);
  if (!next) {
    return { available: false, location: '', untilText: '', nextLocation: '', nextTimeText: '' };
  }

  return {
    available: false,
    location: '',
    untilText: '',
    nextLocation: next.location,
    nextTimeText: next.timeText,
  };
}

// ---------------------------------------------------------------------------
// Menu preview
// ---------------------------------------------------------------------------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface MenuData {
  meal: 'lunch' | 'dinner';
  date: string;
  dateNotFound: boolean;
  items: Array<{ label: string; value: string }>;
  fullMenuUrl: string;
  lunchUrl: string;
  dinnerUrl: string;
}

const LUNCH_FULL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBl5DZC8B5QifnbVsFQDqZ0pLeoHL-TE2Z_3-WvzLSRtgjUQjn0jmTSI9IUMEqnufxPD7jP7Ky0y0z/pubhtml';
const DINNER_FULL_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSE_IkMGx1BOtazOic5f4Dcy_j6S4h_KSb-gsDNha4wf6wpgmN35aDCytFfD-cOoHpQyIF8f2g5UsQh/pubhtml';

function MenuPreview() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const now = new Date();
        const etHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }), 10);
        const slotDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        if (etHour >= 21) slotDate.setDate(slotDate.getDate() + 1);
        const slot = `${slotDate.getFullYear()}-${slotDate.getMonth()}-${slotDate.getDate()}-${etHour >= 13 && etHour < 21 ? 'dinner' : 'lunch'}`;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-menu?slot=${slot}`, {
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        });
        if (!res.ok) throw new Error('bad response');
        const data: MenuData = await res.json();
        if (!cancelled) setMenu(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const menuButtons = (
    <div className="flex gap-2 mt-4 pt-3 border-t border-stone-100">
      <a
        href={LUNCH_FULL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 text-center text-xs font-semibold uppercase tracking-wider py-2 border border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 transition"
      >
        Weekend Lunch Menu ↗
      </a>
      <a
        href={DINNER_FULL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 text-center text-xs font-semibold uppercase tracking-wider py-2 border border-stone-300 text-stone-600 hover:bg-stone-50 hover:border-stone-400 transition"
      >
        Weekend Dinner Menu ↗
      </a>
    </div>
  );

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center py-6 text-stone-400">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span className="text-xs">Loading menu…</span>
        </div>
        {menuButtons}
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div>
        <p className="text-xs text-stone-400 py-4 text-center">Menu preview unavailable</p>
        {menuButtons}
      </div>
    );
  }

  const mealLabel = menu.meal === 'lunch' ? 'Lunch' : 'Dinner';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-xs font-serif font-bold uppercase tracking-wider text-stone-700">
          {mealLabel} · {menu.date}
        </span>
      </div>

      {menu.dateNotFound ? (
        <p className="text-xs text-stone-400 italic">Menu not updated yet for {menu.date}.</p>
      ) : menu.items.length === 0 ? (
        <p className="text-xs text-stone-400 italic">No menu data available for {menu.date}.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {menu.items.map((item) => (
            <div key={item.label} className="py-2.5 flex items-start gap-3">
              <span className="text-xs text-stone-400 uppercase tracking-wide w-28 shrink-0 pt-px font-medium">
                {item.label}
              </span>
              <span className="text-xs text-stone-800 font-medium leading-snug">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {menuButtons}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------
function SectionCard({ title, children, defaultOpen = false, open: controlledOpen, onOpenChange }: { title: string; children: React.ReactNode; defaultOpen?: boolean; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const toggle = () => {
    if (onOpenChange) onOpenChange(!isOpen);
    else setInternalOpen(o => !o);
  };
  return (
    <div className="border border-maroon-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={toggle}
        className="w-full bg-maroon-700 px-4 py-2.5 flex items-center justify-between hover:bg-maroon-800 transition"
      >
        <h2 className="text-xs font-bold uppercase tracking-widest text-white font-serif">{title}</h2>
        {isOpen ? <ChevronUp size={14} className="text-white shrink-0" /> : <ChevronDown size={14} className="text-white shrink-0" />}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

function ResponsiveName({ raw, className }: { raw: string; className?: string }) {
  return (
    <span className={`text-sm font-serif text-stone-800 ${className ?? ''}`}>
      {formatName(raw)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Day Leave Schedule Modal
// ---------------------------------------------------------------------------

type DayLeaveEntry =
  | { kind: 'available'; time: string; location: string }
  | { kind: 'unavailable'; time: string };

const DAY_LEAVE_SCHEDULE: { day: string; slots: DayLeaveEntry[] }[] = [
  {
    day: 'Friday',
    slots: [
      { kind: 'unavailable', time: 'Before 12:00 PM' },
      { kind: 'available',   time: '12:00 PM – 4:00 PM',  location: "Dean's Office" },
      { kind: 'unavailable', time: '4:00 PM – 6:00 PM' },
      { kind: 'available',   time: '6:00 PM – 9:00 PM',   location: 'Stewart Desk' },
      { kind: 'available',   time: '9:00 PM – 10:30 PM',  location: 'On Dorm' },
      { kind: 'unavailable', time: 'After 10:30 PM' },
    ],
  },
  {
    day: 'Saturday',
    slots: [
      { kind: 'unavailable', time: 'Before 10:00 AM' },
      { kind: 'available',   time: '10:00 AM – 4:00 PM',  location: 'Stewart Desk' },
      { kind: 'unavailable', time: '4:00 PM – 5:00 PM' },
      { kind: 'available',   time: '5:00 PM – 5:45 PM',   location: 'On Dorm' },
      { kind: 'available',   time: '6:00 PM – 9:00 PM',   location: 'Stewart Desk' },
      { kind: 'available',   time: '9:00 PM – 10:30 PM',  location: 'On Dorm' },
      { kind: 'unavailable', time: 'After 10:30 PM' },
    ],
  },
  {
    day: 'Sunday',
    slots: [
      { kind: 'unavailable', time: 'Before 10:00 AM' },
      { kind: 'available',   time: '10:00 AM – 6:00 PM',  location: 'Stewart Desk' },
      { kind: 'unavailable', time: 'After 6:00 PM' },
    ],
  },
];

const LOCATION_PREPOSITION: Record<string, string> = {
  'Stewart Desk': 'in Stewart',
  'On Dorm':      'on dorm',
  "Dean's Office": "at the Dean's Office",
};

const LOCATION_COLORS: Record<string, { bg: string; border: string; dot: string; text: string; pill: string }> = {
  'Stewart Desk': {
    bg: 'bg-sky-50', border: 'border-sky-200', dot: 'bg-sky-500', text: 'text-sky-800',
    pill: 'bg-sky-100 text-sky-800 border border-sky-200',
  },
  'On Dorm': {
    bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-800',
    pill: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  "Dean's Office": {
    bg: 'bg-stone-50', border: 'border-stone-200', dot: 'bg-stone-400', text: 'text-stone-700',
    pill: 'bg-stone-100 text-stone-700 border border-stone-200',
  },
};

function DayLeaveModal({ now, onClose }: { now: Date; onClose: () => void }) {
  const { available, location: currentLoc } = getDayLeaveInfo(now);
  const dow = now.getDay();
  const dayName = dow === 5 ? 'Friday' : dow === 6 ? 'Saturday' : dow === 0 ? 'Sunday' : null;

  const fmtTime = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return m === 0 ? `${hh} ${ampm}` : `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm border-2 border-maroon-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-maroon-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-white" />
            <span className="text-white font-serif font-bold uppercase text-xs tracking-widest">Weekend Day Leave</span>
          </div>
          <button onClick={onClose} className="text-maroon-300 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(LOCATION_COLORS).map(([loc, colors]) => (
              <span key={loc} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                {loc}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Unavailable
            </span>
          </div>

          {DAY_LEAVE_SCHEDULE.map(({ day, slots }) => {
            const isToday = day === dayName;
            return (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`text-xs font-serif font-bold uppercase tracking-widest ${isToday ? 'text-maroon-700' : 'text-stone-500'}`}>
                    {day}
                  </h3>
                  {isToday && (
                    <span className="text-xs font-serif text-maroon-500 font-medium">— today</span>
                  )}
                </div>
                <div className="space-y-1">
                  {slots.map((slot) => {
                    if (slot.kind === 'unavailable') {
                      return (
                        <div
                          key={slot.time}
                          className="flex items-center justify-between px-3 py-2 border border-red-100 bg-red-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0 bg-red-300" />
                            <span className="text-xs font-serif text-red-500">Unavailable</span>
                          </div>
                          <span className="text-xs font-serif text-red-300 shrink-0 ml-3">{slot.time}</span>
                        </div>
                      );
                    }

                    const colors = LOCATION_COLORS[slot.location] ?? LOCATION_COLORS['Stewart Desk'];
                    const match = slot.time.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)\s*[–\-]\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i);
                    let isActive = false;
                    if (isToday && match) {
                      const parseMin = (t: string, ap: string) => {
                        const [hStr, mStr = '0'] = t.split(':');
                        let h = parseInt(hStr);
                        const m = parseInt(mStr);
                        if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
                        if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
                        return h * 60 + m;
                      };
                      const slotStart = parseMin(match[1], match[2]);
                      const slotEnd   = parseMin(match[3], match[4]);
                      isActive = available && slot.location === currentLoc && nowMin >= slotStart && nowMin < slotEnd;
                    }
                    return (
                      <div
                        key={slot.time}
                        className={`flex items-center justify-between px-3 py-2 border ${
                          isActive ? 'border-emerald-300 bg-emerald-50' : `${colors.border} ${colors.bg}`
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : colors.dot}`} />
                          <span className={`text-xs font-serif font-medium ${isActive ? 'text-emerald-800' : colors.text}`}>
                            {slot.location}
                          </span>
                          {isActive && (
                            <span className="text-xs font-serif text-emerald-600">· now</span>
                          )}
                        </div>
                        <span className={`text-xs font-serif shrink-0 ml-3 ${isActive ? 'text-emerald-700' : colors.text} opacity-70`}>
                          {slot.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-stone-100 px-5 py-3">
          <button
            onClick={onClose}
            className="w-full border border-stone-300 py-2.5 text-xs font-serif font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DayLeaveStatusPill({ now }: { now: Date }) {
  const [showModal, setShowModal] = useState(false);
  const { available, location, untilText, nextLocation, nextTimeText } = getDayLeaveInfo(now);

  const locColors = available ? LOCATION_COLORS[location] : null;

  const pill = available ? (
    <button
      onClick={() => setShowModal(true)}
      className={`w-full flex items-center justify-between px-3 py-2.5 border transition-colors text-left ${
        locColors
          ? `${locColors.border} ${locColors.bg} hover:opacity-90`
          : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${locColors?.dot ?? 'bg-emerald-500'}`} />
        <div className="min-w-0">
          <span className={`text-xs font-serif font-bold uppercase tracking-wider ${locColors?.text ?? 'text-emerald-800'}`}>
            Day Leave Available
          </span>
          <span className={`block text-xs font-serif leading-tight ${locColors?.text ?? 'text-emerald-700'} opacity-80`}>
            {location}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className={`text-xs font-serif ${locColors?.text ?? 'text-emerald-600'} opacity-70`}>
          {untilText}
        </span>
        <span className={`flex items-center justify-center w-8 h-8 rounded-full border shadow-xl ${locColors?.border ?? 'border-emerald-300'} ${locColors?.text ?? 'text-emerald-600'} opacity-70`}>
          <Maximize2 size={20} />
        </span>
      </div>
    </button>
  ) : (
    <button
      onClick={() => setShowModal(true)}
      className="w-full flex items-center justify-between px-3 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors text-left"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-block w-2 h-2 rounded-full bg-red-400 shrink-0" />
        <div className="min-w-0">
          <span className="text-xs font-serif font-bold uppercase tracking-wider text-red-800">
            Day Leaves Unavailable
          </span>
          {nextLocation && nextTimeText && (
            <span className="block text-xs font-serif text-red-500 leading-tight">
              Next available {LOCATION_PREPOSITION[nextLocation] ?? `at ${nextLocation}`}, {nextTimeText}
            </span>
          )}
        </div>
      </div>
      <span className="flex items-center justify-center w-8 h-8 rounded-full border border-red-300 text-red-400 shrink-0 ml-2 shadow-xl">
        <Maximize2 size={20} />
      </span>
    </button>
  );

  return (
    <>
      {pill}
      {showModal && <DayLeaveModal now={now} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Duty Team section
// ---------------------------------------------------------------------------
function DutyTeamSection({ data }: { data: WeekendData }) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const days: Array<{ key: keyof WeekendData['dutyTeam']; label: string }> = [
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  return (
    <div className="space-y-1.5">
      {days.map(({ key, label }) => {
        const isOpen = openDay === key;
        const day = data.dutyTeam[key];
        return (
          <div key={key} className="border border-stone-200">
            <button
              onClick={() => setOpenDay(isOpen ? null : key)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-50 transition"
            >
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-stone-700">{label}</span>
              {isOpen ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
            </button>
            {isOpen && (
              <div className="border-t border-stone-100 px-3 pb-3 pt-2 space-y-0">
                <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                  <span className="text-xs font-serif text-stone-400 uppercase">ADO</span>
                  <ResponsiveName raw={day.ado} />
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                  <span className="text-xs font-serif text-stone-400 uppercase">Campus Supervisor</span>
                  <div className="flex items-center gap-2.5">
                    <ResponsiveName raw={day.campusSupervisor.name} />
                    <a href={`tel:${day.campusSupervisor.phone.replace(/-/g, '')}`} className="text-stone-400 hover:text-maroon-700 transition">
                      <Phone size={12} />
                    </a>
                    <a href={`sms:${day.campusSupervisor.phone.replace(/-/g, '')}`} className="text-stone-400 hover:text-maroon-700 transition">
                      <MessageCircle size={13} />
                    </a>
                  </div>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                  <span className="text-xs font-serif text-stone-400 uppercase">Activities Lead</span>
                  <div className="flex items-center gap-2.5">
                    <ResponsiveName raw={day.activitiesLead.name} />
                    <a href={`tel:${day.activitiesLead.phone.replace(/-/g, '')}`} className="text-stone-400 hover:text-maroon-700 transition">
                      <Phone size={12} />
                    </a>
                    <a href={`sms:${day.activitiesLead.phone.replace(/-/g, '')}`} className="text-stone-400 hover:text-maroon-700 transition">
                      <MessageCircle size={13} />
                    </a>
                  </div>
                </div>
                {DORM_NAMES.map((dorm, i) => {
                  const dormContact = data.contacts.dorms.find(d => d.name === dorm);
                  return (
                    <div key={dorm} className="flex justify-between items-center py-1.5 border-b border-stone-100 last:border-0">
                      <span className="text-xs font-serif text-stone-400 uppercase">{dorm}</span>
                      <div className="flex items-center gap-2.5">
                        <ResponsiveName raw={day.dorms[i] ?? ''} />
                        {dormContact && (
                          <>
                            <a href={`tel:${dormContact.phone.replace(/-/g, '')}`} className="text-stone-400 hover:text-maroon-700 transition">
                              <Phone size={12} />
                            </a>
                            <a href={`sms:${dormContact.phone.replace(/-/g, '')}`} className="text-stone-400 hover:text-maroon-700 transition">
                              <MessageCircle size={13} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campus Hours section
// ---------------------------------------------------------------------------
function getDefaultCampusDay(now: Date, data: WeekendData): 'friday' | 'saturday' | 'sunday' {
  const dayDates = parseDayDates(data);
  const fri = dayDates.friday;
  const sat = dayDates.saturday;
  const sun = dayDates.sunday;
  if (fri && sat && sun) {
    // Flip to Saturday after Friday 11:30 PM (senior sign-in)
    const friFlip = new Date(fri.year, fri.month - 1, fri.date, 23, 30, 0);
    // Flip to Sunday after Saturday 11:00 PM (sign-in)
    const satFlip = new Date(sat.year, sat.month - 1, sat.date, 23, 0, 0);
    const sunStart = new Date(sun.year, sun.month - 1, sun.date, 0, 0, 0);
    const sunEnd = new Date(sun.year, sun.month - 1, sun.date, 23, 59, 59);
    if (now >= sunStart && now <= sunEnd) return 'sunday';
    if (now >= satFlip) return 'sunday';
    const satStart = new Date(sat.year, sat.month - 1, sat.date, 0, 0, 0);
    if (now >= satStart && now < satFlip) return 'saturday';
    if (now >= friFlip) return 'saturday';
    const friStart = new Date(fri.year, fri.month - 1, fri.date, 0, 0, 0);
    if (now >= friStart) return 'friday';
  }
  // Fallback: use day of week
  const dow = now.getDay();
  if (dow === 0) return 'sunday';
  if (dow === 6) return 'saturday';
  return 'friday';
}

function CampusHoursSection({ data, now }: { data: WeekendData; now: Date }) {
  const [openDay, setOpenDay] = useState<string | null>(() => getDefaultCampusDay(now, data));

  const dayDates = parseDayDates(data);

  // A day is expired after 11:30 PM on that day
  function isDayExpired(key: 'friday' | 'saturday' | 'sunday'): boolean {
    const d = dayDates[key];
    if (!d) return false;
    const cutoff = new Date(d.year, d.month - 1, d.date, 23, 30, 0);
    return now >= cutoff;
  }

  const currentDay = getDefaultCampusDay(now, data);

  const allDays: Array<{ key: 'friday' | 'saturday' | 'sunday'; label: string }> = [
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  // Build ordered list: current day first, then the rest in Fri/Sat/Sun order
  const ordered = [
    allDays.find(d => d.key === currentDay)!,
    ...allDays.filter(d => d.key !== currentDay),
  ];

  const visibleDays = ordered.filter(d => !isDayExpired(d.key));

  if (visibleDays.length === 0) {
    return <p className="text-xs font-serif text-stone-400 py-1">None remaining</p>;
  }

  return (
    <div className="space-y-1.5">
      {visibleDays.map(({ key, label }) => {
        const isOpen = openDay === key;
        return (
          <div key={key} className="border border-stone-200">
            <button
              onClick={() => setOpenDay(isOpen ? null : key)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-50 transition"
            >
              <span className="text-xs font-serif font-bold uppercase tracking-wider text-stone-700">{label}</span>
              {isOpen ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
            </button>
            {isOpen && (
              <div className="border-t border-stone-100 px-3 pb-3 pt-2">
                {data.campusHours.map(h => {
                  const value = h[key];
                  if (!value || value === 'NONE') return null;
                  return (
                    <div key={h.label} className="grid grid-cols-[auto_1fr] items-start gap-x-3 py-1.5 border-b border-stone-100 last:border-0">
                      <div className="flex flex-col shrink-0">
                        <span className="text-xs font-serif text-stone-400 uppercase leading-tight">{h.label}</span>
                        {h.note && <span className="text-xs font-serif text-stone-400 italic">{h.note}</span>}
                      </div>
                      <div className="text-sm font-serif text-stone-800 text-right">
                        {value.split('|').map((part, i) => (
                          <span key={i} className="block">{part.trim()}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADO Modal
// ---------------------------------------------------------------------------
function AdoModal({ data, onClose }: { data: WeekendData; onClose: () => void }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const ready = countdown === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm border-2 border-maroon-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-maroon-700 px-5 py-4 flex items-center justify-between">
          <span className="text-white font-serif font-bold uppercase text-xs tracking-widest">Contact the ADO</span>
          <button onClick={onClose} className="text-maroon-300 hover:text-white transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm font-serif text-stone-800 leading-relaxed mb-6">
            Please confirm that you need to speak to the ADO, and that the answer to your question is not available here.
          </p>
          <div className="border border-stone-200 bg-stone-50 p-3 mb-6">
            <p className="text-xs font-serif text-stone-500 uppercase font-bold mb-2">Non-emergencies include:</p>
            <ul className="text-xs font-serif text-stone-600 space-y-1">
              {["Questions about sign in times, day leaves, or food delivery", "Schedule or activities questions", "Lost items, general requests"].map((item) => (
                <li key={item} className="flex gap-2"><span className="shrink-0">•</span><span>{item}</span></li>
              ))}
            </ul>
          </div>
          {!ready && (
            <div className="flex items-center justify-center mb-6">
              <span className="text-6xl font-serif font-bold text-maroon-700 tabular-nums">{countdown}</span>
            </div>
          )}
          <div className="flex gap-3 items-stretch">
            <a
              href={ready ? `tel:${data.contacts.adoPhone.replace(/-/g, '')}` : undefined}
              onClick={!ready ? (e) => e.preventDefault() : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded transition-all ${ready ? 'opacity-100' : 'opacity-30 cursor-not-allowed'}`}
              style={{ backgroundColor: '#34C759' }}
            >
              <Phone size={20} className="text-white" />
              <span className="text-white text-xs font-serif font-bold uppercase tracking-wider">Call</span>
            </a>
            <a
              href={ready ? `sms:${data.contacts.adoPhone.replace(/-/g, '')}` : undefined}
              onClick={!ready ? (e) => e.preventDefault() : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded transition-all ${ready ? 'opacity-100' : 'opacity-30 cursor-not-allowed'}`}
              style={{ backgroundColor: '#34C759' }}
            >
              <MessageCircle size={20} className="text-white" />
              <span className="text-white text-xs font-serif font-bold uppercase tracking-wider">Text</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed sync
// ---------------------------------------------------------------------------
interface CalendarFeed {
  id: string;
  role: 'ado' | 'cs' | 'dorm';
  dorm_name: string | null;
  label: string;
  ical_url: string;
}

const FEED_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ado',  label: 'ADO' },
  { value: 'cs',   label: 'Campus Supervisor' },
  ...DORM_NAMES.map(d => ({ value: `dorm:${d}`, label: `Dorm — ${d}` })),
];

function roleKey(feed: CalendarFeed): string {
  return feed.role === 'dorm' ? `dorm:${feed.dorm_name}` : feed.role;
}

function roleFromKey(key: string): { role: 'ado' | 'cs' | 'dorm'; dorm_name: string | null } {
  if (key.startsWith('dorm:')) return { role: 'dorm', dorm_name: key.slice(5) };
  return { role: key as 'ado' | 'cs', dorm_name: null };
}

// Extract the first staff name from an event title.
// Calendar events tend to have titles like "J. Pippin — Anderson Duty" or "J. George ADO"
// We just grab the leading name token (up to em-dash, colon, hyphen, or end).
function extractNameFromTitle(title: string): string {
  const clean = title.split(/[—–\-:|]/)[0].trim();
  return resolveStaffName(clean) || clean;
}

// Find the event whose date range covers the given weekend date (ISO yyyy-mm-dd).
// Returns the extracted name, or '' if none found.
function nameForDate(events: Array<{ titleBlock: string; startDate: string | null; endDate: string | null }>, dateStr: string): string {
  if (!dateStr) return '';
  const target = new Date(dateStr + 'T12:00:00');
  for (const ev of events) {
    if (!ev.startDate) continue;
    const start = new Date(ev.startDate);
    const end = ev.endDate ? new Date(ev.endDate) : start;
    if (target >= start && target <= end) {
      return extractNameFromTitle(ev.titleBlock);
    }
  }
  return '';
}

async function fetchIcalViaEdge(url: string): Promise<string> {
  const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ical`;
  const res = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Edge function error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  if (typeof json.ical !== 'string') throw new Error('No iCal data returned');
  return json.ical;
}

function FeedSyncPanel({ form, onFormChange }: {
  form: AdminFormState;
  onFormChange: (f: AdminFormState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [feeds, setFeeds] = useState<CalendarFeed[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Editing state for the feed list
  const [editUrl, setEditUrl] = useState<Record<string, string>>({});
  const [editRole, setEditRole] = useState<Record<string, string>>({});
  const [editLabel, setEditLabel] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLoadingFeeds(true);
    supabase.from('calendar_feeds').select('*').order('role').then(({ data, error }) => {
      if (error) { setLoadingFeeds(false); return; }
      const rows = (data ?? []) as CalendarFeed[];
      setFeeds(rows);
      const urls: Record<string, string> = {};
      const roles: Record<string, string> = {};
      const labels: Record<string, string> = {};
      for (const f of rows) {
        urls[f.id] = f.ical_url;
        roles[f.id] = roleKey(f);
        labels[f.id] = f.label;
      }
      setEditUrl(urls);
      setEditRole(roles);
      setEditLabel(labels);
      setLoadingFeeds(false);
    }).catch(() => setLoadingFeeds(false));
  }, [open]);

  const addFeed = () => {
    const tmp = crypto.randomUUID();
    setFeeds(f => [...f, { id: tmp, role: 'ado', dorm_name: null, label: '', ical_url: '' }]);
    setEditUrl(u => ({ ...u, [tmp]: '' }));
    setEditRole(r => ({ ...r, [tmp]: 'ado' }));
    setEditLabel(l => ({ ...l, [tmp]: '' }));
  };

  const removeFeed = async (id: string) => {
    const { error } = await supabase.from('calendar_feeds').delete().eq('id', id);
    if (!error) setFeeds(f => f.filter(x => x.id !== id));
  };

  const saveFeeds = async () => {
    setSaving(true);
    for (const feed of feeds) {
      const { role, dorm_name } = roleFromKey(editRole[feed.id] ?? roleKey(feed));
      const row = {
        role,
        dorm_name,
        label: editLabel[feed.id] ?? feed.label,
        ical_url: editUrl[feed.id] ?? feed.ical_url,
      };
      const { data: existing } = await supabase.from('calendar_feeds').select('id').eq('id', feed.id).maybeSingle();
      if (existing) {
        await supabase.from('calendar_feeds').update(row).eq('id', feed.id);
      } else {
        await supabase.from('calendar_feeds').insert({ id: feed.id, ...row });
      }
    }
    setSaving(false);
  };

  const syncFromFeeds = async () => {
    if (!form.fridayDate || !form.saturdayDate || !form.sundayDate) {
      setSyncLog(['Set Friday, Saturday, and Sunday dates in Weekend Info first.']);
      return;
    }
    setSyncing(true);
    setSyncLog([]);
    const log: string[] = [];
    let updated = { ...form };

    for (const feed of feeds) {
      const url = editUrl[feed.id] ?? feed.ical_url;
      const rk = editRole[feed.id] ?? roleKey(feed);
      const lbl = (editLabel[feed.id] ?? feed.label) || rk;
      if (!url) { log.push(`Skipped ${lbl}: no URL`); continue; }

      try {
        log.push(`Fetching ${lbl}…`);
        setSyncLog([...log]);
        const icsText = await fetchIcalViaEdge(url);
        const events = parseIcal(icsText);

        if (rk === 'ado') {
          const fri = nameForDate(events, form.fridayDate);
          const sat = nameForDate(events, form.saturdayDate);
          const sun = nameForDate(events, form.sundayDate);
          if (!updated.friday.ado && fri) { updated = { ...updated, friday: { ...updated.friday, ado: fri } }; log.push(`  ADO Fri → ${fri}`); }
          if (!updated.saturday.ado && sat) { updated = { ...updated, saturday: { ...updated.saturday, ado: sat } }; log.push(`  ADO Sat → ${sat}`); }
          if (!updated.sunday.ado && sun) { updated = { ...updated, sunday: { ...updated.sunday, ado: sun } }; log.push(`  ADO Sun → ${sun}`); }
        } else if (rk === 'cs') {
          const fri = nameForDate(events, form.fridayDate);
          const sat = nameForDate(events, form.saturdayDate);
          const sun = nameForDate(events, form.sundayDate);
          if (!updated.friday.csName && fri) { updated = { ...updated, friday: { ...updated.friday, csName: fri } }; log.push(`  CS Fri → ${fri}`); }
          if (!updated.saturday.csName && sat) { updated = { ...updated, saturday: { ...updated.saturday, csName: sat } }; log.push(`  CS Sat → ${sat}`); }
          if (!updated.sunday.csName && sun) { updated = { ...updated, sunday: { ...updated.sunday, csName: sun } }; log.push(`  CS Sun → ${sun}`); }
        } else if (rk.startsWith('dorm:')) {
          const dormName = rk.slice(5);
          const dormIdx = DORM_NAMES.indexOf(dormName as typeof DORM_NAMES[number]);
          if (dormIdx === -1) { log.push(`  Unknown dorm ${dormName}`); continue; }
          for (const [day, dateStr] of [['friday', form.fridayDate], ['saturday', form.saturdayDate], ['sunday', form.sundayDate]] as const) {
            const name = nameForDate(events, dateStr);
            const dayForm = updated[day];
            if (!dayForm.dorms[dormIdx] && name) {
              const newDorms = [...dayForm.dorms];
              newDorms[dormIdx] = name;
              updated = { ...updated, [day]: { ...dayForm, dorms: newDorms } };
              log.push(`  ${dormName} ${day.charAt(0).toUpperCase() + day.slice(1)} → ${name}`);
            }
          }
        }
      } catch (e) {
        log.push(`  Error: ${String(e)}`);
      }
    }

    onFormChange(updated);
    log.push('Sync complete.');
    setSyncLog(log);
    setSyncing(false);
  };

  return (
    <div className="border border-blue-200 bg-blue-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-700 hover:bg-blue-800 transition"
      >
        <div className="flex items-center gap-2">
          <Link size={14} className="text-white" />
          <span className="text-xs font-serif font-bold uppercase tracking-widest text-white">Calendar Feed Sync</span>
        </div>
        {open ? <ChevronUp size={14} className="text-white" /> : <ChevronDown size={14} className="text-white" />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          <p className="text-xs font-serif text-blue-800 leading-relaxed">
            Paste each Google Calendar's private iCal URL. Click <strong>Sync</strong> to auto-fill blank name fields from the calendars. Already-filled fields are never overwritten.
          </p>

          {loadingFeeds ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span className="text-xs font-serif text-blue-600">Loading feeds…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {feeds.map(feed => (
                <div key={feed.id} className="border border-blue-200 bg-white p-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">Role</label>
                      <select
                        value={editRole[feed.id] ?? roleKey(feed)}
                        onChange={e => setEditRole(r => ({ ...r, [feed.id]: e.target.value }))}
                        className="border border-stone-300 px-2 py-1.5 text-xs font-serif text-stone-800 focus:outline-none focus:border-blue-600 bg-white appearance-none"
                      >
                        {FEED_ROLE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">Label</label>
                      <input
                        type="text"
                        value={editLabel[feed.id] ?? feed.label}
                        onChange={e => setEditLabel(l => ({ ...l, [feed.id]: e.target.value }))}
                        placeholder="e.g. ADO Calendar"
                        className="border border-stone-300 px-2 py-1.5 text-xs font-serif text-stone-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFeed(feed.id)}
                      className="self-end mb-0.5 text-stone-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">iCal URL</label>
                    <input
                      type="url"
                      value={editUrl[feed.id] ?? feed.ical_url}
                      onChange={e => setEditUrl(u => ({ ...u, [feed.id]: e.target.value }))}
                      placeholder="https://calendar.google.com/calendar/ical/…"
                      className="border border-stone-300 px-2 py-1.5 text-xs font-mono text-stone-700 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addFeed}
                className="flex items-center gap-1.5 text-xs font-serif text-blue-700 hover:text-blue-900 transition"
              >
                <Plus size={13} /> Add feed
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={saveFeeds}
              disabled={saving}
              className="flex items-center gap-1.5 border border-blue-300 bg-white px-3 py-2 text-xs font-serif font-bold uppercase tracking-wider text-blue-700 hover:bg-blue-50 transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save URLs
            </button>
            <button
              type="button"
              onClick={syncFromFeeds}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-700 text-white px-3 py-2 text-xs font-serif font-bold uppercase tracking-wider hover:bg-blue-800 transition disabled:opacity-60"
            >
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {syncing ? 'Syncing…' : 'Sync Names into Form'}
            </button>
          </div>

          {syncLog.length > 0 && (
            <div className="border border-blue-200 bg-white p-3 max-h-40 overflow-y-auto">
              {syncLog.map((line, i) => (
                <p key={i} className="text-xs font-mono text-stone-600 leading-relaxed">{line}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ICS file dropzone
// ---------------------------------------------------------------------------
interface IcsImportResult {
  fileName: string;
  label: string;
  count: number;
}

function IcsDropzone({ form }: { form: AdminFormState }) {
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<IcsImportResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((file: File): Promise<IcsImportResult> => {
    return new Promise((resolve, reject) => {
      if (!file.name.endsWith('.ics')) {
        reject(new Error(`"${file.name}" is not an .ics file`));
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const events = parseIcal(text);
          // Upsert into calendar_events — clear old entries for same source label first
          const sourceLabel = file.name.replace(/\.ics$/i, '');
          await supabase.from('calendar_events').delete().eq('subCategory', sourceLabel);
          if (events.length > 0) {
            const rows = events.map(ev => ({
              id: ev.id,
              category: ev.category,
              subCategory: sourceLabel,
              titleBlock: ev.titleBlock,
              timeToken: ev.timeToken,
              startDate: ev.startDate,
              endDate: ev.endDate,
            }));
            const { error: dbErr } = await supabase.from('calendar_events').insert(rows);
            if (dbErr) throw new Error(dbErr.message);
          }
          resolve({ fileName: file.name, label: sourceLabel, count: events.length });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.name.endsWith('.ics'));
    if (arr.length === 0) { setError('Only .ics files are accepted.'); return; }
    setError(null);
    setImporting(true);
    setResults([]);
    const newResults: IcsImportResult[] = [];
    for (const file of arr) {
      try {
        const r = await processFile(file);
        newResults.push(r);
      } catch (err) {
        setError(String(err));
      }
    }
    setResults(newResults);
    setImporting(false);
  }, [processFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const inputId = 'ics-file-input';

  return (
    <div className="border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-stone-700">
        <FileText size={14} className="text-white" />
        <span className="text-xs font-serif font-bold uppercase tracking-widest text-white">Manual .ics File Import</span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs font-serif text-stone-500 leading-relaxed">
          Export a calendar from Google Calendar as an .ics file, then drop it here. Each file is saved to the database so the full duty view stays current. Existing events from that file are replaced.
        </p>

        <label
          htmlFor={inputId}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
            dragging
              ? 'border-stone-500 bg-stone-50'
              : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50'
          }`}
        >
          {importing ? (
            <Loader2 size={28} className="animate-spin text-stone-400" />
          ) : (
            <Upload size={28} className={dragging ? 'text-stone-600' : 'text-stone-300'} />
          )}
          <div className="text-center">
            <p className="text-sm font-serif text-stone-600">
              {importing ? 'Importing…' : dragging ? 'Drop to import' : 'Drop .ics files here'}
            </p>
            <p className="text-xs font-serif text-stone-400 mt-0.5">or click to browse</p>
          </div>
          <input
            id={inputId}
            type="file"
            accept=".ics"
            multiple
            className="sr-only"
            onChange={onInputChange}
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2">
            <AlertTriangle size={13} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs font-serif text-red-700">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="border border-green-200 bg-green-50 px-3 py-2 space-y-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check size={13} className="text-green-600 shrink-0" />
                <p className="text-xs font-serif text-green-800">
                  <span className="font-bold">{r.count}</span> event{r.count !== 1 ? 's' : ''} imported from <span className="font-bold">{r.fileName}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin form helpers
// ---------------------------------------------------------------------------
interface AdminDayForm {
  ado: string;
  csName: string;
  csPhone: string;
  alName: string;
  alPhone: string;
  dorms: string[];
}

interface AdminFormState {
  weekendId: string;
  dates: string;
  adoPhone: string;
  fridayDate: string;
  saturdayDate: string;
  sundayDate: string;
  friday: AdminDayForm;
  saturday: AdminDayForm;
  sunday: AdminDayForm;
  activities: Activity[];
}

function emptyDay(): AdminDayForm {
  return { ado: '', csName: '', csPhone: '', alName: '', alPhone: '', dorms: Array(10).fill('') };
}

function emptyForm(): AdminFormState {
  return {
    weekendId: '',
    dates: '',
    adoPhone: '',
    fridayDate: '',
    saturdayDate: '',
    sundayDate: '',
    friday: emptyDay(),
    saturday: emptyDay(),
    sunday: emptyDay(),
    activities: [],
  };
}

function weekendDataToForm(data: WeekendData): AdminFormState {
  const dayToForm = (d: DayShift): AdminDayForm => ({
    ado: d.ado,
    csName: d.campusSupervisor.name,
    csPhone: d.campusSupervisor.phone,
    alName: d.activitiesLead.name,
    alPhone: d.activitiesLead.phone,
    dorms: [...d.dorms],
  });
  return {
    weekendId: data.weekendId,
    dates: data.dates,
    adoPhone: data.contacts.adoPhone,
    fridayDate: data.fridayDate,
    saturdayDate: data.saturdayDate,
    sundayDate: data.sundayDate,
    friday: dayToForm(data.dutyTeam.friday),
    saturday: dayToForm(data.dutyTeam.saturday),
    sunday: dayToForm(data.dutyTeam.sunday),
    activities: [...data.specialActivities],
  };
}

function formToDbRow(f: AdminFormState) {
  const dayToRow = (d: AdminDayForm, prefix: string) => ({
    [`${prefix}_ado`]: d.ado,
    [`${prefix}_cs_name`]: d.csName,
    [`${prefix}_cs_phone`]: d.csPhone,
    [`${prefix}_activities_lead_name`]: d.alName,
    [`${prefix}_activities_lead_phone`]: d.alPhone,
    [`${prefix}_dorms`]: d.dorms,
  });
  return {
    weekend_id: f.weekendId,
    dates: f.dates,
    ado_phone: f.adoPhone,
    friday_date: f.fridayDate || null,
    saturday_date: f.saturdayDate || null,
    sunday_date: f.sundayDate || null,
    ...dayToRow(f.friday, 'friday'),
    ...dayToRow(f.saturday, 'saturday'),
    ...dayToRow(f.sunday, 'sunday'),
    special_activities: f.activities,
    is_active: true,
  };
}

// ---------------------------------------------------------------------------
// Admin form sub-components
// ---------------------------------------------------------------------------
function StaffSelect({ value, onChange, label, allowFreeText = false }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  allowFreeText?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">{label}</label>
      {allowFreeText ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. A. & D. Collins"
          list={`staff-list-${label.replace(/\s/g, '-')}`}
          className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700 bg-white"
        />
      ) : (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700 bg-white appearance-none"
        >
          <option value="">— select —</option>
          {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      {allowFreeText && (
        <datalist id={`staff-list-${label.replace(/\s/g, '-')}`}>
          {STAFF.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  );
}

function DayFormSection({ label, value, onChange }: {
  label: string;
  value: AdminDayForm;
  onChange: (v: AdminDayForm) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof AdminDayForm>(k: K, v: AdminDayForm[K]) => onChange({ ...value, [k]: v });
  const setDorm = (i: number, v: string) => {
    const dorms = [...value.dorms];
    dorms[i] = v;
    onChange({ ...value, dorms });
  };

  const filled = [value.ado, value.csName, value.alName, ...value.dorms].filter(Boolean).length;
  const total = 3 + 10;

  return (
    <div className="border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 transition"
      >
        <span className="text-xs font-serif font-bold uppercase tracking-wider text-stone-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif text-stone-400">{filled}/{total}</span>
          {open ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-4 pt-3 space-y-3 border-t border-stone-100">
          <StaffSelect label="ADO" value={value.ado} onChange={v => set('ado', v)} />
          <div className="grid grid-cols-2 gap-2">
            <StaffSelect label="Campus Supervisor" value={value.csName} onChange={v => set('csName', v)} allowFreeText />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">CS Phone</label>
              <input
                type="tel"
                value={value.csPhone}
                onChange={e => set('csPhone', e.target.value)}
                placeholder="703-000-0000"
                className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StaffSelect label="Activities Lead" value={value.alName} onChange={v => set('alName', v)} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">AL Phone</label>
              <input
                type="tel"
                value={value.alPhone}
                onChange={e => set('alPhone', e.target.value)}
                placeholder="703-000-0000"
                className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
              />
            </div>
          </div>
          <div className="pt-1">
            <p className="text-xs font-serif text-stone-500 uppercase tracking-wide mb-2">Dorm Coverage</p>
            <div className="grid grid-cols-2 gap-2">
              {DORM_NAMES.map((dorm, i) => (
                <div key={dorm} className="flex flex-col gap-1">
                  <label className="text-xs font-serif text-stone-400 uppercase">{dorm}</label>
                  <input
                    type="text"
                    value={value.dorms[i] ?? ''}
                    onChange={e => setDorm(i, e.target.value)}
                    list="staff-datalist"
                    placeholder="e.g. J. Pippin"
                    className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
                  />
                </div>
              ))}
            </div>
            <datalist id="staff-datalist">
              {STAFF.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin view
// ---------------------------------------------------------------------------
function AdminView({ currentData, onSaved, onExit, previewNow, onPreviewChange }: {
  currentData: WeekendData | null;
  onSaved: (data: WeekendData) => void;
  onExit: () => void;
  previewNow: string;
  onPreviewChange: (v: string) => void;
}) {
  const [form, setForm] = useState<AdminFormState>(() =>
    currentData ? weekendDataToForm(currentData) : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDay = (day: 'friday' | 'saturday' | 'sunday') => (v: AdminDayForm) =>
    setForm(f => ({ ...f, [day]: v }));

  const addActivity = () =>
    setForm(f => ({ ...f, activities: [...f.activities, { id: crypto.randomUUID(), time: '', event: '' }] }));

  const updateActivity = (i: number, field: keyof Activity, v: string) =>
    setForm(f => {
      const activities = [...f.activities];
      activities[i] = { ...activities[i], [field]: v };
      return { ...f, activities };
    });

  const removeActivity = (i: number) =>
    setForm(f => ({ ...f, activities: f.activities.filter((_, idx) => idx !== i) }));

  const handleSave = useCallback(async () => {
    if (!form.weekendId.trim()) { setError('Weekend ID is required.'); return; }
    if (!form.dates.trim()) { setError('Date range is required.'); return; }
    setSaving(true);
    setError(null);

    // Deactivate all existing active weekends first
    await supabase.from('weekend_schedule').update({ is_active: false }).eq('is_active', true);

    const row = formToDbRow(form);
    const { data: existing } = await supabase
      .from('weekend_schedule')
      .select('id')
      .eq('weekend_id', form.weekendId)
      .maybeSingle();

    const { data: saved_row, error: dbErr } = existing
      ? await supabase.from('weekend_schedule').update(row).eq('weekend_id', form.weekendId).select().maybeSingle()
      : await supabase.from('weekend_schedule').insert(row).select().maybeSingle();

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    if (saved_row) onSaved(rowToWeekendData(saved_row));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [form, onSaved]);

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl flex flex-col">
        <header className="bg-maroon-700 text-white px-5 pt-10 pb-6">
          <p className="text-xs font-serif uppercase tracking-widest text-maroon-300 mb-2">Admin</p>
          <h1 className="text-2xl font-serif font-bold leading-tight text-white">Weekend Schedule Editor</h1>
          <p className="text-xs font-serif text-maroon-300 mt-2">Changes go live immediately when saved.</p>
        </header>

        <div className="flex-1 px-4 py-5 space-y-4">

          {/* Header info */}
          <div className="border border-stone-200 bg-white p-4 space-y-3">
            <p className="text-xs font-serif font-bold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-2">Weekend Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">Weekend ID</label>
                <input
                  type="text"
                  value={form.weekendId}
                  onChange={e => setForm(f => ({ ...f, weekendId: e.target.value }))}
                  placeholder="Team-31-May-2026"
                  className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">Date Range</label>
                <input
                  type="text"
                  value={form.dates}
                  onChange={e => setForm(f => ({ ...f, dates: e.target.value }))}
                  placeholder="May 29–31, 2026"
                  className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">ADO Phone</label>
              <input
                type="tel"
                value={form.adoPhone}
                onChange={e => setForm(f => ({ ...f, adoPhone: e.target.value }))}
                placeholder="703-000-0000"
                className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['friday', 'saturday', 'sunday'] as const).map((day, i) => (
                <div key={day} className="flex flex-col gap-1">
                  <label className="text-xs font-serif text-stone-500 uppercase tracking-wide">{['Fri Date', 'Sat Date', 'Sun Date'][i]}</label>
                  <input
                    type="date"
                    value={form[`${day}Date` as keyof AdminFormState] as string}
                    onChange={e => setForm(f => ({ ...f, [`${day}Date`]: e.target.value }))}
                    className="border border-stone-300 px-2 py-2 text-xs font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview clock override */}
          <div className="border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-xs font-serif font-bold uppercase tracking-wider text-amber-700 border-b border-amber-200 pb-2">Preview Mode</p>
            <p className="text-xs font-serif text-amber-600 leading-relaxed">Set a fake "now" to test time-based expiry without changing live data. Clear the field to return to real time.</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-serif text-amber-700 uppercase tracking-wide">Simulate Date & Time</label>
              <input
                type="datetime-local"
                value={previewNow}
                onChange={e => onPreviewChange(e.target.value)}
                className="border border-amber-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-amber-500 bg-white"
              />
            </div>
            {previewNow && (
              <button
                type="button"
                onClick={() => onPreviewChange('')}
                className="text-xs font-serif text-amber-700 underline hover:text-amber-900 transition"
              >
                Clear (use real time)
              </button>
            )}
          </div>

          {/* Feed sync */}
          <FeedSyncPanel form={form} onFormChange={setForm} />

          {/* Manual .ics import */}
          <IcsDropzone form={form} />

          {/* Day sections */}
          {(['friday', 'saturday', 'sunday'] as const).map(day => (
            <DayFormSection
              key={day}
              label={day.charAt(0).toUpperCase() + day.slice(1)}
              value={form[day]}
              onChange={setDay(day)}
            />
          ))}

          {/* Activities */}
          <div className="border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <p className="text-xs font-serif font-bold uppercase tracking-wider text-stone-600">Special Activities</p>
              <button
                type="button"
                onClick={addActivity}
                className="flex items-center gap-1 text-xs font-serif text-maroon-700 hover:text-maroon-900 transition"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {form.activities.length === 0 && (
              <p className="text-xs font-serif text-stone-400 italic">No activities added.</p>
            )}
            {form.activities.map((act, i) => (
              <div key={act.id} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <input
                  type="text"
                  value={act.time}
                  onChange={e => updateActivity(i, 'time', e.target.value)}
                  placeholder="Sat 1:00–3:00 PM"
                  className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
                />
                <input
                  type="text"
                  value={act.event}
                  onChange={e => updateActivity(i, 'event', e.target.value)}
                  placeholder="Activity name – staff"
                  className="border border-stone-300 px-2.5 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700"
                />
                <button
                  type="button"
                  onClick={() => removeActivity(i)}
                  className="mt-2 text-stone-400 hover:text-red-500 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-serif text-red-700">{error}</p>
            </div>
          )}

          {/* Save / Exit */}
          <div className="flex gap-3 pb-6">
            <button
              type="button"
              onClick={onExit}
              className="flex-1 border border-stone-300 py-3 text-xs font-serif font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 transition"
            >
              Exit Admin
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-2 flex-[2] flex items-center justify-center gap-2 bg-maroon-700 text-white py-3 text-xs font-serif font-bold uppercase tracking-wider hover:bg-maroon-800 transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save & Go Live'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin login gate
// ---------------------------------------------------------------------------
function AdminLoginModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  const attempt = () => {
    if (pw === ADMIN_PASSWORD) { onSuccess(); }
    else { setErr(true); setPw(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xs border border-stone-200 shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-serif font-bold uppercase tracking-widest text-stone-800 mb-4">Admin Access</h2>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="Password"
          autoFocus
          className="w-full border border-stone-300 px-3 py-2 text-sm font-serif text-stone-800 focus:outline-none focus:border-maroon-700 mb-2"
        />
        {err && <p className="text-xs font-serif text-red-600 mb-2">Incorrect password.</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 border border-stone-300 py-2 text-xs font-serif uppercase tracking-wider text-stone-600 hover:bg-stone-50 transition">Cancel</button>
          <button onClick={attempt} className="flex-1 bg-maroon-700 text-white py-2 text-xs font-serif uppercase tracking-wider hover:bg-maroon-800 transition">Enter</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [weekendData, setWeekendData] = useState<WeekendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdoModal, setShowAdoModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<'duty' | 'calendar'>('duty');
  const [previewNow, setPreviewNow] = useState('');
const [calendarAdoName, setCalendarAdoName] = useState<string | null>(null);

  // Fetch active schedule from Supabase
  useEffect(() => {
    supabase
      .from('weekend_schedule')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setWeekendData(rowToWeekendData(data));
        setLoading(false);
      });
  }, []);

  // Fetch ADO duty from calendar cache and keep it current
  useEffect(() => {
    async function refreshAdoCache() {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        await fetch(`${supabaseUrl}/functions/v1/fetch-ado-calendar`, {
          headers: { Authorization: `Bearer ${anonKey}` },
        });
      } catch { /* non-fatal */ }
    }
    refreshAdoCache();
  }, []);

  // Resolve current ADO from cache: the person listed on duty_date takes over at noon
  // and hands off at noon the following day.
  useEffect(() => {
    async function resolveAdo() {
      const target = previewNow ? new Date(previewNow) : now;
      // The duty slot active at `target` started at noon on some date D.
      // If it's before noon today, the active duty date is yesterday.
      const d = new Date(target);
      if (d.getHours() < 12) d.setDate(d.getDate() - 1);
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      const dutyDate = `${yyyy}-${mm}-${dd}`;

      const { data } = await supabase
        .from('ado_duty_cache')
        .select('display_name')
        .eq('duty_date', dutyDate)
        .maybeSingle();

      setCalendarAdoName(data?.display_name ?? null);
    }
    resolveAdo();
  }, [now, previewNow]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const effectiveNow = previewNow ? new Date(previewNow) : now;
  const currentTimeString = effectiveNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isPreviewMode = Boolean(previewNow);

  if (adminMode) {
    return (
      <AdminView
        currentData={weekendData}
        onSaved={data => { setWeekendData(data); }}
        onExit={() => setAdminMode(false)}
        previewNow={previewNow}
        onPreviewChange={setPreviewNow}
      />
    );
  }

  if (activeTab === 'calendar') {
    return (
      <div className="min-h-screen bg-stone-100">
        <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl flex flex-col">
          <CalendarView />
          <div className="sticky bottom-[56px] z-20 h-10 pointer-events-none bg-gradient-to-t from-white to-transparent" />
          <nav className="border-t border-stone-200 bg-white flex sticky bottom-0 z-30">
            <button
              onClick={() => setActiveTab('duty')}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 text-stone-400 hover:text-maroon-700 transition-colors"
            >
              <Info size={18} />
              <span className="text-[10px] font-sans uppercase tracking-wide">Info</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 text-maroon-700 border-t-2 border-maroon-700"
            >
              <Sparkles size={18} />
              <span className="text-[10px] font-sans uppercase tracking-wide font-bold">Fun</span>
            </button>
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl flex flex-col">

        {/* HEADER */}
        <header className="bg-maroon-700 text-white px-5 pt-10 pb-6 relative">
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-serif font-bold leading-tight text-white">This Weekend<br />at Episcopal</h1>
            <div className="flex-shrink-0 w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm overflow-hidden">
              <img
                src={eLogoSrc}
                alt=""
                aria-hidden="true"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-maroon-600 pt-3">
            <span className="text-xs font-serif text-maroon-300">{weekendData?.dates ?? ''}</span>
            <div className="flex items-center gap-3">
              <span className="tabular-nums text-xs font-mono text-maroon-200">{currentTimeString}</span>
              <button
                onClick={() => setShowAdminLogin(true)}
                className="text-maroon-400 hover:text-white transition p-1"
                aria-label="Admin"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-5 space-y-4">

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-maroon-700" />
            </div>
          )}

          {!loading && !weekendData && (
            <div className="border border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-sm font-serif text-stone-500">No active weekend schedule. Use the admin panel to set one up.</p>
            </div>
          )}

          {isPreviewMode && (
            <div className="border border-amber-300 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
              <p className="text-xs font-serif text-amber-700">Preview: {effectiveNow.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <button onClick={() => setPreviewNow('')} className="text-xs font-serif text-amber-700 underline hover:text-amber-900 transition shrink-0">Exit preview</button>
            </div>
          )}

          {!loading && weekendData && (() => {
            const data = weekendData;
            const dayDates = parseDayDates(data);
            return (
              <>
                {/* ADO BUTTON */}
                <button
                  onClick={() => setShowAdoModal(true)}
                  className="w-full bg-maroon-700 text-white py-4 font-serif font-bold uppercase tracking-widest text-sm hover:bg-maroon-800 active:bg-maroon-900 active:scale-[0.98] active:shadow-none transition-all duration-100 border border-maroon-600 shadow-[0_6px_18px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.28)] rounded-full whitespace-nowrap overflow-hidden text-ellipsis px-4"
                >
                  Contact the ADO: {calendarAdoName ?? currentAdoName(data, effectiveNow)}
                </button>

                {/* DAY LEAVE STATUS */}
                <DayLeaveStatusPill now={effectiveNow} />

                {/* CAMPUS HOURS */}
                <SectionCard title="Campus Hours" defaultOpen={true}>
                  <CampusHoursSection data={data} now={effectiveNow} />
                </SectionCard>

                {/* DUTY TEAM */}
                <SectionCard title="Duty Team Schedule & Contact Info">
                  <DutyTeamSection data={data} />
                </SectionCard>

                {/* MENUS */}
                <SectionCard title="Dining Hall Menus" defaultOpen={false}>
                  <MenuPreview />
                </SectionCard>

              </>
            );
          })()}

        </div>

        {/* SCROLL FADE */}
        <div className="sticky bottom-[56px] z-20 h-10 pointer-events-none bg-gradient-to-t from-white to-transparent" />

        {/* FOOTER */}
        <footer className="px-5 py-2 border-t border-stone-200 bg-stone-50">
          <p className="text-xs font-mono text-stone-400 text-center pb-1">
            {weekendData ? `Weekend ID: ${weekendData.weekendId}` : 'No active schedule'}
          </p>
        </footer>

        {/* TAB BAR */}
        <nav className="border-t border-stone-200 bg-white flex sticky bottom-0 z-30">
          <button
            onClick={() => setActiveTab('duty')}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 text-maroon-700 border-t-2 border-maroon-700"
          >
            <Info size={18} />
            <span className="text-[10px] font-sans uppercase tracking-wide font-bold">Info</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 text-stone-400 hover:text-maroon-700 transition-colors"
          >
            <Sparkles size={18} />
            <span className="text-[10px] font-sans uppercase tracking-wide">Fun</span>
          </button>
        </nav>
      </div>

      {showAdoModal && weekendData && <AdoModal data={weekendData} onClose={() => setShowAdoModal(false)} />}
      {showAdminLogin && (
        <AdminLoginModal
          onSuccess={() => { setShowAdminLogin(false); setAdminMode(true); }}
          onClose={() => setShowAdminLogin(false)}
        />
      )}
    </div>
  );
}
