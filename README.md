# کتابخانه من — Book Archive

A personal, offline-first book library. All data (books, tags, notes, and cached
cover images) lives in the browser via IndexedDB — there is no server-side
database. The Next.js server only proxies iranketab.ir scraping, since browsers
block direct cross-origin fetches.

## Features

- **Import from iranketab.ir** — paste a book link or search by keyword; all
  editions of the work are shown and you pick yours. Name, author, translator,
  publisher, pages, Shamsi + Gregorian years, ISBN, trim size, binding, intro,
  and categories are scraped and fully editable before saving.
- **Manual entry** — everything can be entered by hand; covers via upload or URL.
- **Reading states** — queued (ordered, drag-to-rearrange queue) / reading / read.
- **Ownership** — physical / e-book / audio, plus a personal 1–5 star rating and
  free-form notes and tags.
- **Export / import** — full-fidelity JSON (covers embedded) or CSV for
  spreadsheets; merge or replace on import.
- **Offline** — service worker + cached cover blobs: after the first visit,
  browsing, editing, and the queue all work without a connection. Scraping new
  books naturally requires internet.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS 4 · Dexie (IndexedDB) ·
cheerio (server-side parsing) · Vazirmatn font · RTL Persian UI

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Deploy

The server is stateless, so any Node host works:

- **Vercel** — import the repo; the scrape routes (`/api/scrape/*`,
  `/api/proxy/image`) run as serverless functions.
- **VPS / Dokploy** — build and run the standard Next.js container
  (`pnpm build && pnpm start`, port 3000).

Your library lives in the browser, not on the server — moving hosts doesn't
move data. Use Settings → Export to back up or transfer between browsers.
