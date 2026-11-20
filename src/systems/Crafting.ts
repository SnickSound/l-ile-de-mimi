import type { CampItemType } from '../entities/CampItem';
import type { HarvestableResourceId, ResourceId } from '../entities/Flora';

export type ToolId =
  | 'hand_basket'
  | 'bamboo_shears'
  | 'bamboo_bridge_kit'
  | 'firefly_lantern'
  | 'bamboo_outrigger'
  | 'sea_glass_prism';

export interface CampRecipe {
  type: CampItemType;
  category: 'shelter' | 'decor';
  costs: Partial<Record<ResourceId, number>>;
  maxCount: number;
  upgradesFrom?: CampItemType;
}

export interface ToolRecipe {
  id: Exclude<ToolId, 'hand_basket'>;
  costs: Partial<Record<ResourceId, number>>;
}

export const CAMP_RECIPES: ReadonlyArray<CampRecipe> = [
  {
    type: 'campfire',
    category: 'shelter',
    costs: { driftwood: 2, shell: 1 },
    maxCount: 1,
  },
  {
    type: 'hammock',
    category: 'shelter',
    costs: { bamboo: 2, driftwood: 2 },
    maxCount: 3,
  },
  {
    type: 'shelter_stage_1',
    category: 'shelter',
    costs: { bamboo: 3, driftwood: 2, coconut: 1 },
    maxCount: 1,
  },
  {
    type: 'shelter_stage_2',
    category: 'shelter',
    costs: { bamboo: 4, driftwood: 3, shell: 2 },
    maxCount: 1,
    upgradesFrom: 'shelter_stage_1',
  },
  {
    type: 'shelter_stage_3',
    category: 'shelter',
    costs: { bamboo: 5, driftwood: 3, starfruit: 2, shell: 2 },
    maxCount: 1,
    upgradesFrom: 'shelter_stage_2',
  },
  {
    type: 'herbarium_table',
    category: 'decor',
    costs: { bamboo: 2, driftwood: 2 },
    maxCount: 1,
  },
  {
    type: 'shell_windchime',
    category: 'decor',
    costs: { shell: 3, bamboo: 1 },
    maxCount: 1,
  },
  {
    type: 'flower_planter',
    category: 'decor',
    costs: { driftwood: 2, coconut: 1 },
    maxCount: 2,
  },
  {
    type: 'paper_lantern',
    category: 'decor',
    costs: { bamboo: 2, shell: 1 },
    maxCount: 5,
  },
  {
    type: 'woven_rug',
    category: 'decor',
    costs: { bamboo: 2, coconut: 1 },
    maxCount: 5,
  },
];

export const TOOL_RECIPES: ReadonlyArray<ToolRecipe> = [
  {
    id: 'bamboo_shears',
    costs: { bamboo: 2, shell: 1 },
  },
  {
    id: 'bamboo_bridge_kit',
    costs: { bamboo: 3, driftwood: 2 },
  },
  {
    id: 'firefly_lantern',
    costs: { coconut: 1, shell: 2, driftwood: 1 },
  },
  {
    id: 'bamboo_outrigger',
    costs: { bamboo: 4, driftwood: 3, coconut: 1 },
  },
  {
    id: 'sea_glass_prism',
    costs: { sea_glass: 1, bamboo: 2, shell: 2 },
  },
];

export function getRecipeForType(type: CampItemType): CampRecipe | undefined {
  return CAMP_RECIPES.find((r) => r.type === type);
}

export function getNextShelterUpgrade(currentType: CampItemType): CampRecipe | undefined {
  return CAMP_RECIPES.find((r) => r.upgradesFrom === currentType);
}

export function canAffordCosts(
  inventory: Record<ResourceId, number>,
  costs: Partial<Record<ResourceId, number>>
): boolean {
  for (const [resource, amount] of Object.entries(costs) as Array<[ResourceId, number]>) {
    if ((inventory[resource] ?? 0) < amount) {
      return false;
    }
  }
  return true;
}

export function deductCosts(
  inventory: Record<ResourceId, number>,
  costs: Partial<Record<ResourceId, number>>
): void {
  for (const [resource, amount] of Object.entries(costs) as Array<[ResourceId, number]>) {
    inventory[resource] = Math.max(0, (inventory[resource] ?? 0) - amount);
  }
}

export function canAffordRecipe(
  inventory: Record<ResourceId, number>,
  recipe: CampRecipe
): boolean {
  return canAffordCosts(inventory, recipe.costs);
}

export function deductRecipeCost(
  inventory: Record<ResourceId, number>,
  recipe: CampRecipe
): void {
  deductCosts(inventory, recipe.costs);
}

export function canAffordTool(
  inventory: Record<ResourceId, number>,
  recipe: ToolRecipe
): boolean {
  return canAffordCosts(inventory, recipe.costs);
}

export function deductToolCost(
  inventory: Record<ResourceId, number>,
  recipe: ToolRecipe
): void {
  deductCosts(inventory, recipe.costs);
}

export function findRoastableFruit(
  inventory: Record<ResourceId, number>
): HarvestableResourceId | null {
  if ((inventory.pink_guava ?? 0) > 0) {
    return 'pink_guava';
  }
  if ((inventory.mango ?? 0) > 0) {
    return 'mango';
  }
  if ((inventory.starfruit ?? 0) > 0) {
    return 'starfruit';
  }
  if ((inventory.coconut ?? 0) > 0) {
    return 'coconut';
  }
  return null;
}
