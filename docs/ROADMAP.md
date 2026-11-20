# L'Île de Mimi — Implementation Roadmap

Build the game incrementally in **7 playable milestones**. Each milestone should be testable on both a desktop browser and an Android phone viewport.

---

## Milestone 1: Walkable 2.5D Island & Tap-to-Move
**Goal:** Open the page and walk Mimi around a sunny tropical beach & clearing.
- [x] Initialize Vite + TypeScript project with responsive high-DPI Canvas & mobile viewport meta tags.
- [x] Implement `IsoMath` (2:1 isometric projection) and `TileMap` with sand, shallow water, grass, and palm trees.
- [x] Implement `Player` (Mimi sprite) with A* pathfinding for **tap-to-move** (plus `WASD`/click on PC) and tap ripple feedback.
- [x] Implement smooth camera follow + depth-sorted rendering (`ArtCache` for tiles, palms, and Mimi).

## Milestone 2: Gathering, Stamina & Modular Cozy Camp
**Goal:** Core cozy loop—forage fruit, manage light stamina, and build/upgrade camp.
- [x] Add forageable plants & resources (coconuts, mangoes, driftwood, bamboo, shells) with regrowth timers.
- [x] Implement **Light Stamina** (yawn & gentle slow-down when low; eat fruit or nap to restore).
- [x] Build the **Scenic Camp Clearing** with grid placement for **Campfire**, **Hammock**, and **Shelter Stage 1 (Lean-To)**.
- [x] Add `localStorage` auto-save + **Export/Import Save** modal.

## Milestone 3: Day/Night Cycle, Starry Sky, Rain & Audio
**Goal:** Make the island feel alive, lush, and deeply relaxing.
- [x] Implement 20-minute `TimeWeather` cycle (Dawn → Day → Sunset → Starry Night) + Hammock "Rest until Morning/Night" option.
- [x] Add dynamic night lighting, warm campfire/lantern glow, and twinkling **Starry Night** sky & water reflections.
- [x] Add occasional **Tropical Rain** (rain streaks, puddle ripples, lush tint).
- [x] Implement `AudioEngine` (Web Audio API ocean surf, rain, campfire crackle, footsteps, cozy discovery chimes) + mute toggle.

## Milestone 4: Field Journal, Reactive Flora & Friendly Fauna
**Goal:** Reward exploration and curiosity across all biomes.
- [x] Expand island map with **Whispering Bamboo Grove**, **Emerald Fern Jungle**, and **Starlight Lagoon**.
- [x] Add **Bamboo Shears** (cut vines) and **Bamboo Bridge Kit** (cross streams) + **Firefly Lantern** (night glow).
- [x] Add **Moonflowers** (bloom only at night) and **Raindrop Orchids** (bloom only in rain).
- [x] Add **Friendly Fauna** (hermit crabs, capybaras, hummingbirds, sea turtles, fireflies) with pet/feed interactions, trust, and small gifts.
- [x] Build the **Illustrated Field Journal** UI tracking all discovered flora and fauna.

## Milestone 5: Camp Upgrades, Polish & PWA Packaging
**Goal:** Complete the cozy progression and make it effortless to install on Mimi's Android phone.
- [x] Add Shelter Upgrades (**Bamboo Hut** → **Tree-Deck Bungalow**) and decorative camp items (windchime, flower planters, woven rug, paper lanterns).
- [x] Polish mobile HUD ergonomics (thumb-friendly buttons, safe-area padding, smooth modals).
- [x] Add `manifest.webmanifest`, app icons, and offline Service Worker for Android "Add to Home Screen".

## Milestone 6: Grand Island Expansion, Hot Springs, Mangrove, Ruins & Map
**Goal:** Scale the island to a rich `92×84` world with three new interconnected biomes, interactive exploration map, and quick-travel signposts.
- [x] Expand world grid to **`92×84`** with multi-tiered elevations (`z = 0` to `2.5`) while preserving existing camp & player coordinates cleanly across saves.
- [x] Add **Les Sources Chaudes Brumeuses** *(Misty Thermal Hot Springs)* with volcanic basalt pools, rising steam wisps, stamina-soothing waters, *Lotus rose*, *Fougère dorée*, and *Rainettes émeraude* (plus soaking capybaras).
- [x] Add **La Mangrove aux Racines Tressées** *(Woven Mangrove Estuary)* with arching stilt roots, boardwalk bridge extensions, *Vanille sauvage*, night-glowing *Champignons luisants*, and *Spatules rosées*.
- [x] Add **La Clairière aux Ruines Anciennes** *(Sunlit Mossy Ruins)* with overgrown stone arches, reflection pools, and Golden Hour sundials.
- [x] Add **Illustrated Island Map (`🗺️ Carte` / `M`)** with fog-of-war discovery, camp/biome markers, and repairable **Trail Signposts** for cozy quick-travel between landmarks.

## Milestone 7: Tradewind Cliffs, Restored Lighthouse, Coral Atoll & Bioluminescent Tides
**Goal:** Crown the island with coastal cliffs, a working lighthouse, outer sandbar islets, scenic outpost nooks, and magical night tides.
- [x] Add **Les Falaises des Alizés & Le Vieux Phare** *(Tradewind Cliffs & Overgrown Lighthouse)* with wildflower meadows, *Oiseau de paradis*, *Frangipanier*, *Toucan arc-en-ciel*, and a restorable lighthouse casting a warm ocean beam at night.
- [x] Add **L'Atoll de Corail & Les Bancs de Sable** *(Coral Atoll & Sandbar Islets)* reachable via craftable **Pirogue en bambou** (*Bamboo Outrigger*) or shallow sandbars, with *Palmier nain*, *Étoile de mer bleue*, and *Raie manta*.
- [x] Add **Scenic Outpost Nooks** allowing hammocks, paper lanterns, and woven picnic rugs to be placed at designated overlooks in the new biomes.
- [x] Add **Bioluminescent Tide Nights** washing up rare **Verre de mer** (*Sea Glass*) along glowing neon-blue shorelines, plus matching **Field Journal** entries (`25+` total species).

---
