# L'Île de Mimi — Game Design Document

> **Tagline:** A gentle, no-danger tropical island castaway game about exploration, discovery, and feeling at home in nature.

---

## 1. Vision & Golden Rules

**L'Île de Mimi** is a relaxing web game designed primarily for **Mimi** to play on her **Android phone** (with full support for **PC laptop**). She plays as herself, washed ashore on a lush, welcoming tropical island.

### The Golden Rules (Non-Negotiable)
1. **Zero Danger:** No monsters, no combat, no HP bar, no hypothermia, no poison, no starvation, and no game-over screens.
2. **Gentle Encouragement, Never Punishment:** A light Stamina system encourages Mimi to eat fresh fruit or nap in her hammock, but running low only makes her yawn and walk a little slower—never fainting or losing progress.
3. **One-Handed Mobile Comfort:** Every core action—walking, foraging, petting animals, crafting, and reading the Field Journal—works effortlessly with **tap-to-move & tap-to-interact** on a portrait or landscape phone screen.
4. **Nature Rewards Curiosity:** Time of day and weather aren't hazards; they are invitations. Rain brings out shimmering puddles and rain-blooming orchids; night reveals a canopy of stars and glowing moonflowers.
5. **Canadian French (`fr-CA`) Everywhere:** **All player-facing readable content** (UI, menus, notifications, Field Journal entries, item/biome names, rest prompts, and cozy flavor text) must be written in warm, natural **Canadian French** (*français québécois / canadien* — e.g., *« Se reposer jusqu'au matin »*, *« Carnet d'exploration »*, *« Un peu fatiguée… »*, *« Caresser le capybara »*).

---

## 2. Player & Controls

### Protagonist: Mimi
- Expressive, cozy 2.5D character sprite with idle animations (looking around, stretching, yawning when low on stamina, smiling after petting a critter or tasting fruit).
- Carries a subtle backpack/satchel and equips visible cozy tools (lantern at night, bamboo shears, watering/foraging basket).

### Controls
| Platform | Movement | Interaction | Camera / UI |
| :--- | :--- | :--- | :--- |
| **Android (Primary)** | Tap ground to walk (A* isometric pathfinding around obstacles) | Tap directly on plants, critters, camp stations, or glowing prompts | Pinch/buttons for subtle zoom; bottom-thumb-friendly HUD & Journal button |
| **PC Laptop** | Click-to-move **or** `WASD` / Arrow keys | Click target **or** `Space` / `E` near interactable | Mouse wheel zoom; `J` for Field Journal, `B` for Camp Build mode |

---

## 3. Cozy "Survival" & Stamina

- **Light Stamina Bar (Pep):** Displayed as a soft leaf/sunflower meter.
- **Using Stamina:** Chopping bamboo, clearing thick vines, or long sprints gently dip stamina. Walking and exploring cost nothing.
- **Low Stamina State:** Below ~20%, Mimi occasionally yawns and walks slightly slower—never locked out of playing.
- **Restoring Stamina:**
  - Eating foraged tropical fruits (coconut, mango, starfruit, roasted banana).
  - Resting in her **Hammock** or **Shelter** (also lets her choose to *"Rest until Morning"* or *"Rest until Starry Night"*).

---

## 4. World Structure & Biomes

The island is a continuous, handcrafted **2.5D isometric** paradise divided into interconnected zones unlocked naturally as Mimi crafts tools:

1. **L'Anse Ensoleillée *(Sunny Cove — Starting Area)***
   - Soft golden sand, gentle turquoise waves, driftwood, tidepools, palm trees, and friendly hermit crabs (*bernard-l'ermite*).
   - **La Clairière du Camp *(Scenic Camp Clearing)*:** Just inland from the beach—a flat, grassy glade overlooking the ocean where Mimi builds her shelter.
2. **La Bambouseraie Murmurante *(Whispering Bamboo Grove — Unlocked early)***
   - Tall swaying bamboo, dappled sunlight, mossy stepping stones, and curious capybaras.
   - Source of bamboo poles (*tiges de bambou*), supple reeds, and wild ginger.
3. **La Jungle aux Fougères *(Emerald Fern Jungle — Unlocked with Sécateur en bambou)***
   - Lush monstera, hanging air-plants, hidden waterfalls, hummingbirds (*colibris*), and rare rain-blooming orchids (*orchidée de pluie*).
4. **Le Lagon Étoilé *(Starlight Lagoon & Moonlit Cliffs — Unlocked with Kit de pont en bambou)***
   - Crystal freshwater pools, glowing tide-stones, sea turtles (*tortues de mer*), and cliffside overlooks perfect for stargazing.

---

## 5. Exploration, Flora & Friendly Fauna

### Illustrated Field Journal
Mimi's signature progression tracker. Every new discovery adds a hand-styled entry with a sketch, fun botanical/critter note, habitat, and bloom/active time.
- **Flora (~20–30 species):** Sun-loving hibiscus, spiral ferns, bioluminescent moss, **Moonflower** *(blooms only under the stars)*, **Raindrop Orchid** *(opens only during rain)*, giant water lilies, wild vanilla.
- **Friendly Fauna (~8–12 species):**
  - **Hermit Crabs** on the beach (scuttle happily, trade shiny shells for berries).
  - **Capybaras** near the grove/lagoon (love head pats, nap near campfires).
  - **Hummingbirds** in the jungle (hover near blooming flowers Mimi waters or discovers).
  - **Sea Turtles** at the lagoon (surface at dusk; Mimi can feed them sea-kelp).
  - **Fireflies** at night (gentle ambient companions that light up near flowers).
- **Trust & Gifts:** Petting or feeding critters raises their friendliness, occasionally leaving small gifts (rare seeds, smooth sea glass, feathers) by Mimi's camp.

---

## 6. Crafting, Tools & Modular Cozy Camp

### Cozy Tools (Progression)
- **Driftwood Stick / Hand Basket** *(Start)* — Pick up shells, driftwood, and low berries.
- **Bamboo Shears** — Part overgrown jungle vines (opens Emerald Fern Jungle) and harvest delicate flowers without harming them.
- **Bamboo Bridge Kit** — Place bridges across island streams (opens Starlight Lagoon).
- **Firefly / Coconut Lantern** — Automatically lights up at dusk, illuminating night trails and helping spot night-blooming flora.

### Modular Camp Building
On the **Scenic Camp Clearing** grid, Mimi can:
1. **Upgrade her Shelter in stages:**
   - *Stage 1:* Palm-Frond Lean-To
   - *Stage 2:* Woven Bamboo Hut
   - *Stage 3:* Cozy Tree-Deck Bungalow with warm paper lanterns
2. **Craft & Place Camp Items freely on the clearing grid:**
   - **Campfire** (roast fruit, warm glow at night, attracts capybaras)
   - **Hammock** (nap to restore stamina or skip to morning/night)
   - **Herbarium Table** (browse Field Journal & press rare flowers)
   - **Shell Windchime**, **Flower Planters**, **Tiki/Paper Lanterns**, **Woven Rug**

---

## 7. Atmosphere: Day/Night, Weather & Audio

- **20-Minute Day/Night Cycle:**
  - **Dawn** (warm peach & lavender light, morning birdsong)
  - **Day** (bright, lush greens and turquoise water)
  - **Golden Hour / Sunset** (amber shadows, fireflies waking up)
  - **Starry Night** (deep indigo sky, twinkling starfield & constellations, moonbeams on the water, glowing bioluminescent plants)
  - *Skip Ahead:* Resting in the hammock/shelter lets Mimi jump to Sunrise or Nightfall anytime so she never has to wait if she wants to stargaze or hunt night-blooms.
- **Weather:**
  - Mostly sunny with gentle drifting cloud shadows.
  - Occasional **Satisfying Tropical Rain**: soft diagonal rain streaks, expanding ripples on water and puddles, lush darker greens, rain-blooming orchids opening, and soothing rain audio.
- **Synthesized Web Audio (Zero external audio files):**
  - Gentle procedural ocean surf, soft wind through palms, rain patter, campfire crackle, footsteps on sand/grass/wood, and warm marimba/kalimba-like chimes when discovering new flora or petting critters.
  - Always includes a clear, easy mute/volume toggle for playing silently in bed.
