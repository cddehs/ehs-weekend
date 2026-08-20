import React, { useState, useRef, useCallback } from 'react';
import {
  Calendar, Upload, X,
  Clock, AlertCircle, CheckCircle2, Loader2, Link, MapPin,
  Heart, Sparkles, HelpCircle, ExternalLink, Trophy,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { parseIcal, CalendarEvent } from './icalParser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbEvent {
  id: string;
  category: string;
  subCategory: string;
  titleBlock: string;
  timeToken: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  fanVanUrl: string | null;
}

type UploadStatus = 'idle' | 'parsing' | 'saving' | 'done' | 'error';

// ---------------------------------------------------------------------------
// Category theming
// ---------------------------------------------------------------------------

type CategoryTheme = {
  icon: React.ReactNode;
  pill: string;       // tailwind classes for the pill badge
  border: string;     // left-border accent
  bg: string;         // card background tint
};

function getCategoryTheme(category: string): CategoryTheme {
  const c = category.toLowerCase();
  if (c.includes('athlet') || c.includes('sport') || c.includes('team')) {
    return {
      icon: <Trophy size={11} />,
      pill: 'bg-sky-100 text-sky-700 border border-sky-200',
      border: 'border-l-sky-400',
      bg: 'bg-sky-50/40',
    };
  }
  if (c.includes('service') || c.includes('community') || c.includes('volunteer')) {
    return {
      icon: <Heart size={11} />,
      pill: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      border: 'border-l-emerald-400',
      bg: 'bg-emerald-50/40',
    };
  }
  if (c.includes('activit') || c.includes('club') || c.includes('arts') || c.includes('perform')) {
    return {
      icon: <Sparkles size={11} />,
      pill: 'bg-amber-100 text-amber-700 border border-amber-200',
      border: 'border-l-amber-400',
      bg: 'bg-amber-50/40',
    };
  }
  return {
    icon: <HelpCircle size={11} />,
    pill: 'bg-stone-100 text-stone-600 border border-stone-200',
    border: 'border-l-stone-300',
    bg: 'bg-white',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  if (d >= todayStart && d < tomorrowStart) return 'Today';
  if (d >= tomorrowStart && d < new Date(tomorrowStart.getTime() + 86400000)) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(d);
}

// Returns the Monday 8am and Sunday 11pm bounding the weekend for a given date.
// "The weekend" = the Friday–Sunday block whose Monday precedes `now`.
function getWeekendWindow(now: Date): { start: Date; end: Date } {
  // day 0=Sun, 1=Mon, ..., 6=Sat
  const day = now.getDay();
  // days since Monday (Mon=0 offset)
  const sinceMonday = (day + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday, 8, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 0, 0);
  return { start: monday, end: sunday };
}

function isInWeekendWindow(ev: DbEvent, now: Date): boolean {
  const { start: windowStart, end: windowEnd } = getWeekendWindow(now);
  if (ev.startDate) {
    const evStart = new Date(ev.startDate);
    const evEnd = ev.endDate ? new Date(ev.endDate) : evStart;
    // within the Mon–Sun window and not already ended
    return evStart < windowEnd && evEnd >= now && evStart >= windowStart;
  }
  return false;
}

// ---------------------------------------------------------------------------
// EventCard (24-hour style)
// ---------------------------------------------------------------------------

function EventCard({ ev }: { ev: DbEvent }) {
  const theme = getCategoryTheme(ev.category);
  const category = safeStr(ev.category) || 'Other';
  const subCat   = safeStr(ev.subCategory);
  const title    = safeStr(ev.titleBlock) || '(No title)';
  const location = safeStr(ev.location);
  const startTime = fmtTime(ev.startDate);
  const endTime   = fmtTime(ev.endDate);
  const timeStr   = startTime && endTime ? `${startTime} – ${endTime}` : startTime;

  const isService = category.toLowerCase().includes('service')
    || category.toLowerCase().includes('community')
    || category.toLowerCase().includes('volunteer');

  const fanVanUrl = ev.fanVanUrl?.trim() || null;

  function handleX2vol() {
    window.open('https://www.x2vol.com', '_blank', 'noopener');
  }

  return (
    <div className={`flex border-l-4 ${theme.border} ${theme.bg} rounded-r-xl rounded-l-none
                     border border-l-4 border-stone-200 overflow-hidden shadow-sm`}>
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-stone-800 leading-snug">{title}</p>
          <span className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${theme.pill}`}>
            {theme.icon}
            {category}
          </span>
        </div>
        {(isService || fanVanUrl) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
            {isService && (
              <button
                onClick={handleX2vol}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700
                           active:bg-emerald-800 text-white rounded-lg px-3 py-1.5 text-sm font-semibold
                           transition-colors active:scale-95 shadow-sm"
              >
                <ExternalLink size={12} />
                Sign up on x2vol
              </button>
            )}
            {fanVanUrl && (
              <a
                href={fanVanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700
                           active:bg-sky-800 text-white rounded-lg px-3 py-1.5 text-sm font-semibold
                           transition-colors active:scale-95 shadow-sm"
              >
                <ExternalLink size={12} />
                Fan Van sign up
              </a>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {timeStr && (
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <Clock size={11} className="shrink-0" />
              {timeStr}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <MapPin size={11} className="shrink-0" />
              {location}
            </span>
          )}
          {subCat && (
            <span className="text-xs text-stone-400">{subCat}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload panel
// ---------------------------------------------------------------------------

function UploadPanel({ onEventsAdded }: { onEventsAdded: (events: DbEvent[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab]             = useState<'file' | 'url'>('url');
  const [status, setStatus]       = useState<UploadStatus>('idle');
  const [message, setMessage]     = useState('');
  const [category, setCategory]   = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [urlInput, setUrlInput]   = useState('');

  const saveEvents = useCallback(async (icalText: string) => {
    const parsed: CalendarEvent[] = parseIcal(icalText, {
      defaultCategory:    category.trim() || undefined,
      defaultSubCategory: subCategory.trim() || undefined,
    });

    if (parsed.length === 0) {
      setStatus('error');
      setMessage('No VEVENT blocks found.');
      return;
    }

    setStatus('saving');

    const rows = parsed.map(ev => ({
      category:    ev.category,
      subCategory: ev.subCategory,
      titleBlock:  ev.titleBlock,
      timeToken:   ev.timeToken,
      location:    ev.location,
      startDate:   ev.startDate,
      endDate:     ev.endDate,
    }));

    const { data, error } = await supabase
      .from('calendar_events')
      .insert(rows)
      .select();

    if (error) throw error;

    const inserted: DbEvent[] = (data ?? []).map(r => ({
      id:          safeStr(r.id),
      category:    safeStr(r.category),
      subCategory: safeStr(r.subCategory),
      titleBlock:  safeStr(r.titleBlock),
      timeToken:   safeStr(r.timeToken),
      location:    safeStr(r.location),
      startDate:   r.startDate ?? null,
      endDate:     r.endDate   ?? null,
      fanVanUrl:   null,
    }));

    setStatus('done');
    setMessage(`Imported ${inserted.length} event${inserted.length !== 1 ? 's' : ''}.`);
    onEventsAdded(inserted);
  }, [category, subCategory, onEventsAdded]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.ics')) {
      setStatus('error');
      setMessage('Please select a valid .ics file.');
      return;
    }
    setStatus('parsing');
    setMessage('');
    try {
      const text = await file.text();
      await saveEvents(text);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unknown error.');
    }
  }, [saveEvents]);

  const handleUrl = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    setStatus('parsing');
    setMessage('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/fetch-ical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url, category: category.trim() || undefined, subCategory: subCategory.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);

      const inserted: DbEvent[] = (json.inserted ?? []).map((r: Record<string, unknown>) => ({
        id:          safeStr(r.id),
        category:    safeStr(r.category),
        subCategory: safeStr(r.subCategory),
        titleBlock:  safeStr(r.titleBlock),
        timeToken:   safeStr(r.timeToken),
        location:    safeStr(r.location),
        startDate:   (r.startDate as string | null) ?? null,
        endDate:     (r.endDate as string | null) ?? null,
        fanVanUrl:   null,
      }));

      setStatus('done');
      setMessage(`Imported ${inserted.length} event${inserted.length !== 1 ? 's' : ''}.`);
      onEventsAdded(inserted);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unknown error.');
    }
  }, [urlInput, category, subCategory, onEventsAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const busy = status === 'parsing' || status === 'saving';

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
      <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2">
        <Upload size={15} className="text-maroon-600" />
        Import Calendar
      </h3>

      <div className="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-medium">
        <button
          onClick={() => setTab('url')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors
            ${tab === 'url' ? 'bg-maroon-700 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          <Link size={12} /> URL
        </button>
        <button
          onClick={() => setTab('file')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors
            ${tab === 'file' ? 'bg-maroon-700 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          <Upload size={12} /> File
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g. Athletics"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-maroon-400"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Sub-category</label>
          <input
            type="text"
            value={subCategory}
            onChange={e => setSubCategory(e.target.value)}
            placeholder="e.g. Varsity"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-maroon-400"
          />
        </div>
      </div>

      {tab === 'url' ? (
        <div className="space-y-2">
          <label className="block text-xs text-stone-500">iCal URL (webcal:// or https://)</label>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value.replace(/^webcal:/, 'https:'))}
            placeholder="https://calendar.google.com/calendar/ical/…"
            disabled={busy}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-maroon-400 disabled:opacity-50"
          />
          <button
            onClick={handleUrl}
            disabled={busy || !urlInput.trim()}
            className="w-full flex items-center justify-center gap-2 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Link size={15} />}
            {busy ? (status === 'parsing' ? 'Fetching…' : 'Saving…') : 'Import from URL'}
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !busy && fileRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
            py-8 cursor-pointer transition-colors
            ${busy
              ? 'border-stone-200 bg-stone-50 cursor-not-allowed'
              : 'border-maroon-200 hover:border-maroon-400 hover:bg-maroon-50 active:bg-maroon-100'}
          `}
        >
          {busy
            ? <Loader2 size={24} className="text-maroon-400 animate-spin" />
            : <Calendar size={24} className="text-maroon-400" />
          }
          <span className="text-sm text-stone-500">
            {busy
              ? status === 'parsing' ? 'Parsing…' : 'Saving…'
              : 'Tap or drop a .ics file'}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".ics"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {(status === 'done' || status === 'error') && (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm
          ${status === 'done'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {status === 'done'
            ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            : <AlertCircle  size={15} className="mt-0.5 shrink-0" />}
          <span>{message}</span>
          <button
            className="ml-auto text-inherit opacity-60 hover:opacity-100"
            onClick={() => { setStatus('idle'); setMessage(''); }}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category filter
// ---------------------------------------------------------------------------

type FilterCategory = 'Athletics' | 'Service' | 'Activities';

const FILTER_ITEMS: { label: FilterCategory; icon: React.ReactNode; active: string; inactive: string }[] = [
  {
    label: 'Athletics',
    icon: <Trophy size={13} />,
    active:   'bg-sky-500 text-white border-2 border-sky-500 shadow-sm',
    inactive: 'bg-white text-sky-600 border-2 border-sky-300 hover:bg-sky-50 hover:border-sky-400',
  },
  {
    label: 'Service',
    icon: <Heart size={13} />,
    active:   'bg-emerald-500 text-white border-2 border-emerald-500 shadow-sm',
    inactive: 'bg-white text-emerald-600 border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400',
  },
  {
    label: 'Activities',
    icon: <Sparkles size={13} />,
    active:   'bg-amber-500 text-white border-2 border-amber-500 shadow-sm',
    inactive: 'bg-white text-amber-600 border-2 border-amber-300 hover:bg-amber-50 hover:border-amber-400',
  },
];

function CategoryFilter({
  active,
  onChange,
}: {
  active: Set<FilterCategory>;
  onChange: (cat: FilterCategory) => void;
}) {
  return (
    <div className="flex gap-2">
      {FILTER_ITEMS.map(item => {
        const isActive = active.has(item.label);
        return (
          <button
            key={item.label}
            onClick={() => onChange(item.label)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold
                        transition-all duration-150 active:scale-95 shadow-sm ${isActive ? item.active : item.inactive}`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CalendarView() {
  const [events, setEvents]           = useState<DbEvent[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loadError, setLoadError]     = useState('');
  const [showUpload, setShowUpload]   = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(new Set());
  const [now]                         = useState(() => new Date('2026-05-09T07:00:00Z'));

  React.useEffect(() => {
    setLoading(true);
    supabase
      .from('calendar_events')
      .select('id, category, subCategory, titleBlock, timeToken, location, startDate, endDate, fan_van_url')
      .order('startDate', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
        } else {
          setEvents((data ?? []).map(r => ({
            id:          safeStr(r.id),
            category:    safeStr(r.category),
            subCategory: safeStr(r.subCategory),
            titleBlock:  safeStr(r.titleBlock),
            timeToken:   safeStr(r.timeToken),
            location:    safeStr(r.location),
            startDate:   r.startDate ?? null,
            endDate:     r.endDate   ?? null,
            fanVanUrl:   r.fan_van_url ?? null,
          })));
        }
        setLoading(false);
      });
  }, []);

  const handleEventsAdded = useCallback((added: DbEvent[]) => {
    setEvents(prev => {
      const ids = new Set(prev.map(e => e.id));
      return [...prev, ...added.filter(e => !ids.has(e.id))].sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate.localeCompare(b.startDate);
      });
    });
  }, []);

  function matchesFilter(ev: DbEvent): boolean {
    if (activeFilters.size === 0) return true;
    const c = ev.category.toLowerCase();
    if (activeFilters.has('Athletics') && (c.includes('athlet') || c.includes('sport') || c.includes('team'))) return true;
    if (activeFilters.has('Service')   && (c.includes('service') || c.includes('community') || c.includes('volunteer'))) return true;
    if (activeFilters.has('Activities') && (c.includes('activit') || c.includes('club') || c.includes('arts') || c.includes('perform'))) return true;
    return false;
  }

  const upcoming = events
    .filter(ev => isInWeekendWindow(ev, now) && matchesFilter(ev))
    .sort((a, b) => {
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    });

  // Group by day label for a subtle divider
  const grouped: { label: string; events: DbEvent[] }[] = [];
  for (const ev of upcoming) {
    if (!ev.startDate) continue;
    const label = fmtDayLabel(ev.startDate);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) {
      last.events.push(ev);
    } else {
      grouped.push({ label, events: [ev] });
    }
  }

  const { start: windowStart, end: windowEnd } = getWeekendWindow(now);
  const fmtShort = (d: Date) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
  const windowLabel = `${fmtShort(windowStart)} – ${fmtShort(windowEnd)}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-maroon-700 text-white px-4 pt-safe-top pb-4 sticky top-0 z-20 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <div>
              <span className="font-bold text-base tracking-tight">This Weekend</span>
              <p className="text-xs text-white/60 leading-tight">{windowLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30
                       rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {showUpload ? <X size={14} /> : <Upload size={14} />}
            {showUpload ? 'Close' : 'Import'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {showUpload && <UploadPanel onEventsAdded={handleEventsAdded} />}

        <CategoryFilter
          active={activeFilters}
          onChange={cat => setActiveFilters(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat); else next.add(cat);
            return next;
          })}
        />

        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-stone-400">
            <Loader2 size={32} className="animate-spin text-maroon-400" />
            <span className="text-sm">Loading events…</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && upcoming.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-stone-400">
            <Calendar size={36} className="text-stone-300" />
            <span className="text-sm text-center">
              {events.length === 0
                ? 'No events yet — import a calendar to get started.'
                : 'Nothing left on the schedule this weekend.'}
            </span>
          </div>
        )}

        {!loading && grouped.map(group => (
          <div key={group.label}>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.events.map(ev => <EventCard key={ev.id} ev={ev} />)}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
