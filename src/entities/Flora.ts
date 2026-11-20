import type { TimeWeather } from '../game/TimeWeather';

export type ResourceId =
  | 'coconut'
  | 'mango'
  | 'starfruit'
  | 'pink_guava'
  | 'driftwood'
  | 'bamboo'
  | 'shell'
  | 'sea_glass'
  | 'roasted_fruit';

export type HarvestableResourceId = Exclude<ResourceId, 'roasted_fruit'>;

export type FloraSpeciesId =
  | 'coconut_palm'
  | 'mango_tree'
  | 'bamboo_clump'
  | 'hibiscus'
  | 'fern'
  | 'wild_ginger'
  | 'monstera'
  | 'raindrop_orchid'
  | 'moonflower'
  | 'starfruit_tree'
  | 'thermal_lotus'
  | 'golden_fern'
  | 'wild_vanilla'
  | 'glow_mushroom'
  | 'frangipani'
  | 'bird_of_paradise'
  | 'dwarf_palm'
  | 'mist_begonia'
  | 'mountain_guava';

export type FloraNodeType =
  | 'coconut_palm'
  | 'mango_tree'
  | 'bamboo_clump'
  | 'starfruit_tree'
  | 'driftwood_spot'
  | 'shell_spot'
  | 'sea_glass_spot'
  | 'wild_ginger_node'
  | 'monstera_node'
  | 'raindrop_orchid_node'
  | 'moonflower_node'
  | 'thermal_lotus_node'
  | 'golden_fern_node'
  | 'wild_vanilla_node'
  | 'glow_mushroom_node'
  | 'frangipani_tree'
  | 'bird_of_paradise_node'
  | 'dwarf_palm_node'
  | 'mist_begonia_node'
  | 'mountain_guava_tree';

export type BloomCondition = 'always' | 'night' | 'rain' | 'biolum_tide';

export interface FloraNodeData {
  id: string;
  type: FloraNodeType;
  speciesId?: FloraSpeciesId;
  resource?: HarvestableResourceId;
  bloomCondition: BloomCondition;
  gx: number;
  gy: number;
  walkable: boolean;
  regrowDuration: number;
  regrowTimer: number;
  staminaCost: number;
}

export interface SerializedFloraState {
  id: string;
  regrowTimer: number;
}

export function createInitialFloraNodes(): FloraNodeData[] {
  return [
    // Coconuts — L'Anse Ensoleillée
    {
      id: 'coco_1',
      type: 'coconut_palm',
      speciesId: 'coconut_palm',
      resource: 'coconut',
      bloomCondition: 'always',
      gx: 39,
      gy: 45,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
    {
      id: 'coco_2',
      type: 'coconut_palm',
      speciesId: 'coconut_palm',
      resource: 'coconut',
      bloomCondition: 'always',
      gx: 49,
      gy: 44,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
    {
      id: 'coco_3',
      type: 'coconut_palm',
      speciesId: 'coconut_palm',
      resource: 'coconut',
      bloomCondition: 'always',
      gx: 40,
      gy: 42,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
    {
      id: 'coco_4',
      type: 'coconut_palm',
      speciesId: 'coconut_palm',
      resource: 'coconut',
      bloomCondition: 'always',
      gx: 47,
      gy: 46,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },

    // Driftwood — L'Anse Ensoleillée
    {
      id: 'drift_1',
      type: 'driftwood_spot',
      resource: 'driftwood',
      bloomCondition: 'always',
      gx: 41,
      gy: 47,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'drift_2',
      type: 'driftwood_spot',
      resource: 'driftwood',
      bloomCondition: 'always',
      gx: 48,
      gy: 46,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'drift_3',
      type: 'driftwood_spot',
      resource: 'driftwood',
      bloomCondition: 'always',
      gx: 42,
      gy: 49,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'drift_4',
      type: 'driftwood_spot',
      resource: 'driftwood',
      bloomCondition: 'always',
      gx: 46,
      gy: 48,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },

    // Shells — L'Anse Ensoleillée
    {
      id: 'shell_1',
      type: 'shell_spot',
      resource: 'shell',
      bloomCondition: 'always',
      gx: 38,
      gy: 49,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'shell_2',
      type: 'shell_spot',
      resource: 'shell',
      bloomCondition: 'always',
      gx: 43,
      gy: 50,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'shell_3',
      type: 'shell_spot',
      resource: 'shell',
      bloomCondition: 'always',
      gx: 46,
      gy: 49,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'shell_4',
      type: 'shell_spot',
      resource: 'shell',
      bloomCondition: 'always',
      gx: 48,
      gy: 48,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },

    // Mangoes — La Clairière du Camp
    {
      id: 'mango_1',
      type: 'mango_tree',
      speciesId: 'mango_tree',
      resource: 'mango',
      bloomCondition: 'always',
      gx: 41,
      gy: 35,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
    {
      id: 'mango_2',
      type: 'mango_tree',
      speciesId: 'mango_tree',
      resource: 'mango',
      bloomCondition: 'always',
      gx: 47,
      gy: 36,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
    {
      id: 'mango_3',
      type: 'mango_tree',
      speciesId: 'mango_tree',
      resource: 'mango',
      bloomCondition: 'always',
      gx: 46,
      gy: 38,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },

    // Bamboo & Wild Ginger — La Bambouseraie Murmurante
    {
      id: 'bamboo_1',
      type: 'bamboo_clump',
      speciesId: 'bamboo_clump',
      resource: 'bamboo',
      bloomCondition: 'always',
      gx: 52,
      gy: 35,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.08,
    },
    {
      id: 'bamboo_2',
      type: 'bamboo_clump',
      speciesId: 'bamboo_clump',
      resource: 'bamboo',
      bloomCondition: 'always',
      gx: 54,
      gy: 34,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.08,
    },
    {
      id: 'bamboo_3',
      type: 'bamboo_clump',
      speciesId: 'bamboo_clump',
      resource: 'bamboo',
      bloomCondition: 'always',
      gx: 56,
      gy: 37,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.08,
    },
    {
      id: 'bamboo_4',
      type: 'bamboo_clump',
      speciesId: 'bamboo_clump',
      resource: 'bamboo',
      bloomCondition: 'always',
      gx: 58,
      gy: 35,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.08,
    },
    {
      id: 'ginger_1',
      type: 'wild_ginger_node',
      speciesId: 'wild_ginger',
      bloomCondition: 'always',
      gx: 53,
      gy: 34,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'ginger_2',
      type: 'wild_ginger_node',
      speciesId: 'wild_ginger',
      bloomCondition: 'always',
      gx: 57,
      gy: 38,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },

    // Monstera & Raindrop Orchids — La Jungle aux Fougères
    {
      id: 'monstera_1',
      type: 'monstera_node',
      speciesId: 'monstera',
      bloomCondition: 'always',
      gx: 32,
      gy: 34,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'monstera_2',
      type: 'monstera_node',
      speciesId: 'monstera',
      bloomCondition: 'always',
      gx: 34,
      gy: 38,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'orchid_1',
      type: 'raindrop_orchid_node',
      speciesId: 'raindrop_orchid',
      bloomCondition: 'rain',
      gx: 33,
      gy: 37,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'orchid_2',
      type: 'raindrop_orchid_node',
      speciesId: 'raindrop_orchid',
      bloomCondition: 'rain',
      gx: 31,
      gy: 35,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },

    // Moonflowers & Starfruit — Le Lagon Étoilé
    {
      id: 'moonflower_1',
      type: 'moonflower_node',
      speciesId: 'moonflower',
      bloomCondition: 'night',
      gx: 41,
      gy: 26,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'moonflower_2',
      type: 'moonflower_node',
      speciesId: 'moonflower',
      bloomCondition: 'night',
      gx: 48,
      gy: 26,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'starfruit_1',
      type: 'starfruit_tree',
      speciesId: 'starfruit_tree',
      resource: 'starfruit',
      bloomCondition: 'always',
      gx: 40,
      gy: 28,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
    {
      id: 'starfruit_2',
      type: 'starfruit_tree',
      speciesId: 'starfruit_tree',
      resource: 'starfruit',
      bloomCondition: 'always',
      gx: 49,
      gy: 27,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },

    // Thermal Lotus & Golden Fern — Les Sources Chaudes Brumeuses
    {
      id: 'lotus_1',
      type: 'thermal_lotus_node',
      speciesId: 'thermal_lotus',
      bloomCondition: 'always',
      gx: 60,
      gy: 19,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.01,
    },
    {
      id: 'lotus_2',
      type: 'thermal_lotus_node',
      speciesId: 'thermal_lotus',
      bloomCondition: 'always',
      gx: 64,
      gy: 18,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.01,
    },
    {
      id: 'gfern_1',
      type: 'golden_fern_node',
      speciesId: 'golden_fern',
      bloomCondition: 'always',
      gx: 58,
      gy: 21,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'gfern_2',
      type: 'golden_fern_node',
      speciesId: 'golden_fern',
      bloomCondition: 'always',
      gx: 65,
      gy: 22,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },

    // Wild Vanilla & Night Glow Mushrooms — La Mangrove aux Racines Tressées
    {
      id: 'vanilla_1',
      type: 'wild_vanilla_node',
      speciesId: 'wild_vanilla',
      bloomCondition: 'always',
      gx: 62,
      gy: 47,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'vanilla_2',
      type: 'wild_vanilla_node',
      speciesId: 'wild_vanilla',
      bloomCondition: 'always',
      gx: 68,
      gy: 51,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'mushroom_1',
      type: 'glow_mushroom_node',
      speciesId: 'glow_mushroom',
      bloomCondition: 'night',
      gx: 70,
      gy: 49,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'mushroom_2',
      type: 'glow_mushroom_node',
      speciesId: 'glow_mushroom',
      bloomCondition: 'night',
      gx: 71,
      gy: 52,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'drift_5',
      type: 'driftwood_spot',
      resource: 'driftwood',
      bloomCondition: 'always',
      gx: 60,
      gy: 52,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'shell_5',
      type: 'shell_spot',
      resource: 'shell',
      bloomCondition: 'always',
      gx: 68,
      gy: 49,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },

    // Frangipani & Mangoes — La Clairière aux Ruines Anciennes
    {
      id: 'frangipani_1',
      type: 'frangipani_tree',
      speciesId: 'frangipani',
      bloomCondition: 'always',
      gx: 14,
      gy: 22,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'frangipani_2',
      type: 'frangipani_tree',
      speciesId: 'frangipani',
      bloomCondition: 'always',
      gx: 22,
      gy: 23,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'mango_4',
      type: 'mango_tree',
      speciesId: 'mango_tree',
      resource: 'mango',
      bloomCondition: 'always',
      gx: 17,
      gy: 27,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },

    // Bird of Paradise & Frangipani — Les Falaises des Alizés
    {
      id: 'bop_1',
      type: 'bird_of_paradise_node',
      speciesId: 'bird_of_paradise',
      bloomCondition: 'always',
      gx: 35,
      gy: 14,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'bop_2',
      type: 'bird_of_paradise_node',
      speciesId: 'bird_of_paradise',
      bloomCondition: 'always',
      gx: 41,
      gy: 11,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'frangipani_3',
      type: 'frangipani_tree',
      speciesId: 'frangipani',
      bloomCondition: 'always',
      gx: 33,
      gy: 12,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },

    // Dwarf Palms & Shells — L'Atoll de Corail
    {
      id: 'dpalm_1',
      type: 'dwarf_palm_node',
      speciesId: 'dwarf_palm',
      resource: 'coconut',
      bloomCondition: 'always',
      gx: 32,
      gy: 65,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'dpalm_2',
      type: 'dwarf_palm_node',
      speciesId: 'dwarf_palm',
      resource: 'coconut',
      bloomCondition: 'always',
      gx: 47,
      gy: 63,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'dpalm_3',
      type: 'dwarf_palm_node',
      speciesId: 'dwarf_palm',
      resource: 'coconut',
      bloomCondition: 'always',
      gx: 39,
      gy: 72,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.05,
    },
    {
      id: 'shell_6',
      type: 'shell_spot',
      resource: 'shell',
      bloomCondition: 'always',
      gx: 35,
      gy: 71,
      walkable: true,
      regrowDuration: 35,
      regrowTimer: 0,
      staminaCost: 0.05,
    },

    // Sea Glass — Washes up during Bioluminescent Tide Nights
    {
      id: 'seaglass_1',
      type: 'sea_glass_spot',
      resource: 'sea_glass',
      bloomCondition: 'biolum_tide',
      gx: 41,
      gy: 51,
      walkable: true,
      regrowDuration: 40,
      regrowTimer: 0,
      staminaCost: 0.03,
    },
    {
      id: 'seaglass_2',
      type: 'sea_glass_spot',
      resource: 'sea_glass',
      bloomCondition: 'biolum_tide',
      gx: 47,
      gy: 50,
      walkable: true,
      regrowDuration: 40,
      regrowTimer: 0,
      staminaCost: 0.03,
    },
    {
      id: 'seaglass_3',
      type: 'sea_glass_spot',
      resource: 'sea_glass',
      bloomCondition: 'biolum_tide',
      gx: 33,
      gy: 69,
      walkable: true,
      regrowDuration: 40,
      regrowTimer: 0,
      staminaCost: 0.03,
    },
    {
      id: 'seaglass_4',
      type: 'sea_glass_spot',
      resource: 'sea_glass',
      bloomCondition: 'biolum_tide',
      gx: 45,
      gy: 70,
      walkable: true,
      regrowDuration: 40,
      regrowTimer: 0,
      staminaCost: 0.03,
    },

    // Mist Begonia & Mountain Guava — Les Crêtes de la Cascade
    {
      id: 'begonia_1',
      type: 'mist_begonia_node',
      speciesId: 'mist_begonia',
      bloomCondition: 'always',
      gx: 75,
      gy: 32,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'begonia_2',
      type: 'mist_begonia_node',
      speciesId: 'mist_begonia',
      bloomCondition: 'always',
      gx: 81,
      gy: 34,
      walkable: false,
      regrowDuration: 30,
      regrowTimer: 0,
      staminaCost: 0.02,
    },
    {
      id: 'guava_1',
      type: 'mountain_guava_tree',
      speciesId: 'mountain_guava',
      resource: 'pink_guava',
      bloomCondition: 'always',
      gx: 74,
      gy: 37,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
    {
      id: 'guava_2',
      type: 'mountain_guava_tree',
      speciesId: 'mountain_guava',
      resource: 'pink_guava',
      bloomCondition: 'always',
      gx: 82,
      gy: 29,
      walkable: false,
      regrowDuration: 45,
      regrowTimer: 0,
      staminaCost: 0.06,
    },
  ];
}

export function isFloraReady(node: FloraNodeData): boolean {
  return node.regrowTimer <= 0;
}

export function isFloraBlooming(node: FloraNodeData, timeWeather: TimeWeather): boolean {
  if (node.bloomCondition === 'night') {
    return timeWeather.getPhase() === 'night' || timeWeather.isNightLanternActive();
  }
  if (node.bloomCondition === 'rain') {
    return timeWeather.weather === 'rain' || timeWeather.rainIntensity >= 0.35;
  }
  if (node.bloomCondition === 'biolum_tide') {
    return timeWeather.isBioluminescentTideActive();
  }
  return true;
}

export function updateFloraNodes(nodes: FloraNodeData[], dt: number): void {
  for (const node of nodes) {
    if (node.regrowTimer > 0) {
      node.regrowTimer = Math.max(0, node.regrowTimer - dt);
    }
  }
}

export function harvestFloraNode(node: FloraNodeData): HarvestableResourceId | null {
  if (!isFloraReady(node)) {
    return null;
  }
  node.regrowTimer = node.regrowDuration;
  return node.resource ?? null;
}

export function serializeFloraNodes(nodes: FloraNodeData[]): SerializedFloraState[] {
  return nodes
    .filter((n) => n.regrowTimer > 0)
    .map((n) => ({
      id: n.id,
      regrowTimer: Number(n.regrowTimer.toFixed(2)),
    }));
}

export function restoreFloraNodes(
  nodes: FloraNodeData[],
  saved: SerializedFloraState[]
): void {
  const map = new Map(saved.map((entry) => [entry.id, entry.regrowTimer]));
  for (const node of nodes) {
    const t = map.get(node.id);
    node.regrowTimer =
      typeof t === 'number' && Number.isFinite(t)
        ? Math.max(0, Math.min(node.regrowDuration, t))
        : 0;
  }
}
