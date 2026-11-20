import {
  isCampItemWalkable,
  isShelterType,
  type CampItemType,
  type PlacedCampItem,
} from '../entities/CampItem';
import { createInitialFauna, isFaunaActive, type FaunaEntity } from '../entities/Fauna';
import {
  createInitialFloraNodes,
  restoreFloraNodes,
  serializeFloraNodes,
  type FloraNodeData,
  type ResourceId,
  type SerializedFloraState,
} from '../entities/Flora';
import { Player } from '../entities/Player';
import {
  canAffordRecipe,
  deductRecipeCost,
  getNextShelterUpgrade,
  type ToolId,
} from '../systems/Crafting';
import type { CameraState } from '../world/IsoMath';
import type { BiomeId, TileMap } from '../world/TileMap';
import {
  applyBridgeToTileMap,
  applyCascadeMistClearedToTileMap,
  applyLighthouseRestoredToTileMap,
  applyMangroveBoardwalkToTileMap,
  applyOutriggerLaunchedToTileMap,
  applyVineCutToTileMap,
  BIOME_SIGNPOSTS,
  createIslandTileMap,
  LEGACY_OFFSET_X,
  LEGACY_OFFSET_Y,
  PLAYER_SPAWN,
  resetBarriersOnTileMap,
} from '../world/WorldData';
import { TimeWeather } from './TimeWeather';

export const SAVE_STORAGE_KEY = 'l_ile_de_mimi_save_v1';

export type LandBiomeId = Exclude<BiomeId, 'ocean'>;

export interface WorldFlags {
  vinesCut: boolean;
  bridgeBuilt: boolean;
  mangroveBoardwalkBuilt: boolean;
  lighthouseRestored: boolean;
  outriggerLaunched: boolean;
  cascadeMistCleared: boolean;
  chimeProgress: number;
  sabrevoixFound: boolean;
}

export interface SaveDataV1 {
  version: 1;
  mapVersion?: number;
  timestamp: number;
  timeOfDay?: number;
  isBioluminescentNight?: boolean;
  player: {
    x: number;
    y: number;
    stamina: number;
  };
  inventory: Record<ResourceId, number>;
  camp: PlacedCampItem[];
  flora: SerializedFloraState[];
  tools?: Partial<Record<ToolId, boolean>>;
  worldFlags?: Partial<WorldFlags>;
  journal?: string[];
  faunaTrust?: Record<string, number>;
  discoveredBiomes?: LandBiomeId[];
  unlockedSignposts?: LandBiomeId[];
}

export interface PlacementModeState {
  type: CampItemType;
  movingItemId?: string;
}

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function createInitialInventory(): Record<ResourceId, number> {
  return {
    coconut: 1,
    mango: 0,
    starfruit: 0,
    pink_guava: 0,
    driftwood: 0,
    bamboo: 0,
    shell: 0,
    sea_glass: 0,
    roasted_fruit: 0,
  };
}

function createInitialTools(): Record<ToolId, boolean> {
  return {
    hand_basket: true,
    bamboo_shears: false,
    bamboo_bridge_kit: false,
    firefly_lantern: false,
    bamboo_outrigger: false,
    sea_glass_prism: false,
  };
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export class GameState {
  public readonly tileMap: TileMap;
  public readonly player: Player;
  public readonly camera: CameraState;
  public readonly timeWeather = new TimeWeather();
  public elapsedTime = 0;

  public inventory: Record<ResourceId, number>;
  public tools: Record<ToolId, boolean>;
  public worldFlags: WorldFlags = {
    vinesCut: false,
    bridgeBuilt: false,
    mangroveBoardwalkBuilt: false,
    lighthouseRestored: false,
    outriggerLaunched: false,
    cascadeMistCleared: false,
    chimeProgress: 0,
    sabrevoixFound: false,
  };
  public cascadeMistAlpha = 1;
  public discoveredJournal = new Set<string>();
  public discoveredBiomes = new Set<LandBiomeId>(['cove']);
  public unlockedSignposts = new Set<LandBiomeId>(['cove', 'clearing']);
  public floraNodes: FloraNodeData[];
  public fauna: FaunaEntity[];
  public campItems: PlacedCampItem[] = [];
  public placementMode: PlacementModeState | null = null;
  public lastSavedAt: number | null = null;

  constructor() {
    this.tileMap = createIslandTileMap();
    this.floraNodes = createInitialFloraNodes();
    this.fauna = createInitialFauna(this.tileMap);
    this.inventory = createInitialInventory();
    this.tools = createInitialTools();
    this.player = new Player(this.tileMap);

    this.tileMap.setDynamicBlocker((gx, gy) => {
      for (const node of this.floraNodes) {
        if (!node.walkable && node.gx === gx && node.gy === gy) {
          return true;
        }
      }
      for (const item of this.campItems) {
        if (!isCampItemWalkable(item.type) && item.gx === gx && item.gy === gy) {
          return true;
        }
      }
      return false;
    });

    const viewWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    const initialZoom = viewWidth <= 640 ? 1.15 : 1.32;
    this.camera = {
      x: 0,
      y: 0,
      zoom: initialZoom,
      targetZoom: initialZoom,
      viewWidth,
      viewHeight,
    };

    this.tryLoadFromLocalStorage();
  }

  public getFloraAt(gx: number, gy: number): FloraNodeData | null {
    return this.floraNodes.find((n) => n.gx === gx && n.gy === gy) ?? null;
  }

  public getCampItemAt(gx: number, gy: number): PlacedCampItem | null {
    return this.campItems.find((c) => c.gx === gx && c.gy === gy) ?? null;
  }

  public getCampItemByType(type: CampItemType): PlacedCampItem | null {
    return this.campItems.find((c) => c.type === type) ?? null;
  }

  public getPlacedShelter(): PlacedCampItem | null {
    return this.campItems.find((c) => isShelterType(c.type)) ?? null;
  }

  public upgradeShelter(): PlacedCampItem | null {
    const shelter = this.getPlacedShelter();
    if (!shelter) {
      return null;
    }
    const nextRecipe = getNextShelterUpgrade(shelter.type);
    if (!nextRecipe || !canAffordRecipe(this.inventory, nextRecipe)) {
      return null;
    }
    deductRecipeCost(this.inventory, nextRecipe);
    shelter.type = nextRecipe.type;
    return shelter;
  }

  public getFaunaAt(gx: number, gy: number, maxDist = 0.95): FaunaEntity | null {
    let best: FaunaEntity | null = null;
    let bestDist = maxDist;
    for (const critter of this.fauna) {
      if (!isFaunaActive(critter, this.timeWeather)) {
        continue;
      }
      const d = Math.hypot(critter.x - gx, critter.y - gy);
      if (d <= bestDist) {
        bestDist = d;
        best = critter;
      }
    }
    return best;
  }

  public unlockBiomeAndSignpost(biome: BiomeId): boolean {
    if (biome === 'ocean') {
      return false;
    }
    this.discoveredBiomes.add(biome);
    if (!this.unlockedSignposts.has(biome)) {
      this.unlockedSignposts.add(biome);
      return true;
    }
    return false;
  }

  public fastTravelToBiome(biome: LandBiomeId): boolean {
    if (!this.unlockedSignposts.has(biome)) {
      return false;
    }
    const signpost = BIOME_SIGNPOSTS[biome];
    const dest =
      this.tileMap.findNearestWalkable(
        signpost.x,
        signpost.y,
        this.player.x,
        this.player.y,
        4
      ) ?? signpost;

    this.player.x = dest.x;
    this.player.y = dest.y;
    this.player.z = this.tileMap.getInterpolatedElevation(dest.x, dest.y);
    this.player.path = [];
    this.player.targetTile = null;
    this.player.currentBiome = biome;
    this.discoveredBiomes.add(biome);
    return true;
  }

  public cutJungleVines(): boolean {
    if (this.worldFlags.vinesCut) {
      return false;
    }
    this.worldFlags.vinesCut = true;
    applyVineCutToTileMap(this.tileMap);
    return true;
  }

  public buildLagoonBridge(): boolean {
    if (this.worldFlags.bridgeBuilt) {
      return false;
    }
    this.worldFlags.bridgeBuilt = true;
    applyBridgeToTileMap(this.tileMap);
    return true;
  }

  public buildMangroveBoardwalk(): boolean {
    if (this.worldFlags.mangroveBoardwalkBuilt) {
      return false;
    }
    this.worldFlags.mangroveBoardwalkBuilt = true;
    applyMangroveBoardwalkToTileMap(this.tileMap);
    return true;
  }

  public restoreLighthouse(): boolean {
    if (this.worldFlags.lighthouseRestored) {
      return false;
    }
    this.worldFlags.lighthouseRestored = true;
    applyLighthouseRestoredToTileMap(this.tileMap);
    return true;
  }

  public launchOutrigger(): boolean {
    if (this.worldFlags.outriggerLaunched) {
      return false;
    }
    this.worldFlags.outriggerLaunched = true;
    applyOutriggerLaunchedToTileMap(this.tileMap);
    return true;
  }

  public activateChimeStone(
    step: 1 | 2 | 3
  ): 'already_cleared' | 'already_lit' | 'wrong_order' | 'step_lit' | 'mist_cleared' {
    if (this.worldFlags.cascadeMistCleared) {
      return 'already_cleared';
    }
    if (step <= this.worldFlags.chimeProgress) {
      return 'already_lit';
    }
    if (step !== this.worldFlags.chimeProgress + 1) {
      return 'wrong_order';
    }
    this.worldFlags.chimeProgress = step;
    if (step === 3) {
      this.worldFlags.cascadeMistCleared = true;
      applyCascadeMistClearedToTileMap(this.tileMap);
      return 'mist_cleared';
    }
    return 'step_lit';
  }

  public toSaveData(): SaveDataV1 {
    const faunaTrust: Record<string, number> = {};
    for (const critter of this.fauna) {
      if (critter.trust > 0) {
        faunaTrust[critter.id] = critter.trust;
      }
    }

    return {
      version: 1,
      mapVersion: 2,
      timestamp: Date.now(),
      timeOfDay: Number(this.timeWeather.timeOfDay.toFixed(4)),
      isBioluminescentNight: this.timeWeather.isBioluminescentNight,
      player: {
        x: Number(this.player.x.toFixed(3)),
        y: Number(this.player.y.toFixed(3)),
        stamina: Number(this.player.stamina.toFixed(3)),
      },
      inventory: { ...this.inventory },
      camp: this.campItems.map((item) => ({ ...item })),
      flora: serializeFloraNodes(this.floraNodes),
      tools: { ...this.tools },
      worldFlags: { ...this.worldFlags },
      journal: Array.from(this.discoveredJournal),
      faunaTrust,
      discoveredBiomes: Array.from(this.discoveredBiomes),
      unlockedSignposts: Array.from(this.unlockedSignposts),
    };
  }

  public saveToLocalStorage(): boolean {
    if (!canUseBrowserStorage()) {
      return false;
    }
    try {
      const payload = this.toSaveData();
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      this.lastSavedAt = payload.timestamp;
      return true;
    } catch {
      return false;
    }
  }

  public tryLoadFromLocalStorage(): boolean {
    if (!canUseBrowserStorage()) {
      return false;
    }
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        return false;
      }
      return this.loadFromSaveData(JSON.parse(raw));
    } catch {
      return false;
    }
  }

  public loadFromSaveData(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') {
      return false;
    }
    const data = raw as Partial<SaveDataV1>;
    if (data.version !== 1 || !data.player || !data.inventory) {
      return false;
    }

    const isLegacyMap = (data.mapVersion ?? 1) < 2;
    const shiftX = isLegacyMap ? LEGACY_OFFSET_X : 0;
    const shiftY = isLegacyMap ? LEGACY_OFFSET_Y : 0;

    resetBarriersOnTileMap(this.tileMap);
    this.worldFlags = {
      vinesCut: Boolean(data.worldFlags?.vinesCut),
      bridgeBuilt: Boolean(data.worldFlags?.bridgeBuilt),
      mangroveBoardwalkBuilt: Boolean(data.worldFlags?.mangroveBoardwalkBuilt),
      lighthouseRestored: Boolean(data.worldFlags?.lighthouseRestored),
      outriggerLaunched: Boolean(data.worldFlags?.outriggerLaunched),
      cascadeMistCleared: Boolean(data.worldFlags?.cascadeMistCleared),
      chimeProgress:
        typeof data.worldFlags?.chimeProgress === 'number' &&
        Number.isFinite(data.worldFlags.chimeProgress)
          ? Math.max(0, Math.min(3, Math.floor(data.worldFlags.chimeProgress)))
          : 0,
      sabrevoixFound: Boolean(data.worldFlags?.sabrevoixFound),
    };
    if (this.worldFlags.vinesCut) {
      applyVineCutToTileMap(this.tileMap);
    }
    if (this.worldFlags.bridgeBuilt) {
      applyBridgeToTileMap(this.tileMap);
    }
    if (this.worldFlags.mangroveBoardwalkBuilt) {
      applyMangroveBoardwalkToTileMap(this.tileMap);
    }
    if (this.worldFlags.lighthouseRestored) {
      applyLighthouseRestoredToTileMap(this.tileMap);
    }
    if (this.worldFlags.outriggerLaunched) {
      applyOutriggerLaunchedToTileMap(this.tileMap);
    }
    if (this.worldFlags.cascadeMistCleared) {
      applyCascadeMistClearedToTileMap(this.tileMap);
      this.cascadeMistAlpha = 0;
    } else {
      this.cascadeMistAlpha = 1;
    }

    const restoredTools = createInitialTools();
    if (data.tools) {
      for (const toolKey of Object.keys(restoredTools) as ToolId[]) {
        if (typeof data.tools[toolKey] === 'boolean') {
          restoredTools[toolKey] = Boolean(data.tools[toolKey]);
        }
      }
    }
    restoredTools.hand_basket = true;
    this.tools = restoredTools;

    this.discoveredJournal = new Set(
      Array.isArray(data.journal)
        ? data.journal.filter((id): id is string => typeof id === 'string')
        : []
    );

    const validBiomes = new Set<LandBiomeId>([
      'cove',
      'clearing',
      'bambooGrove',
      'fernJungle',
      'starlightLagoon',
      'hotSprings',
      'mangrove',
      'ancientRuins',
      'tradewindCliffs',
      'coralAtoll',
      'cascadePeaks',
    ]);
    this.discoveredBiomes = new Set<LandBiomeId>(['cove']);
    if (Array.isArray(data.discoveredBiomes)) {
      for (const b of data.discoveredBiomes) {
        if (validBiomes.has(b)) {
          this.discoveredBiomes.add(b);
        }
      }
    }

    this.unlockedSignposts = new Set<LandBiomeId>(['cove', 'clearing']);
    if (Array.isArray(data.unlockedSignposts)) {
      for (const b of data.unlockedSignposts) {
        if (validBiomes.has(b)) {
          this.unlockedSignposts.add(b);
        }
      }
    }

    this.fauna = createInitialFauna(this.tileMap);
    if (data.faunaTrust) {
      for (const critter of this.fauna) {
        const savedTrust = data.faunaTrust[critter.id];
        if (typeof savedTrust === 'number' && Number.isFinite(savedTrust)) {
          critter.trust = Math.max(0, Math.min(3, Math.floor(savedTrust)));
        }
      }
    }

    const restoredCamp: PlacedCampItem[] = [];
    if (Array.isArray(data.camp)) {
      const validTypes = new Set<CampItemType>([
        'campfire',
        'hammock',
        'shelter_stage_1',
        'shelter_stage_2',
        'shelter_stage_3',
        'herbarium_table',
        'shell_windchime',
        'flower_planter',
        'paper_lantern',
        'woven_rug',
      ]);
      for (const item of data.camp) {
        if (item && typeof item.id === 'string' && validTypes.has(item.type)) {
          const gx = Math.round(item.gx) + shiftX;
          const gy = Math.round(item.gy) + shiftY;
          if (this.tileMap.inBounds(gx, gy)) {
            restoredCamp.push({
              id: item.id,
              type: item.type,
              gx,
              gy,
            });
          }
        }
      }
    }
    this.campItems = restoredCamp;

    const freshInv = createInitialInventory();
    for (const key of Object.keys(freshInv) as ResourceId[]) {
      const val = data.inventory[key];
      freshInv[key] =
        typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
    }
    this.inventory = freshInv;

    if (Array.isArray(data.flora)) {
      restoreFloraNodes(this.floraNodes, data.flora);
    } else {
      restoreFloraNodes(this.floraNodes, []);
    }

    if (typeof data.timeOfDay === 'number' && Number.isFinite(data.timeOfDay)) {
      this.timeWeather.setTimeOfDay(data.timeOfDay);
    } else {
      this.timeWeather.setTimeOfDay(0.34);
    }
    this.timeWeather.isBioluminescentNight = Boolean(data.isBioluminescentNight);

    const px =
      (typeof data.player.x === 'number' && Number.isFinite(data.player.x)
        ? data.player.x
        : PLAYER_SPAWN.x - shiftX) + shiftX;
    const py =
      (typeof data.player.y === 'number' && Number.isFinite(data.player.y)
        ? data.player.y
        : PLAYER_SPAWN.y - shiftY) + shiftY;

    const safePos = this.tileMap.canOccupyContinuous(px, py)
      ? { x: px, y: py }
      : (this.tileMap.findNearestWalkable(px, py, PLAYER_SPAWN.x, PLAYER_SPAWN.y, 8) ??
        PLAYER_SPAWN);

    this.player.x = safePos.x;
    this.player.y = safePos.y;
    this.player.z = this.tileMap.getInterpolatedElevation(safePos.x, safePos.y);
    this.player.path = [];
    this.player.targetTile = null;
    this.player.stamina =
      typeof data.player.stamina === 'number' && Number.isFinite(data.player.stamina)
        ? Math.max(0, Math.min(1, data.player.stamina))
        : 1.0;

    const biome = this.tileMap.getBiomeAt(safePos.x, safePos.y);
    if (biome !== 'ocean') {
      this.player.currentBiome = biome;
      this.discoveredBiomes.add(biome);
    }

    this.placementMode = null;
    this.lastSavedAt = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
    return true;
  }

  public exportSaveCode(): string {
    const json = JSON.stringify(this.toSaveData());
    return `MIMI1:${utf8ToBase64(json)}`;
  }

  public importSaveCode(rawInput: string): boolean {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return false;
    }
    try {
      const jsonText = trimmed.startsWith('MIMI1:')
        ? base64ToUtf8(trimmed.slice('MIMI1:'.length))
        : trimmed;
      const parsed = JSON.parse(jsonText);
      const loaded = this.loadFromSaveData(parsed);
      if (loaded) {
        this.saveToLocalStorage();
      }
      return loaded;
    } catch {
      return false;
    }
  }

  public resetIsland(): void {
    resetBarriersOnTileMap(this.tileMap);
    this.inventory = createInitialInventory();
    this.tools = createInitialTools();
    this.worldFlags = {
      vinesCut: false,
      bridgeBuilt: false,
      mangroveBoardwalkBuilt: false,
      lighthouseRestored: false,
      outriggerLaunched: false,
      cascadeMistCleared: false,
      chimeProgress: 0,
      sabrevoixFound: false,
    };
    this.cascadeMistAlpha = 1;
    this.discoveredJournal.clear();
    this.discoveredBiomes = new Set<LandBiomeId>(['cove']);
    this.unlockedSignposts = new Set<LandBiomeId>(['cove', 'clearing']);
    this.floraNodes = createInitialFloraNodes();
    this.fauna = createInitialFauna(this.tileMap);
    this.campItems = [];
    this.placementMode = null;
    this.timeWeather.reset();
    this.player.x = PLAYER_SPAWN.x;
    this.player.y = PLAYER_SPAWN.y;
    this.player.z = this.tileMap.getInterpolatedElevation(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.player.path = [];
    this.player.targetTile = null;
    this.player.stamina = 1.0;
    this.player.isYawning = false;
    this.player.happyTimer = 0;
    this.player.currentBiome = this.tileMap.getBiomeAt(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.saveToLocalStorage();
  }
}
