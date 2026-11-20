import type { CampItemType } from '../entities/CampItem';
import type { FaunaEntity } from '../entities/Fauna';
import type { FloraNodeType } from '../entities/Flora';
import type { Player } from '../entities/Player';
import { ELEVATION_H, TILE_H, TILE_W } from '../world/IsoMath';
import type { PropType, TerrainType } from '../world/TileMap';

export interface CachedSprite {
  canvas: HTMLCanvasElement;
  logicalW: number;
  logicalH: number;
  anchorX: number;
  anchorY: number;
}

interface TerrainPalette {
  topLight: string;
  topDark: string;
  leftFace: string;
  rightFace: string;
  skirtHeight: number;
}

const TERRAIN_PALETTES: Record<Exclude<TerrainType, 'deep_water' | 'shallow_water'>, TerrainPalette> = {
  wet_sand: {
    topLight: '#e5ca8f',
    topDark: '#d8bc7f',
    leftFace: '#c5a569',
    rightFace: '#b39256',
    skirtHeight: 8,
  },
  sand: {
    topLight: '#f8e2a5',
    topDark: '#f0d48f',
    leftFace: '#d9b974',
    rightFace: '#c2a05b',
    skirtHeight: 13,
  },
  coral_sand: {
    topLight: '#fff0cc',
    topDark: '#f7e2b6',
    leftFace: '#dec595',
    rightFace: '#c9ad7c',
    skirtHeight: 10,
  },
  outrigger_channel: {
    topLight: '#7ce5ea',
    topDark: '#60d6df',
    leftFace: '#48b8c8',
    rightFace: '#3a9eb0',
    skirtHeight: 6,
  },
  tidepool: {
    topLight: '#9be0dc',
    topDark: '#7ec9cb',
    leftFace: '#b4a57d',
    rightFace: '#9f906a',
    skirtHeight: 8,
  },
  path: {
    topLight: '#efd79d',
    topDark: '#e4c786',
    leftFace: '#c8a768',
    rightFace: '#b29154',
    skirtHeight: 15,
  },
  coastal_grass: {
    topLight: '#85cf6b',
    topDark: '#73be5c',
    leftFace: '#9d8259',
    rightFace: '#826a46',
    skirtHeight: 20,
  },
  clearing_grass: {
    topLight: '#93d972',
    topDark: '#82ca63',
    leftFace: '#a4885d',
    rightFace: '#8b704a',
    skirtHeight: 20,
  },
  bamboo_grass: {
    topLight: '#88d36f',
    topDark: '#77c15f',
    leftFace: '#9c8156',
    rightFace: '#816944',
    skirtHeight: 20,
  },
  jungle_grass: {
    topLight: '#68bd5c',
    topDark: '#58ac4d',
    leftFace: '#7c6b4d',
    rightFace: '#66573d',
    skirtHeight: 21,
  },
  lagoon_grass: {
    topLight: '#74ce7b',
    topDark: '#62ba69',
    leftFace: '#808882',
    rightFace: '#68706b',
    skirtHeight: 22,
  },
  cliff_meadow: {
    topLight: '#9be07a',
    topDark: '#87ce68',
    leftFace: '#8d7d64',
    rightFace: '#72644e',
    skirtHeight: 25,
  },
  mountain_grass: {
    topLight: '#76c978',
    topDark: '#63b568',
    leftFace: '#6e797d',
    rightFace: '#566065',
    skirtHeight: 26,
  },
  mountain_rock: {
    topLight: '#8b969c',
    topDark: '#77838a',
    leftFace: '#5d6870',
    rightFace: '#485259',
    skirtHeight: 28,
  },
  cascade_pool: {
    topLight: '#6be5df',
    topDark: '#48cfd0',
    leftFace: '#5d6870',
    rightFace: '#485259',
    skirtHeight: 22,
  },
  basalt_rock: {
    topLight: '#6b757d',
    topDark: '#5b656d',
    leftFace: '#485159',
    rightFace: '#384047',
    skirtHeight: 24,
  },
  thermal_pool: {
    topLight: '#79e3e8',
    topDark: '#58cdd8',
    leftFace: '#5b656d',
    rightFace: '#485159',
    skirtHeight: 20,
  },
  mangrove_mud: {
    topLight: '#978566',
    topDark: '#877557',
    leftFace: '#726046',
    rightFace: '#5e4e38',
    skirtHeight: 11,
  },
  ruin_stone: {
    topLight: '#b9c0b5',
    topDark: '#a6ae9f',
    leftFace: '#889184',
    rightFace: '#717a6e',
    skirtHeight: 22,
  },
  wood_bridge: {
    topLight: '#dfb67c',
    topDark: '#cba065',
    leftFace: '#946b3e',
    rightFace: '#78552f',
    skirtHeight: 14,
  },
  rock: {
    topLight: '#9aa7a5',
    topDark: '#879594',
    leftFace: '#737f80',
    rightFace: '#5d686a',
    skirtHeight: 22,
  },
};

function createHiDpiCanvas(
  logicalW: number,
  logicalH: number,
  dpr: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(logicalW * dpr);
  canvas.height = Math.ceil(logicalH * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class ArtCache {
  public readonly dpr: number;
  private readonly terrainSprites = new Map<string, CachedSprite>();
  private readonly propSprites = new Map<PropType, CachedSprite>();
  private readonly floraSprites = new Map<string, CachedSprite>();
  private readonly campSprites = new Map<CampItemType, CachedSprite>();

  constructor() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.buildTerrainCache();
    this.buildPropCache();
    this.buildFloraCache();
    this.buildCampCache();
  }

  public getTerrainSprite(terrain: TerrainType, variant: number): CachedSprite | null {
    if (terrain === 'deep_water' || terrain === 'shallow_water') {
      return null;
    }
    const idx = Math.floor(variant * 3) % 3;
    return this.terrainSprites.get(`${terrain}_${idx}`) ?? null;
  }

  public getPropSprite(prop: PropType): CachedSprite | null {
    return this.propSprites.get(prop) ?? null;
  }

  public getFloraSprite(type: FloraNodeType, activeState: boolean): CachedSprite | null {
    return this.floraSprites.get(`${type}_${activeState ? 'ready' : 'regrow'}`) ?? null;
  }

  public getCampSprite(type: CampItemType): CachedSprite | null {
    return this.campSprites.get(type) ?? null;
  }

  private buildTerrainCache(): void {
    const types = Object.keys(TERRAIN_PALETTES) as Array<keyof typeof TERRAIN_PALETTES>;

    for (const terrain of types) {
      const palette = TERRAIN_PALETTES[terrain];
      for (let variantIdx = 0; variantIdx < 3; variantIdx++) {
        const logicalW = TILE_W + 6;
        const logicalH = TILE_H + palette.skirtHeight + 8;
        const anchorX = logicalW / 2;
        const anchorY = TILE_H / 2 + 3;

        const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

        const top = { x: anchorX, y: anchorY - TILE_H / 2 };
        const right = { x: anchorX + TILE_W / 2, y: anchorY };
        const bottom = { x: anchorX, y: anchorY + TILE_H / 2 };
        const left = { x: anchorX - TILE_W / 2, y: anchorY };
        const skirt = palette.skirtHeight;

        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.lineTo(bottom.x, bottom.y + skirt);
        ctx.lineTo(left.x, left.y + skirt);
        ctx.closePath();
        ctx.fillStyle = palette.leftFace;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(bottom.x, bottom.y);
        ctx.lineTo(right.x, right.y);
        ctx.lineTo(right.x, right.y + skirt);
        ctx.lineTo(bottom.x, bottom.y + skirt);
        ctx.closePath();
        ctx.fillStyle = palette.rightFace;
        ctx.fill();

        if (
          terrain === 'coastal_grass' ||
          terrain === 'clearing_grass' ||
          terrain === 'bamboo_grass' ||
          terrain === 'jungle_grass' ||
          terrain === 'lagoon_grass' ||
          terrain === 'cliff_meadow' ||
          terrain === 'mountain_grass'
        ) {
          ctx.beginPath();
          ctx.moveTo(left.x, left.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.lineTo(right.x, right.y);
          ctx.lineTo(right.x, right.y + 4);
          ctx.lineTo(bottom.x, bottom.y + 4.5);
          ctx.lineTo(left.x, left.y + 4);
          ctx.closePath();
          ctx.fillStyle = terrain === 'jungle_grass' ? '#438c3c' : '#5ba448';
          ctx.fill();
        }

        const grad = ctx.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
        grad.addColorStop(0, palette.topLight);
        grad.addColorStop(1, palette.topDark);

        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(right.x, right.y);
        ctx.lineTo(bottom.x, bottom.y);
        ctx.lineTo(left.x, left.y);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = palette.topDark;
        ctx.stroke();

        if (terrain === 'wood_bridge') {
          ctx.strokeStyle = 'rgba(120, 82, 42, 0.55)';
          ctx.lineWidth = 1.4;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(anchorX - 18, anchorY + i * 4.5);
            ctx.lineTo(anchorX + 18, anchorY + i * 4.5);
            ctx.stroke();
          }
        } else if (terrain === 'sand' || terrain === 'path') {
          ctx.fillStyle = 'rgba(255, 250, 224, 0.45)';
          const ox = (variantIdx - 1) * 7;
          ctx.beginPath();
          ctx.ellipse(anchorX + ox, anchorY - 2, 4, 1.8, 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (terrain === 'tidepool') {
          ctx.beginPath();
          ctx.ellipse(anchorX, anchorY, 20, 10, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(54, 186, 194, 0.72)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (
          terrain === 'coastal_grass' ||
          terrain === 'clearing_grass' ||
          terrain === 'bamboo_grass' ||
          terrain === 'jungle_grass' ||
          terrain === 'lagoon_grass'
        ) {
          ctx.strokeStyle = 'rgba(218, 249, 165, 0.48)';
          ctx.lineWidth = 1.3;
          ctx.lineCap = 'round';
          const gx = anchorX + (variantIdx - 1) * 8;
          const gy = anchorY + (variantIdx === 1 ? -3 : 2);
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - 2, gy - 4);
          ctx.moveTo(gx + 2, gy);
          ctx.lineTo(gx + 4, gy - 3.5);
          ctx.stroke();
        } else if (terrain === 'rock' || terrain === 'basalt_rock') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.ellipse(anchorX - 4, anchorY - 2, 8, 3.5, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (terrain === 'thermal_pool') {
          ctx.beginPath();
          ctx.ellipse(anchorX, anchorY, 22, 11, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(130, 246, 248, 0.72)';
          ctx.fill();
        } else if (terrain === 'ruin_stone') {
          ctx.strokeStyle = 'rgba(104, 114, 98, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(anchorX - 10, anchorY - 3);
          ctx.lineTo(anchorX + 10, anchorY + 4);
          ctx.stroke();
          if (variantIdx === 0) {
            ctx.fillStyle = 'rgba(116, 186, 102, 0.48)';
            ctx.beginPath();
            ctx.ellipse(anchorX - 7, anchorY + 2, 5, 2.2, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (terrain === 'mangrove_mud') {
          ctx.fillStyle = 'rgba(72, 146, 142, 0.24)';
          ctx.beginPath();
          ctx.ellipse(anchorX + (variantIdx - 1) * 5, anchorY, 6, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        this.terrainSprites.set(`${terrain}_${variantIdx}`, {
          canvas,
          logicalW,
          logicalH,
          anchorX,
          anchorY,
        });
      }
    }
  }

  private buildPropCache(): void {
    this.propSprites.set('palm_tall', this.renderPalm(false, true));
    this.propSprites.set('palm_curved', this.renderPalm(true, false));
    this.propSprites.set('hibiscus', this.renderHibiscus());
    this.propSprites.set('fern', this.renderFern());
    this.propSprites.set('driftwood', this.renderDriftwood(true));
    this.propSprites.set('tidepool_Cluster', this.renderTidepoolCluster());
    this.propSprites.set('shells', this.renderShells(true));
    this.propSprites.set('boulder', this.renderBoulder());
    this.propSprites.set('wildflowers', this.renderWildflowers());
    this.propSprites.set('camp_circle', this.renderCampCircle());
    this.propSprites.set('camp_sign', this.renderCampSign());
    this.propSprites.set('vine_barrier', this.renderVineBarrier());
    this.propSprites.set('bridge_post', this.renderBridgePost());
    this.propSprites.set('monstera', this.renderMonstera());
    this.propSprites.set('water_lily', this.renderWaterLily());
    this.propSprites.set('glow_moss', this.renderGlowMoss());
    this.propSprites.set('ginger_plant', this.renderWildGinger(true));
    this.propSprites.set('mangrove_tree', this.renderMangroveTree());
    this.propSprites.set('stone_arch', this.renderStoneArch());
    this.propSprites.set('sundial', this.renderSundial());
    this.propSprites.set('trail_signpost', this.renderTrailSignpost());
    this.propSprites.set('lighthouse_overgrown', this.renderLighthouse(false));
    this.propSprites.set('lighthouse_restored', this.renderLighthouse(true));
    this.propSprites.set('outrigger_dock', this.renderOutriggerDock());
    this.propSprites.set('outrigger_post', this.renderOutriggerPost());
    this.propSprites.set('coral_reef', this.renderCoralReef());
    this.propSprites.set('outpost_marker', this.renderOutpostMarker());
    this.propSprites.set('mist_barrier', this.renderMistBarrier());
    this.propSprites.set('chime_stone_1', this.renderChimeStone(1));
    this.propSprites.set('chime_stone_2', this.renderChimeStone(2));
    this.propSprites.set('chime_stone_3', this.renderChimeStone(3));
    this.propSprites.set('mountain_cairn', this.renderMountainCairn());
  }

  private buildFloraCache(): void {
    this.floraSprites.set('coconut_palm_ready', this.renderPalm(false, true, true));
    this.floraSprites.set('coconut_palm_regrow', this.renderPalm(false, false, false));

    this.floraSprites.set('mango_tree_ready', this.renderMangoTree(true));
    this.floraSprites.set('mango_tree_regrow', this.renderMangoTree(false));

    this.floraSprites.set('starfruit_tree_ready', this.renderStarfruitTree(true));
    this.floraSprites.set('starfruit_tree_regrow', this.renderStarfruitTree(false));

    this.floraSprites.set('bamboo_clump_ready', this.renderBambooClump(true));
    this.floraSprites.set('bamboo_clump_regrow', this.renderBambooClump(false));

    this.floraSprites.set('driftwood_spot_ready', this.renderDriftwood(true));
    this.floraSprites.set('driftwood_spot_regrow', this.renderDriftwood(false));

    this.floraSprites.set('shell_spot_ready', this.renderShells(true));
    this.floraSprites.set('shell_spot_regrow', this.renderShells(false));

    this.floraSprites.set('wild_ginger_node_ready', this.renderWildGinger(true));
    this.floraSprites.set('wild_ginger_node_regrow', this.renderWildGinger(false));

    this.floraSprites.set('monstera_node_ready', this.renderMonstera());
    this.floraSprites.set('monstera_node_regrow', this.renderMonstera());

    this.floraSprites.set('raindrop_orchid_node_ready', this.renderRaindropOrchid(true));
    this.floraSprites.set('raindrop_orchid_node_regrow', this.renderRaindropOrchid(false));

    this.floraSprites.set('moonflower_node_ready', this.renderMoonflower(true));
    this.floraSprites.set('moonflower_node_regrow', this.renderMoonflower(false));

    this.floraSprites.set('thermal_lotus_node_ready', this.renderThermalLotus(true));
    this.floraSprites.set('thermal_lotus_node_regrow', this.renderThermalLotus(false));

    this.floraSprites.set('golden_fern_node_ready', this.renderGoldenFern());
    this.floraSprites.set('golden_fern_node_regrow', this.renderGoldenFern());

    this.floraSprites.set('wild_vanilla_node_ready', this.renderWildVanilla(true));
    this.floraSprites.set('wild_vanilla_node_regrow', this.renderWildVanilla(false));

    this.floraSprites.set('glow_mushroom_node_ready', this.renderGlowMushroom(true));
    this.floraSprites.set('glow_mushroom_node_regrow', this.renderGlowMushroom(false));

    this.floraSprites.set('frangipani_tree_ready', this.renderFrangipaniTree(true));
    this.floraSprites.set('frangipani_tree_regrow', this.renderFrangipaniTree(false));

    this.floraSprites.set('bird_of_paradise_node_ready', this.renderBirdOfParadise(true));
    this.floraSprites.set('bird_of_paradise_node_regrow', this.renderBirdOfParadise(false));

    this.floraSprites.set('dwarf_palm_node_ready', this.renderDwarfPalm(true));
    this.floraSprites.set('dwarf_palm_node_regrow', this.renderDwarfPalm(false));

    this.floraSprites.set('sea_glass_spot_ready', this.renderSeaGlass(true));
    this.floraSprites.set('sea_glass_spot_regrow', this.renderSeaGlass(false));

    this.floraSprites.set('mist_begonia_node_ready', this.renderMistBegonia(true));
    this.floraSprites.set('mist_begonia_node_regrow', this.renderMistBegonia(false));

    this.floraSprites.set('mountain_guava_tree_ready', this.renderMountainGuavaTree(true));
    this.floraSprites.set('mountain_guava_tree_regrow', this.renderMountainGuavaTree(false));
  }

  private buildCampCache(): void {
    this.campSprites.set('campfire', this.renderCampfire());
    this.campSprites.set('hammock', this.renderHammock());
    this.campSprites.set('shelter_stage_1', this.renderShelterStage1());
    this.campSprites.set('shelter_stage_2', this.renderShelterStage2());
    this.campSprites.set('shelter_stage_3', this.renderShelterStage3());
    this.campSprites.set('herbarium_table', this.renderHerbariumTable());
    this.campSprites.set('shell_windchime', this.renderShellWindchime());
    this.campSprites.set('flower_planter', this.renderFlowerPlanter());
    this.campSprites.set('paper_lantern', this.renderPaperLantern());
    this.campSprites.set('woven_rug', this.renderWovenRug());
  }

  private renderPalm(
    curved: boolean,
    withCoconuts: boolean,
    highlightCoconuts = false
  ): CachedSprite {
    const logicalW = 128;
    const logicalH = 148;
    const anchorX = 64;
    const anchorY = 130;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX + (curved ? 10 : 4), anchorY + 2, 22, 9, 0.1, 0, Math.PI * 2);
    ctx.fill();

    const baseX = anchorX;
    const baseY = anchorY;
    const topX = curved ? anchorX + 18 : anchorX - 4;
    const topY = curved ? 54 : 42;
    const ctrlX = curved ? anchorX + 20 : anchorX - 10;
    const ctrlY = 86;

    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const x0 = (1 - t0) * (1 - t0) * baseX + 2 * (1 - t0) * t0 * ctrlX + t0 * t0 * topX;
      const y0 = (1 - t0) * (1 - t0) * baseY + 2 * (1 - t0) * t0 * ctrlY + t0 * t0 * topY;
      const x1 = (1 - t1) * (1 - t1) * baseX + 2 * (1 - t1) * t1 * ctrlX + t1 * t1 * topX;
      const y1 = (1 - t1) * (1 - t1) * baseY + 2 * (1 - t1) * t1 * ctrlY + t1 * t1 * topY;

      const width = 10 - t0 * 5.2;
      ctx.strokeStyle = i % 2 === 0 ? '#9c724b' : '#8b623f';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    if (withCoconuts) {
      const coconuts = [
        { x: topX - 5, y: topY + 4 },
        { x: topX + 5, y: topY + 4.5 },
        { x: topX, y: topY + 7.5 },
      ];
      for (const c of coconuts) {
        const rad = highlightCoconuts ? 5 : 4.2;
        ctx.fillStyle = highlightCoconuts ? '#7c4c29' : '#6c4427';
        ctx.beginPath();
        ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = highlightCoconuts ? '#b57b45' : '#8b5a36';
        ctx.beginPath();
        ctx.arc(c.x - 1.2, c.y - 1.4, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const frondAngles = [-2.55, -2.05, -1.4, -0.7, -0.15, 0.35, 0.95];
    for (let i = 0; i < frondAngles.length; i++) {
      const ang = frondAngles[i];
      const len = i % 2 === 0 ? 44 : 38;
      const tipX = topX + Math.cos(ang) * len;
      const tipY = topY + Math.sin(ang) * (len * 0.72) + 10;
      const midX = topX + Math.cos(ang) * (len * 0.55);
      const midY = topY + Math.sin(ang) * (len * 0.35) - 6;

      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(midX, midY - 7, tipX, tipY);
      ctx.quadraticCurveTo(midX, midY + 9, topX, topY);
      ctx.closePath();

      const grad = ctx.createLinearGradient(topX, topY, tipX, tipY);
      grad.addColorStop(0, '#4ea649');
      grad.addColorStop(0.6, '#6dc756');
      grad.addColorStop(1, '#92db65');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(218, 249, 155, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMangoTree(ready: boolean): CachedSprite {
    const logicalW = 104;
    const logicalH = 116;
    const anchorX = 52;
    const anchorY = 98;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 23, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7e5536';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.quadraticCurveTo(anchorX - 2, anchorY - 22, anchorX, anchorY - 40);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 30);
    ctx.lineTo(anchorX - 11, anchorY - 42);
    ctx.moveTo(anchorX, anchorY - 32);
    ctx.lineTo(anchorX + 10, anchorY - 42);
    ctx.stroke();

    const puffs = [
      { x: anchorX - 16, y: anchorY - 48, r: 16, c: '#3d9946' },
      { x: anchorX + 16, y: anchorY - 47, r: 16, c: '#40a24b' },
      { x: anchorX - 8, y: anchorY - 62, r: 18, c: '#54b956' },
      { x: anchorX + 10, y: anchorY - 61, r: 17, c: '#52b454' },
      { x: anchorX, y: anchorY - 50, r: 20, c: '#60c45d' },
      { x: anchorX - 2, y: anchorY - 68, r: 14, c: '#72d267' },
    ];
    for (const p of puffs) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ready) {
      const mangoes = [
        { x: anchorX - 15, y: anchorY - 46 },
        { x: anchorX + 14, y: anchorY - 45 },
        { x: anchorX - 3, y: anchorY - 60 },
        { x: anchorX + 6, y: anchorY - 52 },
      ];
      for (const m of mangoes) {
        ctx.fillStyle = '#ff9838';
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, 4.4, 5.4, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd15c';
        ctx.beginPath();
        ctx.arc(m.x - 1.2, m.y - 1.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#a8e36d';
      ctx.beginPath();
      ctx.arc(anchorX - 12, anchorY - 47, 2.2, 0, Math.PI * 2);
      ctx.arc(anchorX + 10, anchorY - 51, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderStarfruitTree(ready: boolean): CachedSprite {
    const logicalW = 104;
    const logicalH = 116;
    const anchorX = 52;
    const anchorY = 98;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#75563d';
    ctx.lineWidth = 8.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.quadraticCurveTo(anchorX + 2, anchorY - 22, anchorX, anchorY - 42);
    ctx.stroke();

    const puffs = [
      { x: anchorX - 15, y: anchorY - 49, r: 15, c: '#3d9868' },
      { x: anchorX + 15, y: anchorY - 48, r: 15, c: '#42a370' },
      { x: anchorX - 6, y: anchorY - 63, r: 17, c: '#54ba7d' },
      { x: anchorX + 9, y: anchorY - 61, r: 16, c: '#4eb377' },
      { x: anchorX, y: anchorY - 51, r: 19, c: '#5ec584' },
    ];
    for (const p of puffs) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ready) {
      const stars = [
        { x: anchorX - 13, y: anchorY - 47 },
        { x: anchorX + 13, y: anchorY - 46 },
        { x: anchorX + 1, y: anchorY - 61 },
      ];
      for (const s of stars) {
        ctx.fillStyle = '#ffd94a';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? 5.6 : 2.6;
          const px = s.x + Math.cos(a) * r;
          const py = s.y + Math.sin(a) * r;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderBambooClump(ready: boolean): CachedSprite {
    const logicalW = 76;
    const logicalH = 108;
    const anchorX = 38;
    const anchorY = 92;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const stalks = [
      { ox: -9, oy: 2, h: ready ? 58 : 16, tilt: -4 },
      { ox: -2, oy: -2, h: ready ? 68 : 20, tilt: 1 },
      { ox: 6, oy: 1, h: ready ? 62 : 18, tilt: 4 },
      { ox: 12, oy: 3, h: ready ? 50 : 14, tilt: 6 },
    ];

    for (const s of stalks) {
      const sx = anchorX + s.ox;
      const sy = anchorY + s.oy;
      const topX = sx + s.tilt;
      const topY = sy - s.h;

      ctx.strokeStyle = '#6db852';
      ctx.lineWidth = 4.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(topX, topY);
      ctx.stroke();

      ctx.strokeStyle = '#478436';
      ctx.lineWidth = 1.4;
      const step = 12;
      for (let h = step; h < s.h - 4; h += step) {
        const t = h / s.h;
        const jx = sx + s.tilt * t;
        const jy = sy - h;
        ctx.beginPath();
        ctx.moveTo(jx - 2.6, jy);
        ctx.lineTo(jx + 2.6, jy);
        ctx.stroke();
      }

      if (ready) {
        ctx.fillStyle = '#8de065';
        ctx.beginPath();
        ctx.ellipse(topX - 6, topY + 6, 7, 2.5, -0.45, 0, Math.PI * 2);
        ctx.ellipse(topX + 6, topY + 9, 7, 2.5, 0.4, 0, Math.PI * 2);
        ctx.ellipse(topX + 2, topY - 1, 6.5, 2.4, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#a3e879';
        ctx.beginPath();
        ctx.ellipse(topX + 3, topY + 1, 4, 1.8, -0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderWildGinger(ready: boolean): CachedSprite {
    const logicalW = 60;
    const logicalH = 58;
    const anchorX = 30;
    const anchorY = 44;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Long broad green ginger leaves
    for (const a of [-2.2, -1.6, -1.0, -0.5]) {
      ctx.strokeStyle = '#3f9649';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.quadraticCurveTo(anchorX + Math.cos(a) * 10, anchorY - 14, anchorX + Math.cos(a) * 18, anchorY - 18);
      ctx.stroke();
    }

    if (ready) {
      // Scarlet wild ginger flower cones
      for (const bx of [anchorX - 5, anchorX + 5]) {
        ctx.fillStyle = '#e6495c';
        ctx.beginPath();
        ctx.ellipse(bx, anchorY - 14, 4, 7, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff8a96';
        ctx.beginPath();
        ctx.arc(bx - 1, anchorY - 16, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMonstera(): CachedSprite {
    const logicalW = 68;
    const logicalH = 62;
    const anchorX = 34;
    const anchorY = 48;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const leaves = [
      { x: anchorX - 11, y: anchorY - 14, r: 10, rot: -0.5, c: '#338d46' },
      { x: anchorX + 11, y: anchorY - 13, r: 10, rot: 0.5, c: '#3ca150' },
      { x: anchorX, y: anchorY - 21, r: 11.5, rot: 0, c: '#48b55d' },
    ];
    for (const l of leaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = l.c;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.r, l.r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      // Signature monstera leaf slits
      ctx.strokeStyle = '#68bd5c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-l.r * 0.7, -2);
      ctx.lineTo(-2, -1);
      ctx.moveTo(l.r * 0.7, 2);
      ctx.lineTo(2, 1);
      ctx.stroke();
      ctx.restore();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderRaindropOrchid(blooming: boolean): CachedSprite {
    const logicalW = 62;
    const logicalH = 60;
    const anchorX = 31;
    const anchorY = 46;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base leaves & arching stem
    ctx.fillStyle = '#3c8e4d';
    ctx.beginPath();
    ctx.ellipse(anchorX - 6, anchorY - 3, 7, 3.2, -0.35, 0, Math.PI * 2);
    ctx.ellipse(anchorX + 6, anchorY - 3, 7, 3.2, 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4ba85c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 3);
    ctx.quadraticCurveTo(anchorX + 4, anchorY - 18, anchorX - 2, anchorY - 26);
    ctx.stroke();

    if (blooming) {
      // Iridescent blue-violet raindrop orchid blossoms
      const blooms = [
        { x: anchorX - 2, y: anchorY - 26, s: 1 },
        { x: anchorX + 3, y: anchorY - 18, s: 0.85 },
      ];
      for (const b of blooms) {
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          ctx.fillStyle = i % 2 === 0 ? '#79b8ff' : '#a78bfa';
          ctx.beginPath();
          ctx.ellipse(
            b.x + Math.cos(a) * 4 * b.s,
            b.y + Math.sin(a) * 4 * b.s,
            3.6 * b.s,
            2.4 * b.s,
            a,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = '#eef8ff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.8 * b.s, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Closed buds waiting for rain
      ctx.fillStyle = '#8b8fd4';
      ctx.beginPath();
      ctx.ellipse(anchorX - 2, anchorY - 26, 2.8, 4.2, -0.2, 0, Math.PI * 2);
      ctx.ellipse(anchorX + 3, anchorY - 18, 2.4, 3.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMoonflower(blooming: boolean): CachedSprite {
    const logicalW = 64;
    const logicalH = 62;
    const anchorX = 32;
    const anchorY = 48;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heart-shaped dark teal foliage
    ctx.fillStyle = '#368a63';
    ctx.beginPath();
    ctx.arc(anchorX - 8, anchorY - 6, 7.5, 0, Math.PI * 2);
    ctx.arc(anchorX + 8, anchorY - 6, 7.5, 0, Math.PI * 2);
    ctx.arc(anchorX, anchorY - 10, 8, 0, Math.PI * 2);
    ctx.fill();

    if (blooming) {
      // Radiant silvery-white moonflower open under the stars
      const blooms = [
        { x: anchorX - 5, y: anchorY - 14, s: 1 },
        { x: anchorX + 6, y: anchorY - 11, s: 0.85 },
      ];
      for (const b of blooms) {
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          ctx.fillStyle = '#eef8ff';
          ctx.beginPath();
          ctx.ellipse(
            b.x + Math.cos(a) * 4.5 * b.s,
            b.y + Math.sin(a) * 4.5 * b.s,
            4.2 * b.s,
            2.8 * b.s,
            a,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = '#a8f0ff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.2 * b.s, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Spiral closed buds during daytime
      ctx.fillStyle = '#c8dff2';
      ctx.beginPath();
      ctx.ellipse(anchorX - 4, anchorY - 14, 2.4, 5.2, -0.25, 0, Math.PI * 2);
      ctx.ellipse(anchorX + 6, anchorY - 11, 2.1, 4.4, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderVineBarrier(): CachedSprite {
    const logicalW = 70;
    const logicalH = 68;
    const anchorX = 35;
    const anchorY = 50;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 46, 36, 0.22)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thick intertwined jungle vines
    ctx.strokeStyle = '#3d6f35';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 20, anchorY + 4);
    ctx.quadraticCurveTo(anchorX - 4, anchorY - 26, anchorX + 18, anchorY - 4);
    ctx.moveTo(anchorX - 16, anchorY - 10);
    ctx.quadraticCurveTo(anchorX + 2, anchorY - 30, anchorX + 20, anchorY + 4);
    ctx.stroke();

    const leaves = [
      { x: anchorX - 12, y: anchorY - 14, r: 8, c: '#4da44d' },
      { x: anchorX + 10, y: anchorY - 15, r: 8, c: '#489d49' },
      { x: anchorX, y: anchorY - 22, r: 9.5, c: '#60b857' },
      { x: anchorX - 4, y: anchorY - 8, r: 7.5, c: '#54ae50' },
      { x: anchorX + 6, y: anchorY - 7, r: 7.5, c: '#58b353' },
    ];
    for (const l of leaves) {
      ctx.fillStyle = l.c;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderBridgePost(): CachedSprite {
    const logicalW = 54;
    const logicalH = 54;
    const anchorX = 27;
    const anchorY = 38;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = '#8b623f';
    drawRoundedRectPath(ctx, anchorX - 12, anchorY - 16, 5.5, 20, 2);
    drawRoundedRectPath(ctx, anchorX + 6, anchorY - 14, 5.5, 20, 2);
    ctx.fill();

    ctx.strokeStyle = '#d3a974';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(anchorX - 9, anchorY - 10);
    ctx.quadraticCurveTo(anchorX, anchorY - 5, anchorX + 9, anchorY - 8);
    ctx.stroke();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderWaterLily(): CachedSprite {
    const logicalW = 52;
    const logicalH = 38;
    const anchorX = 26;
    const anchorY = 22;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = '#4cb35e';
    ctx.beginPath();
    ctx.ellipse(anchorX - 4, anchorY, 12, 6, 0, 0.25, Math.PI * 1.9);
    ctx.lineTo(anchorX - 4, anchorY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff96b6';
    ctx.beginPath();
    ctx.arc(anchorX + 3, anchorY - 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff08a';
    ctx.beginPath();
    ctx.arc(anchorX + 3, anchorY - 2, 1.7, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderGlowMoss(): CachedSprite {
    const logicalW = 48;
    const logicalH = 34;
    const anchorX = 24;
    const anchorY = 20;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = '#4ad2b8';
    ctx.beginPath();
    ctx.ellipse(anchorX - 4, anchorY, 7, 3.5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(anchorX + 5, anchorY - 2, 6, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a6fff0';
    ctx.beginPath();
    ctx.arc(anchorX - 3, anchorY - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(anchorX + 5, anchorY - 2.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderHibiscus(): CachedSprite {
    const logicalW = 64;
    const logicalH = 60;
    const anchorX = 32;
    const anchorY = 48;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const puffs = [
      { x: 24, y: 36, r: 11, c: '#3a8f49' },
      { x: 40, y: 36, r: 11, c: '#3f9a4d' },
      { x: 32, y: 31, r: 13, c: '#4eb459' },
      { x: 28, y: 39, r: 9, c: '#48a651' },
      { x: 37, y: 39, r: 9, c: '#46a14e' },
    ];
    for (const p of puffs) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const blooms = [
      { x: 24, y: 31, s: 1 },
      { x: 36, y: 26, s: 1.08 },
      { x: 39, y: 37, s: 0.92 },
    ];
    for (const b of blooms) {
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx.fillStyle = i % 2 === 0 ? '#ff6f87' : '#ff8599';
        ctx.beginPath();
        ctx.ellipse(
          b.x + Math.cos(a) * 3.4 * b.s,
          b.y + Math.sin(a) * 3.4 * b.s,
          3.2 * b.s,
          2.2 * b.s,
          a,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = '#ffd966';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.8 * b.s, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderFern(): CachedSprite {
    const logicalW = 60;
    const logicalH = 54;
    const anchorX = 30;
    const anchorY = 42;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const leaves = [-2.5, -1.9, -1.35, -0.75, -0.2, 0.35];
    for (let i = 0; i < leaves.length; i++) {
      const a = leaves[i];
      const len = 19;
      const tx = anchorX + Math.cos(a) * len;
      const ty = anchorY - 4 + Math.sin(a) * len * 0.72;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY - 3);
      ctx.quadraticCurveTo(anchorX + Math.cos(a - 0.35) * 12, anchorY - 12, tx, ty);
      ctx.quadraticCurveTo(anchorX + Math.cos(a + 0.35) * 12, anchorY - 6, anchorX, anchorY - 3);
      ctx.fillStyle = i % 2 === 0 ? '#45a755' : '#65c465';
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderDriftwood(ready: boolean): CachedSprite {
    const logicalW = 64;
    const logicalH = 44;
    const anchorX = 32;
    const anchorY = 28;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    if (!ready) {
      ctx.fillStyle = 'rgba(179, 146, 86, 0.3)';
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY + 1, 14, 4.5, -0.25, 0, Math.PI * 2);
      ctx.fill();
      return { canvas, logicalW, logicalH, anchorX, anchorY };
    }

    ctx.fillStyle = 'rgba(46, 40, 28, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 3, 19, 6, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(anchorX, anchorY);
    ctx.rotate(-0.28);

    drawRoundedRectPath(ctx, -18, -5, 36, 10, 4.5);
    ctx.fillStyle = '#c8b295';
    ctx.fill();
    ctx.strokeStyle = '#9c8569';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawRoundedRectPath(ctx, 2, -10, 12, 5, 2.5);
    ctx.fillStyle = '#bfa688';
    ctx.fill();

    ctx.strokeStyle = '#e5d4ba';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, -1.5);
    ctx.lineTo(10, -1.5);
    ctx.moveTo(-6, 2);
    ctx.lineTo(13, 2);
    ctx.stroke();
    ctx.restore();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderTidepoolCluster(): CachedSprite {
    const logicalW = 64;
    const logicalH = 44;
    const anchorX = 32;
    const anchorY = 26;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    const rocks = [
      { x: 18, y: 24, rx: 6, ry: 4, c: '#869599' },
      { x: 44, y: 22, rx: 7, ry: 4.5, c: '#79888c' },
      { x: 25, y: 31, rx: 5, ry: 3.2, c: '#96a5a8' },
      { x: 40, y: 30, rx: 5.5, ry: 3.4, c: '#819094' },
    ];
    for (const r of rocks) {
      ctx.fillStyle = r.c;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.rx, r.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const sx = 32;
    const sy = 24;
    ctx.fillStyle = '#f27c63';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? 5.2 : 2.1;
      const px = sx + Math.cos(a) * rad;
      const py = sy + Math.sin(a) * rad * 0.7;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderShells(ready: boolean): CachedSprite {
    const logicalW = 44;
    const logicalH = 30;
    const anchorX = 22;
    const anchorY = 18;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    if (!ready) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      return { canvas, logicalW, logicalH, anchorX, anchorY };
    }

    ctx.fillStyle = '#f8b9ba';
    ctx.beginPath();
    ctx.arc(17, 17, 5, Math.PI, 0);
    ctx.lineTo(17, 20.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff3dc';
    ctx.beginPath();
    ctx.ellipse(26, 15, 4.6, 2.8, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dfbe8f';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.fillStyle = '#d2eef2';
    ctx.beginPath();
    ctx.arc(22, 21, 2, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderBoulder(): CachedSprite {
    const logicalW = 64;
    const logicalH = 54;
    const anchorX = 32;
    const anchorY = 40;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(15, 38);
    ctx.quadraticCurveTo(14, 21, 29, 18);
    ctx.quadraticCurveTo(45, 16, 48, 34);
    ctx.quadraticCurveTo(44, 42, 32, 42);
    ctx.quadraticCurveTo(18, 42, 15, 38);
    ctx.closePath();

    const grad = ctx.createLinearGradient(20, 18, 42, 42);
    grad.addColorStop(0, '#adb8b6');
    grad.addColorStop(1, '#798787');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.fillStyle = '#7ac363';
    ctx.beginPath();
    ctx.ellipse(27, 22, 6, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderWildflowers(): CachedSprite {
    const logicalW = 48;
    const logicalH = 36;
    const anchorX = 24;
    const anchorY = 24;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    const spots = [
      { x: 17, y: 21, c: '#ffe066' },
      { x: 24, y: 17, c: '#c9a6ff' },
      { x: 30, y: 22, c: '#ffe066' },
      { x: 21, y: 25, c: '#ff9ebb' },
    ];
    for (const s of spots) {
      ctx.strokeStyle = '#4ea34e';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + 4);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff9d6';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderCampCircle(): CachedSprite {
    const logicalW = 72;
    const logicalH = 54;
    const anchorX = 36;
    const anchorY = 34;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = '#e8cf9b';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY, 19, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const a = (i * Math.PI * 2) / stoneCount;
      const sx = anchorX + Math.cos(a) * 16;
      const sy = anchorY + Math.sin(a) * 8;
      ctx.fillStyle = i % 2 === 0 ? '#909d9d' : '#7b8989';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 4.2, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#996a41';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 7, anchorY + 1);
    ctx.lineTo(anchorX + 7, anchorY - 2);
    ctx.moveTo(anchorX - 6, anchorY - 2);
    ctx.lineTo(anchorX + 6, anchorY + 2);
    ctx.stroke();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderCampSign(): CachedSprite {
    const logicalW = 60;
    const logicalH = 74;
    const anchorX = 30;
    const anchorY = 60;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#855a36';
    drawRoundedRectPath(ctx, anchorX - 2.5, anchorY - 34, 5, 34, 2);
    ctx.fill();

    ctx.fillStyle = '#d3a572';
    drawRoundedRectPath(ctx, anchorX - 15, anchorY - 33, 30, 14, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#8e613a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#ff6f87';
    ctx.beginPath();
    ctx.arc(anchorX - 8, anchorY - 26, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#734b2b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(anchorX - 2, anchorY - 28);
    ctx.lineTo(anchorX + 10, anchorY - 28);
    ctx.moveTo(anchorX - 2, anchorY - 24);
    ctx.lineTo(anchorX + 8, anchorY - 24);
    ctx.stroke();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderCampfire(): CachedSprite {
    const logicalW = 72;
    const logicalH = 62;
    const anchorX = 36;
    const anchorY = 42;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = '#53433b';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const a = (i * Math.PI * 2) / stoneCount;
      const sx = anchorX + Math.cos(a) * 16;
      const sy = anchorY + Math.sin(a) * 8;
      ctx.fillStyle = i % 2 === 0 ? '#97a4a4' : '#7d8a8a';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 4.4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#7e5232';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 9, anchorY + 2);
    ctx.lineTo(anchorX + 9, anchorY - 3);
    ctx.moveTo(anchorX - 8, anchorY - 3);
    ctx.lineTo(anchorX + 8, anchorY + 3);
    ctx.stroke();

    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY - 1, 7.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderHammock(): CachedSprite {
    const logicalW = 86;
    const logicalH = 70;
    const anchorX = 43;
    const anchorY = 50;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 24, 9, -0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#9e7045';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 20, anchorY + 4);
    ctx.lineTo(anchorX - 24, anchorY - 22);
    ctx.moveTo(anchorX + 20, anchorY - 2);
    ctx.lineTo(anchorX + 24, anchorY - 27);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(anchorX - 23, anchorY - 19);
    ctx.quadraticCurveTo(anchorX, anchorY + 1, anchorX + 23, anchorY - 24);
    ctx.quadraticCurveTo(anchorX + 2, anchorY - 9, anchorX - 23, anchorY - 19);
    ctx.closePath();
    ctx.fillStyle = '#fff3dc';
    ctx.fill();
    ctx.strokeStyle = '#e78772';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#ef7e69';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(anchorX - 15, anchorY - 15);
    ctx.quadraticCurveTo(anchorX, anchorY - 3, anchorX + 15, anchorY - 19);
    ctx.stroke();

    ctx.fillStyle = '#73d4cf';
    ctx.beginPath();
    ctx.ellipse(anchorX - 13, anchorY - 15, 5, 3, 0.35, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderShelterStage1(): CachedSprite {
    const logicalW = 96;
    const logicalH = 88;
    const anchorX = 48;
    const anchorY = 66;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 52, 62, 0.22)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 3, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e6cb8e';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 11);
    ctx.lineTo(anchorX + 22, anchorY);
    ctx.lineTo(anchorX, anchorY + 11);
    ctx.lineTo(anchorX - 22, anchorY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c4a464';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = '#8b613c';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 18, anchorY - 1);
    ctx.lineTo(anchorX - 14, anchorY - 26);
    ctx.moveTo(anchorX + 18, anchorY - 1);
    ctx.lineTo(anchorX + 14, anchorY - 26);
    ctx.moveTo(anchorX - 16, anchorY - 26);
    ctx.lineTo(anchorX + 16, anchorY - 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(anchorX - 23, anchorY - 14);
    ctx.lineTo(anchorX - 16, anchorY - 34);
    ctx.lineTo(anchorX + 19, anchorY - 32);
    ctx.lineTo(anchorX + 23, anchorY - 8);
    ctx.closePath();

    const roofGrad = ctx.createLinearGradient(anchorX - 16, anchorY - 34, anchorX + 16, anchorY - 8);
    roofGrad.addColorStop(0, '#72c557');
    roofGrad.addColorStop(0.55, '#59ab45');
    roofGrad.addColorStop(1, '#4a913a');
    ctx.fillStyle = roofGrad;
    ctx.fill();
    ctx.strokeStyle = '#3d7930';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(202, 240, 148, 0.45)';
    ctx.lineWidth = 1.4;
    for (let i = -12; i <= 14; i += 7) {
      ctx.beginPath();
      ctx.moveTo(anchorX + i, anchorY - 32);
      ctx.lineTo(anchorX + i + 3, anchorY - 11);
      ctx.stroke();
    }

    ctx.fillStyle = '#f28b77';
    ctx.beginPath();
    ctx.ellipse(anchorX - 4, anchorY + 1, 6, 3.2, -0.2, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderShelterStage2(): CachedSprite {
    const logicalW = 104;
    const logicalH = 98;
    const anchorX = 52;
    const anchorY = 76;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 52, 62, 0.24)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 3, 31, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Raised bamboo deck platform
    ctx.fillStyle = '#cfa264';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 14);
    ctx.lineTo(anchorX + 26, anchorY - 1);
    ctx.lineTo(anchorX, anchorY + 12);
    ctx.lineTo(anchorX - 26, anchorY - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a37742';
    ctx.beginPath();
    ctx.moveTo(anchorX - 26, anchorY - 1);
    ctx.lineTo(anchorX, anchorY + 12);
    ctx.lineTo(anchorX + 26, anchorY - 1);
    ctx.lineTo(anchorX + 26, anchorY + 4);
    ctx.lineTo(anchorX, anchorY + 17);
    ctx.lineTo(anchorX - 26, anchorY + 4);
    ctx.closePath();
    ctx.fill();

    // Woven bamboo cabin walls
    ctx.fillStyle = '#e4c48a';
    drawRoundedRectPath(ctx, anchorX - 18, anchorY - 29, 36, 23, 3);
    ctx.fill();
    ctx.strokeStyle = '#9e7445';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Vertical bamboo weave lines
    ctx.strokeStyle = 'rgba(150, 110, 62, 0.45)';
    ctx.lineWidth = 1;
    for (let x = anchorX - 13; x <= anchorX + 13; x += 6.5) {
      ctx.beginPath();
      ctx.moveTo(x, anchorY - 28);
      ctx.lineTo(x, anchorY - 7);
      ctx.stroke();
    }

    // Cozy arched doorway
    ctx.fillStyle = '#533b2d';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY - 14, 6.5, Math.PI, 0);
    ctx.lineTo(anchorX + 6.5, anchorY - 6);
    ctx.lineTo(anchorX - 6.5, anchorY - 6);
    ctx.closePath();
    ctx.fill();

    // Layered tropical gable roof
    ctx.beginPath();
    ctx.moveTo(anchorX - 25, anchorY - 24);
    ctx.lineTo(anchorX, anchorY - 46);
    ctx.lineTo(anchorX + 25, anchorY - 24);
    ctx.quadraticCurveTo(anchorX, anchorY - 20, anchorX - 25, anchorY - 24);
    ctx.closePath();
    const grad = ctx.createLinearGradient(anchorX, anchorY - 46, anchorX, anchorY - 22);
    grad.addColorStop(0, '#7dcf5b');
    grad.addColorStop(1, '#4c983f');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#3b7a30';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderShelterStage3(): CachedSprite {
    const logicalW = 118;
    const logicalH = 112;
    const anchorX = 59;
    const anchorY = 88;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(18, 48, 58, 0.26)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 4, 36, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stilts
    ctx.strokeStyle = '#755032';
    ctx.lineWidth = 3.5;
    for (const sx of [-26, -8, 10, 26]) {
      ctx.beginPath();
      ctx.moveTo(anchorX + sx, anchorY - 6);
      ctx.lineTo(anchorX + sx, anchorY + 4);
      ctx.stroke();
    }

    // Tree-deck timber terrace
    ctx.fillStyle = '#ddb378';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 20);
    ctx.lineTo(anchorX + 32, anchorY - 4);
    ctx.lineTo(anchorX, anchorY + 12);
    ctx.lineTo(anchorX - 32, anchorY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9c6e3b';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Deck front trim & steps
    ctx.fillStyle = '#a87844';
    ctx.beginPath();
    ctx.moveTo(anchorX - 32, anchorY - 4);
    ctx.lineTo(anchorX, anchorY + 12);
    ctx.lineTo(anchorX + 32, anchorY - 4);
    ctx.lineTo(anchorX + 32, anchorY + 1);
    ctx.lineTo(anchorX, anchorY + 17);
    ctx.lineTo(anchorX - 32, anchorY + 1);
    ctx.closePath();
    ctx.fill();

    // Cozy bungalow house
    ctx.fillStyle = '#f3dcab';
    drawRoundedRectPath(ctx, anchorX - 20, anchorY - 36, 40, 25, 4);
    ctx.fill();
    ctx.strokeStyle = '#a57c4b';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Warm glowing window & doorway
    ctx.fillStyle = '#ffcf70';
    drawRoundedRectPath(ctx, anchorX - 15, anchorY - 29, 8, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#5c3f30';
    drawRoundedRectPath(ctx, anchorX - 4, anchorY - 29, 10, 17, 4);
    ctx.fill();

    // Deck railing & tiny flower box
    ctx.strokeStyle = '#9b6c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(anchorX - 28, anchorY - 12);
    ctx.lineTo(anchorX - 10, anchorY - 3);
    ctx.moveTo(anchorX + 12, anchorY - 3);
    ctx.lineTo(anchorX + 28, anchorY - 12);
    ctx.stroke();

    // Tiered bungalow roof
    ctx.beginPath();
    ctx.moveTo(anchorX - 29, anchorY - 32);
    ctx.lineTo(anchorX, anchorY - 58);
    ctx.lineTo(anchorX + 29, anchorY - 32);
    ctx.closePath();
    const grad = ctx.createLinearGradient(anchorX, anchorY - 58, anchorX, anchorY - 32);
    grad.addColorStop(0, '#85d664');
    grad.addColorStop(0.55, '#59ad45');
    grad.addColorStop(1, '#448938');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#366f2d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Two hanging warm paper lanterns on eaves
    for (const lx of [anchorX - 22, anchorX + 22]) {
      ctx.strokeStyle = '#755032';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lx, anchorY - 32);
      ctx.lineTo(lx, anchorY - 25);
      ctx.stroke();

      ctx.fillStyle = '#ffbe55';
      ctx.beginPath();
      ctx.arc(lx, anchorY - 22, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5b8';
      ctx.beginPath();
      ctx.arc(lx, anchorY - 22, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderHerbariumTable(): CachedSprite {
    const logicalW = 72;
    const logicalH = 66;
    const anchorX = 36;
    const anchorY = 48;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Table legs
    ctx.strokeStyle = '#8d623b';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(anchorX - 12, anchorY - 12);
    ctx.lineTo(anchorX - 13, anchorY + 1);
    ctx.moveTo(anchorX + 12, anchorY - 12);
    ctx.lineTo(anchorX + 13, anchorY + 1);
    ctx.stroke();

    // Tabletop diamond
    ctx.fillStyle = '#dcb278';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 24);
    ctx.lineTo(anchorX + 19, anchorY - 14);
    ctx.lineTo(anchorX, anchorY - 4);
    ctx.lineTo(anchorX - 19, anchorY - 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9c7040';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Open Field Journal & pressed pink hibiscus specimen
    ctx.fillStyle = '#fffaf0';
    drawRoundedRectPath(ctx, anchorX - 9, anchorY - 19, 16, 10, 2);
    ctx.fill();
    ctx.strokeStyle = '#b48a5a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ff728b';
    ctx.beginPath();
    ctx.arc(anchorX + 3, anchorY - 14, 2.5, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderShellWindchime(): CachedSprite {
    const logicalW = 60;
    const logicalH = 74;
    const anchorX = 30;
    const anchorY = 58;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bamboo stand + crossbar
    ctx.strokeStyle = '#9b7444';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 2, anchorY);
    ctx.lineTo(anchorX - 2, anchorY - 38);
    ctx.lineTo(anchorX + 13, anchorY - 35);
    ctx.stroke();

    // Hanging shells & sea glass
    const chimes = [
      { x: anchorX + 3, len: 14, c: '#ffe8d6' },
      { x: anchorX + 7.5, len: 18, c: '#9be7e5' },
      { x: anchorX + 12, len: 13, c: '#ffc4cf' },
    ];
    for (const ch of chimes) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ch.x, anchorY - 36);
      ctx.lineTo(ch.x, anchorY - 36 + ch.len);
      ctx.stroke();

      ctx.fillStyle = ch.c;
      ctx.beginPath();
      ctx.arc(ch.x, anchorY - 36 + ch.len + 2, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderFlowerPlanter(): CachedSprite {
    const logicalW = 64;
    const logicalH = 54;
    const anchorX = 32;
    const anchorY = 40;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Driftwood planter box
    ctx.fillStyle = '#b48758';
    drawRoundedRectPath(ctx, anchorX - 14, anchorY - 12, 28, 13, 3);
    ctx.fill();
    ctx.strokeStyle = '#7e5936';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Lush foliage + bright blossoms
    ctx.fillStyle = '#4cb35b';
    ctx.beginPath();
    ctx.arc(anchorX - 7, anchorY - 14, 7.5, 0, Math.PI * 2);
    ctx.arc(anchorX + 7, anchorY - 14, 7.5, 0, Math.PI * 2);
    ctx.arc(anchorX, anchorY - 17, 8.5, 0, Math.PI * 2);
    ctx.fill();

    const blooms = [
      { x: anchorX - 6, y: anchorY - 17, c: '#ff738d' },
      { x: anchorX + 6, y: anchorY - 15, c: '#ffe066' },
      { x: anchorX, y: anchorY - 21, c: '#ff96b6' },
    ];
    for (const b of blooms) {
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderPaperLantern(): CachedSprite {
    const logicalW = 56;
    const logicalH = 74;
    const anchorX = 28;
    const anchorY = 58;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8b613c';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 4, anchorY);
    ctx.lineTo(anchorX - 4, anchorY - 36);
    ctx.quadraticCurveTo(anchorX + 4, anchorY - 40, anchorX + 8, anchorY - 32);
    ctx.stroke();

    // Glowing warm coral-amber paper lantern
    ctx.fillStyle = '#ffaa54';
    ctx.beginPath();
    ctx.ellipse(anchorX + 8, anchorY - 25, 6.2, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2a6';
    ctx.beginPath();
    ctx.ellipse(anchorX + 8, anchorY - 25, 3.2, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b472b';
    ctx.fillRect(anchorX + 5, anchorY - 33, 6, 2);
    ctx.fillRect(anchorX + 5, anchorY - 18, 6, 2);

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderWovenRug(): CachedSprite {
    const logicalW = 68;
    const logicalH = 40;
    const anchorX = 34;
    const anchorY = 20;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    // Outer woven cream diamond
    ctx.fillStyle = '#faebd0';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 13);
    ctx.lineTo(anchorX + 26, anchorY);
    ctx.lineTo(anchorX, anchorY + 13);
    ctx.lineTo(anchorX - 26, anchorY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9b583';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Coral & turquoise inner diamond motifs
    ctx.fillStyle = '#ef846f';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 8);
    ctx.lineTo(anchorX + 16, anchorY);
    ctx.lineTo(anchorX, anchorY + 8);
    ctx.lineTo(anchorX - 16, anchorY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#56c2c0';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 4);
    ctx.lineTo(anchorX + 8, anchorY);
    ctx.lineTo(anchorX, anchorY + 4);
    ctx.lineTo(anchorX - 8, anchorY);
    ctx.closePath();
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderLighthouse(restored: boolean): CachedSprite {
    const logicalW = 104;
    const logicalH = 152;
    const anchorX = 52;
    const anchorY = 132;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    // Shadow
    ctx.fillStyle = 'rgba(20, 48, 58, 0.24)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 3, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone base plinth
    ctx.fillStyle = '#8b9496';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY - 4, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a4adae';
    ctx.fillRect(anchorX - 18, anchorY - 14, 36, 10);

    // Tapered lighthouse tower
    ctx.fillStyle = restored ? '#fbf6ea' : '#dcd8cb';
    ctx.beginPath();
    ctx.moveTo(anchorX - 15, anchorY - 12);
    ctx.lineTo(anchorX - 10, anchorY - 88);
    ctx.lineTo(anchorX + 10, anchorY - 88);
    ctx.lineTo(anchorX + 15, anchorY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9aa09a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Warm coral-red coastal stripes
    ctx.fillStyle = restored ? '#e46b5c' : '#b8766a';
    ctx.beginPath();
    ctx.moveTo(anchorX - 13.5, anchorY - 34);
    ctx.lineTo(anchorX - 12.2, anchorY - 52);
    ctx.lineTo(anchorX + 12.2, anchorY - 52);
    ctx.lineTo(anchorX + 13.5, anchorY - 34);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(anchorX - 11.4, anchorY - 68);
    ctx.lineTo(anchorX - 10.4, anchorY - 82);
    ctx.lineTo(anchorX + 10.4, anchorY - 82);
    ctx.lineTo(anchorX + 11.4, anchorY - 68);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = restored ? '#8e5e3b' : '#6c5a47';
    drawRoundedRectPath(ctx, anchorX - 4.5, anchorY - 26, 9, 14, 4);
    ctx.fill();

    // Gallery balcony
    ctx.fillStyle = restored ? '#435862' : '#5f6868';
    ctx.fillRect(anchorX - 14, anchorY - 92, 28, 5);

    // Lantern glass room
    ctx.fillStyle = restored ? '#fff1a6' : '#a8b7b4';
    ctx.fillRect(anchorX - 9, anchorY - 108, 18, 16);
    ctx.strokeStyle = '#435862';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(anchorX - 9, anchorY - 108, 18, 16);

    if (restored) {
      const glow = ctx.createRadialGradient(anchorX, anchorY - 100, 2, anchorX, anchorY - 100, 22);
      glow.addColorStop(0, 'rgba(255, 246, 168, 0.92)');
      glow.addColorStop(1, 'rgba(255, 210, 102, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 100, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dome roof
    ctx.fillStyle = restored ? '#df5d4f' : '#7b6a64';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY - 108, 11, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f6d475';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY - 121, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Overgrown vines if not yet restored
    if (!restored) {
      ctx.strokeStyle = '#4b8f4d';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(anchorX - 13, anchorY - 14);
      ctx.quadraticCurveTo(anchorX + 6, anchorY - 38, anchorX - 9, anchorY - 64);
      ctx.quadraticCurveTo(anchorX + 5, anchorY - 78, anchorX - 6, anchorY - 94);
      ctx.stroke();

      ctx.fillStyle = '#5ea85b';
      for (const [lx, ly] of [
        [-10, -24],
        [3, -40],
        [-7, -56],
        [4, -74],
        [-6, -86],
      ]) {
        ctx.beginPath();
        ctx.ellipse(anchorX + lx, anchorY + ly, 4.5, 2.6, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderOutriggerDock(): CachedSprite {
    const logicalW = 72;
    const logicalH = 56;
    const anchorX = 36;
    const anchorY = 38;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    // Wooden dock planks
    ctx.fillStyle = '#c4945e';
    drawRoundedRectPath(ctx, 16, 26, 40, 14, 3);
    ctx.fill();
    ctx.strokeStyle = '#8b6238';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Mooring posts
    ctx.fillStyle = '#8b6238';
    ctx.fillRect(18, 16, 4.5, 18);
    ctx.fillRect(50, 16, 4.5, 18);

    // Coiled rope
    ctx.strokeStyle = '#ead4a2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20, 21, 3.2, 0, Math.PI * 2);
    ctx.stroke();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderOutriggerPost(): CachedSprite {
    const logicalW = 54;
    const logicalH = 52;
    const anchorX = 27;
    const anchorY = 36;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    // Water ripple
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Bamboo buoy post
    ctx.fillStyle = '#8eb85c';
    drawRoundedRectPath(ctx, anchorX - 3, anchorY - 20, 6, 22, 2);
    ctx.fill();
    ctx.fillStyle = '#ef7e69';
    ctx.beginPath();
    ctx.moveTo(anchorX + 3, anchorY - 19);
    ctx.lineTo(anchorX + 14, anchorY - 14);
    ctx.lineTo(anchorX + 3, anchorY - 9);
    ctx.closePath();
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderCoralReef(): CachedSprite {
    const logicalW = 64;
    const logicalH = 44;
    const anchorX = 32;
    const anchorY = 26;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    // Soft underwater glow
    ctx.fillStyle = 'rgba(255, 152, 134, 0.24)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Branching pink/coral arms
    ctx.strokeStyle = '#f58478';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 4, anchorY + 2);
    ctx.lineTo(anchorX - 8, anchorY - 8);
    ctx.moveTo(anchorX - 6, anchorY - 3);
    ctx.lineTo(anchorX - 13, anchorY - 5);
    ctx.moveTo(anchorX + 3, anchorY + 2);
    ctx.lineTo(anchorX + 8, anchorY - 9);
    ctx.moveTo(anchorX + 6, anchorY - 4);
    ctx.lineTo(anchorX + 13, anchorY - 5);
    ctx.stroke();

    // Golden sea anemone
    ctx.fillStyle = '#ffd06b';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY + 1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8f7cf5';
    ctx.beginPath();
    ctx.arc(anchorX + 10, anchorY + 3, 3.2, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderOutpostMarker(): CachedSprite {
    const logicalW = 64;
    const logicalH = 38;
    const anchorX = 32;
    const anchorY = 20;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    // Subtle stone ring indicating a scenic outpost overlook nook
    ctx.strokeStyle = 'rgba(255, 246, 212, 0.58)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY, 20, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const stones = [
      [-16, -2],
      [16, -2],
      [-10, 6],
      [10, 6],
      [0, -8],
    ];
    ctx.fillStyle = '#d8d2bf';
    for (const [sx, sy] of stones) {
      ctx.beginPath();
      ctx.ellipse(anchorX + sx, anchorY + sy, 3.2, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderBirdOfParadise(blooming: boolean): CachedSprite {
    const logicalW = 64;
    const logicalH = 68;
    const anchorX = 32;
    const anchorY = 52;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 52, 54, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tall fan leaves
    ctx.fillStyle = '#3d9953';
    for (const angle of [-0.55, -0.2, 0.25, 0.6]) {
      ctx.save();
      ctx.translate(anchorX, anchorY - 2);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -14, 4.5, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (blooming) {
      // Iconic orange & royal-blue bird-like crest
      ctx.strokeStyle = '#338047';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY - 6);
      ctx.lineTo(anchorX + 2, anchorY - 28);
      ctx.stroke();

      ctx.fillStyle = '#ff7d2c';
      for (const [ox, oy, ang] of [
        [2, -31, -0.45],
        [5, -33, -0.15],
        [8, -30, 0.22],
      ]) {
        ctx.save();
        ctx.translate(anchorX + ox, anchorY + oy);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, -4, 2.4, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#3b6ef5';
      ctx.beginPath();
      ctx.ellipse(anchorX + 8, anchorY - 27, 5, 2.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderDwarfPalm(withCoconuts: boolean): CachedSprite {
    const logicalW = 92;
    const logicalH = 98;
    const anchorX = 46;
    const anchorY = 82;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 52, 62, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 18, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Short stout curved trunk
    ctx.strokeStyle = '#b48758';
    ctx.lineWidth = 8.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.quadraticCurveTo(anchorX + 6, anchorY - 18, anchorX + 3, anchorY - 34);
    ctx.stroke();

    // Lush compact fronds
    const topX = anchorX + 3;
    const topY = anchorY - 35;
    const frondAngles = [-2.5, -1.9, -1.1, -0.35, 0.35, 1.05, 1.85];
    for (const a of frondAngles) {
      ctx.save();
      ctx.translate(topX, topY);
      ctx.rotate(a);
      ctx.fillStyle = '#54b960';
      ctx.beginPath();
      ctx.ellipse(15, 0, 16, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#83d97b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(26, 0);
      ctx.stroke();
      ctx.restore();
    }

    if (withCoconuts) {
      ctx.fillStyle = '#8b5732';
      ctx.beginPath();
      ctx.arc(topX - 3, topY + 4, 3.6, 0, Math.PI * 2);
      ctx.arc(topX + 4, topY + 5, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderSeaGlass(ready: boolean): CachedSprite {
    const logicalW = 44;
    const logicalH = 34;
    const anchorX = 22;
    const anchorY = 20;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    if (!ready) {
      return { canvas, logicalW, logicalH, anchorX, anchorY };
    }

    // Neon cyan bioluminescent halo
    const glow = ctx.createRadialGradient(anchorX, anchorY - 2, 1, anchorX, anchorY - 2, 16);
    glow.addColorStop(0, 'rgba(98, 245, 255, 0.9)');
    glow.addColorStop(0.5, 'rgba(56, 210, 255, 0.4)');
    glow.addColorStop(1, 'rgba(56, 210, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(anchorX, anchorY - 2, 16, 0, Math.PI * 2);
    ctx.fill();

    // Smooth translucent sea glass shards
    ctx.fillStyle = '#7bf7ff';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 8);
    ctx.lineTo(anchorX + 6, anchorY - 2);
    ctx.lineTo(anchorX + 2, anchorY + 4);
    ctx.lineTo(anchorX - 5, anchorY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9ffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#a4ffe8';
    ctx.beginPath();
    ctx.ellipse(anchorX - 6, anchorY + 3, 3.5, 2.2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMistBarrier(): CachedSprite {
    const logicalW = 76;
    const logicalH = 64;
    const anchorX = 38;
    const anchorY = 44;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    const puffs = [
      { x: 0, y: -14, r: 24, a: 0.72 },
      { x: -16, y: -8, r: 19, a: 0.62 },
      { x: 16, y: -10, r: 19, a: 0.62 },
      { x: 2, y: -26, r: 17, a: 0.54 },
    ];
    for (const p of puffs) {
      const grad = ctx.createRadialGradient(
        anchorX + p.x,
        anchorY + p.y,
        2,
        anchorX + p.x,
        anchorY + p.y,
        p.r
      );
      grad.addColorStop(0, `rgba(242, 252, 255, ${p.a})`);
      grad.addColorStop(0.6, `rgba(210, 240, 248, ${p.a * 0.55})`);
      grad.addColorStop(1, 'rgba(210, 240, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(anchorX + p.x, anchorY + p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderChimeStone(step: 1 | 2 | 3): CachedSprite {
    const logicalW = 60;
    const logicalH = 74;
    const anchorX = 30;
    const anchorY = 58;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 48, 56, 0.22)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 15, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Standing carved stone monolith
    ctx.fillStyle = '#8b999c';
    ctx.beginPath();
    ctx.moveTo(anchorX - 11, anchorY);
    ctx.lineTo(anchorX - 8, anchorY - 36);
    ctx.quadraticCurveTo(anchorX, anchorY - 46, anchorX + 8, anchorY - 36);
    ctx.lineTo(anchorX + 11, anchorY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#627075';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Moss cap
    ctx.fillStyle = '#5eb062';
    ctx.beginPath();
    ctx.ellipse(anchorX - 3, anchorY - 36, 7, 3.2, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Engraved glowing dots (1, 2, or 3)
    const dotPositions: Record<1 | 2 | 3, Array<[number, number]>> = {
      1: [[0, -21]],
      2: [
        [-4, -23],
        [4, -18],
      ],
      3: [
        [0, -27],
        [-4.5, -19],
        [4.5, -19],
      ],
    };
    for (const [dx, dy] of dotPositions[step]) {
      ctx.fillStyle = '#86f5ff';
      ctx.beginPath();
      ctx.arc(anchorX + dx, anchorY + dy, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d9ffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMountainCairn(): CachedSprite {
    const logicalW = 60;
    const logicalH = 64;
    const anchorX = 30;
    const anchorY = 48;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 48, 56, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 16, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const stones = [
      { y: -3, rx: 13, ry: 5.5, c: '#8c9799' },
      { y: -11, rx: 10, ry: 4.5, c: '#a2acad' },
      { y: -18, rx: 7.5, ry: 3.8, c: '#909b9d' },
      { y: -24, rx: 5.2, ry: 3.0, c: '#b4bdbd' },
      { y: -29, rx: 3.3, ry: 2.2, c: '#d8dcd7' },
    ];
    for (const s of stones) {
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.ellipse(anchorX, anchorY + s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#687376';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMistBegonia(blooming: boolean): CachedSprite {
    const logicalW = 56;
    const logicalH = 54;
    const anchorX = 28;
    const anchorY = 39;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 52, 54, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3d8f58';
    for (const [lx, ly] of [
      [-8, -5],
      [8, -5],
      [0, -9],
      [-5, -1],
      [6, -1],
    ]) {
      ctx.beginPath();
      ctx.ellipse(anchorX + lx, anchorY + ly, 6.2, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (blooming) {
      for (const [fx, fy] of [
        [-6, -12],
        [5, -13],
        [0, -7],
      ]) {
        ctx.fillStyle = '#ff7da8';
        ctx.beginPath();
        ctx.arc(anchorX + fx, anchorY + fy, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe985';
        ctx.beginPath();
        ctx.arc(anchorX + fx, anchorY + fy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMountainGuavaTree(withFruit: boolean): CachedSprite {
    const logicalW = 96;
    const logicalH = 114;
    const anchorX = 48;
    const anchorY = 96;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(20, 52, 62, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 20, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8b6544';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.quadraticCurveTo(anchorX - 3, anchorY - 24, anchorX + 1, anchorY - 44);
    ctx.stroke();

    const puffs = [
      { x: 0, y: -56, r: 22, c: '#4ba65c' },
      { x: -14, y: -48, r: 16, c: '#3f9350' },
      { x: 14, y: -49, r: 16, c: '#56b566' },
      { x: 0, y: -66, r: 15, c: '#67c774' },
    ];
    for (const p of puffs) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(anchorX + p.x, anchorY + p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (withFruit) {
      for (const [fx, fy] of [
        [-10, -52],
        [8, -56],
        [0, -45],
        [12, -45],
      ]) {
        ctx.fillStyle = '#8be06c';
        ctx.beginPath();
        ctx.arc(anchorX + fx, anchorY + fy, 4.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff85a1';
        ctx.beginPath();
        ctx.arc(anchorX + fx + 1, anchorY + fy + 0.5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderMangroveTree(): CachedSprite {
    const logicalW = 104;
    const logicalH = 116;
    const anchorX = 52;
    const anchorY = 96;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 3, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#75563b';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (const rx of [-18, -9, 9, 18]) {
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY - 24);
      ctx.quadraticCurveTo(anchorX + rx * 0.9, anchorY - 12, anchorX + rx, anchorY + 2);
      ctx.stroke();
    }

    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 20);
    ctx.lineTo(anchorX, anchorY - 48);
    ctx.stroke();

    const puffs = [
      { x: anchorX - 16, y: anchorY - 52, r: 15, c: '#388e52' },
      { x: anchorX + 16, y: anchorY - 51, r: 15, c: '#3d9957' },
      { x: anchorX, y: anchorY - 62, r: 19, c: '#4cb364' },
      { x: anchorX - 6, y: anchorY - 68, r: 14, c: '#5cc26f' },
    ];
    for (const p of puffs) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderStoneArch(): CachedSprite {
    const logicalW = 86;
    const logicalH = 92;
    const anchorX = 43;
    const anchorY = 74;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 48, 46, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#9aa396';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX - 18, anchorY);
    ctx.lineTo(anchorX - 18, anchorY - 30);
    ctx.arc(anchorX, anchorY - 30, 18, Math.PI, 0);
    ctx.lineTo(anchorX + 18, anchorY);
    ctx.stroke();

    ctx.fillStyle = '#70bd64';
    ctx.beginPath();
    ctx.ellipse(anchorX - 9, anchorY - 46, 8, 3.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(anchorX + 12, anchorY - 38, 6, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderSundial(): CachedSprite {
    const logicalW = 64;
    const logicalH = 68;
    const anchorX = 32;
    const anchorY = 50;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 48, 46, 0.22)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 16, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#aeb5a8';
    drawRoundedRectPath(ctx, anchorX - 7, anchorY - 24, 14, 24, 3);
    ctx.fill();
    ctx.fillStyle = '#cfd4c8';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY - 24, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e7bd56';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY - 25, 8.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY - 25);
    ctx.lineTo(anchorX + 6, anchorY - 34);
    ctx.lineTo(anchorX + 3, anchorY - 25);
    ctx.closePath();
    ctx.fillStyle = '#c9932e';
    ctx.fill();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderTrailSignpost(): CachedSprite {
    const logicalW = 62;
    const logicalH = 74;
    const anchorX = 31;
    const anchorY = 60;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#855a36';
    drawRoundedRectPath(ctx, anchorX - 2.5, anchorY - 36, 5, 36, 2);
    ctx.fill();

    ctx.fillStyle = '#deb17b';
    drawRoundedRectPath(ctx, anchorX - 15, anchorY - 35, 24, 9, 2.5);
    ctx.fill();
    drawRoundedRectPath(ctx, anchorX - 9, anchorY - 24, 24, 9, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#8b5e38';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderThermalLotus(ready: boolean): CachedSprite {
    const logicalW = 58;
    const logicalH = 52;
    const anchorX = 29;
    const anchorY = 38;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = '#4bb46c';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ready) {
      for (let i = -2; i <= 2; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ff9ebc' : '#ffb8cf';
        ctx.beginPath();
        ctx.ellipse(anchorX + i * 3.2, anchorY - 7 + Math.abs(i), 3.4, 6.2, i * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe57f';
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 6, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderGoldenFern(): CachedSprite {
    const logicalW = 60;
    const logicalH = 54;
    const anchorX = 30;
    const anchorY = 42;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 1, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const leaves = [-2.5, -1.9, -1.35, -0.75, -0.2, 0.35];
    for (let i = 0; i < leaves.length; i++) {
      const a = leaves[i];
      const len = 19;
      const tx = anchorX + Math.cos(a) * len;
      const ty = anchorY - 4 + Math.sin(a) * len * 0.72;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY - 3);
      ctx.quadraticCurveTo(anchorX + Math.cos(a - 0.35) * 12, anchorY - 12, tx, ty);
      ctx.quadraticCurveTo(anchorX + Math.cos(a + 0.35) * 12, anchorY - 6, anchorX, anchorY - 3);
      ctx.fillStyle = i % 2 === 0 ? '#d8a644' : '#f2c85b';
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderWildVanilla(ready: boolean): CachedSprite {
    const logicalW = 60;
    const logicalH = 60;
    const anchorX = 30;
    const anchorY = 46;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.strokeStyle = '#4c9e4e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.quadraticCurveTo(anchorX - 8, anchorY - 16, anchorX + 4, anchorY - 28);
    ctx.stroke();

    ctx.fillStyle = '#5bb85a';
    ctx.beginPath();
    ctx.ellipse(anchorX - 7, anchorY - 13, 6, 3, -0.3, 0, Math.PI * 2);
    ctx.ellipse(anchorX + 7, anchorY - 19, 6, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    if (ready) {
      ctx.fillStyle = '#fff3b8';
      ctx.beginPath();
      ctx.arc(anchorX + 2, anchorY - 26, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b343';
      ctx.beginPath();
      ctx.arc(anchorX + 2, anchorY - 26, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderGlowMushroom(glowing: boolean): CachedSprite {
    const logicalW = 54;
    const logicalH = 48;
    const anchorX = 27;
    const anchorY = 34;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    const caps = [
      { x: anchorX - 6, y: anchorY - 8, r: 6.5 },
      { x: anchorX + 6, y: anchorY - 5, r: 5 },
      { x: anchorX, y: anchorY - 12, r: 7.5 },
    ];

    for (const c of caps) {
      ctx.fillStyle = glowing ? '#b5fff4' : '#d8cbb8';
      ctx.fillRect(c.x - 1.8, c.y, 3.6, anchorY - c.y);

      ctx.fillStyle = glowing ? '#47f0db' : '#b89f86';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      if (glowing) {
        ctx.fillStyle = '#e6fffb';
        ctx.beginPath();
        ctx.arc(c.x - 2, c.y - 3, 1.4, 0, Math.PI * 2);
        ctx.arc(c.x + 2, c.y - 2, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }

  private renderFrangipaniTree(ready: boolean): CachedSprite {
    const logicalW = 96;
    const logicalH = 104;
    const anchorX = 48;
    const anchorY = 88;
    const { canvas, ctx } = createHiDpiCanvas(logicalW, logicalH, this.dpr);

    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + 2, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8b6e56';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(anchorX, anchorY - 36);
    ctx.stroke();

    const puffs = [
      { x: anchorX - 14, y: anchorY - 44, r: 14, c: '#48a454' },
      { x: anchorX + 14, y: anchorY - 43, r: 14, c: '#50b05c' },
      { x: anchorX, y: anchorY - 54, r: 17, c: '#60c268' },
    ];
    for (const p of puffs) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ready) {
      for (const b of [
        { x: anchorX - 11, y: anchorY - 46 },
        { x: anchorX + 11, y: anchorY - 44 },
        { x: anchorX + 1, y: anchorY - 57 },
      ]) {
        ctx.fillStyle = '#fff9ee';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return { canvas, logicalW, logicalH, anchorX, anchorY };
  }
}

export function drawFaunaEntity(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  critter: FaunaEntity,
  zoom: number,
  time: number
): void {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.scale(zoom, zoom);

  const bob = Math.sin(critter.animPhase) * 1.4;
  ctx.save();
  ctx.scale(critter.facingX, 1);

  if (critter.species === 'hermit_crab') {
    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 8.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scuttling coral legs
    ctx.strokeStyle = '#ef7e69';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-7, 1 + bob * 0.4);
    ctx.moveTo(3, -2);
    ctx.lineTo(7, 1 - bob * 0.4);
    ctx.stroke();

    // Spiral shell
    ctx.fillStyle = '#ffe5c4';
    ctx.beginPath();
    ctx.ellipse(-1, -5.5 + bob * 0.3, 6.5, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2a382';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Tiny peeking eyes
    ctx.fillStyle = '#273b44';
    ctx.beginPath();
    ctx.arc(5, -4, 1, 0, Math.PI * 2);
    ctx.arc(7, -3.5, 1, 0, Math.PI * 2);
    ctx.fill();
  } else if (critter.species === 'capybara') {
    ctx.fillStyle = 'rgba(24, 58, 66, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 13.5, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, bob * 0.35);

    // Legs
    ctx.fillStyle = '#75533a';
    drawRoundedRectPath(ctx, -8, -5, 3.4, 6, 1.5);
    drawRoundedRectPath(ctx, 4, -5, 3.4, 6, 1.5);
    ctx.fill();

    // Plump cocoa body
    ctx.fillStyle = '#9a6e4c';
    ctx.beginPath();
    ctx.ellipse(-1, -9, 11.5, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blocky gentle snoot & ears
    ctx.fillStyle = '#a87b56';
    drawRoundedRectPath(ctx, 4, -15, 9.5, 7.5, 3.2);
    ctx.fill();
    ctx.fillStyle = '#7c573c';
    ctx.beginPath();
    ctx.ellipse(6.2, -15.5, 1.8, 2.2, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Peaceful squinted eye + nose
    ctx.strokeStyle = '#33231d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(8, -12.2);
    ctx.lineTo(10.5, -12.2);
    ctx.stroke();
    ctx.fillStyle = '#533827';
    ctx.beginPath();
    ctx.arc(12.5, -11, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (critter.species === 'hummingbird') {
    const hoverY = -22 + Math.sin(time * 4.5 + critter.animPhase) * 3.5;
    ctx.fillStyle = 'rgba(24, 58, 66, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, hoverY);
    const wingBeat = Math.sin(critter.animPhase * 2) * 5;
    ctx.fillStyle = 'rgba(205, 252, 232, 0.72)';
    ctx.beginPath();
    ctx.ellipse(-2, -3 + wingBeat * 0.4, 6.5, 2.6, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2cb887';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.2, 3.2, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff729f';
    ctx.beginPath();
    ctx.arc(3.5, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#36464f';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4.5, -1.5);
    ctx.lineTo(10.5, -2.5);
    ctx.stroke();
  } else if (critter.species === 'sea_turtle') {
    ctx.fillStyle = 'rgba(24, 58, 66, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flippers
    ctx.fillStyle = '#6db885';
    ctx.beginPath();
    ctx.ellipse(-7, 0, 4.2, 2, 0.4, 0, Math.PI * 2);
    ctx.ellipse(6, 0, 4.5, 2, -0.35 + bob * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Patterned carapace
    ctx.fillStyle = '#3f8a6e';
    ctx.beginPath();
    ctx.ellipse(-1, -4.5, 9.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64b88d';
    ctx.beginPath();
    ctx.ellipse(-1, -5.5, 5.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#75c48c';
    ctx.beginPath();
    ctx.arc(9.5, -4.2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#273b44';
    ctx.beginPath();
    ctx.arc(10.8, -5, 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else if (critter.species === 'tree_frog') {
    const hop = Math.max(0, Math.sin(critter.animPhase * 1.4)) * 4;
    ctx.fillStyle = 'rgba(24, 58, 66, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 7, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -hop);
    ctx.fillStyle = '#52d468';
    ctx.beginPath();
    ctx.ellipse(0, -3.5, 5.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b4f584';
    ctx.beginPath();
    ctx.ellipse(1.5, -2.5, 3.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(2.5, -7.2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#273b44';
    ctx.beginPath();
    ctx.arc(2.9, -7.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (critter.species === 'spoonbill') {
    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d96c82';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.lineTo(-2, 1);
    ctx.moveTo(2, -10);
    ctx.lineTo(2, 1);
    ctx.stroke();

    ctx.fillStyle = '#ff9bb4';
    ctx.beginPath();
    ctx.ellipse(-1, -13 + bob * 0.3, 8.5, 5.2, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd6e2';
    ctx.beginPath();
    ctx.arc(7, -18 + bob * 0.3, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6c5a56';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(9.5, -18 + bob * 0.3);
    ctx.lineTo(16, -15.5 + bob * 0.3);
    ctx.stroke();
  } else if (critter.species === 'rainbow_toucan') {
    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sleek black body & yellow throat
    ctx.fillStyle = '#252c36';
    ctx.beginPath();
    ctx.ellipse(-2, -10 + bob * 0.4, 7.5, 5.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(3.5, -13.5 + bob * 0.4, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Iconic rainbow beak
    ctx.fillStyle = '#73d656';
    ctx.beginPath();
    ctx.moveTo(6.5, -16 + bob * 0.4);
    ctx.quadraticCurveTo(16, -15 + bob * 0.4, 15.5, -11.5 + bob * 0.4);
    ctx.lineTo(6.5, -11.5 + bob * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff7d3b';
    ctx.beginPath();
    ctx.arc(13.5, -13 + bob * 0.4, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1b2329';
    ctx.beginPath();
    ctx.arc(4.2, -14.5 + bob * 0.4, 1.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (critter.species === 'blue_starfish') {
    ctx.fillStyle = 'rgba(20, 58, 78, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 0.5, 8.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d8bf0';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2 + Math.sin(time * 0.6) * 0.04;
      const rad = i % 2 === 0 ? 8.2 : 3.2;
      const px = Math.cos(a) * rad;
      const py = -1.5 + Math.sin(a) * rad * 0.55;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9be0ff';
    ctx.beginPath();
    ctx.arc(0, -1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (critter.species === 'manta_ray') {
    const flap = Math.sin(time * 2.6 + critter.animPhase) * 3.5;

    // Graceful underwater shadow
    ctx.fillStyle = 'rgba(18, 78, 102, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Manta wings
    ctx.fillStyle = '#336b8a';
    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.quadraticCurveTo(0, -13 - flap, -13, -5 + flap * 0.4);
    ctx.quadraticCurveTo(-5, -1, -13, 3 - flap * 0.4);
    ctx.quadraticCurveTo(0, 6 + flap, 10, -4);
    ctx.closePath();
    ctx.fill();

    // Soft pale markings & tail
    ctx.fillStyle = 'rgba(216, 246, 255, 0.68)';
    ctx.beginPath();
    ctx.ellipse(2, -4, 4.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#295770';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, -1);
    ctx.lineTo(-20, 1 + Math.sin(time * 3) * 1.5);
    ctx.stroke();
  } else if (critter.species === 'blue_morpho') {
    const wing = Math.abs(Math.sin(time * 9 + critter.animPhase));
    const fy = -18 + Math.sin(time * 3.5 + critter.animPhase) * 3.5;

    ctx.fillStyle = '#2596ff';
    ctx.beginPath();
    ctx.ellipse(-4, fy - 2, 6 * (0.4 + wing * 0.6), 4.8, -0.3, 0, Math.PI * 2);
    ctx.ellipse(4, fy - 2, 6 * (0.4 + wing * 0.6), 4.8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8ce6ff';
    ctx.beginPath();
    ctx.ellipse(-3.5, fy - 2, 3 * (0.4 + wing * 0.6), 2.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(3.5, fy - 2, 3 * (0.4 + wing * 0.6), 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1b2838';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, fy - 5);
    ctx.lineTo(0, fy + 2);
    ctx.stroke();
  } else if (critter.species === 'kingfisher') {
    ctx.fillStyle = 'rgba(24, 58, 66, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 7, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e8823c';
    ctx.beginPath();
    ctx.ellipse(0, -8 + bob * 0.3, 5.2, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1ca8c9';
    ctx.beginPath();
    ctx.ellipse(-2.5, -10.5 + bob * 0.3, 5.8, 3.8, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -13.5 + bob * 0.3, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2d3a42';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, -13.5 + bob * 0.3);
    ctx.lineTo(12.5, -12.5 + bob * 0.3);
    ctx.stroke();
  } else if (critter.species === 'firefly') {
    for (let i = 0; i < 4; i++) {
      const fx = Math.sin(time * 2.2 + i * 1.7 + critter.animPhase) * 8;
      const fy = -16 + Math.cos(time * 2.6 + i * 1.9) * 5;
      const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9);
      grad.addColorStop(0, 'rgba(255, 255, 185, 0.95)');
      grad.addColorStop(1, 'rgba(182, 242, 92, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // Floating friendship heart after petting/greeting
  if (critter.heartTimer > 0) {
    const progress = 1 - critter.heartTimer / 2.4;
    const hy = -26 - progress * 14;
    ctx.save();
    ctx.globalAlpha = Math.min(1, critter.heartTimer * 1.4);
    ctx.fillStyle = '#ff6b87';
    ctx.beginPath();
    ctx.arc(-2.5, hy, 2.8, 0, Math.PI * 2);
    ctx.arc(2.5, hy, 2.8, 0, Math.PI * 2);
    ctx.moveTo(-5.2, hy + 1);
    ctx.lineTo(0, hy + 6.5);
    ctx.lineTo(5.2, hy + 1);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function drawMimi(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  player: Player,
  zoom: number,
  time: number,
  lanternActive = false,
  inOutrigger = false
): void {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.scale(zoom, zoom);

  if (inOutrigger) {
    const floatBob = Math.sin(time * 3.2) * 1.5;
    ctx.translate(0, floatBob);

    // Water wake ripples
    ctx.strokeStyle = 'rgba(230, 255, 255, 0.68)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 3.5, 22, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Bamboo outrigger float (ama)
    ctx.strokeStyle = '#97be63';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-6, 1);
    ctx.lineTo(-14, 7);
    ctx.moveTo(6, 1);
    ctx.lineTo(14, 7);
    ctx.stroke();
    ctx.fillStyle = '#c8de7a';
    drawRoundedRectPath(ctx, -18, 5.5, 36, 4.5, 2.2);
    ctx.fill();

    // Main bamboo canoe hull
    ctx.fillStyle = '#c99357';
    ctx.beginPath();
    ctx.moveTo(-19, -2);
    ctx.quadraticCurveTo(0, 8, 19, -2);
    ctx.quadraticCurveTo(0, -7, -19, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8b5e34';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.translate(0, -4);
  }

  const bob = inOutrigger
    ? 0
    : player.isMoving
      ? Math.abs(Math.sin(player.walkCycle)) * 3.4
      : Math.sin(time * 2.2) * 0.75;
  const stride = player.isMoving ? Math.sin(player.walkCycle) * 4.5 : 0;
  const facingBack = player.facingY < -0.18;
  const lookX = Math.max(-1, Math.min(1, player.facingX));

  ctx.fillStyle = 'rgba(20, 52, 62, 0.26)';
  ctx.beginPath();
  ctx.ellipse(0, 1.5, 11.5 - bob * 0.35, 5 - bob * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);

  const drawSatchel = () => {
    ctx.fillStyle = '#d39f59';
    drawRoundedRectPath(ctx, -7.5, -24, 15, 11, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#9c6e34';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#e7b974';
    drawRoundedRectPath(ctx, -6.5, -24, 13, 5, 2.5);
    ctx.fill();
  };

  if (!facingBack) {
    ctx.fillStyle = '#b98344';
    ctx.beginPath();
    ctx.ellipse(-7 * Math.sign(lookX || 1), -19, 3.2, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f0b892';
  ctx.lineWidth = 3.6;

  ctx.beginPath();
  ctx.moveTo(-3.4, -10);
  ctx.lineTo(-3.6 - stride * 0.35, -1.5 + stride * 0.25);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(3.4, -10);
  ctx.lineTo(3.6 + stride * 0.35, -1.5 - stride * 0.25);
  ctx.stroke();

  ctx.fillStyle = '#8b5e3c';
  ctx.beginPath();
  ctx.ellipse(-3.8 - stride * 0.35, -1 + stride * 0.25, 2.6, 1.5, 0, 0, Math.PI * 2);
  ctx.ellipse(3.8 + stride * 0.35, -1 - stride * 0.25, 2.6, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e6d8bd';
  drawRoundedRectPath(ctx, -6.8, -14, 13.6, 6.2, 2.5);
  ctx.fill();

  ctx.fillStyle = '#ef7e69';
  drawRoundedRectPath(ctx, -7.5, -25, 15, 12.5, 4.5);
  ctx.fill();
  ctx.fillStyle = '#f69884';
  ctx.beginPath();
  ctx.ellipse(-2, -21, 3.2, 4.2, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f2be9a';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-7.2, -22.5);
  ctx.lineTo(-9.2 + stride * 0.35, -14.5 + stride * 0.25);
  ctx.moveTo(7.2, -22.5);
  ctx.lineTo(9.2 - stride * 0.35, -14.5 - stride * 0.25);
  ctx.stroke();

  if (facingBack) {
    drawSatchel();
  }

  ctx.fillStyle = '#f6c7a5';
  ctx.beginPath();
  ctx.arc(0, -32.5, 8.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5e3c2c';
  if (facingBack) {
    ctx.beginPath();
    ctx.arc(0, -32.2, 8.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -24.5, 3.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, -33.5, 8.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-7.4, -30.5, 2.1, 4.5, 0.15, 0, Math.PI * 2);
    ctx.ellipse(7.4, -30.5, 2.1, 4.5, -0.15, 0, Math.PI * 2);
    ctx.fill();

    const gazeX = lookX * 2.1;
    ctx.fillStyle = 'rgba(244, 128, 128, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-4.3 + gazeX * 0.6, -30.3, 2, 1.1, 0, 0, Math.PI * 2);
    ctx.ellipse(4.3 + gazeX * 0.6, -30.3, 2, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#33231d';
    if (player.isBlinking || player.isYawning) {
      ctx.strokeStyle = '#33231d';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4 + gazeX, -32.5);
      ctx.lineTo(-1.8 + gazeX, -32.5);
      ctx.moveTo(1.8 + gazeX, -32.5);
      ctx.lineTo(4 + gazeX, -32.5);
      ctx.stroke();
    } else if (player.happyTimer > 0) {
      ctx.strokeStyle = '#33231d';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(-2.8 + gazeX, -32, 1.4, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2.8 + gazeX, -32, 1.4, Math.PI, 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(-2.8 + gazeX, -32.5, 1.25, 0, Math.PI * 2);
      ctx.arc(2.8 + gazeX, -32.5, 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player.isYawning) {
      ctx.fillStyle = '#b45e53';
      ctx.beginPath();
      ctx.ellipse(gazeX, -29.2, 1.5, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#9c5244';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(gazeX, -30.2, 2.1, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#f3d485';
  ctx.beginPath();
  ctx.ellipse(0, -37.2, 14, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#caa252';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = '#f7dd97';
  ctx.beginPath();
  ctx.ellipse(0, -40.2, 8.2, 4.8, 0, Math.PI, 0);
  ctx.lineTo(8.2, -37.4);
  ctx.ellipse(0, -37.4, 8.2, 2.8, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3ab0b6';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(0, -37.8, 8.1, 2.2, 0, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#ff6f87';
  ctx.beginPath();
  ctx.arc(7.8, -38.4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(7.8, -38.4, 0.9, 0, Math.PI * 2);
  ctx.fill();

  if (lanternActive) {
    const handX = (lookX >= 0 ? 10.5 : -10.5) - stride * 0.25;
    const handY = -14.5 + Math.sin(time * 3.1) * 0.5;
    ctx.strokeStyle = '#7b5535';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX, handY + 3.5);
    ctx.stroke();

    const lanternGlow = ctx.createRadialGradient(handX, handY + 6, 1, handX, handY + 6, 16);
    lanternGlow.addColorStop(0, 'rgba(255, 240, 148, 0.95)');
    lanternGlow.addColorStop(0.5, 'rgba(255, 198, 92, 0.42)');
    lanternGlow.addColorStop(1, 'rgba(255, 180, 72, 0)');
    ctx.fillStyle = lanternGlow;
    ctx.beginPath();
    ctx.arc(handX, handY + 6, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe885';
    ctx.beginPath();
    ctx.arc(handX, handY + 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9c6e3b';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

export { ELEVATION_H };
