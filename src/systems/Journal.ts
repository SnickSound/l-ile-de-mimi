import type { FaunaSpeciesId } from '../entities/Fauna';
import type { FloraSpeciesId } from '../entities/Flora';
import { FR_CA } from '../i18n/frCA';

export type JournalSpeciesId = FloraSpeciesId | FaunaSpeciesId;

export interface JournalEntryMeta {
  id: JournalSpeciesId;
  category: 'flora' | 'fauna';
}

export const JOURNAL_CATALOG: ReadonlyArray<JournalEntryMeta> = [
  // Flore (19)
  { id: 'coconut_palm', category: 'flora' },
  { id: 'mango_tree', category: 'flora' },
  { id: 'bamboo_clump', category: 'flora' },
  { id: 'hibiscus', category: 'flora' },
  { id: 'fern', category: 'flora' },
  { id: 'wild_ginger', category: 'flora' },
  { id: 'monstera', category: 'flora' },
  { id: 'raindrop_orchid', category: 'flora' },
  { id: 'moonflower', category: 'flora' },
  { id: 'starfruit_tree', category: 'flora' },
  { id: 'thermal_lotus', category: 'flora' },
  { id: 'golden_fern', category: 'flora' },
  { id: 'wild_vanilla', category: 'flora' },
  { id: 'glow_mushroom', category: 'flora' },
  { id: 'frangipani', category: 'flora' },
  { id: 'bird_of_paradise', category: 'flora' },
  { id: 'dwarf_palm', category: 'flora' },
  { id: 'mist_begonia', category: 'flora' },
  { id: 'mountain_guava', category: 'flora' },
  // Faune (12)
  { id: 'hermit_crab', category: 'fauna' },
  { id: 'capybara', category: 'fauna' },
  { id: 'hummingbird', category: 'fauna' },
  { id: 'sea_turtle', category: 'fauna' },
  { id: 'firefly', category: 'fauna' },
  { id: 'tree_frog', category: 'fauna' },
  { id: 'spoonbill', category: 'fauna' },
  { id: 'rainbow_toucan', category: 'fauna' },
  { id: 'blue_starfish', category: 'fauna' },
  { id: 'manta_ray', category: 'fauna' },
  { id: 'blue_morpho', category: 'fauna' },
  { id: 'kingfisher', category: 'fauna' },
];

export function discoverJournalSpecies(
  discovered: Set<string>,
  id: JournalSpeciesId
): { icon: string; name: string } | null {
  if (discovered.has(id)) {
    return null;
  }
  discovered.add(id);
  const entry = FR_CA.journal.entries[id];
  return {
    icon: entry.icon,
    name: entry.name,
  };
}
