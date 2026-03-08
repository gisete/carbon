# Carbon — Claude Code Project Context

Carbon is a self-hosted Next.js e-ink display management system. It runs on a mini PC (Ubuntu Server, 192.168.1.135) and serves content to a Seeed Studio ESP32-S3 e-ink display (800x480px). The admin UI manages playlists of "screens" that rotate on the device.

---

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript)
- **UI**: React + Tailwind CSS v4 (with custom `@theme` tokens in `globals.css`)
- **Rendering**: Puppeteer + Sharp — Puppeteer screenshots pages, Sharp converts to 2-bit/4-color grayscale PNG optimized for e-ink
- **Storage**: JSON file-based (`data/playlist.json`, `data/state.json`, `data/settings.json`) — no database
- **Fonts**: IBM Plex Sans (UI sans), IBM Plex Serif (UI serif), JetBrains Mono (UI mono), Roboto + ChareInk (e-ink screens)
- **Icons**: Lucide React

---

## Project Structure

```
app/
  actions.ts               # All server actions (Next.js "use server")
  layout.tsx               # Root layout with nav (Logo → Playlists / Screens / Settings)
  page.tsx                 # Redirects to /playlist
  playlist/                # Playlist manager UI (main admin page)
    page.tsx
    components/
      PlaylistGrid.tsx      # Drag-reorder list of screens per playlist
      PlaylistHeader.tsx    # Playlist name, schedule, edit/delete controls
      ConfigModal.tsx       # Per-screen config (duration, view mode, etc.)
      AddPlaylistModal.tsx  # Create/edit playlist modal
      ScreenSelectionModal.tsx  # Pick screen type to add
      AddScreenButton.tsx
  screens/                 # E-ink display pages (800x480, no nav chrome)
    weather/page.tsx        # views/CurrentView.tsx + views/WeeklyView.tsx
    calendar/page.tsx       # views/DailyView.tsx + WeeklyView.tsx + MonthlyView.tsx
    custom-text/page.tsx
    logo/page.tsx
    image/page.tsx
    system/page.tsx         # Local mini PC stats via systeminformation
    servers/page.tsx        # Mini PC + UGREEN NAS side-by-side stats
    comic/page.tsx          # New Yorker daily cartoon via RSS
    calibration/page.tsx    # Dev tool
    dither-test/page.tsx    # Dev tool
  api/
    display/route.ts        # Main device endpoint — returns image_url + sleep seconds
    render/route.ts         # Puppeteer screenshot → Sharp PNG pipeline
    sleep-duration/route.ts # Sleep calculation endpoint
    control/next/route.tsx  # POST to manually advance cycle
  simulator/page.tsx        # Browser-based device simulator (iframe preview)
  components/
    Logo.tsx
    Modal.tsx
    PageHeader.tsx
  contexts/
    PluginContext.tsx        # selectedPlugin state for Screens tab drill-down

lib/
  playlist.ts    # PlaylistCollection CRUD, conflict detection, file I/O with queue
  director.ts    # Rotation logic: tick(), advanceCycle(), getCurrentItem(), skipCache
  settings.ts    # Read/write settings.json
  calendar.ts    # iCal fetch + parse (node-ical), event filtering by view
  ipma.ts        # Portugal weather API (IPMA) + SunCalc for sunrise/sunset
  ha.ts          # Home Assistant REST API client (for NAS sensor data)
  sleep.ts       # Sleep duration math: night mode, battery-aware, synced to director

data/            # Runtime JSON files (gitignored, created on first run)
  playlist.json
  state.json
  settings.json

public/
  fonts/         # ChareInk-Regular.ttf, ChareInk-Bold.ttf (local e-ink serif)
```

---

## Core Concepts

### Playlist Collection

The data model is a `PlaylistCollection` with multiple `Playlist` objects. Each playlist has a `Schedule` (weekly with activeDays + startTime/endTime) and an array of `PlaylistItem`s. One playlist is marked `isDefault: true` — it runs when no specific playlist matches the current time.

### Director (`lib/director.ts`)

The Director is the rotation engine. Key functions:

- `tick()` — called on every device wake; determines current item, advances if duration expired, returns `DirectorStatus`
- `getCurrentItem()` — returns active playlist item respecting sleep window
- `advanceCycle()` — increments cycle index
- `resolveActivePlaylist()` — priority: manual override → specific time match → default fallback
- State persisted in `data/state.json` with atomic write (tmp file → copyFile → unlink)
- `skipCache` in state allows runtime-only item skipping without modifying playlist.json

### Screen Types

Valid `PlaylistItem.type` values: `'weather' | 'calendar' | 'custom-text' | 'logo' | 'image' | 'system' | 'comic' | 'servers' | 'quote'`

When adding a new screen type, update ALL of these:

1. `PlaylistItem` type union in `lib/playlist.ts`
2. `ScreenSelectionModal.tsx` — add to `SCREEN_OPTIONS`
3. `PlaylistGrid.tsx` — add icon in `renderScreenIcon()` and `renderPreview()`
4. `buildScreenUrl()` in `app/api/render/route.ts`
5. `buildScreenUrl()` in `app/simulator/page.tsx`
6. `addScreen()` switch in `app/playlist/page.tsx`
7. Create `app/screens/{type}/page.tsx`

### E-ink Rendering Pipeline

Device hits `/api/display` → director resolves current item → returns JSON with `image_url` pointing to `/api/render?screen={itemId}` → device fetches that URL → Puppeteer visits the screen page, takes 800x480 screenshot → Sharp converts to 4-color palette PNG (dithered or not per item config).

E-ink screen pages must:

- Be exactly `w-[800px] h-[480px]`
- Use `font-eink-sans` (Roboto) or `font-eink-serif` (ChareInk)
- Use the 4-color e-ink palette: `eink-black` (#000), `eink-dark-gray` (#555555), `eink-light-gray` (#AAAAAA), `eink-white` (#FFF)
- Not include any nav chrome or layout wrapper
- Export `export const dynamic = 'force-dynamic'` if reading from filesystem or external APIs

### Sleep Logic

The device wakes, hits `/api/display`, gets a `refresh_rate` in seconds. The sleep duration is calculated in `lib/sleep.ts`:

- Night mode (outside startTime–endTime): sleep until wake time exactly
- Critical battery (<20%): sleep 2 hours
- Day mode: sleep until just before Director's `nextSwitchTime` (minus 25s device prep time)

---

## Design System (Admin UI)

Tailwind custom tokens defined in `app/globals.css` via `@theme {}`:

| Token         | Value   | Usage                                      |
| ------------- | ------- | ------------------------------------------ |
| `bold-red`    | #ff3300 | Primary accent, active states, CTA buttons |
| `bright-blue` | #0055ff | Hover states, focus borders                |
| `charcoal`    | #1c1917 | Primary text                               |
| `warm-gray`   | #78716c | Secondary text, icons                      |
| `off-white`   | #fafaf9 | Page background                            |
| `light-gray`  | #e7e5e4 | Borders                                    |
| `pure-white`  | #ffffff | Card/modal backgrounds                     |

UI conventions:

- No rounded corners on interactive elements (buttons, inputs, modals) — sharp edges only
- Buttons: `font-mono text-xs tracking-widest uppercase`
- Active nav item: `border-b-2 border-bold-red`
- Hover: `hover:text-bright-blue` / `hover:border-bright-blue`
- Modal backdrop: `bg-white/85 backdrop-blur-sm`

---

## Data Files

### `data/quotes.json`

```json
[{ "text": "...", "author": "..." }]
```

Quote of the day selected by `dayOfYear % quotes.length`.

### `data/playlist.json`

```json
{
  "playlists": [{ "id": "...", "name": "...", "schedule": {...}, "items": [...], "isDefault": true }],
  "activePlaylistId": null
}
```

### `data/state.json`

```json
{
	"currentCycleIndex": 0,
	"lastSwitchTime": 1234567890000,
	"lastUpdate": "2026-01-01T00:00:00.000Z",
	"activePlaylistId": null,
	"batteryLevel": 85,
	"skipCache": {
		"{itemId}": { "shouldSkip": false, "cachedAt": 1234567890000, "weekKey": "2026-W10" }
	}
}
```

### `data/settings.json`

```json
{
	"weather": { "location": "Caldas da Rainha", "latitude": 39.4062, "longitude": -9.1364 },
	"calendar": { "icalUrl": "..." },
	"system": {
		"timezone": "Europe/Lisbon",
		"refreshInterval": 5,
		"startTime": "07:00",
		"endTime": "23:00",
		"bitDepth": 1
	}
}
```

---

## Environment Variables

```
BASE_URL=http://localhost:3000          # Used by render/display APIs for self-referencing URLs
HA_BASE_URL=http://homeassistant.local  # Home Assistant API base
HA_ACCESS_TOKEN=...                     # HA long-lived access token
```

---

## Known Patterns & Gotchas

- **File writes are queued** in `playlist.ts` via `saveQueue` to prevent race conditions. Always use `savePlaylistCollection()`, never write directly.
- **State writes use atomic copy** (tmp → copyFile → unlink) in `director.ts`. Same pattern should be used for any new state files.
- **Empty file guard**: `playlist.ts` checks for empty/corrupt JSON and recreates defaults. `director.ts` `getState()` needs the same guard (reminder: add it before `JSON.parse` if not already done).
- **`getPlaylist()` and `savePlaylist()`** are legacy functions that operate on the first playlist only. Prefer the collection-level functions for new code.
- **Screen pages skip the layout**: `app/layout.tsx` checks `pathname.startsWith('/screens/')` and renders children directly with no nav wrapper.
- **Simulator page** also skips layout and is excluded from nav.
- **Puppeteer in production** uses `/usr/bin/chromium-browser` (set via `executablePath` when `NODE_ENV === 'production'`).
- **iCal URLs**: normalize `webcal://` → `https://` before fetching (done in `lib/calendar.ts`).
- **IPMA weather API** uses a hardcoded location ID (`1100600` for Caldas da Rainha). Lat/lon from settings is only used for SunCalc sunrise/sunset — the IPMA forecast fetch still uses the hardcoded ID.

---

## Development

```bash
npm run dev     # Start dev server on :3000
npm run build   # Production build
npm start       # Start production server
```

Production runs in Docker on the mini PC at 192.168.1.135. Deployed via Docker Compose. Chromium must be installed in the container for Puppeteer (`/usr/bin/chromium-browser`).
