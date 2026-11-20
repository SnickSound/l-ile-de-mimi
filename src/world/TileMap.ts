import type { GridPoint } from './IsoMath';

export type BiomeId =
  | 'cove'
  | 'clearing'
  | 'bambooGrove'
  | 'fernJungle'
  | 'starlightLagoon'
  | 'hotSprings'
  | 'mangrove'
  | 'ancientRuins'
  | 'tradewindCliffs'
  | 'coralAtoll'
  | 'cascadePeaks'
  | 'ocean';

export type TerrainType =
  | 'deep_water'
  | 'shallow_water'
  | 'wet_sand'
  | 'sand'
  | 'coral_sand'
  | 'outrigger_channel'
  | 'tidepool'
  | 'coastal_grass'
  | 'clearing_grass'
  | 'bamboo_grass'
  | 'jungle_grass'
  | 'lagoon_grass'
  | 'cliff_meadow'
  | 'mountain_grass'
  | 'mountain_rock'
  | 'cascade_pool'
  | 'basalt_rock'
  | 'thermal_pool'
  | 'mangrove_mud'
  | 'ruin_stone'
  | 'wood_bridge'
  | 'path'
  | 'rock';

export type PropType =
  | 'palm_tall'
  | 'palm_curved'
  | 'hibiscus'
  | 'fern'
  | 'driftwood'
  | 'tidepool_Cluster'
  | 'shells'
  | 'boulder'
  | 'wildflowers'
  | 'camp_circle'
  | 'camp_sign'
  | 'vine_barrier'
  | 'bridge_post'
  | 'monstera'
  | 'water_lily'
  | 'glow_moss'
  | 'ginger_plant'
  | 'mangrove_tree'
  | 'stone_arch'
  | 'sundial'
  | 'trail_signpost'
  | 'lighthouse_overgrown'
  | 'lighthouse_restored'
  | 'outrigger_dock'
  | 'outrigger_post'
  | 'coral_reef'
  | 'outpost_marker'
  | 'mist_barrier'
  | 'chime_stone_1'
  | 'chime_stone_2'
  | 'chime_stone_3'
  | 'mountain_cairn';

export interface TileData {
  x: number;
  y: number;
  terrain: TerrainType;
  biome: BiomeId;
  elevation: number;
  walkable: boolean;
  prop?: PropType;
  propWalkable?: boolean;
  variant: number;
}

export class TileMap {
  public readonly width: number;
  public readonly height: number;
  private readonly grid: TileData[][];
  private dynamicBlocker: ((gx: number, gy: number) => boolean) | null = null;

  constructor(width: number, height: number, grid: TileData[][]) {
    this.width = width;
    this.height = height;
    this.grid = grid;
  }

  public setDynamicBlocker(blocker: (gx: number, gy: number) => boolean): void {
    this.dynamicBlocker = blocker;
  }

  public inBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gy >= 0 && gx < this.width && gy < this.height;
  }

  public getTile(gx: number, gy: number): TileData | null {
    if (!this.inBounds(gx, gy)) {
      return null;
    }
    return this.grid[gy][gx];
  }

  public getElevation(gx: number, gy: number): number {
    const tile = this.getTile(gx, gy);
    return tile ? tile.elevation : 0;
  }

  public isWalkable(gx: number, gy: number): boolean {
    const tile = this.getTile(gx, gy);
    if (!tile || !tile.walkable) {
      return false;
    }
    if (tile.prop && !tile.propWalkable) {
      return false;
    }
    if (this.dynamicBlocker && this.dynamicBlocker(gx, gy)) {
      return false;
    }
    return true;
  }

  /**
   * Checks whether a circular footprint around (wx, wy) fits entirely on walkable tiles.
   */
  public canOccupyContinuous(wx: number, wy: number, radius = 0.22): boolean {
    const sampleOffsets: Array<[number, number]> = [
      [0, 0],
      [-radius, -radius],
      [radius, -radius],
      [-radius, radius],
      [radius, radius],
    ];

    for (const [ox, oy] of sampleOffsets) {
      const gx = Math.round(wx + ox);
      const gy = Math.round(wy + oy);
      if (!this.isWalkable(gx, gy)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Bilinearly interpolates tile elevation so walking up slopes is smooth.
   */
  public getInterpolatedElevation(wx: number, wy: number): number {
    const x0 = Math.floor(wx);
    const y0 = Math.floor(wy);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const tx = Math.max(0, Math.min(1, wx - x0));
    const ty = Math.max(0, Math.min(1, wy - y0));

    const e00 = this.getElevation(x0, y0);
    const e10 = this.getElevation(x1, y0);
    const e01 = this.getElevation(x0, y1);
    const e11 = this.getElevation(x1, y1);

    const top = e00 * (1 - tx) + e10 * tx;
    const bottom = e01 * (1 - tx) + e11 * tx;
    return top * (1 - ty) + bottom * ty;
  }

  public getBiomeAt(wx: number, wy: number): BiomeId {
    const tile = this.getTile(Math.round(wx), Math.round(wy));
    return tile ? tile.biome : 'ocean';
  }

  /**
   * Finds the closest walkable tile near (targetX, targetY), preferring tiles facing (fromX, fromY).
   */
  public findNearestWalkable(
    targetX: number,
    targetY: number,
    fromX: number,
    fromY: number,
    maxRadius = 6
  ): GridPoint | null {
    const clampedX = Math.max(0, Math.min(this.width - 1, Math.round(targetX)));
    const clampedY = Math.max(0, Math.min(this.height - 1, Math.round(targetY)));

    if (this.isWalkable(clampedX, clampedY)) {
      return { x: clampedX, y: clampedY };
    }

    let best: GridPoint | null = null;
    let bestScore = Infinity;

    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) {
            continue;
          }
          const nx = clampedX + dx;
          const ny = clampedY + dy;
          if (!this.isWalkable(nx, ny)) {
            continue;
          }
          const distToTarget = Math.hypot(dx, dy);
          const distToPlayer = Math.hypot(nx - fromX, ny - fromY);
          const score = distToTarget * 100 + distToPlayer * 0.25;
          if (score < bestScore) {
            bestScore = score;
            best = { x: nx, y: ny };
          }
        }
      }
      if (best) {
        return best;
      }
    }

    return null;
  }
}
