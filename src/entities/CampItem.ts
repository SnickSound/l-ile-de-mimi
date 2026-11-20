import type { TileMap } from '../world/TileMap';
import { SCENIC_OUTPOST_NOOKS } from '../world/WorldData';
import type { FloraNodeData } from './Flora';

export type CampItemType =
  | 'campfire'
  | 'hammock'
  | 'shelter_stage_1'
  | 'shelter_stage_2'
  | 'shelter_stage_3'
  | 'herbarium_table'
  | 'shell_windchime'
  | 'flower_planter'
  | 'paper_lantern'
  | 'woven_rug';

export interface PlacedCampItem {
  id: string;
  type: CampItemType;
  gx: number;
  gy: number;
}

export const CLEARING_GRID_BOUNDS = {
  minX: 40,
  maxX: 48,
  minY: 34,
  maxY: 39,
} as const;

export function isShelterType(type: CampItemType): boolean {
  return (
    type === 'shelter_stage_1' ||
    type === 'shelter_stage_2' ||
    type === 'shelter_stage_3'
  );
}

export function isCampItemWalkable(type: CampItemType): boolean {
  return type === 'woven_rug';
}

export function isOutpostItemType(type: CampItemType): boolean {
  return type === 'hammock' || type === 'paper_lantern' || type === 'woven_rug';
}

export function isInOutpostNook(gx: number, gy: number): boolean {
  return SCENIC_OUTPOST_NOOKS.some(
    (n) => gx >= n.minX && gx <= n.maxX && gy >= n.minY && gy <= n.maxY
  );
}

/**
 * Checks whether (gx, gy) is an open, valid tile inside La Clairière du Camp (or a Scenic Outpost Nook for eligible items).
 */
export function isValidPlacementTile(
  tileMap: TileMap,
  floraNodes: FloraNodeData[],
  campItems: PlacedCampItem[],
  itemType: CampItemType,
  gx: number,
  gy: number,
  ignoreItemId?: string
): boolean {
  const inClearing =
    gx >= CLEARING_GRID_BOUNDS.minX &&
    gx <= CLEARING_GRID_BOUNDS.maxX &&
    gy >= CLEARING_GRID_BOUNDS.minY &&
    gy <= CLEARING_GRID_BOUNDS.maxY;

  const inOutpost = isOutpostItemType(itemType) && isInOutpostNook(gx, gy);

  if (!inClearing && !inOutpost) {
    return false;
  }

  const tile = tileMap.getTile(gx, gy);
  if (!tile || !tile.walkable) {
    return false;
  }

  if (inClearing && tile.biome !== 'clearing') {
    return false;
  }

  if (tile.prop && !tile.propWalkable) {
    return false;
  }

  for (const node of floraNodes) {
    if (node.gx === gx && node.gy === gy && !node.walkable) {
      return false;
    }
  }

  for (const item of campItems) {
    if (item.id === ignoreItemId) {
      continue;
    }
    if (item.gx === gx && item.gy === gy) {
      return false;
    }
  }

  return true;
}

export function isClearingBuildTile(
  tileMap: TileMap,
  floraNodes: FloraNodeData[],
  campItems: PlacedCampItem[],
  gx: number,
  gy: number,
  ignoreItemId?: string
): boolean {
  return isValidPlacementTile(
    tileMap,
    floraNodes,
    campItems,
    'campfire',
    gx,
    gy,
    ignoreItemId
  );
}
