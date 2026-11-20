import type { GridPoint } from './IsoMath';
import { TileMap, type BiomeId, type PropType, type TerrainType, type TileData } from './TileMap';

export const ISLAND_WIDTH = 92;
export const ISLAND_HEIGHT = 84;

export const LEGACY_OFFSET_X = 24;
export const LEGACY_OFFSET_Y = 22;

export const PLAYER_SPAWN: GridPoint = { x: 44, y: 48 };

export const VINE_PASS_TILES: ReadonlyArray<GridPoint> = [
  { x: 38, y: 35 },
  { x: 38, y: 36 },
  { x: 38, y: 37 },
];

export const BRIDGE_TILES: ReadonlyArray<GridPoint> = [
  { x: 44, y: 31 },
  { x: 45, y: 31 },
  { x: 44, y: 32 },
  { x: 45, y: 32 },
];

export const MANGROVE_BOARDWALK_TILES: ReadonlyArray<GridPoint> = [
  { x: 65, y: 50 },
  { x: 66, y: 50 },
  { x: 65, y: 51 },
  { x: 66, y: 51 },
];

export const LIGHTHOUSE_POS: GridPoint = { x: 34, y: 11 };

export const CASCADE_MIST_GATE_TILES: ReadonlyArray<GridPoint> = [
  { x: 68, y: 32 },
  { x: 68, y: 33 },
  { x: 68, y: 34 },
  { x: 69, y: 32 },
  { x: 69, y: 33 },
  { x: 69, y: 34 },
];

export const CASCADE_WATERFALL_POS: GridPoint = { x: 79, y: 30 };

export const CHIME_STONE_POSITIONS: ReadonlyArray<{ step: 1 | 2 | 3; x: number; y: number }> = [
  { step: 1, x: 64, y: 31 },
  { step: 2, x: 66, y: 33 },
  { step: 3, x: 64, y: 35 },
];

export const OUTRIGGER_CHANNEL_TILES: ReadonlyArray<GridPoint> = [
  { x: 43, y: 54 },
  { x: 44, y: 54 },
  { x: 43, y: 55 },
  { x: 44, y: 55 },
  { x: 43, y: 56 },
  { x: 44, y: 56 },
  { x: 43, y: 57 },
  { x: 44, y: 57 },
  { x: 43, y: 58 },
  { x: 44, y: 58 },
  { x: 43, y: 59 },
  { x: 44, y: 59 },
];

export interface OutpostNookBounds {
  id: string;
  biome: Exclude<BiomeId, 'ocean'>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const SCENIC_OUTPOST_NOOKS: ReadonlyArray<OutpostNookBounds> = [
  { id: 'cliffs_overlook', biome: 'tradewindCliffs', minX: 38, maxX: 40, minY: 11, maxY: 12 },
  { id: 'atoll_overlook', biome: 'coralAtoll', minX: 46, maxX: 48, minY: 65, maxY: 66 },
  { id: 'springs_overlook', biome: 'hotSprings', minX: 59, maxX: 60, minY: 22, maxY: 23 },
  { id: 'ruins_overlook', biome: 'ancientRuins', minX: 15, maxX: 16, minY: 25, maxY: 26 },
  { id: 'cascade_overlook', biome: 'cascadePeaks', minX: 73, maxX: 75, minY: 35, maxY: 36 },
];

export const BIOME_SIGNPOSTS: Record<Exclude<BiomeId, 'ocean'>, GridPoint> = {
  cove: { x: 42, y: 47 },
  clearing: { x: 46, y: 39 },
  bambooGrove: { x: 54, y: 37 },
  fernJungle: { x: 33, y: 35 },
  starlightLagoon: { x: 43, y: 29 },
  hotSprings: { x: 59, y: 24 },
  mangrove: { x: 61, y: 49 },
  ancientRuins: { x: 22, y: 28 },
  tradewindCliffs: { x: 41, y: 15 },
  coralAtoll: { x: 42, y: 61 },
  cascadePeaks: { x: 72, y: 33 },
};

function hashVariant(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

interface PropPlacement {
  x: number;
  y: number;
  prop: PropType;
  walkable?: boolean;
}

const HANDCRAFTED_PROPS: PropPlacement[] = [
  // L'Anse Ensoleillée
  { x: 37, y: 44, prop: 'palm_tall' },
  { x: 38, y: 48, prop: 'palm_curved' },
  { x: 41, y: 43, prop: 'palm_curved' },
  { x: 47, y: 43, prop: 'palm_tall' },
  { x: 51, y: 45, prop: 'palm_curved' },
  { x: 50, y: 49, prop: 'palm_tall' },
  { x: 39, y: 50, prop: 'tidepool_Cluster' },
  { x: 49, y: 48, prop: 'tidepool_Cluster' },
  { x: 35, y: 46, prop: 'boulder' },
  { x: 53, y: 46, prop: 'boulder' },
  { x: 42, y: 42, prop: 'hibiscus' },
  { x: 46, y: 42, prop: 'hibiscus' },

  // La Clairière du Camp
  { x: 42, y: 39, prop: 'camp_sign' },
  { x: 44, y: 36, prop: 'camp_circle', walkable: true },
  { x: 39, y: 38, prop: 'palm_tall' },
  { x: 49, y: 34, prop: 'palm_curved' },
  { x: 40, y: 39, prop: 'hibiscus' },
  { x: 48, y: 38, prop: 'hibiscus' },
  { x: 40, y: 34, prop: 'fern' },
  { x: 48, y: 34, prop: 'fern' },
  { x: 42, y: 37, prop: 'wildflowers', walkable: true },
  { x: 46, y: 37, prop: 'wildflowers', walkable: true },
  { x: 43, y: 34, prop: 'wildflowers', walkable: true },
  { x: 46, y: 35, prop: 'wildflowers', walkable: true },

  // La Bambouseraie Murmurante
  { x: 52, y: 33, prop: 'fern' },
  { x: 57, y: 34, prop: 'fern' },
  { x: 55, y: 39, prop: 'fern' },
  { x: 51, y: 39, prop: 'boulder' },
  { x: 59, y: 37, prop: 'boulder' },
  { x: 53, y: 37, prop: 'wildflowers', walkable: true },
  { x: 56, y: 35, prop: 'wildflowers', walkable: true },

  // La Jungle aux Fougères (gated by vines at x=38, y=35..37)
  { x: 38, y: 35, prop: 'vine_barrier' },
  { x: 38, y: 36, prop: 'vine_barrier' },
  { x: 38, y: 37, prop: 'vine_barrier' },
  { x: 31, y: 33, prop: 'fern' },
  { x: 35, y: 33, prop: 'fern' },
  { x: 30, y: 38, prop: 'fern' },
  { x: 35, y: 39, prop: 'fern' },
  { x: 32, y: 36, prop: 'hibiscus' },
  { x: 31, y: 37, prop: 'hibiscus' },
  { x: 29, y: 36, prop: 'boulder' },
  { x: 36, y: 39, prop: 'boulder' },

  // Le Lagon Étoilé (gated by stream at y=31..32)
  { x: 44, y: 32, prop: 'bridge_post' },
  { x: 45, y: 32, prop: 'bridge_post' },
  { x: 44, y: 26, prop: 'water_lily' },
  { x: 45, y: 27, prop: 'water_lily' },
  { x: 41, y: 27, prop: 'glow_moss', walkable: true },
  { x: 47, y: 27, prop: 'glow_moss', walkable: true },
  { x: 39, y: 29, prop: 'boulder' },
  { x: 50, y: 29, prop: 'boulder' },

  // Les Sources Chaudes Brumeuses
  { x: 57, y: 19, prop: 'boulder' },
  { x: 67, y: 17, prop: 'boulder' },
  { x: 66, y: 23, prop: 'boulder' },
  { x: 60, y: 17, prop: 'glow_moss', walkable: true },
  { x: 64, y: 20, prop: 'glow_moss', walkable: true },

  // La Mangrove aux Racines Tressées
  { x: 65, y: 50, prop: 'bridge_post' },
  { x: 65, y: 51, prop: 'bridge_post' },
  { x: 59, y: 46, prop: 'mangrove_tree' },
  { x: 63, y: 53, prop: 'mangrove_tree' },
  { x: 69, y: 48, prop: 'mangrove_tree' },
  { x: 72, y: 53, prop: 'mangrove_tree' },
  { x: 65, y: 46, prop: 'water_lily' },
  { x: 66, y: 54, prop: 'water_lily' },

  // La Clairière aux Ruines Anciennes
  { x: 19, y: 25, prop: 'sundial' },
  { x: 15, y: 21, prop: 'stone_arch' },
  { x: 21, y: 21, prop: 'stone_arch' },
  { x: 23, y: 27, prop: 'stone_arch' },
  { x: 15, y: 26, prop: 'wildflowers', walkable: true },
  { x: 21, y: 25, prop: 'wildflowers', walkable: true },
  { x: 13, y: 25, prop: 'boulder' },
  { x: 24, y: 22, prop: 'boulder' },

  // Les Falaises des Alizés & Le Vieux Phare
  { x: LIGHTHOUSE_POS.x, y: LIGHTHOUSE_POS.y, prop: 'lighthouse_overgrown' },
  { x: 32, y: 14, prop: 'wildflowers', walkable: true },
  { x: 36, y: 13, prop: 'wildflowers', walkable: true },
  { x: 39, y: 14, prop: 'wildflowers', walkable: true },
  { x: 42, y: 12, prop: 'wildflowers', walkable: true },
  { x: 31, y: 10, prop: 'boulder' },
  { x: 44, y: 11, prop: 'boulder' },
  { x: 37, y: 9, prop: 'fern' },
  { x: 39, y: 11, prop: 'outpost_marker', walkable: true },

  // L'Atoll de Corail & Les Bancs de Sable
  { x: 45, y: 53, prop: 'outrigger_dock' },
  { x: 43, y: 54, prop: 'outrigger_post' },
  { x: 44, y: 54, prop: 'outrigger_post' },
  { x: 37, y: 66, prop: 'coral_reef' },
  { x: 41, y: 67, prop: 'coral_reef' },
  { x: 39, y: 68, prop: 'coral_reef' },
  { x: 31, y: 63, prop: 'tidepool_Cluster' },
  { x: 48, y: 69, prop: 'tidepool_Cluster' },
  { x: 30, y: 68, prop: 'boulder' },
  { x: 47, y: 65, prop: 'outpost_marker', walkable: true },
  { x: 59, y: 22, prop: 'outpost_marker', walkable: true },
  { x: 15, y: 25, prop: 'outpost_marker', walkable: true },

  // Foothills Chime Stones & Mist Gate -> Les Crêtes de la Cascade
  { x: 64, y: 31, prop: 'chime_stone_1' },
  { x: 66, y: 33, prop: 'chime_stone_2' },
  { x: 64, y: 35, prop: 'chime_stone_3' },
  { x: 68, y: 32, prop: 'mist_barrier' },
  { x: 68, y: 33, prop: 'mist_barrier' },
  { x: 68, y: 34, prop: 'mist_barrier' },
  { x: 69, y: 32, prop: 'mist_barrier' },
  { x: 69, y: 33, prop: 'mist_barrier' },
  { x: 69, y: 34, prop: 'mist_barrier' },

  // Les Crêtes de la Cascade
  { x: 83, y: 27, prop: 'mountain_cairn' },
  { x: 74, y: 35, prop: 'outpost_marker', walkable: true },
  { x: 73, y: 31, prop: 'fern' },
  { x: 76, y: 37, prop: 'fern' },
  { x: 82, y: 33, prop: 'boulder' },
  { x: 79, y: 25, prop: 'boulder' },
  { x: 84, y: 29, prop: 'wildflowers', walkable: true },
  { x: 76, y: 35, prop: 'wildflowers', walkable: true },

  // Trail Signposts (1 per biome)
  { x: BIOME_SIGNPOSTS.cove.x, y: BIOME_SIGNPOSTS.cove.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.clearing.x, y: BIOME_SIGNPOSTS.clearing.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.bambooGrove.x, y: BIOME_SIGNPOSTS.bambooGrove.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.fernJungle.x, y: BIOME_SIGNPOSTS.fernJungle.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.starlightLagoon.x, y: BIOME_SIGNPOSTS.starlightLagoon.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.hotSprings.x, y: BIOME_SIGNPOSTS.hotSprings.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.mangrove.x, y: BIOME_SIGNPOSTS.mangrove.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.ancientRuins.x, y: BIOME_SIGNPOSTS.ancientRuins.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.tradewindCliffs.x, y: BIOME_SIGNPOSTS.tradewindCliffs.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.coralAtoll.x, y: BIOME_SIGNPOSTS.coralAtoll.y, prop: 'trail_signpost' },
  { x: BIOME_SIGNPOSTS.cascadePeaks.x, y: BIOME_SIGNPOSTS.cascadePeaks.y, prop: 'trail_signpost' },
];

function createBaseTile(x: number, y: number): TileData {
  // Core 5 biomes shifted by (+24, +22)
  const coveDx = (x - 44.0) / 10.2;
  const coveDy = (y - 46.4) / 7.1;
  const bayIndent =
    Math.exp(-Math.pow((x - 44.2) / 4.2, 2)) * (y >= 48 ? (y - 47.5) * 0.14 : 0);
  const coveDist = Math.hypot(coveDx, coveDy) + bayIndent;

  const clearingDx = (x - 44.0) / 5.7;
  const clearingDy = (y - 36.3) / 3.9;
  const clearingDist = Math.hypot(clearingDx, clearingDy);

  const bambooDx = (x - 55.0) / 6.3;
  const bambooDy = (y - 36.0) / 5.2;
  const bambooDist = Math.hypot(bambooDx, bambooDy);

  const jungleDx = (x - 32.5) / 5.2;
  const jungleDy = (y - 36.0) / 5.3;
  const jungleDist = Math.hypot(jungleDx, jungleDy);

  const lagoonDx = (x - 44.5) / 8.0;
  const lagoonDy = (y - 27.2) / 3.6;
  const lagoonDist = Math.hypot(lagoonDx, lagoonDy);

  // New Milestone 6 biomes
  const springsDx = (x - 62.5) / 8.5;
  const springsDy = (y - 19.5) / 6.2;
  const springsDist = Math.hypot(springsDx, springsDy);

  const mangroveInnerDx = (x - 60.5) / 5.2;
  const mangroveInnerDy = (y - 50.0) / 6.8;
  const mangroveInnerDist = Math.hypot(mangroveInnerDx, mangroveInnerDy);

  const mangroveOuterDx = (x - 71.0) / 5.2;
  const mangroveOuterDy = (y - 51.0) / 5.8;
  const mangroveOuterDist = Math.hypot(mangroveOuterDx, mangroveOuterDy);

  const ruinsDx = (x - 18.5) / 7.6;
  const ruinsDy = (y - 24.5) / 6.0;
  const ruinsDist = Math.hypot(ruinsDx, ruinsDy);

  // New Milestone 7 biomes
  const cliffsDx = (x - 37.5) / 9.2;
  const cliffsDy = (y - 12.2) / 5.6;
  const cliffsDist = Math.hypot(cliffsDx, cliffsDy);

  const atollOuterDx = (x - 39.5) / 11.8;
  const atollOuterDy = (y - 67.0) / 7.5;
  const atollOuterDist = Math.hypot(atollOuterDx, atollOuterDy);

  const atollInnerDx = (x - 39.5) / 5.4;
  const atollInnerDy = (y - 66.8) / 3.2;
  const atollInnerDist = Math.hypot(atollInnerDx, atollInnerDy);

  // Mountain & Waterfall biome: Les Crêtes de la Cascade
  const cascadeBaseDx = (x - 76.5) / 7.6;
  const cascadeBaseDy = (y - 34.0) / 6.2;
  const cascadeBaseDist = Math.hypot(cascadeBaseDx, cascadeBaseDy);

  const cascadePeakDx = (x - 81.5) / 6.0;
  const cascadePeakDy = (y - 27.5) / 4.8;
  const cascadePeakDist = Math.hypot(cascadePeakDx, cascadePeakDy);

  let terrain: TerrainType = 'deep_water';
  let biome: BiomeId = 'ocean';
  let elevation = 0;
  let walkable = false;

  // 1. Connecting sandy slope between Cove & Clearing
  if (x >= 43 && x <= 45 && y >= 40 && y <= 42) {
    terrain = 'path';
    if (y === 40) {
      biome = 'clearing';
      elevation = 0.85;
    } else if (y === 41) {
      biome = 'cove';
      elevation = 0.68;
    } else {
      biome = 'cove';
      elevation = 0.52;
    }
    walkable = true;
  } else if (x === 38 && y >= 35 && y <= 37) {
    // 2. Vine-gated narrow pass into Fern Jungle
    terrain = 'path';
    biome = 'clearing';
    elevation = 1.03;
    walkable = true;
  } else if (y >= 31 && y <= 32 && x >= 36 && x <= 52) {
    // 3. Freshwater stream south of Starlight Lagoon
    terrain = 'shallow_water';
    biome = 'starlightLagoon';
    elevation = 0.88;
    walkable = false;
  } else if (x >= 56 && x <= 58 && y >= 24 && y <= 33) {
    // 4. Highland trail from Bamboo Grove -> Misty Thermal Hot Springs
    const t = Math.max(0, Math.min(1, (33 - y) / 9));
    terrain = 'path';
    biome = y <= 29 ? 'hotSprings' : 'bambooGrove';
    elevation = 1.04 + t * 0.91;
    walkable = true;
  } else if (
    (x >= 26 && x <= 30 && y >= 29 && y <= 33) ||
    (x >= 24 && x <= 26 && y >= 27 && y <= 30)
  ) {
    // 5. Stepped mossy trail from Fern Jungle -> Ancient Ruins
    const t = Math.max(0, Math.min(1, (30 - x) / 6));
    terrain = 'path';
    biome = x <= 26 ? 'ancientRuins' : 'fernJungle';
    elevation = 1.06 + t * 0.49;
    walkable = true;
  } else if (x >= 52 && x <= 57 && y >= 46 && y <= 48) {
    // 6. Tidal sandy trail from Sunny Cove east into Mangrove Estuary
    terrain = x <= 54 ? 'sand' : 'mangrove_mud';
    biome = x <= 54 ? 'cove' : 'mangrove';
    elevation = 0.4;
    walkable = true;
  } else if (x >= 65 && x <= 66 && y >= 42 && y <= 59) {
    // 7. Mangrove tidal stream separating inner & outer mangrove islets
    terrain = 'shallow_water';
    biome = 'mangrove';
    elevation = 0.14;
    walkable = false;
  } else if (x >= 41 && x <= 43 && y >= 17 && y <= 24) {
    // 7b. Cliffside switchback trail from Starlight Lagoon -> Tradewind Cliffs
    const t = Math.max(0, Math.min(1, (24 - y) / 7));
    terrain = 'path';
    biome = y <= 20 ? 'tradewindCliffs' : 'starlightLagoon';
    elevation = 1.12 + t * 1.23;
    walkable = true;
  } else if (x >= 43 && x <= 44 && y >= 54 && y <= 59) {
    // 7c. Shallow turquoise outrigger crossing from Sunny Cove -> Coral Atoll
    terrain = 'shallow_water';
    biome = y >= 57 ? 'coralAtoll' : 'cove';
    elevation = 0.08;
    walkable = false;
  } else if (cliffsDist <= 1.02 && x >= 28 && x <= 47 && y >= 6 && y <= 18) {
    // 7d. Les Falaises des Alizés & Le Vieux Phare
    biome = 'tradewindCliffs';
    if (cliffsDist <= 0.88) {
      terrain = 'cliff_meadow';
      elevation = 2.35;
      walkable = true;
    } else {
      terrain = 'rock';
      elevation = 2.05;
      walkable = false;
    }
  } else if (atollOuterDist <= 1.02 && y >= 59 && y <= 76) {
    // 7e. L'Atoll de Corail & Les Bancs de Sable
    biome = 'coralAtoll';
    if (atollInnerDist <= 0.96) {
      terrain = 'shallow_water';
      elevation = 0.08;
      walkable = false;
    } else if (atollOuterDist <= 0.88) {
      terrain = 'coral_sand';
      elevation = 0.34;
      walkable = true;
    } else {
      terrain = 'wet_sand';
      elevation = 0.18;
      walkable = true;
    }
  } else if (x >= 60 && x <= 67 && y >= 31 && y <= 35) {
    // 7f. Foothill sanctuary terrace with the 3 Chime Stones (accessible from Bamboo Grove)
    const t = Math.max(0, Math.min(1, (x - 60) / 7));
    terrain = x >= 63 ? 'path' : 'bamboo_grass';
    biome = 'bambooGrove';
    elevation = 1.04 + t * 0.46;
    walkable = true;
  } else if (x >= 68 && x <= 71 && y >= 32 && y <= 34) {
    // 7g. Mist-veiled mountain pass into Les Crêtes de la Cascade
    const t = Math.max(0, Math.min(1, (x - 67) / 4));
    terrain = 'path';
    biome = x >= 70 ? 'cascadePeaks' : 'bambooGrove';
    elevation = 1.5 + t * 0.45;
    walkable = true;
  } else if (x >= 74 && x <= 76 && y >= 27 && y <= 31) {
    // 7h. Mountain switchback trail from lower waterfall basin up to the peak
    const t = Math.max(0, Math.min(1, (31 - y) / 4));
    terrain = 'path';
    biome = 'cascadePeaks';
    elevation = 1.95 + t * 1.1;
    walkable = true;
  } else if (cascadePeakDist <= 1.02 && x >= 75 && x <= 88 && y >= 22 && y <= 32) {
    // 7i. Upper Mountain Peak & Waterfall Source
    biome = 'cascadePeaks';
    if ((x === 79 || x === 80) && y >= 28 && y <= 30) {
      terrain = 'cascade_pool';
      elevation = y === 28 ? 2.95 : y === 29 ? 2.55 : 2.15;
      walkable = false;
    } else if (cascadePeakDist <= 0.86) {
      terrain = (x + y) % 3 === 0 ? 'mountain_rock' : 'mountain_grass';
      elevation = 3.05;
      walkable = true;
    } else {
      terrain = 'mountain_rock';
      elevation = 2.75;
      walkable = false;
    }
  } else if (cascadeBaseDist <= 1.02 && x >= 69 && x <= 85 && y >= 27 && y <= 41) {
    // 7j. Lower Emerald Waterfall Basin & Overlook
    biome = 'cascadePeaks';
    if (x >= 77 && x <= 80 && y >= 31 && y <= 33) {
      terrain = 'cascade_pool';
      elevation = 1.82;
      walkable = false;
    } else if (cascadeBaseDist <= 0.88) {
      terrain = 'mountain_grass';
      elevation = 1.95;
      walkable = true;
    } else {
      terrain = 'mountain_rock';
      elevation = 1.72;
      walkable = false;
    }
  } else if (springsDist <= 1.02 && x >= 54 && y >= 13 && y <= 26) {
    // 8. Les Sources Chaudes Brumeuses
    biome = 'hotSprings';
    if (x >= 61 && x <= 63 && y >= 18 && y <= 19) {
      terrain = 'thermal_pool';
      elevation = 1.82;
      walkable = false;
    } else if (springsDist <= 0.88) {
      terrain = (x + y) % 3 === 0 ? 'lagoon_grass' : 'basalt_rock';
      elevation = 1.95;
      walkable = true;
    } else {
      terrain = 'basalt_rock';
      elevation = 1.7;
      walkable = false;
    }
  } else if (ruinsDist <= 1.02 && x <= 27 && y >= 17 && y <= 31) {
    // 9. La Clairière aux Ruines Anciennes
    biome = 'ancientRuins';
    if (x >= 16 && x <= 18 && y >= 23 && y <= 24) {
      terrain = 'shallow_water';
      elevation = 1.46;
      walkable = false;
    } else if (ruinsDist <= 0.88) {
      terrain = Math.abs(x - 19) <= 3 && Math.abs(y - 25) <= 3 ? 'ruin_stone' : 'lagoon_grass';
      elevation = 1.55;
      walkable = true;
    } else {
      terrain = 'rock';
      elevation = 1.38;
      walkable = false;
    }
  } else if (mangroveInnerDist <= 1.0 && x >= 56 && x <= 64 && y >= 43 && y <= 57) {
    // 10a. Inner Mangrove Estuary
    biome = 'mangrove';
    terrain = 'mangrove_mud';
    elevation = 0.38;
    walkable = mangroveInnerDist <= 0.92;
  } else if (mangroveOuterDist <= 1.0 && x >= 67 && x <= 76 && y >= 45 && y <= 57) {
    // 10b. Outer Mangrove Secret Islet (unlocked via boardwalk)
    biome = 'mangrove';
    terrain = 'mangrove_mud';
    elevation = 0.4;
    walkable = mangroveOuterDist <= 0.9;
  } else if (lagoonDist <= 1.02 && y >= 23 && y <= 30) {
    // 11. Le Lagon Étoilé
    biome = 'starlightLagoon';
    if (x >= 43 && x <= 46 && y >= 26 && y <= 27) {
      terrain = 'shallow_water';
      elevation = 0.96;
      walkable = false;
    } else if (lagoonDist <= 0.88) {
      terrain = 'lagoon_grass';
      elevation = 1.12;
      walkable = true;
    } else {
      terrain = 'rock';
      elevation = 0.98;
      walkable = false;
    }
  } else if (jungleDist <= 1.02 && x <= 37 && y >= 30 && y <= 41) {
    // 12. La Jungle aux Fougères
    biome = 'fernJungle';
    if (jungleDist <= 0.86 && y <= 40) {
      terrain = 'jungle_grass';
      elevation = 1.06;
      walkable = true;
    } else {
      terrain = 'rock';
      elevation = 0.92;
      walkable = false;
    }
  } else if (bambooDist <= 1.02 && x >= 50 && y >= 31 && y <= 41) {
    // 13. La Bambouseraie Murmurante
    biome = 'bambooGrove';
    if (bambooDist <= 0.88 && y <= 40) {
      terrain = 'bamboo_grass';
      elevation = 1.04;
      walkable = true;
    } else {
      terrain = 'rock';
      elevation = 0.9;
      walkable = false;
    }
  } else if (clearingDist <= 1.02 && x >= 38 && x <= 50 && y >= 33 && y <= 40) {
    // 14. La Clairière du Camp
    biome = 'clearing';
    if (x >= 40 && x <= 48 && y >= 34 && y <= 39) {
      terrain = 'clearing_grass';
      elevation = 1.0;
      walkable = true;
    } else if (y === 40) {
      terrain = 'rock';
      elevation = 0.78;
      walkable = false;
    } else if (x === 38 && (y === 33 || y === 34 || y === 38 || y === 39)) {
      terrain = 'rock';
      elevation = 0.86;
      walkable = false;
    } else {
      terrain = 'coastal_grass';
      elevation = 1.0;
      walkable = true;
    }
  } else if (coveDist <= 1.05 && y >= 41) {
    // 15. L'Anse Ensoleillée
    biome = 'cove';
    if (coveDist <= 0.78 && y <= 50) {
      terrain = 'sand';
      elevation = 0.45;
      walkable = true;
    } else if (coveDist <= 0.93) {
      terrain = 'wet_sand';
      elevation = 0.22;
      walkable = true;
    } else {
      terrain = 'shallow_water';
      elevation = 0.05;
      walkable = false;
    }
  } else {
    const overallDist = Math.min(
      coveDist,
      clearingDist,
      bambooDist,
      jungleDist,
      lagoonDist,
      springsDist,
      mangroveInnerDist,
      mangroveOuterDist,
      ruinsDist,
      cliffsDist,
      atollOuterDist,
      cascadeBaseDist,
      cascadePeakDist
    );
    if (overallDist <= 1.24) {
      terrain = 'shallow_water';
      biome = 'ocean';
      elevation = 0.04;
      walkable = false;
    }
  }

  // Open connection Clearing <-> Bamboo Grove
  if ((x === 49 || x === 50) && y >= 35 && y <= 38) {
    terrain = x === 49 ? 'clearing_grass' : 'bamboo_grass';
    biome = x === 49 ? 'clearing' : 'bambooGrove';
    elevation = x === 49 ? 1.0 : 1.04;
    walkable = true;
  }

  // Open connection West of Vine Pass into Fern Jungle
  if (x === 37 && y >= 35 && y <= 37) {
    terrain = 'jungle_grass';
    biome = 'fernJungle';
    elevation = 1.06;
    walkable = true;
  }

  // Bridge approaches North & South of Stream
  if ((x === 44 || x === 45) && y === 33) {
    terrain = 'clearing_grass';
    biome = 'clearing';
    elevation = 1.0;
    walkable = true;
  }
  if ((x === 44 || x === 45) && y === 30) {
    terrain = 'lagoon_grass';
    biome = 'starlightLagoon';
    elevation = 1.12;
    walkable = true;
  }

  // Mangrove boardwalk approaches
  if (x === 64 && (y === 50 || y === 51)) {
    terrain = 'mangrove_mud';
    biome = 'mangrove';
    elevation = 0.38;
    walkable = true;
  }
  if (x === 67 && (y === 50 || y === 51)) {
    terrain = 'mangrove_mud';
    biome = 'mangrove';
    elevation = 0.4;
    walkable = true;
  }

  // Tidepools along Sunny Cove
  if (
    (x === 39 && y === 50) ||
    (x === 40 && y === 50) ||
    (x === 48 && y === 49) ||
    (x === 49 && y === 48)
  ) {
    terrain = 'tidepool';
    biome = 'cove';
    elevation = 0.24;
    walkable = true;
  }

  // Beach entrance to central path
  if (x >= 43 && x <= 45 && y >= 43 && y <= 48) {
    terrain = 'sand';
    biome = 'cove';
    elevation = 0.45;
    walkable = true;
  }

  // Southern Cove departure beach to Coral Atoll outrigger crossing
  if (x >= 43 && x <= 45 && y >= 51 && y <= 53) {
    terrain = y === 53 ? 'wet_sand' : 'sand';
    biome = 'cove';
    elevation = y === 53 ? 0.24 : 0.38;
    walkable = true;
  }

  // Northern Coral Atoll landing beach
  if (x >= 42 && x <= 45 && y >= 60 && y <= 61) {
    terrain = 'coral_sand';
    biome = 'coralAtoll';
    elevation = 0.34;
    walkable = true;
  }

  return {
    x,
    y,
    terrain,
    biome,
    elevation,
    walkable,
    variant: hashVariant(x, y),
  };
}

export function createIslandTileMap(): TileMap {
  const grid: TileData[][] = [];

  for (let y = 0; y < ISLAND_HEIGHT; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < ISLAND_WIDTH; x++) {
      row.push(createBaseTile(x, y));
    }
    grid.push(row);
  }

  for (const placement of HANDCRAFTED_PROPS) {
    const tile = grid[placement.y]?.[placement.x];
    if (!tile) {
      continue;
    }
    if (placement.x === PLAYER_SPAWN.x && placement.y === PLAYER_SPAWN.y) {
      continue;
    }
    tile.prop = placement.prop;
    tile.propWalkable = Boolean(placement.walkable);
  }

  return new TileMap(ISLAND_WIDTH, ISLAND_HEIGHT, grid);
}

export function applyVineCutToTileMap(tileMap: TileMap): void {
  for (const pt of VINE_PASS_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.prop = undefined;
      tile.propWalkable = true;
      tile.walkable = true;
    }
  }
}

export function applyBridgeToTileMap(tileMap: TileMap): void {
  for (const pt of BRIDGE_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.terrain = 'wood_bridge';
      tile.elevation = 1.05;
      tile.walkable = true;
      tile.prop = undefined;
      tile.propWalkable = true;
    }
  }
}

export function applyMangroveBoardwalkToTileMap(tileMap: TileMap): void {
  for (const pt of MANGROVE_BOARDWALK_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.terrain = 'wood_bridge';
      tile.elevation = 0.42;
      tile.walkable = true;
      tile.prop = undefined;
      tile.propWalkable = true;
    }
  }
}

export function applyLighthouseRestoredToTileMap(tileMap: TileMap): void {
  const tile = tileMap.getTile(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.y);
  if (tile) {
    tile.prop = 'lighthouse_restored';
    tile.propWalkable = false;
  }
}

export function applyOutriggerLaunchedToTileMap(tileMap: TileMap): void {
  for (const pt of OUTRIGGER_CHANNEL_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.terrain = 'outrigger_channel';
      tile.elevation = 0.14;
      tile.walkable = true;
      tile.prop = undefined;
      tile.propWalkable = true;
    }
  }
}

export function applyCascadeMistClearedToTileMap(tileMap: TileMap): void {
  for (const pt of CASCADE_MIST_GATE_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.prop = undefined;
      tile.propWalkable = true;
      tile.walkable = true;
    }
  }
}

export function resetBarriersOnTileMap(tileMap: TileMap): void {
  for (const pt of VINE_PASS_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.prop = 'vine_barrier';
      tile.propWalkable = false;
      tile.walkable = true;
    }
  }
  for (const pt of BRIDGE_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.terrain = 'shallow_water';
      tile.elevation = 0.88;
      tile.walkable = false;
      tile.prop = pt.y === 32 ? 'bridge_post' : undefined;
      tile.propWalkable = false;
    }
  }
  for (const pt of MANGROVE_BOARDWALK_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.terrain = 'shallow_water';
      tile.elevation = 0.14;
      tile.walkable = false;
      tile.prop = pt.x === 65 ? 'bridge_post' : undefined;
      tile.propWalkable = false;
    }
  }
  const lighthouseTile = tileMap.getTile(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.y);
  if (lighthouseTile) {
    lighthouseTile.prop = 'lighthouse_overgrown';
    lighthouseTile.propWalkable = false;
  }
  for (const pt of OUTRIGGER_CHANNEL_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.terrain = 'shallow_water';
      tile.elevation = 0.08;
      tile.walkable = false;
      tile.prop = pt.y === 54 ? 'outrigger_post' : undefined;
      tile.propWalkable = false;
    }
  }
  for (const pt of CASCADE_MIST_GATE_TILES) {
    const tile = tileMap.getTile(pt.x, pt.y);
    if (tile) {
      tile.prop = 'mist_barrier';
      tile.propWalkable = false;
      tile.walkable = true;
    }
  }
}
