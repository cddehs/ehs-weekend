import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------------------------------------------------------------------------
// Minimal iCal parser (mirrors src/icalParser.ts logic)
// ---------------------------------------------------------------------------

const TIME_TOKEN_RE =
  /\(?\b(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\s*[-–]\s*(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b\)?|\b\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b/gi;

const ICAL_DATE_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

function parseIcalDate(raw: string): string | null {
  const m = raw.trim().match(ICAL_DATE_RE);
  if (!m) return null;
  const [, yr, mo, dy, hh = "00", mm = "00", ss = "00", z = ""] = m;
  return `${yr}-${mo}-${dy}T${hh}:${mm}:${ss}${z === "Z" ? "Z" : ""}`;
}

function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function extractProp(lines: string[], propName: string): string {
  const upperName = propName.toUpperCase();
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).toUpperCase();
    if (key === upperName || key.startsWith(upperName + ";")) {
      return line.slice(colonIdx + 1).trim();
    }
  }
  return "";
}

function extractTimeToken(summary: string): { cleanTitle: string; timeToken: string } {
  const tokens: string[] = [];
  const clean = summary.replace(TIME_TOKEN_RE, (match: string) => {
    tokens.push(match.replace(/^\(|\)$/g, "").trim());
    return "";
  });
  const timeToken = tokens.join(" / ").trim();
  const cleanTitle = clean.replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
  return { cleanTitle, timeToken };
}

function unescapeIcal(s: string): string {
  return s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function deriveCategories(categoriesProp: string, calnameProp: string): { category: string; subCategory: string } {
  if (categoriesProp) {
    const parts = categoriesProp.split(";").map((s: string) => s.trim()).filter(Boolean);
    return { category: parts[0] ?? "", subCategory: parts[1] ?? "" };
  }
  if (calnameProp) return { category: calnameProp.trim(), subCategory: "" };
  return { category: "", subCategory: "" };
}

function parseIcal(
  icsText: string,
  defaultCategory?: string,
  defaultSubCategory?: string,
): Array<{ category: string; subCategory: string; titleBlock: string; timeToken: string; location: string; startDate: string | null; endDate: string | null }> {
  const text = unfold(icsText);
  const lines = text.split("\n");
  const calName = extractProp(lines, "X-WR-CALNAME");

  const events: Array<{ category: string; subCategory: string; titleBlock: string; timeToken: string; location: string; startDate: string | null; endDate: string | null }> = [];
  let insideEvent = false;
  let eventLines: string[] = [];

  for (const line of lines) {
    if (line.trimEnd() === "BEGIN:VEVENT") { insideEvent = true; eventLines = []; continue; }
    if (line.trimEnd() === "END:VEVENT") {
      insideEvent = false;
      const rawSummary  = unescapeIcal(extractProp(eventLines, "SUMMARY"));
      const rawStart    = extractProp(eventLines, "DTSTART");
      const rawEnd      = extractProp(eventLines, "DTEND");
      const rawCats     = extractProp(eventLines, "CATEGORIES");
      const rawLocation = unescapeIcal(extractProp(eventLines, "LOCATION"));
      const { category, subCategory } = deriveCategories(rawCats, calName);
      const { cleanTitle, timeToken } = extractTimeToken(rawSummary);
      events.push({
        category:    defaultCategory    ?? category,
        subCategory: defaultSubCategory ?? subCategory,
        titleBlock:  cleanTitle,
        timeToken,
        location:    rawLocation,
        startDate:   parseIcalDate(rawStart),
        endDate:     parseIcalDate(rawEnd),
      });
      eventLines = [];
      continue;
    }
    if (insideEvent) eventLines.push(line);
  }
  return events;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url, category, subCategory } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only HTTPS URLs are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${upstream.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const icalText = await upstream.text();
    const events = parseIcal(icalText, category || undefined, subCategory || undefined);

    if (events.length === 0) {
      return new Response(JSON.stringify({ error: "No VEVENT blocks found in the calendar." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert using service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("calendar_events")
      .insert(events)
      .select();

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ inserted: data }), {
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
