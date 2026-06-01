# Mundial 2026 — Sticker Collector

> Track your Panini FIFA World Cup 2026 album stickers. No account, no cloud, no QR codes. Just you and your stickers.

[![PWA](https://img.shields.io/badge/PWA-Installable-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Offline](https://img.shields.io/badge/Offline-Full%20Support-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Offline)

## Features

- **Virtualized grid** — all 960 album stickers rendered smoothly (color = have, grayscale = missing)
- **Quick-add mode** — one tap to register a sticker (+1)
- **Sticker detail** — full info with +/- controls and swipe navigation
- **Camera OCR** — point at the sticker number, Tesseract.js reads it, confirm to register
- **Duplicates** — list all duplicates and generate a shareable trade list
- **Progress stats** — completion %, per-team progress, "almost complete" highlights
- **Backup/restore** — export collection to JSON, import on another device
- **Offline-first** — works without internet after first load
- **Light/dark/system** theme

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript |
| Bundler | Vite |
| Styles | Tailwind CSS |
| State | Zustand |
| Persistence | Dexie.js (IndexedDB) |
| Virtualization | @tanstack/react-virtual |
| OCR | Tesseract.js |
| PWA | vite-plugin-pwa (Workbox) |
| Icons | lucide-react |
| Routing | react-router-dom |

## Getting Started

```bash
# Clone and enter
cd sticker-collector

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build
```

## Regenerate the Catalog

The catalog ships with 960 placeholder stickers. To regenerate with your own data:

```bash
node --import=tsx scripts/build-catalog.ts
```

This regenerates `public/data/catalog.2026.json` and placeholder images in `public/assets/stickers/`.

## Architecture

```
src/
├── data/
│   ├── types.ts      # TypeScript contracts
│   ├── db.ts         # Dexie schema (collection, meta, userImages)
│   └── catalog.ts    # Async catalog loader with validation
├── store/
│   └── collectionStore.ts   # Zustand — in-memory source of truth
├── components/       # Shared components
│   ├── AlbumGrid.tsx
│   ├── StickerCell.tsx
│   ├── FilterBar.tsx
│   └── BottomNav.tsx
└── features/
    ├── album/        # / — main grid
    ├── scan/         # /scan — camera + OCR
    ├── repes/        # /repes — duplicates + trade list
    ├── stats/        # /stats — progress
    ├── sticker/      # /sticker/:id — sticker detail
    └── settings/     # /settings — backup, theme, reset
```

## Disclaimer

This is an unofficial fan project and is not affiliated with Panini or FIFA. Placeholder images are for development only. See the [specs](./SPEC.md#13-consideraciones-legales) for full legal notes.