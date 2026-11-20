# L'Île de Mimi — Technical Specification

## 1. Architecture Overview

- **Type:** Pure static client-side **Progressive Web App (PWA)** — zero backend required.
- **Language & Localization:** **Canadian French (`fr-CA`)** for all player-facing text (`<html lang="fr-CA">`, `src/i18n/frCA.ts` centralized string dictionary so tone, accents, and Quebec/Canadian French phrasing stay consistent across HUD, modals, and Field Journal).
- **Language & Build:** **TypeScript** + **Vite** (fast builds, strict types, easy static deployment to GitHub Pages, Netlify, or Vercel).
- **Rendering:** **HTML5 Canvas 2D** with a custom **2.5D Isometric Projection Engine** and procedural/SVG-cached sprite rendering.
  - *Why custom Canvas 2D?* Zero heavy engine bundle size on mobile data, total control over crisp high-DPI (`devicePixelRatio`) rendering on Android phones, smooth day/night color grading, and seamless isometric depth-sorting (painter's algorithm).
- **Audio:** **Web Audio API** procedural synthesizer (pink-noise ocean waves & rain, filtered crackle for campfire, pentatonic kalimba/marimba chimes for UI & discoveries).

---

## 2. Project Structure

```text
L'Île de Mimi/
├── docs/
│   ├── GAME_DESIGN.md
│   ├── TECH_SPEC.md
│   └── ROADMAP.md
├── public/
│   ├── manifest.webmanifest      # PWA installability on Android
│   └── icons/                    # App icons
├── src/
│   ├── main.ts                   # Entry point, canvas & loop bootstrap
│   ├── game/
│   │   ├── GameState.ts          # Central serializable state + save/load
│   │   ├── TimeWeather.ts        # 20-min day/night cycle & rain state machine
│   │   └── AudioEngine.ts        # Web Audio API ambient & SFX synthesizer
│   ├── world/
│   │   ├── IsoMath.ts            # World <-> Screen isometric coordinate transforms
│   │   ├── TileMap.ts            # Island biomes, elevation, water, obstacles
│   │   ├── Pathfinder.ts         # A* grid pathfinding for tap-to-move
│   │   └── WorldData.ts          # Handcrafted island layout & spawn points
│   ├── entities/
│   │   ├── Player.ts             # Mimi movement, stamina, animations, tool use
│   │   ├── Flora.ts              # Plants, bloom conditions (sun/rain/night), regrowth
│   │   ├── Fauna.ts              # Friendly critters, roaming AI, pet/feed reactions
│   │   └── CampItem.ts           # Modular shelter stages & placeable camp furniture
│   ├── systems/
│   │   ├── Crafting.ts           # Recipes for tools, camp items, shelter upgrades
│   │   └── Journal.ts            # Field Journal entries & discovery triggers
│   ├── render/
│   │   ├── Renderer.ts           # Depth-sorted 2.5D render pipeline + lighting/stars
│   │   ├── ArtCache.ts           # Offscreen canvas/SVG procedural sprite caching
│   │   └── WeatherFX.ts          # Rain streaks, puddle ripples, fireflies, stars
│   └── ui/
│       ├── Hud.ts                # Mobile-first thumb-friendly HUD & stamina bar
│       ├── JournalModal.ts       # Illustrated Field Journal overlay
│       ├── CraftModal.ts         # Tool & Camp Building menu
│       └── SaveModal.ts          # Export/Import save code & file UI
└── index.html
```

---

## 3. Key Technical Systems

### 3.1 Isometric 2.5D Projection & Depth Sorting
- Standard 2:1 isometric tile geometry (`TILE_W = 64`, `TILE_H = 32` logical units, scaled cleanly by `devicePixelRatio` and camera zoom).
- **Painter's Algorithm:** All tiles, props, flora, fauna, camp items, and Mimi are sorted each frame by `(gridX + gridY)` (plus a small vertical tie-breaker for tall trees/shelters) so Mimi naturally walks *behind* palm trunks and *in front* of bushes.
- **ArtCache:** Procedural vector/canvas drawings (palm trees, hibiscus, capybaras, shelter stages) are pre-rendered once to offscreen canvases at startup so mobile frame rates stay locked at 60fps.

### 3.2 Mobile-First Input & Pathfinding
- **Tap-to-Move:** Screen tap converts via `IsoMath.screenToGrid(x, y)` to a target tile.
  - If the tapped tile holds an interactable (plant, critter, campfire, vine), Mimi pathfinds via **A\*** to the nearest adjacent walkable tile and automatically triggers the interaction on arrival.
  - Visual tap ripple feedback on the ground so touch input always feels responsive.
- **PC Support:** Mouse click mirrors tap; `WASD`/Arrow keys apply smooth directional velocity with tile collision sliding.
- **Viewport:** `user-scalable=no`, `touch-action: none` on the canvas, safe-area inset padding (`env(safe-area-inset-*)`) for modern Android notches/gesture bars.

### 3.3 Day/Night Lighting & Starry Sky
- `TimeWeather` tracks `timeOfDay` in `[0, 1)` over a 20-minute (`1200s`) cycle.
- **Lighting Pass:** An offscreen lighting canvas tints the scene smoothly across Dawn → Day → Sunset → Night, with radial warm cutouts (`globalCompositeOperation = 'destination-out'` / `'lighter'`) around campfires, paper lanterns, and Mimi's firefly lantern.
- **Starry Night:** At night, water tiles and sky margins reflect twinkling procedural stars, while glowing flora (Moonflowers, bioluminescent moss) emit soft colored halos.

### 3.4 Persistence & Cross-Device Saves
- **Auto-Save:** Debounced save to `localStorage` every 10 seconds and on `visibilitychange` / `pagehide` (crucial for Android Chrome tab suspension).
- **Versioned Save Schema:** `{ version: 1, timestamp, player, inventory, journal, camp, worldFlags, timeOfDay }`.
- **Export / Import:**
  - **Copy Save Code:** Compresses/encodes JSON into a shareable text string she can paste between her phone and PC.
  - **Download / Upload `.json`:** One-tap file backup.

### 3.5 PWA & Offline Support
- `manifest.webmanifest` with `display: "standalone"` so she can tap **"Add to Home Screen"** on Android Chrome and launch *L'Île de Mimi* like a native app.
- Simple Service Worker caching static assets for offline play (e.g., on a flight or train).
