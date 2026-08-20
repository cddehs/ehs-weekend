import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ICAL_URL =
  "https://calendar.google.com/calendar/ical/c_13a3bcd8aaca54ec99a999353b97864b691594bb7d3054da3b2afc2d129e925f@group.calendar.google.com/public/basic.ics";

const ICAL_DATE_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function extractProp(lines: string[], propName: string): string {
  const upper = propName.toUpperCase();
  for (const line of lines) {
    const ci = line.indexOf(":");
    if (ci === -1) continue;
    const key = line.slice(0, ci).toUpperCase();
    if (key === upper || key.startsWith(upper + ";")) return line.slice(ci + 1).trim();
  }
  return "";
}

function unescapeIcal(s: string): string {
  return s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcalDate(raw: string): string | null {
  const m = raw.trim().match(ICAL_DATE_RE);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

// Strip "ADO:" / "ADO on call:" prefix variants (case-insensitive)
function stripAdoPrefix(raw: string): string {
  return raw.replace(/^ADO\s+on\s+call\s*:\s*/i, "").replace(/^ADO\s*:\s*/i, "").trim();
}

// Convert "First Last" → "F. Last", title-casing the last name.
// Returns null if input is a single word (caller will try first-name lookup).
function formatFullName(s: string): string | null {
  if (/^[A-Z]\.\s+\S/.test(s)) return s; // already "F. Last"
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((p) => p.trim());
    if (first && last) {
      const lc = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
      return `${first.charAt(0).toUpperCase()}. ${lc}`;
    }
  }
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    const lc = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
    return `${first.charAt(0).toUpperCase()}. ${lc}`;
  }
  return null; // single word
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const res = await fetch(ICAL_URL);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const icsText = await res.text();
    const text = unfold(icsText);
    const lines = text.split("\n");

    // Parse all VEVENT blocks into raw rows
    const rawRows: { duty_date: string; name: string }[] = [];
    let inside = false;
    let eventLines: string[] = [];

    for (const line of lines) {
      if (line.trimEnd() === "BEGIN:VEVENT") { inside = true; eventLines = []; continue; }
      if (line.trimEnd() === "END:VEVENT") {
        inside = false;
        const summary = unescapeIcal(extractProp(eventLines, "SUMMARY"));
        const dtstart = extractProp(eventLines, "DTSTART");
        const dateStr = parseIcalDate(dtstart);
        if (summary && dateStr) {
          // Take only the first person if the summary has a slash (e.g. "Lucy/Amila")
          const name = stripAdoPrefix(summary).split("/")[0].trim();
          // Strip parenthetical notes like "(Chris not doing Sunday)"
          const cleanName = name.replace(/\s*\(.*\)/, "").trim();
          rawRows.push({ duty_date: dateStr, name: cleanName });
        }
        eventLines = [];
        continue;
      }
      if (inside) eventLines.push(line);
    }

    if (rawRows.length === 0) {
      return new Response(JSON.stringify({ error: "No events found in calendar" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a first-name → "F. Lastname" resolution map from full-name entries in the feed
    const firstNameMap: Record<string, string> = {};
    for (const { name } of rawRows) {
      const formatted = formatFullName(name);
      if (formatted) {
        // key is lowercase first name (first word)
        const firstName = name.split(/\s+/)[0].toLowerCase();
        // Only store if not already set (prefer earliest full-name entry)
        if (!firstNameMap[firstName]) firstNameMap[firstName] = formatted;
      }
    }

    // Build final rows, resolving single first names via the map
    const rows: { duty_date: string; raw_title: string; display_name: string }[] = [];
    for (const { duty_date, name } of rawRows) {
      const formatted = formatFullName(name);
      let display_name: string;
      if (formatted) {
        display_name = formatted;
      } else {
        // Single word — look up by lowercase first name
        const key = name.toLowerCase();
        display_name = firstNameMap[key] ?? (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
      }
      rows.push({ duty_date, raw_title: name, display_name });
    }

    // Deduplicate by duty_date — last entry wins
    const deduped = Object.values(
      rows.reduce((acc, row) => { acc[row.duty_date] = row; return acc; }, {} as Record<string, typeof rows[0]>)
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase
      .from("ado_duty_cache")
      .upsert(deduped, { onConflict: "duty_date" });

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ upserted: deduped.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
