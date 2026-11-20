import type { GameState } from '../game/GameState';
import { FR_CA } from '../i18n/frCA';
import type { BiomeId } from '../world/TileMap';
import { BIOME_SIGNPOSTS, LIGHTHOUSE_POS } from '../world/WorldData';

type LandBiomeId = Exclude<BiomeId, 'ocean'>;

const ALL_LAND_BIOMES: ReadonlyArray<LandBiomeId> = [
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
];

export interface MapModalCallbacks {
  onFastTravel: (biome: LandBiomeId) => void;
}

export class MapModal {
  private readonly backdrop: HTMLElement;
  private readonly card: HTMLElement;
  private readonly callbacks: MapModalCallbacks;

  constructor(callbacks: MapModalCallbacks) {
    this.callbacks = callbacks;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop hidden';
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    this.card = document.createElement('div');
    this.card.className = 'cozy-modal';
    this.backdrop.appendChild(this.card);
    document.body.appendChild(this.backdrop);
  }

  public isOpen(): boolean {
    return !this.backdrop.classList.contains('hidden');
  }

  public close(): void {
    this.backdrop.classList.add('hidden');
  }

  public open(state: GameState): void {
    this.card.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = `🗺️ ${FR_CA.map.modalTitle}`;

    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = FR_CA.map.modalSubtitle;

    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = FR_CA.camp.closeBtn;
    closeBtn.addEventListener('click', () => this.close());
    header.append(titleWrap, closeBtn);

    // Discovery progress
    const foundCount = ALL_LAND_BIOMES.filter((b) => state.discoveredBiomes.has(b)).length;
    const progressWrap = document.createElement('div');
    progressWrap.className = 'journal-progress-wrap';

    const progressLabel = document.createElement('div');
    progressLabel.className = 'journal-progress-label';
    progressLabel.textContent = FR_CA.map.discoveredRegions(foundCount, ALL_LAND_BIOMES.length);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'journal-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'journal-progress-fill';
    progressFill.style.width = `${Math.round((foundCount / ALL_LAND_BIOMES.length) * 100)}%`;
    progressTrack.appendChild(progressFill);
    progressWrap.append(progressLabel, progressTrack);

    // Parchment Island Canvas Map
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = 480;
    mapCanvas.height = 320;
    mapCanvas.className = 'island-map-canvas';
    this.drawIslandMap(mapCanvas, state);

    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.textContent = `👒 ${FR_CA.map.legendMimi}   •   🏕️ ${FR_CA.map.legendCamp}   •   🪧 ${FR_CA.map.legendSignpost}`;

    // Quick-travel signposts list
    const travelHeading = document.createElement('h3');
    travelHeading.className = 'modal-section-heading';
    travelHeading.textContent = FR_CA.map.quickTravelTitle;

    const travelList = document.createElement('div');
    travelList.className = 'recipe-list';

    for (const biome of ALL_LAND_BIOMES) {
      const unlocked = state.unlockedSignposts.has(biome);
      const info = FR_CA.biomes[biome];
      const isCurrent = state.player.currentBiome === biome;

      const row = document.createElement('div');
      row.className = unlocked ? 'map-signpost-row' : 'map-signpost-row map-signpost-row--locked';

      const infoWrap = document.createElement('div');
      infoWrap.className = 'map-signpost-info';

      const iconEl = document.createElement('span');
      iconEl.className = 'map-signpost-icon';
      iconEl.textContent = unlocked ? info.icon : '☁️';

      const nameEl = document.createElement('span');
      nameEl.className = 'map-signpost-name';
      nameEl.textContent = unlocked ? info.name : FR_CA.map.lockedRegionLabel;

      infoWrap.append(iconEl, nameEl);
      row.appendChild(infoWrap);

      if (unlocked) {
        if (isCurrent) {
          const badge = document.createElement('span');
          badge.className = 'recipe-badge';
          badge.textContent = FR_CA.map.currentLocationBadge;
          row.appendChild(badge);
        } else {
          const goBtn = document.createElement('button');
          goBtn.type = 'button';
          goBtn.className = 'modal-primary-btn map-travel-btn';
          goBtn.textContent = FR_CA.map.travelBtn;
          goBtn.addEventListener('click', () => {
            this.close();
            this.callbacks.onFastTravel(biome);
          });
          row.appendChild(goBtn);
        }
      }

      travelList.appendChild(row);
    }

    this.card.append(header, progressWrap, mapCanvas, legend, travelHeading, travelList);
    this.backdrop.classList.remove('hidden');
  }

  private drawIslandMap(canvas: HTMLCanvasElement, state: GameState): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    const { tileMap, discoveredBiomes, unlockedSignposts, campItems, player } = state;

    // Ocean backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#3098be');
    grad.addColorStop(1, '#58c6d4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const padX = 16;
    const padY = 14;
    const cellW = (w - padX * 2) / tileMap.width;
    const cellH = (h - padY * 2) / tileMap.height;

    const toPx = (gx: number, gy: number): { x: number; y: number } => ({
      x: padX + (gx + 0.5) * cellW,
      y: padY + (gy + 0.5) * cellH,
    });

    for (let gy = 0; gy < tileMap.height; gy++) {
      for (let gx = 0; gx < tileMap.width; gx++) {
        const tile = tileMap.getTile(gx, gy);
        if (!tile || tile.terrain === 'deep_water') {
          continue;
        }

        const x = padX + gx * cellW;
        const y = padY + gy * cellH;

        if (tile.terrain === 'shallow_water' && tile.biome === 'ocean') {
          ctx.fillStyle = 'rgba(130, 232, 234, 0.36)';
          ctx.fillRect(x, y, cellW + 0.4, cellH + 0.4);
          continue;
        }

        const isDiscovered =
          tile.biome === 'ocean' || discoveredBiomes.has(tile.biome);

        if (!isDiscovered) {
          ctx.fillStyle = 'rgba(248, 245, 232, 0.65)';
          ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
          continue;
        }

        switch (tile.terrain) {
          case 'sand':
          case 'wet_sand':
            ctx.fillStyle = '#f3da99';
            break;
          case 'coral_sand':
            ctx.fillStyle = '#fff0cc';
            break;
          case 'outrigger_channel':
            ctx.fillStyle = '#74e6ec';
            break;
          case 'tidepool':
          case 'thermal_pool':
            ctx.fillStyle = '#7de6ea';
            break;
          case 'shallow_water':
            ctx.fillStyle = '#62d1e0';
            break;
          case 'clearing_grass':
          case 'coastal_grass':
            ctx.fillStyle = '#8ad66e';
            break;
          case 'cliff_meadow':
            ctx.fillStyle = '#9be07a';
            break;
          case 'mountain_grass':
            ctx.fillStyle = '#6fc472';
            break;
          case 'mountain_rock':
            ctx.fillStyle = '#89969c';
            break;
          case 'cascade_pool':
            ctx.fillStyle = '#5ee0dc';
            break;
          case 'bamboo_grass':
            ctx.fillStyle = '#75c462';
            break;
          case 'jungle_grass':
            ctx.fillStyle = '#4ba850';
            break;
          case 'lagoon_grass':
            ctx.fillStyle = '#6ec97a';
            break;
          case 'basalt_rock':
            ctx.fillStyle = '#69747d';
            break;
          case 'mangrove_mud':
            ctx.fillStyle = '#998768';
            break;
          case 'ruin_stone':
            ctx.fillStyle = '#b9c0b5';
            break;
          case 'wood_bridge':
          case 'path':
            ctx.fillStyle = '#e4be82';
            break;
          default:
            ctx.fillStyle = '#8b9694';
        }
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
      }
    }

    // Camp marker if items placed
    if (campItems.length > 0) {
      const cPos = toPx(44, 36);
      ctx.font = '14px "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏕️', cPos.x, cPos.y);
    }

    // Lighthouse marker if Tradewind Cliffs discovered
    if (discoveredBiomes.has('tradewindCliffs')) {
      const lhPos = toPx(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.y);
      ctx.font = '13px "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🗼', lhPos.x, lhPos.y);
    }

    // Unlocked signposts
    ctx.font = '12px "Segoe UI Emoji", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const biome of ALL_LAND_BIOMES) {
      if (!unlockedSignposts.has(biome)) {
        continue;
      }
      const pt = BIOME_SIGNPOSTS[biome];
      const sp = toPx(pt.x, pt.y);
      ctx.fillStyle = 'rgba(255, 250, 236, 0.85)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('🪧', sp.x, sp.y + 0.5);
    }

    // Mimi position marker
    const mimiPt = toPx(player.x, player.y);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(mimiPt.x, mimiPt.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef7e69';
    ctx.beginPath();
    ctx.arc(mimiPt.x, mimiPt.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '13px "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillText('👒', mimiPt.x, mimiPt.y - 10);
  }
}
