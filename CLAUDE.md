# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript type check (no emit)
npm run preview    # Serve the production build locally
```

There are no tests.

## What This App Is

A weekend duty dashboard for a boarding school. Staff look up who is on duty, sign-in times, day leave desk schedules, and weekend activities. All data is hardcoded in the `WEEKEND_DATA` constant at the top of `src/App.tsx` — there is no backend, database calls, or CSV parsing at runtime (the CSV files in `src/assets/` are reference documents only).

## Architecture

The entire application lives in `src/App.tsx`. There are no separate route files, context providers, or state management libraries.

**Data shape**: `WEEKEND_DATA` holds a single weekend's worth of data: ADO identity, a three-day duty team (`dutyTeam[Friday|Saturday|Sunday]`), phone contacts, sign-in time windows, day leave desk slots, and special activities. Updating the weekend means replacing this object.

**Time-based visibility**: A `now` ticker (updated every second) automatically hides expired entries — sign-in windows, leave desk slots, and activities disappear 30 minutes after their end time. The `isExpired()` helper drives this.

**Search**: A single `searchTerm` state filters all four sections simultaneously via the `matches()` helper (case-insensitive substring on names, roles, phone numbers).

**ADO contact gate**: Tapping the ADO phone/text icon opens `AdoModal`, which requires a checkbox acknowledgment before enabling the call/text buttons. This is intentional — do not remove it.

**Key small utilities** (all in App.tsx):
- `stripTiming(s)` — removes "until 7pm" / "after" qualifiers from a name string
- `initLast(raw)` — formats a full name as "F. Lastname"; preserves already-abbreviated names
- `formatName(raw)` — splits on `/`, applies `stripTiming` then `initLast` to each segment, rejoins with ` / `

## Name Display Rules

Names in the data may contain timing qualifiers (e.g. `"Viola until 7pm / George after"`). **Always strip timing before displaying** — `formatName()` does this automatically. The desired output is always first-initial + last name with timing removed: `"V. Viola / G. George"`. Never add back responsive fallback logic that shows last-name-only or last-name-first variants.
