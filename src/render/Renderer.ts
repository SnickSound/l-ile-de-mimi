import {
  CLEARING_GRID_BOUNDS,
  isCampItemWalkable,
  isOutpostItemType,
  isValidPlacementTile,
} from '../entities/CampItem';
import { isFaunaActive } from '../entities/Fauna';
import { isFloraBlooming, isFloraReady } from '../entities/Flora';
import type { Player } from '../entities/Player';
import type { GameState } from '../game/GameState';
import {
  ELEVATION_H,
  TILE_H,
  TILE_W,
  worldToIso,
  worldToScreen,
  type CameraState,
  type GridPoint,
} from '../world/IsoMath';
import type { TileData, TileMap } from '../world/TileMap';
import {
  CHIME_STONE_POSITIONS,
  LIGHTHOUSE_POS,
  SCENIC_OUTPOST_NOOKS,
} from '../world/WorldData';
import { ArtCache, drawFaunaEntity, drawMimi } from './ArtCache';
import { WeatherFX } from './WeatherFX';

interface TapRipple {
  gx: number;
  gy: number;
  gz: number;
  age: number;
  duration: number;
}

interface FootstepPuff {
  x: number;
  y: number;
  z: number;
  age: number;
  duration: number;
  color: string;
}

interface SunMote {
  x: number;
  y: number;
  phase: number;
  speed: number;
  radius: number;
}

interface DepthRenderItem {
  depth: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly artCache: ArtCache;
  private readonly weatherFX = new WeatherFX();
  private readonly lightCanvas: HTMLCanvasElement;
  private readonly lightCtx: CanvasRenderingContext2D;

  private readonly tapRipples: TapRipple[] = [];
  private readonly footsteps: FootstepPuff[] = [];
  private readonly sunMotes: SunMote[] = [];

  constructor(canvas: HTMLCanvasElement, artCache: ArtCache) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible d’initialiser le contexte Canvas 2D.');
    }
    this.ctx = context;
    this.artCache = artCache;

    this.lightCanvas = document.createElement('canvas');
    const lCtx = this.lightCanvas.getContext('2d');
    if (!lCtx) {
      throw new Error('Impossible d’initialiser le calque d’éclairage.');
    }
    this.lightCtx = lCtx;

    for (let i = 0; i < 22; i++) {
      this.sunMotes.push({
        x: Math.random(),
        y: Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.012 + Math.random() * 0.018,
        radius: 1.5 + Math.random() * 2.2,
      });
    }
  }

  public resize(camera: CameraState): void {
    const dpr = this.artCache.dpr;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.canvas.width = Math.ceil(width * dpr);
    this.canvas.height = Math.ceil(height * dpr);
    this.lightCanvas.width = width;
    this.lightCanvas.height = height;
    camera.viewWidth = width;
    camera.viewHeight = height;
  }

  public snapCameraToPlayer(camera: CameraState, player: Player): void {
    const iso = worldToIso(player.x, player.y, player.z);
    camera.x = iso.x;
    camera.y = iso.y - 16;
  }

  public addTapRipple(gx: number, gy: number, gz: number): void {
    this.tapRipples.push({
      gx,
      gy,
      gz,
      age: 0,
      duration: 0.72,
    });
  }

  public addFootstep(x: number, y: number, z: number, terrain: string): void {
    const color =
      terrain === 'tidepool' || terrain === 'wet_sand' || terrain === 'thermal_pool'
        ? 'rgba(218, 250, 255, 0.65)'
        : terrain === 'coastal_grass' ||
            terrain === 'clearing_grass' ||
            terrain === 'bamboo_grass' ||
            terrain === 'jungle_grass' ||
            terrain === 'lagoon_grass'
          ? 'rgba(220, 248, 178, 0.55)'
          : terrain === 'mangrove_mud'
            ? 'rgba(196, 176, 138, 0.55)'
            : terrain === 'basalt_rock' || terrain === 'ruin_stone'
              ? 'rgba(232, 236, 232, 0.45)'
              : 'rgba(255, 242, 198, 0.65)';
    this.footsteps.push({
      x,
      y,
      z,
      age: 0,
      duration: 0.55,
      color,
    });
  }

  public render(
    time: number,
    dt: number,
    state: GameState,
    hoverTile: GridPoint | null
  ): void {
    const { tileMap, player, camera, timeWeather } = state;

    let focusX = player.x;
    let focusY = player.y;
    let focusZ = player.z;
    if (state.placementMode && !player.isMoving) {
      let targetCenterX = 44;
      let targetCenterY = 36.5;
      if (isOutpostItemType(state.placementMode.type)) {
        let bestDist = Math.hypot(player.x - targetCenterX, player.y - targetCenterY);
        for (const nook of SCENIC_OUTPOST_NOOKS) {
          const cx = (nook.minX + nook.maxX) / 2;
          const cy = (nook.minY + nook.maxY) / 2;
          const d = Math.hypot(player.x - cx, player.y - cy);
          if (d < bestDist) {
            bestDist = d;
            targetCenterX = cx;
            targetCenterY = cy;
          }
        }
      }
      focusX = player.x * 0.35 + targetCenterX * 0.65;
      focusY = player.y * 0.35 + targetCenterY * 0.65;
      focusZ = tileMap.getInterpolatedElevation(focusX, focusY);
    }

    const targetIso = worldToIso(focusX, focusY, focusZ);
    const followFactor = 1 - Math.exp(-6.5 * dt);
    const zoomFactor = 1 - Math.exp(-10 * dt);
    camera.x += (targetIso.x - camera.x) * followFactor;
    camera.y += (targetIso.y - 16 - camera.y) * followFactor;
    camera.zoom += (camera.targetZoom - camera.zoom) * zoomFactor;

    this.updateEffects(dt);
    this.weatherFX.update(dt, timeWeather, tileMap);

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.artCache.dpr, this.artCache.dpr);

    this.drawOceanBackdrop(ctx, state, time);
    this.drawTerrainPass(ctx, tileMap, camera, time, timeWeather.isBioluminescentTideActive());
    this.weatherFX.drawCloudShadows(ctx, camera, timeWeather, tileMap);
    this.drawPlacementGrid(ctx, state, hoverTile, time);
    this.drawOverlayMarkers(ctx, state, hoverTile, time);
    this.drawEntitiesAndPropsPass(ctx, state, hoverTile, time);
    this.weatherFX.drawHotSpringsSteam(ctx, camera, tileMap, time);
    this.weatherFX.drawCascadeWaterfallAndMist(
      ctx,
      camera,
      tileMap,
      timeWeather,
      time,
      state.cascadeMistAlpha
    );
    this.drawLightingPass(ctx, state, time);
    this.drawLighthouseBeam(ctx, state, time);
    this.weatherFX.drawBioluminescentSparkles(ctx, camera, timeWeather, tileMap, time);
    this.weatherFX.drawFireflies(ctx, camera, timeWeather, tileMap, time);
    this.weatherFX.drawRain(ctx, camera, timeWeather);
    this.drawSunMotes(ctx, state, time);
    this.drawThoughtBubble(ctx, player, camera);

    ctx.restore();
  }

  private updateEffects(dt: number): void {
    for (let i = this.tapRipples.length - 1; i >= 0; i--) {
      this.tapRipples[i].age += dt;
      if (this.tapRipples[i].age >= this.tapRipples[i].duration) {
        this.tapRipples.splice(i, 1);
      }
    }

    for (let i = this.footsteps.length - 1; i >= 0; i--) {
      this.footsteps[i].age += dt;
      if (this.footsteps[i].age >= this.footsteps[i].duration) {
        this.footsteps.splice(i, 1);
      }
    }
  }

  private drawOceanBackdrop(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    time: number
  ): void {
    const { camera, timeWeather } = state;
    const palette = timeWeather.getOceanPalette();
    const grad = ctx.createLinearGradient(0, 0, 0, camera.viewHeight);
    grad.addColorStop(0, palette.top);
    grad.addColorStop(0.55, palette.mid);
    grad.addColorStop(1, palette.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight);

    this.weatherFX.drawStarsAndMoonbeams(ctx, camera, timeWeather, time);

    const waveAlpha = 0.14 - timeWeather.getStarAlpha() * 0.06;
    ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    const spacingX = 110;
    const spacingY = 64;
    const offsetX = ((-camera.x * 0.35 + time * 14) % spacingX + spacingX) % spacingX;
    const offsetY = ((-camera.y * 0.35) % spacingY + spacingY) % spacingY;

    for (let y = offsetY - spacingY; y < camera.viewHeight + spacingY; y += spacingY) {
      for (let x = offsetX - spacingX; x < camera.viewWidth + spacingX; x += spacingX) {
        const wave = Math.sin(time * 1.4 + x * 0.02 + y * 0.03) * 4;
        ctx.beginPath();
        ctx.moveTo(x, y + wave);
        ctx.quadraticCurveTo(x + 14, y - 3 + wave, x + 28, y + wave);
        ctx.stroke();
      }
    }
  }

  private drawTerrainPass(
    ctx: CanvasRenderingContext2D,
    tileMap: TileMap,
    camera: CameraState,
    time: number,
    biolumActive: boolean
  ): void {
    const maxSum = tileMap.width + tileMap.height - 2;
    const halfW = (TILE_W / 2) * camera.zoom;
    const halfH = (TILE_H / 2) * camera.zoom;

    for (let sum = 0; sum <= maxSum; sum++) {
      for (let gx = 0; gx < tileMap.width; gx++) {
        const gy = sum - gx;
        if (gy < 0 || gy >= tileMap.height) {
          continue;
        }
        const tile = tileMap.getTile(gx, gy);
        if (!tile) {
          continue;
        }

        const pos = worldToScreen(gx, gy, tile.elevation, camera);

        if (
          pos.x < -80 * camera.zoom ||
          pos.x > camera.viewWidth + 80 * camera.zoom ||
          pos.y < -90 * camera.zoom ||
          pos.y > camera.viewHeight + 90 * camera.zoom
        ) {
          continue;
        }

        if (tile.terrain === 'deep_water' || tile.terrain === 'shallow_water') {
          this.drawWaterTile(ctx, tile, pos.x, pos.y, halfW, halfH, camera.zoom, time, biolumActive);
        } else {
          const sprite = this.artCache.getTerrainSprite(tile.terrain, tile.variant);
          if (sprite) {
            ctx.drawImage(
              sprite.canvas,
              pos.x - sprite.anchorX * camera.zoom,
              pos.y - sprite.anchorY * camera.zoom,
              sprite.logicalW * camera.zoom,
              sprite.logicalH * camera.zoom
            );
          }
        }
      }
    }
  }

  private drawWaterTile(
    ctx: CanvasRenderingContext2D,
    tile: TileData,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    zoom: number,
    time: number,
    biolumActive: boolean
  ): void {
    if (tile.terrain === 'deep_water') {
      return;
    }

    const shimmer = Math.sin(time * 2.1 + tile.x * 0.6 + tile.y * 0.8) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - halfH);
    ctx.lineTo(sx + halfW, sy);
    ctx.lineTo(sx, sy + halfH);
    ctx.lineTo(sx - halfW, sy);
    ctx.closePath();

    const isLagoon = tile.biome === 'starlightLagoon' || tile.biome === 'coralAtoll';
    if (biolumActive) {
      ctx.fillStyle = `rgba(48, 224, 255, ${0.44 + shimmer * 0.28})`;
    } else {
      ctx.fillStyle = isLagoon
        ? `rgba(88, 212, 232, ${0.46 + shimmer * 0.16})`
        : `rgba(104, 224, 224, ${0.34 + shimmer * 0.14})`;
    }
    ctx.fill();

    if (tile.variant > 0.42 || biolumActive) {
      const waveShift = Math.sin(time * 1.8 + tile.x) * 3 * zoom;
      ctx.strokeStyle = biolumActive
        ? `rgba(130, 248, 255, ${0.45 + shimmer * 0.45})`
        : `rgba(255, 255, 255, ${0.22 + shimmer * 0.25})`;
      ctx.lineWidth = Math.max(1, 1.4 * zoom);
      ctx.beginPath();
      ctx.moveTo(sx - 10 * zoom + waveShift, sy);
      ctx.quadraticCurveTo(sx + waveShift, sy - 2.5 * zoom, sx + 10 * zoom + waveShift, sy);
      ctx.stroke();
    }
  }

  private drawPlacementGrid(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    hoverTile: GridPoint | null,
    time: number
  ): void {
    if (!state.placementMode) {
      return;
    }

    const { tileMap, floraNodes, campItems, camera, placementMode } = state;
    const hw = (TILE_W / 2) * camera.zoom;
    const hh = (TILE_H / 2) * camera.zoom;
    const pulse = 0.72 + Math.sin(time * 4.5) * 0.28;

    const zones: Array<{ minX: number; maxX: number; minY: number; maxY: number }> = [
      CLEARING_GRID_BOUNDS,
    ];
    if (isOutpostItemType(placementMode.type)) {
      for (const nook of SCENIC_OUTPOST_NOOKS) {
        zones.push(nook);
      }
    }

    for (const zone of zones) {
      for (let gy = zone.minY; gy <= zone.maxY; gy++) {
        for (let gx = zone.minX; gx <= zone.maxX; gx++) {
          const valid = isValidPlacementTile(
            tileMap,
            floraNodes,
            campItems,
            placementMode.type,
            gx,
            gy,
            placementMode.movingItemId
          );
          if (!valid) {
            continue;
          }

          const elev = tileMap.getElevation(gx, gy);
          const pos = worldToScreen(gx, gy, elev, camera);
          const isHover = hoverTile?.x === gx && hoverTile?.y === gy;

          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - hh);
          ctx.lineTo(pos.x + hw, pos.y);
          ctx.lineTo(pos.x, pos.y + hh);
          ctx.lineTo(pos.x - hw, pos.y);
          ctx.closePath();

          ctx.fillStyle = isHover
            ? `rgba(255, 248, 179, ${0.42 * pulse})`
            : 'rgba(130, 240, 170, 0.22)';
          ctx.fill();
          ctx.strokeStyle = isHover
            ? 'rgba(255, 255, 255, 0.95)'
            : `rgba(232, 255, 212, ${0.58 * pulse})`;
          ctx.lineWidth = isHover ? 2.2 : 1.3;
          ctx.stroke();

          if (isHover) {
            const preview = this.artCache.getCampSprite(placementMode.type);
            if (preview) {
              ctx.save();
              ctx.globalAlpha = 0.78;
              ctx.drawImage(
                preview.canvas,
                pos.x - preview.anchorX * camera.zoom,
                pos.y - preview.anchorY * camera.zoom,
                preview.logicalW * camera.zoom,
                preview.logicalH * camera.zoom
              );
              ctx.restore();
            }
          }
        }
      }
    }
  }

  private drawOverlayMarkers(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    hoverTile: GridPoint | null,
    time: number
  ): void {
    const { tileMap, player, camera } = state;

    if (hoverTile && !state.placementMode) {
      const tile = tileMap.getTile(hoverTile.x, hoverTile.y);
      if (tile && tile.terrain !== 'deep_water') {
        const pos = worldToScreen(tile.x, tile.y, tile.elevation, camera);
        const hw = (TILE_W / 2) * camera.zoom;
        const hh = (TILE_H / 2) * camera.zoom;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - hh);
        ctx.lineTo(pos.x + hw, pos.y);
        ctx.lineTo(pos.x, pos.y + hh);
        ctx.lineTo(pos.x - hw, pos.y);
        ctx.closePath();
        ctx.strokeStyle = tileMap.isWalkable(tile.x, tile.y)
          ? 'rgba(255, 255, 255, 0.55)'
          : 'rgba(255, 232, 163, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    if (player.path.length > 0) {
      for (let i = 0; i < player.path.length; i++) {
        const pt = player.path[i];
        const z = tileMap.getElevation(pt.x, pt.y);
        const pos = worldToScreen(pt.x, pt.y, z, camera);
        const isLast = i === player.path.length - 1;
        const pulse = 1 + Math.sin(time * 5 - i * 0.6) * 0.15;

        if (isLast) {
          ctx.strokeStyle = 'rgba(255, 250, 224, 0.85)';
          ctx.lineWidth = 2 * camera.zoom;
          ctx.beginPath();
          ctx.ellipse(
            pos.x,
            pos.y,
            10 * camera.zoom * pulse,
            5 * camera.zoom * pulse,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255, 252, 235, 0.62)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y, 2.8 * camera.zoom, 1.5 * camera.zoom, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const ripple of this.tapRipples) {
      const progress = ripple.age / ripple.duration;
      const alpha = (1 - progress) * 0.85;
      const pos = worldToScreen(ripple.gx, ripple.gy, ripple.gz, camera);
      const radius = (6 + progress * 22) * camera.zoom;

      ctx.strokeStyle = `rgba(255, 249, 206, ${alpha})`;
      ctx.lineWidth = Math.max(1.2, 2.2 * (1 - progress) * camera.zoom);
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, radius, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (progress < 0.65) {
        const innerRadius = (3 + progress * 14) * camera.zoom;
        ctx.strokeStyle = `rgba(116, 235, 226, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, innerRadius, innerRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const step of this.footsteps) {
      const progress = step.age / step.duration;
      const pos = worldToScreen(step.x, step.y, step.z, camera);
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = step.color;
      ctx.beginPath();
      ctx.ellipse(
        pos.x,
        pos.y,
        (3.5 + progress * 4) * camera.zoom,
        (1.8 + progress * 2) * camera.zoom,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  private drawEntitiesAndPropsPass(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    hoverTile: GridPoint | null,
    time: number
  ): void {
    const { tileMap, player, floraNodes, campItems, fauna, camera, timeWeather } = state;
    const items: DepthRenderItem[] = [];
    const occupiedByCamp = new Set(campItems.map((c) => `${c.gx},${c.gy}`));

    // Static island props
    for (let gy = 0; gy < tileMap.height; gy++) {
      for (let gx = 0; gx < tileMap.width; gx++) {
        const tile = tileMap.getTile(gx, gy);
        if (!tile?.prop) {
          continue;
        }
        if (tile.propWalkable && occupiedByCamp.has(`${gx},${gy}`)) {
          continue;
        }
        const prop = tile.prop;
        const sprite = this.artCache.getPropSprite(prop);
        if (!sprite) {
          continue;
        }

        const pos = worldToScreen(gx, gy, tile.elevation, camera);
        if (
          pos.x < -140 * camera.zoom ||
          pos.x > camera.viewWidth + 140 * camera.zoom ||
          pos.y < -180 * camera.zoom ||
          pos.y > camera.viewHeight + 140 * camera.zoom
        ) {
          continue;
        }

        const depthBias = tile.propWalkable ? -0.35 : 0.05;
        const swayFactor =
          prop === 'palm_tall' || prop === 'palm_curved'
            ? 0.032
            : prop === 'hibiscus' || prop === 'fern' || prop === 'vine_barrier'
              ? 0.025
              : 0;

        items.push({
          depth: gx + gy + depthBias,
          draw: (renderCtx) => {
            renderCtx.save();
            renderCtx.translate(pos.x, pos.y);
            if (swayFactor > 0) {
              const angle = Math.sin(time * 1.55 + gx * 0.7 + gy * 0.4) * swayFactor;
              renderCtx.rotate(angle);
            }
            renderCtx.drawImage(
              sprite.canvas,
              -sprite.anchorX * camera.zoom,
              -sprite.anchorY * camera.zoom,
              sprite.logicalW * camera.zoom,
              sprite.logicalH * camera.zoom
            );
            renderCtx.restore();
          },
        });
      }
    }

    // Interactive & Reactive Flora
    for (const node of floraNodes) {
      const ready = isFloraReady(node);
      const blooming = isFloraBlooming(node, timeWeather);
      if (node.type === 'sea_glass_spot' && (!blooming || !ready)) {
        continue;
      }
      const activeVisual =
        node.bloomCondition === 'always' ? ready : blooming;
      const sprite = this.artCache.getFloraSprite(node.type, activeVisual);
      if (!sprite) {
        continue;
      }

      const elev = tileMap.getElevation(node.gx, node.gy);
      const pos = worldToScreen(node.gx, node.gy, elev, camera);
      const swayFactor =
        node.type === 'coconut_palm'
          ? 0.03
          : node.type === 'bamboo_clump'
            ? 0.036
            : node.type === 'mango_tree' || node.type === 'starfruit_tree'
              ? 0.016
              : 0.014;

      const depthBias = node.walkable ? -0.25 : 0.06;
      const isHovered = hoverTile?.x === node.gx && hoverTile?.y === node.gy;

      items.push({
        depth: node.gx + node.gy + depthBias,
        draw: (renderCtx) => {
          renderCtx.save();
          renderCtx.translate(pos.x, pos.y);
          if (swayFactor > 0) {
            const angle = Math.sin(time * 1.55 + node.gx * 0.8 + node.gy * 0.5) * swayFactor;
            renderCtx.rotate(angle);
          }
          renderCtx.drawImage(
            sprite.canvas,
            -sprite.anchorX * camera.zoom,
            -sprite.anchorY * camera.zoom,
            sprite.logicalW * camera.zoom,
            sprite.logicalH * camera.zoom
          );
          renderCtx.restore();

          if (ready && blooming) {
            const sparkleY =
              node.type === 'coconut_palm'
                ? -44
                : node.type === 'mango_tree' || node.type === 'starfruit_tree'
                  ? -48
                  : node.type === 'bamboo_clump'
                    ? -42
                    : -16;
            const pulse = 0.5 + 0.5 * Math.sin(time * 3.4 + node.gx * 1.3);
            renderCtx.save();
            renderCtx.fillStyle =
              node.type === 'moonflower_node'
                ? `rgba(196, 240, 255, ${0.55 + pulse * 0.4})`
                : node.type === 'raindrop_orchid_node'
                  ? `rgba(192, 186, 255, ${0.55 + pulse * 0.4})`
                  : `rgba(255, 247, 178, ${0.4 + pulse * 0.45})`;
            renderCtx.beginPath();
            renderCtx.arc(
              pos.x + 8 * camera.zoom,
              pos.y + sparkleY * camera.zoom - pulse * 3 * camera.zoom,
              (2.3 + pulse * 1.1) * camera.zoom,
              0,
              Math.PI * 2
            );
            renderCtx.fill();
            renderCtx.restore();
          } else if (!ready && isHovered) {
            const pct = 1 - node.regrowTimer / node.regrowDuration;
            renderCtx.save();
            renderCtx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            renderCtx.lineWidth = 2.5;
            renderCtx.beginPath();
            renderCtx.arc(
              pos.x,
              pos.y - 24 * camera.zoom,
              8 * camera.zoom,
              -Math.PI / 2,
              -Math.PI / 2 + pct * Math.PI * 2
            );
            renderCtx.stroke();
            renderCtx.restore();
          }
        },
      });
    }

    // Placed Camp Items
    for (const item of campItems) {
      const sprite = this.artCache.getCampSprite(item.type);
      if (!sprite) {
        continue;
      }
      const elev = tileMap.getElevation(item.gx, item.gy);
      const pos = worldToScreen(item.gx, item.gy, elev, camera);
      const depthBias = isCampItemWalkable(item.type) ? -0.32 : 0.08;

      items.push({
        depth: item.gx + item.gy + depthBias,
        draw: (renderCtx) => {
          if (item.type === 'campfire') {
            const glowPulse = 0.22 + Math.sin(time * 6.5) * 0.04;
            const glowGrad = renderCtx.createRadialGradient(
              pos.x,
              pos.y - 4 * camera.zoom,
              4 * camera.zoom,
              pos.x,
              pos.y - 4 * camera.zoom,
              46 * camera.zoom
            );
            glowGrad.addColorStop(0, `rgba(255, 198, 92, ${glowPulse})`);
            glowGrad.addColorStop(1, 'rgba(255, 165, 64, 0)');
            renderCtx.fillStyle = glowGrad;
            renderCtx.beginPath();
            renderCtx.arc(pos.x, pos.y - 4 * camera.zoom, 46 * camera.zoom, 0, Math.PI * 2);
            renderCtx.fill();
          }

          renderCtx.save();
          renderCtx.translate(pos.x, pos.y);
          if (item.type === 'shell_windchime') {
            renderCtx.rotate(Math.sin(time * 2.2 + item.gx) * 0.025);
          }
          renderCtx.drawImage(
            sprite.canvas,
            -sprite.anchorX * camera.zoom,
            -sprite.anchorY * camera.zoom,
            sprite.logicalW * camera.zoom,
            sprite.logicalH * camera.zoom
          );
          renderCtx.restore();

          if (item.type === 'campfire') {
            this.drawCampfireFlames(renderCtx, pos.x, pos.y - 3 * camera.zoom, camera.zoom, time);
          }
        },
      });
    }

    // Friendly Fauna
    for (const critter of fauna) {
      if (!isFaunaActive(critter, timeWeather)) {
        continue;
      }
      const pos = worldToScreen(critter.x, critter.y, critter.z, camera);
      items.push({
        depth: critter.x + critter.y + 0.03,
        draw: (renderCtx) => {
          drawFaunaEntity(renderCtx, pos.x, pos.y, critter, camera.zoom, time);
        },
      });
    }

    // Mimi
    const mimiPos = worldToScreen(player.x, player.y, player.z, camera);
    const underfootTile = tileMap.getTile(Math.round(player.x), Math.round(player.y));
    const inOutrigger = !player.waterfallSlide && underfootTile?.terrain === 'outrigger_channel';
    items.push({
      depth: player.x + player.y + 0.02,
      draw: (renderCtx) => {
        drawMimi(
          renderCtx,
          mimiPos.x,
          mimiPos.y,
          player,
          camera.zoom,
          time,
          timeWeather.isNightLanternActive(),
          inOutrigger
        );
        if (player.waterfallSlide) {
          renderCtx.save();
          renderCtx.strokeStyle = 'rgba(235, 254, 255, 0.88)';
          renderCtx.lineWidth = 2 * camera.zoom;
          renderCtx.beginPath();
          renderCtx.ellipse(
            mimiPos.x,
            mimiPos.y + 2 * camera.zoom,
            (14 + Math.sin(time * 22) * 3) * camera.zoom,
            6.5 * camera.zoom,
            0,
            0,
            Math.PI * 2
          );
          renderCtx.stroke();
          renderCtx.restore();
        }
      },
    });

    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) {
      item.draw(ctx);
    }
  }

  private drawLightingPass(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    time: number
  ): void {
    const { timeWeather, camera, campItems, floraNodes, player, tileMap, tools } = state;
    const tint = timeWeather.getAmbientTint();
    const starAlpha = timeWeather.getStarAlpha();
    const lanternActive = timeWeather.isNightLanternActive();

    if (tint.a > 0.015) {
      const lCtx = this.lightCtx;
      lCtx.globalCompositeOperation = 'source-over';
      lCtx.clearRect(0, 0, camera.viewWidth, camera.viewHeight);
      lCtx.fillStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${tint.a})`;
      lCtx.fillRect(0, 0, camera.viewWidth, camera.viewHeight);

      lCtx.globalCompositeOperation = 'destination-out';

      const punchLight = (sx: number, sy: number, radius: number, strength = 0.92): void => {
        const grad = lCtx.createRadialGradient(sx, sy, radius * 0.12, sx, sy, radius);
        grad.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
        grad.addColorStop(0.55, `rgba(0, 0, 0, ${strength * 0.48})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.fillStyle = grad;
        lCtx.beginPath();
        lCtx.arc(sx, sy, radius, 0, Math.PI * 2);
        lCtx.fill();
      };

      for (const item of campItems) {
        if (item.type === 'campfire') {
          const elev = tileMap.getElevation(item.gx, item.gy);
          const pos = worldToScreen(item.gx, item.gy, elev, camera);
          const flicker = Math.sin(time * 6.8 + item.gx) * 5;
          punchLight(pos.x, pos.y - 8 * camera.zoom, (124 + flicker) * camera.zoom, 0.96);
        } else if (
          lanternActive &&
          (item.type === 'paper_lantern' || item.type === 'shelter_stage_3')
        ) {
          const elev = tileMap.getElevation(item.gx, item.gy);
          const pos = worldToScreen(item.gx, item.gy, elev, camera);
          const rad = item.type === 'shelter_stage_3' ? 128 : 96;
          punchLight(pos.x, pos.y - 22 * camera.zoom, rad * camera.zoom, 0.9);
        }
      }

      if (lanternActive) {
        const mimiPos = worldToScreen(player.x, player.y, player.z, camera);
        const lanternRadius = tools.firefly_lantern ? 138 : 82;
        punchLight(mimiPos.x, mimiPos.y - 16 * camera.zoom, lanternRadius * camera.zoom, 0.9);
      }

      if (lanternActive && state.worldFlags.lighthouseRestored) {
        const lhPos = worldToScreen(
          LIGHTHOUSE_POS.x,
          LIGHTHOUSE_POS.y,
          tileMap.getElevation(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.y),
          camera
        );
        punchLight(lhPos.x, lhPos.y - 98 * camera.zoom, 175 * camera.zoom, 0.94);
      }

      // Glowing awakened Chime Stones
      for (const stone of CHIME_STONE_POSITIONS) {
        if (state.worldFlags.cascadeMistCleared || stone.step <= state.worldFlags.chimeProgress) {
          const sPos = worldToScreen(
            stone.x,
            stone.y,
            tileMap.getElevation(stone.x, stone.y),
            camera
          );
          punchLight(sPos.x, sPos.y - 22 * camera.zoom, 54 * camera.zoom, 0.78);
        }
      }

      // Bioluminescent Moonflowers, glow mushrooms, sea glass & glowing moss cutouts at night
      if (starAlpha > 0.12) {
        for (const node of floraNodes) {
          if (
            (node.type === 'moonflower_node' ||
              node.type === 'glow_mushroom_node' ||
              (node.type === 'sea_glass_spot' && isFloraReady(node))) &&
            isFloraBlooming(node, timeWeather)
          ) {
            const pos = worldToScreen(
              node.gx,
              node.gy,
              tileMap.getElevation(node.gx, node.gy),
              camera
            );
            punchLight(pos.x, pos.y - 10 * camera.zoom, 48 * camera.zoom, 0.78 * starAlpha);
          }
        }
        for (const pt of [
          { x: 41, y: 27 },
          { x: 47, y: 27 },
          { x: 60, y: 17 },
          { x: 64, y: 20 },
          { x: 39, y: 50 },
          { x: 49, y: 48 },
        ]) {
          const pos = worldToScreen(pt.x, pt.y, tileMap.getElevation(pt.x, pt.y), camera);
          punchLight(pos.x, pos.y, 30 * camera.zoom, 0.5 * starAlpha);
        }
      }

      lCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.lightCanvas, 0, 0, camera.viewWidth, camera.viewHeight);
    }

    if (lanternActive) {
      const mimiPos = worldToScreen(player.x, player.y, player.z, camera);
      const glowRadius = (tools.firefly_lantern ? 76 : 52) * camera.zoom;
      const mGlow = ctx.createRadialGradient(
        mimiPos.x,
        mimiPos.y - 14 * camera.zoom,
        2,
        mimiPos.x,
        mimiPos.y - 14 * camera.zoom,
        glowRadius
      );
      mGlow.addColorStop(0, tools.firefly_lantern ? 'rgba(255, 232, 138, 0.3)' : 'rgba(255, 224, 130, 0.22)');
      mGlow.addColorStop(1, 'rgba(255, 190, 90, 0)');
      ctx.fillStyle = mGlow;
      ctx.beginPath();
      ctx.arc(mimiPos.x, mimiPos.y - 14 * camera.zoom, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const stone of CHIME_STONE_POSITIONS) {
      if (state.worldFlags.cascadeMistCleared || stone.step <= state.worldFlags.chimeProgress) {
        const sPos = worldToScreen(
          stone.x,
          stone.y,
          tileMap.getElevation(stone.x, stone.y),
          camera
        );
        const pulse = 0.24 + Math.sin(time * 3.2 + stone.step) * 0.08;
        const rad = 32 * camera.zoom;
        const glow = ctx.createRadialGradient(
          sPos.x,
          sPos.y - 22 * camera.zoom,
          2,
          sPos.x,
          sPos.y - 22 * camera.zoom,
          rad
        );
        glow.addColorStop(0, `rgba(130, 248, 255, ${pulse + 0.14})`);
        glow.addColorStop(1, 'rgba(92, 224, 240, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sPos.x, sPos.y - 22 * camera.zoom, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const item of campItems) {
      if (
        item.type !== 'campfire' &&
        !(lanternActive && (item.type === 'paper_lantern' || item.type === 'shelter_stage_3'))
      ) {
        continue;
      }
      const pos = worldToScreen(
        item.gx,
        item.gy,
        tileMap.getElevation(item.gx, item.gy),
        camera
      );
      const radius = item.type === 'campfire' ? 88 : item.type === 'shelter_stage_3' ? 76 : 64;
      const offsetY = item.type === 'campfire' ? 6 : 22;
      const glow = ctx.createRadialGradient(
        pos.x,
        pos.y - offsetY * camera.zoom,
        4,
        pos.x,
        pos.y - offsetY * camera.zoom,
        radius * camera.zoom
      );
      glow.addColorStop(0, 'rgba(255, 192, 92, 0.25)');
      glow.addColorStop(1, 'rgba(255, 152, 64, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - offsetY * camera.zoom, radius * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawLighthouseBeam(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    time: number
  ): void {
    const { worldFlags, timeWeather, tileMap, camera } = state;
    if (!worldFlags.lighthouseRestored || !timeWeather.isNightLanternActive()) {
      return;
    }

    const elev = tileMap.getElevation(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.y);
    const pos = worldToScreen(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.y, elev, camera);
    const originX = pos.x;
    const originY = pos.y - 98 * camera.zoom;

    const angle = time * 0.38;
    const beamLen = 360 * camera.zoom;
    const spread = 0.24;

    ctx.save();
    for (const dir of [0, Math.PI]) {
      const a = angle + dir;
      const tipX = originX + Math.cos(a) * beamLen;
      const tipY = originY + Math.sin(a) * beamLen * 0.52;
      const grad = ctx.createLinearGradient(originX, originY, tipX, tipY);
      grad.addColorStop(0, 'rgba(255, 242, 168, 0.42)');
      grad.addColorStop(0.5, 'rgba(255, 224, 128, 0.16)');
      grad.addColorStop(1, 'rgba(255, 210, 100, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(
        originX + Math.cos(a - spread) * beamLen,
        originY + Math.sin(a - spread) * beamLen * 0.52
      );
      ctx.lineTo(
        originX + Math.cos(a + spread) * beamLen,
        originY + Math.sin(a + spread) * beamLen * 0.52
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCampfireFlames(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    zoom: number,
    time: number
  ): void {
    const flicker = Math.sin(time * 9.5) * 1.8 * zoom;
    const sway = Math.cos(time * 7.2) * 1.6 * zoom;

    ctx.fillStyle = 'rgba(255, 134, 48, 0.92)';
    ctx.beginPath();
    ctx.moveTo(x - 6.5 * zoom, y);
    ctx.quadraticCurveTo(x - 5 * zoom, y - 10 * zoom, x + sway, y - 16 * zoom - flicker);
    ctx.quadraticCurveTo(x + 6 * zoom, y - 10 * zoom, x + 6.5 * zoom, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 224, 102, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 3.5 * zoom, y);
    ctx.quadraticCurveTo(x - 2 * zoom, y - 6 * zoom, x - sway * 0.5, y - 10 * zoom - flicker * 0.6);
    ctx.quadraticCurveTo(x + 3 * zoom, y - 6 * zoom, x + 3.5 * zoom, y);
    ctx.closePath();
    ctx.fill();

    const sparkCycle = (time * 0.9) % 1;
    ctx.fillStyle = `rgba(255, 214, 120, ${1 - sparkCycle})`;
    ctx.beginPath();
    ctx.arc(
      x + Math.sin(time * 4) * 4 * zoom,
      y - (12 + sparkCycle * 18) * zoom,
      1.3 * zoom,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawThoughtBubble(
    ctx: CanvasRenderingContext2D,
    player: Player,
    camera: CameraState
  ): void {
    const thought = player.activeThought;
    if (!thought) {
      return;
    }

    const mimiPos = worldToScreen(player.x, player.y, player.z, camera);
    const fadeIn = Math.min(1, (thought.duration - thought.timer) / 0.25);
    const fadeOut = Math.min(1, thought.timer / 0.4);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';

    const maxTextW = Math.min(260, camera.viewWidth - 48);
    const words = thought.text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxTextW - 24) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    const lineHeight = 17;
    const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxW = textWidth + 24;
    const boxH = lines.length * lineHeight + 16;

    const anchorX = Math.max(
      boxW / 2 + 12,
      Math.min(camera.viewWidth - boxW / 2 - 12, mimiPos.x)
    );
    const anchorY = Math.max(boxH + 74, mimiPos.y - 54 * camera.zoom);

    const x = anchorX - boxW / 2;
    const y = anchorY - boxH;

    ctx.fillStyle = 'rgba(255, 252, 244, 0.94)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(18, 60, 82, 0.2)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 14);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 252, 244, 0.94)';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#273b44';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], anchorX, y + 12 + lineHeight * (i + 0.5) - 4);
    }

    ctx.restore();
  }

  private drawSunMotes(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    time: number
  ): void {
    const { camera, timeWeather } = state;
    const dayVisibility = (1 - timeWeather.getStarAlpha()) * (1 - timeWeather.rainIntensity);
    if (dayVisibility <= 0.08) {
      return;
    }

    ctx.save();
    for (const mote of this.sunMotes) {
      const mx = ((mote.x + time * mote.speed) % 1) * camera.viewWidth;
      const my =
        ((mote.y + Math.sin(time * 0.7 + mote.phase) * 0.03 + 1) % 1) * camera.viewHeight;
      const pulse = (0.22 + (Math.sin(time * 2 + mote.phase) * 0.5 + 0.5) * 0.28) * dayVisibility;
      ctx.fillStyle = `rgba(255, 249, 214, ${pulse})`;
      ctx.beginPath();
      ctx.arc(mx, my, mote.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export { ELEVATION_H };
