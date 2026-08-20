import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LUNCH_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBl5DZC8B5QifnbVsFQDqZ0pLeoHL-TE2Z_3-WvzLSRtgjUQjn0jmTSI9IUMEqnufxPD7jP7Ky0y0z/pub?output=csv";

const DINNER_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSE_IkMGx1BOtazOic5f4Dcy_j6S4h_KSb-gsDNha4wf6wpgmN35aDCytFfD-cOoHpQyIF8f2g5UsQh/pub?output=csv";

// Display order for preview
const CATEGORY_DISPLAY: Array<{ keys: string[]; label: string }> = [
  { keys: ["ENTRÉE", "ENTREE"], label: "Entrée" },
  { keys: ["VEGETARIAN ENTRÉE", "VEGETARIAN ENTREE"], label: "Veg Entrée" },
  { keys: ["ACTION STATION"], label: "Action Station" },
  { keys: ["DESSERT"], label: "Dessert" },
];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cells.push(cell.trim().replace(/\n/g, " "));
        cell = "";
      } else if (ch !== "\r") {
        cell += ch;
      }
    }
    cells.push(cell.trim().replace(/\n/g, " "));
    rows.push(cells);
  }
  return rows;
}

// Find the date row: the row where col 1 looks like "May 25", "Jun 1", etc.
// Returns the row index of the date row, or -1 if not found.
function findDateRowIndex(rows: string[][]): number {
  const datePattern = /^[A-Z][a-z]{2} \d{1,2}$/;
  for (let r = 0; r < rows.length; r++) {
    if (rows[r][1] && datePattern.test(rows[r][1].trim())) {
      return r;
    }
  }
  return -1;
}

// Returns { found, menuMap } — found=false when the date column isn't in the sheet yet
function extractDayMenu(rows: string[][], targetDate: string): { found: boolean; menuMap: Record<string, string> } {
  const dateRowIdx = findDateRowIndex(rows);
  if (dateRowIdx === -1) return { found: false, menuMap: {} };

  const dateRow = rows[dateRowIdx];
  let colIndex = -1;
  for (let c = 1; c < dateRow.length; c++) {
    if (dateRow[c].trim().toLowerCase() === targetDate.toLowerCase()) {
      colIndex = c;
      break;
    }
  }
  if (colIndex === -1) return { found: false, menuMap: {} };

  const menuMap: Record<string, string> = {};
  for (let r = dateRowIdx + 1; r < rows.length; r++) {
    const category = rows[r][0]?.trim().toUpperCase().replace(/\s+/g, " ");
    if (!category) continue;
    const value = rows[r][colIndex]?.trim();
    if (value) menuMap[category] = value;
  }
  return { found: true, menuMap };
}

function formatDateKey(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "long", timeZone: "America/New_York" });
  const day = parseInt(
    date.toLocaleString("en-US", { day: "numeric", timeZone: "America/New_York" }),
    10
  );
  const abbrev = month.slice(0, 3);
  return `${abbrev} ${day}`;
}

function pickPreviewItems(menuMap: Record<string, string>): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];
  for (const { keys, label } of CATEGORY_DISPLAY) {
    for (const key of keys) {
      if (menuMap[key]) {
        items.push({ label, value: menuMap[key] });
        break;
      }
    }
  }
  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dateOverride = url.searchParams.get("date");
    const mealOverride = url.searchParams.get("meal") as "lunch" | "dinner" | null;

    // Determine which meal to show based on Eastern time
    const nowET = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const hourET = nowET.getHours() + nowET.getMinutes() / 60;

    // Lunch: from 9pm the night before until 1pm that day
    // Dinner: 1pm until 9pm
    let meal: "lunch" | "dinner";
    let menuDate: Date;

    if (hourET >= 13 && hourET < 21) {
      meal = "dinner";
      menuDate = nowET;
    } else if (hourET >= 21) {
      // After 9pm: tomorrow's lunch
      meal = "lunch";
      menuDate = new Date(nowET);
      menuDate.setDate(menuDate.getDate() + 1);
    } else {
      // Before 1pm: today's lunch
      meal = "lunch";
      menuDate = nowET;
    }

    if (mealOverride) meal = mealOverride;
    const dateKey = dateOverride ?? formatDateKey(menuDate);
    const csvUrl = meal === "lunch" ? LUNCH_CSV_URL : DINNER_CSV_URL;

    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) throw new Error(`Failed to fetch CSV: ${csvRes.status}`);
    const csvText = await csvRes.text();
    const rows = parseCSV(csvText);
    const { found, menuMap } = extractDayMenu(rows, dateKey);
    const items = pickPreviewItems(menuMap);

    const lunchUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBl5DZC8B5QifnbVsFQDqZ0pLeoHL-TE2Z_3-WvzLSRtgjUQjn0jmTSI9IUMEqnufxPD7jP7Ky0y0z/pubhtml";
    const dinnerUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSE_IkMGx1BOtazOic5f4Dcy_j6S4h_KSb-gsDNha4wf6wpgmN35aDCytFfD-cOoHpQyIF8f2g5UsQh/pubhtml";

    return new Response(
      JSON.stringify({
        meal,
        date: dateKey,
        dateNotFound: !found,
        items,
        lunchUrl,
        dinnerUrl,
        fullMenuUrl: meal === "lunch" ? lunchUrl : dinnerUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=900",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
