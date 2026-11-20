import { FR_CA } from '../i18n/frCA';
import type { GridPoint } from '../world/IsoMath';
import { findPath } from '../world/Pathfinder';
import type { BiomeId, PropType, TileMap } from '../world/TileMap';
import { PLAYER_SPAWN } from '../world/WorldData';

export interface ThoughtBubble {
  text: string;
  timer: number;
  duration: number;
}

export type PlayerInteraction =
  | { kind: 'flora'; id: string }
  | { kind: 'camp'; id: string }
  | { kind: 'fauna'; id: string }
  | {
      kind: 'barrier';
      barrier: 'vines' | 'bridge' | 'mangrove_boardwalk' | 'outrigger_crossing' | 'cascade_mist';
      gx: number;
      gy: number;
    }
  | {
      kind: 'landmark';
      landmark: 'sundial' | 'signpost' | 'lighthouse' | 'mountain_cairn' | 'chime_stone' | 'waterfall_slide';
      step?: 1 | 2 | 3;
      gx: number;
      gy: number;
    };

export interface WaterfallSlideState {
  elapsed: number;
  duration: number;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
}

export const LOW_STAMINA_THRESHOLD = 0.2;

export class Player {
  public x: number;
  public y: number;
  public z: number;

  /** Screen-space normalized facing direction: +x is right, +y is toward camera */
  public facingX = 0.2;
  public facingY = 0.98;

  public isMoving = false;
  public path: GridPoint[] = [];
  public targetTile: GridPoint | null = null;

  public walkCycle = 0;
  public idleTimer = 0;
  public blinkTimer = 2.6;
  public isBlinking = false;
  public stamina = 1.0;

  public isYawning = false;
  public yawnTimer = 0;
  public happyTimer = 0;
  public waterfallSlide: WaterfallSlideState | null = null;
  private onWaterfallSlideEnd: (() => void) | null = null;

  public currentBiome: BiomeId;
  public activeThought: ThoughtBubble | null = null;

  private pendingInspectProp: PropType | null = null;
  private pendingInspectPoint: GridPoint | null = null;
  private pendingWaterThought = false;
  private pendingInteraction: PlayerInteraction | null = null;
  private lowStaminaYawnCooldown = 4.0;
  private stepEmitTimer = 0;
  private lastBiomeAnnounced: BiomeId;

  constructor(tileMap: TileMap) {
    this.x = PLAYER_SPAWN.x;
    this.y = PLAYER_SPAWN.y;
    this.z = tileMap.getInterpolatedElevation(this.x, this.y);
    this.currentBiome = tileMap.getBiomeAt(this.x, this.y);
    this.lastBiomeAnnounced = this.currentBiome;
    this.showThought(FR_CA.thoughts.welcome, 4.8);
  }

  public showThought(text: string, duration = 3.8): void {
    this.activeThought = {
      text,
      timer: duration,
      duration,
    };
  }

  public consumeStamina(amount: number): void {
    const prev = this.stamina;
    this.stamina = Math.max(0, Math.min(1, this.stamina - amount));
    if (prev >= LOW_STAMINA_THRESHOLD && this.stamina < LOW_STAMINA_THRESHOLD) {
      this.lowStaminaYawnCooldown = 2.2;
    }
  }

  public restoreStamina(amount: number): void {
    this.stamina = Math.max(0, Math.min(1, this.stamina + amount));
    this.isYawning = false;
    this.yawnTimer = 0;
    this.happyTimer = 1.7;
  }

  public startWaterfallSlide(onComplete: () => void): void {
    this.path = [];
    this.targetTile = null;
    this.pendingInteraction = null;
    this.pendingInspectProp = null;
    this.pendingInspectPoint = null;
    this.pendingWaterThought = false;
    this.happyTimer = 3.2;
    this.facingX = -0.35;
    this.facingY = 0.94;
    this.waterfallSlide = {
      elapsed: 0,
      duration: 1.35,
      startX: 79.4,
      startY: 28.0,
      startZ: 3.05,
      endX: 78.0,
      endY: 34.0,
      endZ: 1.95,
    };
    this.onWaterfallSlideEnd = onComplete;
  }

  public setTapTarget(
    gx: number,
    gy: number,
    tileMap: TileMap,
    interaction: PlayerInteraction | null = null,
    onArriveInteraction?: (interaction: PlayerInteraction) => void,
    onInspectProp?: (prop: PropType) => void
  ): boolean {
    const tappedTile = tileMap.getTile(gx, gy);

    if (interaction) {
      this.pendingInteraction = interaction;
      this.pendingInspectProp = null;
      this.pendingWaterThought = false;
      this.pendingInspectPoint = { x: gx, y: gy };
    } else {
      this.pendingInteraction = null;
      this.pendingInspectProp = tappedTile?.prop ?? null;
      this.pendingWaterThought =
        !this.pendingInspectProp &&
        (tappedTile?.terrain === 'shallow_water' || tappedTile?.terrain === 'tidepool');
      this.pendingInspectPoint =
        this.pendingInspectProp || this.pendingWaterThought ? { x: gx, y: gy } : null;
    }

    const start: GridPoint = {
      x: Math.round(this.x),
      y: Math.round(this.y),
    };

    const computedPath = findPath(tileMap, start, { x: gx, y: gy });

    if (computedPath.length > 0) {
      this.path = computedPath;
      this.targetTile = computedPath[computedPath.length - 1];
      return true;
    }

    this.path = [];
    this.targetTile = null;

    const dist = Math.hypot(gx - this.x, gy - this.y);
    if (dist <= 2.15) {
      this.faceWorldTarget(gx, gy);
      this.triggerArrival(onArriveInteraction, onInspectProp);
    }

    return false;
  }

  private faceWorldTarget(targetX: number, targetY: number): void {
    const worldDx = targetX - this.x;
    const worldDy = targetY - this.y;
    const screenDx = (worldDx - worldDy) * 2;
    const screenDy = worldDx + worldDy;
    const len = Math.hypot(screenDx, screenDy);
    if (len > 0.001) {
      this.facingX = screenDx / len;
      this.facingY = screenDy / len;
    }
  }

  private triggerArrival(
    onArriveInteraction?: (interaction: PlayerInteraction) => void,
    onInspectProp?: (prop: PropType) => void
  ): void {
    if (this.pendingInspectPoint) {
      this.faceWorldTarget(this.pendingInspectPoint.x, this.pendingInspectPoint.y);
      this.pendingInspectPoint = null;
    }

    if (this.pendingInteraction) {
      const interaction = this.pendingInteraction;
      this.pendingInteraction = null;
      if (onArriveInteraction) {
        onArriveInteraction(interaction);
      }
      return;
    }

    if (this.pendingInspectProp) {
      const prop = this.pendingInspectProp;
      const propNote = FR_CA.thoughts.props[prop];
      if (propNote) {
        this.showThought(propNote, 4.0);
      }
      onInspectProp?.(prop);
      this.pendingInspectProp = null;
      this.pendingWaterThought = false;
      return;
    }

    if (this.pendingWaterThought) {
      this.showThought(FR_CA.thoughts.nearWater, 3.8);
      this.pendingWaterThought = false;
    }
  }

  public update(
    dt: number,
    keysPressed: Set<string>,
    tileMap: TileMap,
    onBiomeChange?: (biome: BiomeId) => void,
    onFootstep?: (x: number, y: number, z: number, terrain: string) => void,
    onArriveInteraction?: (interaction: PlayerInteraction) => void,
    onInspectProp?: (prop: PropType) => void
  ): void {
    this.blinkTimer -= dt;
    if (this.isBlinking) {
      if (this.blinkTimer <= 0) {
        this.isBlinking = false;
        this.blinkTimer = 2.4 + Math.random() * 2.5;
      }
    } else if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      this.blinkTimer = 0.13;
    }

    if (this.happyTimer > 0) {
      this.happyTimer = Math.max(0, this.happyTimer - dt);
    }

    if (this.isYawning) {
      this.yawnTimer -= dt;
      if (this.yawnTimer <= 0) {
        this.isYawning = false;
      }
    } else if (this.stamina < LOW_STAMINA_THRESHOLD) {
      this.lowStaminaYawnCooldown -= dt;
      if (this.lowStaminaYawnCooldown <= 0) {
        this.isYawning = true;
        this.yawnTimer = 1.25;
        this.lowStaminaYawnCooldown = 26;
        if (!this.activeThought) {
          this.showThought(FR_CA.stamina.yawnThought, 4.4);
        }
      }
    }

    if (this.activeThought) {
      this.activeThought.timer -= dt;
      if (this.activeThought.timer <= 0) {
        this.activeThought = null;
      }
    }

    if (this.waterfallSlide) {
      this.waterfallSlide.elapsed += dt;
      const t = Math.min(1, this.waterfallSlide.elapsed / this.waterfallSlide.duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.x =
        this.waterfallSlide.startX + (this.waterfallSlide.endX - this.waterfallSlide.startX) * ease;
      this.y =
        this.waterfallSlide.startY + (this.waterfallSlide.endY - this.waterfallSlide.startY) * ease;
      this.z =
        this.waterfallSlide.startZ + (this.waterfallSlide.endZ - this.waterfallSlide.startZ) * ease;
      this.isMoving = true;
      this.walkCycle += dt * 16;

      if (t >= 1) {
        this.x = this.waterfallSlide.endX;
        this.y = this.waterfallSlide.endY;
        this.z = tileMap.getInterpolatedElevation(this.x, this.y);
        this.waterfallSlide = null;
        const done = this.onWaterfallSlideEnd;
        this.onWaterfallSlideEnd = null;
        done?.();
      }
      return;
    }

    const staminaFactor = this.stamina < LOW_STAMINA_THRESHOLD ? 0.72 : 1.0;

    let screenDx = 0;
    let screenDy = 0;
    if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) {
      screenDy -= 1;
    }
    if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) {
      screenDy += 1;
    }
    if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) {
      screenDx -= 1;
    }
    if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) {
      screenDx += 1;
    }

    let movedThisFrame = false;

    if (screenDx !== 0 || screenDy !== 0) {
      this.path = [];
      this.targetTile = null;
      this.pendingInspectProp = null;
      this.pendingInspectPoint = null;
      this.pendingWaterThought = false;
      this.pendingInteraction = null;

      const rawWorldDx = screenDx + screenDy;
      const rawWorldDy = screenDy - screenDx;
      const worldLen = Math.hypot(rawWorldDx, rawWorldDy);

      if (worldLen > 0.001) {
        const dirX = rawWorldDx / worldLen;
        const dirY = rawWorldDy / worldLen;
        const speed = 3.4 * staminaFactor;
        const stepX = dirX * speed * dt;
        const stepY = dirY * speed * dt;

        if (tileMap.canOccupyContinuous(this.x + stepX, this.y + stepY)) {
          this.x += stepX;
          this.y += stepY;
          movedThisFrame = true;
        } else if (tileMap.canOccupyContinuous(this.x + stepX, this.y)) {
          this.x += stepX;
          movedThisFrame = true;
        } else if (tileMap.canOccupyContinuous(this.x, this.y + stepY)) {
          this.y += stepY;
          movedThisFrame = true;
        }

        const faceLen = Math.hypot(screenDx, screenDy);
        if (faceLen > 0.001) {
          this.facingX = screenDx / faceLen;
          this.facingY = screenDy / faceLen;
        }
      }
    } else if (this.path.length > 0) {
      const next = this.path[0];
      const dx = next.x - this.x;
      const dy = next.y - this.y;
      const dist = Math.hypot(dx, dy);
      const speed = 3.55 * staminaFactor;
      const maxStep = speed * dt;

      if (dist <= maxStep) {
        this.x = next.x;
        this.y = next.y;
        this.path.shift();
        movedThisFrame = true;

        if (this.path.length === 0) {
          this.targetTile = null;
          this.triggerArrival(onArriveInteraction, onInspectProp);
        }
      } else {
        this.x += (dx / dist) * maxStep;
        this.y += (dy / dist) * maxStep;
        this.faceWorldTarget(next.x, next.y);
        movedThisFrame = true;
      }
    }

    this.isMoving = movedThisFrame;
    this.z = tileMap.getInterpolatedElevation(this.x, this.y);

    if (this.isMoving) {
      this.walkCycle += dt * 11.5 * staminaFactor;
      this.idleTimer = 0;
      this.stepEmitTimer -= dt;
      if (this.stepEmitTimer <= 0) {
        this.stepEmitTimer = 0.28 / staminaFactor;
        const underfoot = tileMap.getTile(Math.round(this.x), Math.round(this.y));
        if (underfoot && onFootstep) {
          onFootstep(this.x, this.y, this.z, underfoot.terrain);
        }
      }
    } else {
      this.idleTimer += dt;
      this.stepEmitTimer = 0.08;
    }

    const newBiome = tileMap.getBiomeAt(this.x, this.y);
    if (newBiome !== 'ocean' && newBiome !== this.currentBiome) {
      this.currentBiome = newBiome;
      if (onBiomeChange) {
        onBiomeChange(newBiome);
      }
      if (newBiome !== this.lastBiomeAnnounced) {
        this.lastBiomeAnnounced = newBiome;
        if (newBiome === 'clearing') {
          this.showThought(FR_CA.thoughts.enterClearing, 4.2);
        } else if (newBiome === 'cove') {
          this.showThought(FR_CA.thoughts.enterCove, 3.8);
        } else if (newBiome === 'bambooGrove') {
          this.showThought(FR_CA.thoughts.enterBambooGrove, 4.2);
        } else if (newBiome === 'fernJungle') {
          this.showThought(FR_CA.thoughts.enterFernJungle, 4.2);
        } else if (newBiome === 'starlightLagoon') {
          this.showThought(FR_CA.thoughts.enterStarlightLagoon, 4.4);
        } else if (newBiome === 'hotSprings') {
          this.showThought(FR_CA.thoughts.enterHotSprings, 4.4);
        } else if (newBiome === 'mangrove') {
          this.showThought(FR_CA.thoughts.enterMangrove, 4.4);
        } else if (newBiome === 'ancientRuins') {
          this.showThought(FR_CA.thoughts.enterAncientRuins, 4.4);
        } else if (newBiome === 'tradewindCliffs') {
          this.showThought(FR_CA.thoughts.enterTradewindCliffs, 4.4);
        } else if (newBiome === 'coralAtoll') {
          this.showThought(FR_CA.thoughts.enterCoralAtoll, 4.4);
        } else if (newBiome === 'cascadePeaks') {
          this.showThought(FR_CA.thoughts.enterCascadePeaks, 4.6);
        }
      }
    }
  }
}
