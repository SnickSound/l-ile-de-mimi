import type { CampItemType } from '../entities/CampItem';
import type { ResourceId } from '../entities/Flora';
import type { DayPhase } from '../game/TimeWeather';
import { FR_CA } from '../i18n/frCA';
import type { ToolId } from '../systems/Crafting';
import type { BiomeId } from '../world/TileMap';

export interface HudCallbacks {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onOpenCraft: () => void;
  onOpenJournal: () => void;
  onOpenMap: () => void;
  onOpenSave: () => void;
  onToggleMute: () => void;
  onEatResource: (resource: ResourceId) => void;
  onCancelPlacement: () => void;
}

const POUCH_ORDER: ResourceId[] = [
  'coconut',
  'mango',
  'starfruit',
  'pink_guava',
  'roasted_fruit',
  'driftwood',
  'bamboo',
  'shell',
  'sea_glass',
];

const TOOL_ORDER: ToolId[] = [
  'hand_basket',
  'bamboo_shears',
  'bamboo_bridge_kit',
  'firefly_lantern',
  'bamboo_outrigger',
  'sea_glass_prism',
];

export class Hud {
  private readonly biomeBadge: HTMLElement;
  private readonly biomeIcon: HTMLElement;
  private readonly biomeName: HTMLElement;
  private readonly biomeSubtitle: HTMLElement;
  private readonly pepFill: HTMLElement;
  private readonly pepState: HTMLElement;
  private readonly dayPill: HTMLElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly pouchBar: HTMLElement;
  private readonly toolsPill: HTMLElement;
  private readonly pouchButtons = new Map<ResourceId, HTMLButtonElement>();
  private readonly toolBadges = new Map<ToolId, HTMLElement>();
  private readonly placementBanner: HTMLElement;
  private readonly placementLabel: HTMLElement;
  private readonly toastEl: HTMLElement;

  private pulseTimer: number | null = null;
  private toastTimer: number | null = null;

  constructor(root: HTMLElement, initialBiome: BiomeId, callbacks: HudCallbacks) {
    const isTouchDevice =
      window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    root.innerHTML = '';

    const topArea = document.createElement('div');
    topArea.className = 'hud-top-area';

    const topBar = document.createElement('div');
    topBar.className = 'hud-top';

    this.biomeBadge = document.createElement('div');
    this.biomeBadge.className = 'hud-card biome-badge';

    this.biomeIcon = document.createElement('div');
    this.biomeIcon.className = 'biome-icon';

    const biomeText = document.createElement('div');
    biomeText.className = 'biome-text';

    this.biomeName = document.createElement('div');
    this.biomeName.className = 'biome-name';

    this.biomeSubtitle = document.createElement('div');
    this.biomeSubtitle.className = 'biome-subtitle';

    biomeText.append(this.biomeName, this.biomeSubtitle);
    this.biomeBadge.append(this.biomeIcon, biomeText);

    const statusStack = document.createElement('div');
    statusStack.className = 'status-stack';

    const pepPill = document.createElement('div');
    pepPill.className = 'hud-card pep-pill';

    const pepIcon = document.createElement('span');
    pepIcon.className = 'pep-icon';
    pepIcon.textContent = '🌿';

    const pepDetails = document.createElement('div');
    pepDetails.className = 'pep-details';

    const pepHeader = document.createElement('div');
    pepHeader.className = 'pep-header';

    const pepLabel = document.createElement('span');
    pepLabel.className = 'pep-label';
    pepLabel.textContent = FR_CA.hud.staminaLabel;

    this.pepState = document.createElement('span');
    this.pepState.className = 'pep-state';
    this.pepState.textContent = FR_CA.stamina.full;

    pepHeader.append(pepLabel, this.pepState);

    const pepTrack = document.createElement('div');
    pepTrack.className = 'pep-bar-track';

    this.pepFill = document.createElement('div');
    this.pepFill.className = 'pep-bar-fill';

    pepTrack.appendChild(this.pepFill);
    pepDetails.append(pepHeader, pepTrack);
    pepPill.append(pepIcon, pepDetails);

    this.dayPill = document.createElement('div');
    this.dayPill.className = 'hud-card daytime-pill';
    this.dayPill.textContent = `☀️ ${FR_CA.hud.dayTimeLabel}`;

    statusStack.append(pepPill, this.dayPill);
    topBar.append(this.biomeBadge, statusStack);

    // Resource pouch + Tools row
    const pouchToolsRow = document.createElement('div');
    pouchToolsRow.className = 'pouch-tools-row';

    this.pouchBar = document.createElement('div');
    this.pouchBar.className = 'hud-card pouch-bar';

    for (const resId of POUCH_ORDER) {
      const info = FR_CA.resources[resId];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pouch-item';
      btn.title = info.edible ? `${info.name} — ${FR_CA.hud.eatHint}` : info.name;
      if (info.edible) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          callbacks.onEatResource(resId);
        });
      }
      this.pouchButtons.set(resId, btn);
      this.pouchBar.appendChild(btn);
    }

    this.toolsPill = document.createElement('div');
    this.toolsPill.className = 'hud-card tools-pill';
    for (const toolId of TOOL_ORDER) {
      const info = FR_CA.tools[toolId];
      const badge = document.createElement('span');
      badge.className = 'tool-badge';
      badge.textContent = info.icon;
      badge.title = `${info.name} — ${info.description}`;
      this.toolBadges.set(toolId, badge);
      this.toolsPill.appendChild(badge);
    }

    pouchToolsRow.append(this.pouchBar, this.toolsPill);

    this.placementBanner = document.createElement('div');
    this.placementBanner.className = 'hud-card placement-banner hidden';
    this.placementLabel = document.createElement('span');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'placement-cancel-btn';
    cancelBtn.textContent = FR_CA.camp.cancelPlacement;
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onCancelPlacement();
    });
    this.placementBanner.append(this.placementLabel, cancelBtn);

    topArea.append(topBar, pouchToolsRow, this.placementBanner);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'hud-bottom';

    const bottomLeft = document.createElement('div');
    bottomLeft.className = 'hud-bottom-left';

    const craftBtn = document.createElement('button');
    craftBtn.type = 'button';
    craftBtn.className = 'hud-btn hud-btn--camp';
    craftBtn.textContent = isTouchDevice ? FR_CA.camp.buildBtnMobile : FR_CA.camp.buildBtn;
    craftBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onOpenCraft();
    });

    const journalBtn = document.createElement('button');
    journalBtn.type = 'button';
    journalBtn.className = 'hud-btn hud-btn--journal';
    journalBtn.textContent = isTouchDevice ? FR_CA.journal.btnMobile : FR_CA.journal.btn;
    journalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onOpenJournal();
    });

    const mapBtn = document.createElement('button');
    mapBtn.type = 'button';
    mapBtn.className = 'hud-btn hud-btn--map';
    mapBtn.textContent = isTouchDevice ? FR_CA.map.btnMobile : FR_CA.map.btn;
    mapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onOpenMap();
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'hud-btn hud-btn--save';
    saveBtn.textContent = isTouchDevice ? FR_CA.camp.saveBtnMobile : FR_CA.camp.saveBtn;
    saveBtn.title = FR_CA.save.modalTitle;
    saveBtn.setAttribute('aria-label', FR_CA.save.modalTitle);
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onOpenSave();
    });

    this.muteBtn = document.createElement('button');
    this.muteBtn.type = 'button';
    this.muteBtn.className = 'hud-btn';
    this.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onToggleMute();
    });

    const hint = document.createElement('div');
    hint.className = 'hud-card controls-hint';
    hint.textContent = isTouchDevice
      ? FR_CA.hud.controlsHintTouch
      : FR_CA.hud.controlsHintDesktop;

    bottomLeft.append(craftBtn, journalBtn, mapBtn, saveBtn, this.muteBtn, hint);

    const cameraControls = document.createElement('div');
    cameraControls.className = 'camera-controls';

    const btnZoomOut = this.createButton('−', FR_CA.hud.zoomOut, callbacks.onZoomOut);
    btnZoomOut.classList.add('hud-btn--zoom');
    const btnRecenter = this.createButton('◎', FR_CA.hud.recenter, callbacks.onRecenter, true);
    const btnZoomIn = this.createButton('+', FR_CA.hud.zoomIn, callbacks.onZoomIn);
    btnZoomIn.classList.add('hud-btn--zoom');

    cameraControls.append(btnZoomOut, btnRecenter, btnZoomIn);
    bottomBar.append(bottomLeft, cameraControls);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'cozy-toast';

    root.append(topArea, bottomBar, this.toastEl);
    this.updateBiome(initialBiome, false);
  }

  private createButton(
    label: string,
    title: string,
    onClick: () => void,
    accent = false
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = accent ? 'hud-btn hud-btn--accent' : 'hud-btn';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return button;
  }

  public updateBiome(biome: BiomeId, animate = true): void {
    const info = FR_CA.biomes[biome];
    this.biomeIcon.textContent = info.icon;
    this.biomeName.textContent = info.name;
    this.biomeSubtitle.textContent = info.subtitle;

    if (animate) {
      this.biomeBadge.classList.add('biome-badge--pulse');
      if (this.pulseTimer !== null) {
        window.clearTimeout(this.pulseTimer);
      }
      this.pulseTimer = window.setTimeout(() => {
        this.biomeBadge.classList.remove('biome-badge--pulse');
      }, 380);
    }
  }

  public updateTimeWeather(phase: DayPhase, isRaining: boolean, isBiolumTide = false): void {
    if (isRaining) {
      this.dayPill.textContent = `${FR_CA.timeWeather.rain.icon} ${FR_CA.timeWeather.rain.name}`;
      return;
    }
    if (isBiolumTide) {
      this.dayPill.textContent = `${FR_CA.timeWeather.biolumTide.icon} ${FR_CA.timeWeather.biolumTide.name}`;
      return;
    }
    const info = FR_CA.timeWeather.phases[phase];
    this.dayPill.textContent = `${info.icon} ${info.name}`;
  }

  public updateAudioMuted(muted: boolean): void {
    this.muteBtn.textContent = muted ? '🔇' : '🔊';
    const label = muted ? FR_CA.audio.unmuteTitle : FR_CA.audio.muteTitle;
    this.muteBtn.title = label;
    this.muteBtn.setAttribute('aria-label', label);
  }

  public updateStamina(stamina: number): void {
    const pct = Math.max(0, Math.min(100, Math.round(stamina * 100)));
    this.pepFill.style.width = `${pct}%`;

    const isLow = stamina < 0.2;
    this.pepFill.classList.toggle('pep-bar-fill--low', isLow);
    this.pepState.classList.toggle('pep-state--low', isLow);

    if (isLow) {
      this.pepState.textContent = FR_CA.stamina.low;
    } else if (stamina >= 0.85) {
      this.pepState.textContent = FR_CA.stamina.full;
    } else {
      this.pepState.textContent = FR_CA.stamina.good;
    }
  }

  public updateTools(tools: Record<ToolId, boolean>): void {
    for (const toolId of TOOL_ORDER) {
      const badge = this.toolBadges.get(toolId);
      if (badge) {
        badge.classList.toggle('tool-badge--locked', !tools[toolId]);
      }
    }
  }

  public updateInventory(inventory: Record<ResourceId, number>): void {
    let anyOwned = false;
    for (const resId of POUCH_ORDER) {
      const btn = this.pouchButtons.get(resId);
      if (!btn) {
        continue;
      }
      const info = FR_CA.resources[resId];
      const count = inventory[resId] ?? 0;
      if (count > 0) {
        anyOwned = true;
      }

      btn.classList.toggle('pouch-item--empty', count === 0);
      btn.classList.toggle('pouch-item--edible', info.edible && count > 0);
      btn.innerHTML = '';

      const iconSpan = document.createElement('span');
      iconSpan.textContent = info.icon;
      const countSpan = document.createElement('span');
      countSpan.textContent = `${count}`;
      btn.append(iconSpan, countSpan);

      if (info.edible && count > 0) {
        const eatTag = document.createElement('span');
        eatTag.className = 'pouch-eat-tag';
        eatTag.textContent = `+${Math.round(info.staminaRestore * 100)}%`;
        btn.appendChild(eatTag);
      }
    }
    this.pouchBar.classList.toggle('pouch-bar--all-empty', !anyOwned);
  }

  public setPlacementBanner(itemType: CampItemType | null): void {
    if (!itemType) {
      this.placementBanner.classList.add('hidden');
      return;
    }
    const itemInfo = FR_CA.camp.items[itemType];
    this.placementLabel.textContent = FR_CA.camp.placementBanner(`${itemInfo.icon} ${itemInfo.name}`);
    this.placementBanner.classList.remove('hidden');
  }

  public showToast(message: string, durationMs = 2600): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('cozy-toast--visible');
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('cozy-toast--visible');
    }, durationMs);
  }
}
