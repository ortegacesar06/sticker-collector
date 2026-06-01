# Mundial 2026 — Sticker Collector

> App para registrar los cromos del álbum Panini FIFA World Cup 2026. Sin cuenta, sin nube, sin código QR. Solo vos y tus cromos.

[![PWA](https://img.shields.io/badge/PWA-Installable-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Offline](https://img.shields.io/badge/Offline-Full%20Support-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Offline)

## Demo

Abrí `http://localhost:5173` después de levantar el proyecto, o instalá la PWA en tu celular para la experiencia completa.

## Qué hace

- **Grilla virtualizada** con los 960 cromos del álbum — a color los que tenés, en blanco y negro los que faltan
- **Registro rápido** (un toque = +1 cromo) y modo detalle con +/-
- **Escaneo por cámara** — apuntás al número del cromo, el OCR lo detecta y lo registra
- **Repetidos** — список всех duplicates + генерация списка для обмена
- **Estadísticas** — porcentaje completado, progreso por equipo, destacados "casi completo"
- **Backup** — exportás tu colección a JSON, la importás en otro dispositivo
- **Offline** — funciona sin internet después de la primera carga
- **Tema claro/oscuro** con preferencia del sistema

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript |
| Bundler | Vite |
| Estilos | Tailwind CSS |
| Estado | Zustand |
| Persistencia | Dexie.js (IndexedDB) |
| Virtualización | @tanstack/react-virtual |
| OCR | Tesseract.js |
| PWA | vite-plugin-pwa (Workbox) |
| Iconos | lucide-react |
| Routing | react-router-dom |

## Primeros pasos

```bash
# Clonar y entrar
cd sticker-collector

# Instalar dependencias
npm install

# Levantar en desarrollo
npm run dev

# Tests
npm test

# Build de producción
npm run build
```

## Regenerar el catálogo

El catálogo tiene 960 cromos placeholder por defecto. Si tenés el checklist real:

```bash
node --import=tsx scripts/build-catalog.ts
```

Esto regenera `public/data/catalog.2026.json` y las imágenes placeholder en `public/assets/stickers/`.

## Arquitectura

```
src/
├── data/
│   ├── types.ts      # Contratos TypeScript
│   ├── db.ts         # Schema Dexie (collection, meta, userImages)
│   └── catalog.ts    # Loader del catálogo con validación
├── store/
│   └── collectionStore.ts   # Zustand — fuente de verdad en memoria
├── components/       # Componentes shared
│   ├── AlbumGrid.tsx
│   ├── StickerCell.tsx
│   ├── FilterBar.tsx
│   └── BottomNav.tsx
└── features/
    ├── album/        # / — grilla principal
    ├── scan/         # /scan — cámara + OCR
    ├── repes/        # /repes — duplicados + lista de intercambio
    ├── stats/        # /stats — progreso
    ├── sticker/      # /sticker/:id — detalle del cromo
    └── settings/     # /settings — backup, tema, reset
```

## Disclaimer

Este es un proyecto de fans, no está afiliado a Panini ni a FIFA. Las imágenes placeholder son solo para desarrollo. Ver [consideraciones legales](https://github.com/ortegacesar06/sticker-collector/blob/main/SPEC.md#13-consideraciones-legales) en las specs para más detalles.