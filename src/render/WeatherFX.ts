import type { TimeWeather } from '../game/TimeWeather';
import { worldToScreen, type CameraState } from '../world/IsoMath';
import type { TileMap } from '../world/TileMap';

interface StarPoint {
  nx: number;
  ny: number;
  radius: number;
  phase: number;
  warm: boolean;
}

interface Firefly {
  wx: number;
  wy: number;
  phase: number;
  speed: number;
  radius: number;
}

interface RainDrop {
  nx: number;
  ny: number;
  len: number;
  speed: number;
}

interface PuddleRipple {
  wx: number;
  wy: number;
  wz: number;
  age: number;
  duration: number;
}

interface CloudShadow {
  wx: number;
  wy: number;
  rx: number;
  ry: number;
  speed: number;
}

const CONSTELLATIONS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  // La Tortue
  [
    [0.14, 0.14],
    [0.18, 0.11],
    [0.23, 0.13],
    [0.21, 0.18],
    [0.16, 0.19],
    [0.14, 0.14],
  ],
  // La Fleur de Lune
  [
    [0.74, 0.12],
    [0.78, 0.16],
    [0.83, 0.14],
    [0.8, 0.2],
  ],
  // La Croix du Sud
  [
    [0.48, 0.08],
    [0.5, 0.15],
    [0.46, 0.11],
    [0.54, 0.12],
  ],
];

export class WeatherFX {
  private readonly stars: StarPoint[] = [];
  private readonly fireflies: Firefly[] = [];
  private readonly rainDrops: RainDrop[] = [];
  private readonly puddleRipples: PuddleRipple[] = [];
  private readonly clouds: CloudShadow[] = [];

  private rippleSpawnTimer = 0;

  constructor() {
    for (let i = 0; i < 64; i++) {
      this.stars.push({
        nx: Math.random(),
        ny: Math.random() * 0.42,
        radius: 0.9 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        warm: i % 5 === 0,
      });
    }

    for (let i = 0; i < 34; i++) {
      const zone = i % 4;
      this.fireflies.push({
        wx:
          zone === 0
            ? 40 + Math.random() * 9
            : zone === 1
              ? 39 + Math.random() * 11
              : zone === 2
                ? 15 + Math.random() * 10
                : 64 + Math.random() * 10,
        wy:
          zone === 0
            ? 34 + Math.random() * 6
            : zone === 1
              ? 24 + Math.random() * 6
              : zone === 2
                ? 21 + Math.random() * 7
                : 46 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.7,
        radius: 2.2 + Math.random() * 1.4,
      });
    }

    for (let i = 0; i < 80; i++) {
      this.rainDrops.push({
        nx: Math.random(),
        ny: Math.random(),
        len: 12 + Math.random() * 14,
        speed: 0.85 + Math.random() * 0.45,
      });
    }

    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        wx: 12 + i * 14,
        wy: 18 + (i % 3) * 14,
        rx: 105 + (i % 2) * 35,
        ry: 46 + (i % 3) * 12,
        speed: 0.32 + i * 0.05,
      });
    }
  }

  public update(dt: number, timeWeather: TimeWeather, tileMap: TileMap): void {
    // Update rain streaks
    if (timeWeather.rainIntensity > 0.01) {
      for (const drop of this.rainDrops) {
        drop.ny += dt * drop.speed;
        drop.nx -= dt * drop.speed * 0.16;
        if (drop.ny > 1.05) {
          drop.ny = -0.05;
          drop.nx = Math.random() * 1.15;
        }
        if (drop.nx < -0.05) {
          drop.nx += 1.1;
        }
      }

      this.rippleSpawnTimer -= dt * timeWeather.rainIntensity;
      if (this.rippleSpawnTimer <= 0) {
        this.rippleSpawnTimer = 0.08;
        const gx = Math.floor(12 + Math.random() * 65);
        const gy = Math.floor(14 + Math.random() * 44);
        const tile = tileMap.getTile(gx, gy);
        if (tile && tile.terrain !== 'deep_water') {
          this.puddleRipples.push({
            wx: gx + (Math.random() - 0.5) * 0.6,
            wy: gy + (Math.random() - 0.5) * 0.6,
            wz: tile.elevation,
            age: 0,
            duration: 0.65,
          });
        }
      }
    }

    for (let i = this.puddleRipples.length - 1; i >= 0; i--) {
      this.puddleRipples[i].age += dt;
      if (this.puddleRipples[i].age >= this.puddleRipples[i].duration) {
        this.puddleRipples.splice(i, 1);
      }
    }

    for (const c of this.clouds) {
      c.wx += dt * c.speed;
      if (c.wx > 96) {
        c.wx = -4;
      }
    }
  }

  public drawHotSpringsSteam(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    tileMap: TileMap,
    time: number
  ): void {
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const cycle = (time * 0.35 + i * 0.14) % 1;
      const wx = 61 + (i % 3) + Math.sin(time * 0.9 + i) * 0.35;
      const wy = 18 + Math.floor(i / 3) * 0.65;
      const wz = tileMap.getInterpolatedElevation(wx, wy);
      const pos = worldToScreen(wx, wy, wz, camera);
      const alpha = Math.sin(cycle * Math.PI) * 0.28;
      const radius = (8 + cycle * 14) * camera.zoom;

      ctx.fillStyle = `rgba(235, 250, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - cycle * 32 * camera.zoom, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public drawBioluminescentSparkles(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    timeWeather: TimeWeather,
    tileMap: TileMap,
    time: number
  ): void {
    if (!timeWeather.isBioluminescentTideActive()) {
      return;
    }
    const strength = timeWeather.getStarAlpha();
    if (strength <= 0.1) {
      return;
    }

    ctx.save();
    const shorelineAnchors: ReadonlyArray<[number, number]> = [
      [38, 50],
      [41, 51],
      [45, 51],
      [48, 49],
      [51, 48],
      [32, 69],
      [36, 72],
      [42, 72],
      [47, 70],
      [40, 62],
      [44, 56],
      [44, 58],
    ];
    for (let i = 0; i < shorelineAnchors.length; i++) {
      const [ax, ay] = shorelineAnchors[i];
      const wx = ax + Math.sin(time * 0.9 + i * 1.3) * 0.7;
      const wy = ay + Math.cos(time * 0.8 + i * 1.1) * 0.45;
      const wz = tileMap.getInterpolatedElevation(wx, wy);
      const pos = worldToScreen(wx, wy, wz, camera);
      const pulse = 0.45 + 0.55 * Math.sin(time * 2.8 + i * 1.7);
      const rad = (10 + pulse * 8) * camera.zoom;

      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, rad);
      grad.addColorStop(0, `rgba(92, 245, 255, ${0.72 * strength * pulse})`);
      grad.addColorStop(0.5, `rgba(42, 185, 255, ${0.32 * strength * pulse})`);
      grad.addColorStop(1, 'rgba(42, 185, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public drawCascadeWaterfallAndMist(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    tileMap: TileMap,
    timeWeather: TimeWeather,
    time: number,
    mistAlpha: number
  ): void {
    ctx.save();

    // 1. Animated multi-tiered Waterfall & Rainbow (visible as mist clears)
    const wfVis = Math.max(0, 1 - mistAlpha * 0.92);
    if (wfVis > 0.04) {
      const topPos = worldToScreen(79.5, 28.0, 3.02, camera);
      const botPos = worldToScreen(78.8, 31.6, 1.82, camera);
      const z = camera.zoom;

      // Flowing turquoise waterfall ribbon
      const wfGrad = ctx.createLinearGradient(topPos.x, topPos.y, botPos.x, botPos.y);
      wfGrad.addColorStop(0, `rgba(175, 248, 255, ${0.88 * wfVis})`);
      wfGrad.addColorStop(0.5, `rgba(104, 228, 240, ${0.82 * wfVis})`);
      wfGrad.addColorStop(1, `rgba(220, 252, 255, ${0.92 * wfVis})`);

      ctx.strokeStyle = wfGrad;
      ctx.lineWidth = 26 * z;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(topPos.x, topPos.y);
      ctx.lineTo(botPos.x, botPos.y);
      ctx.stroke();

      // Animated white falling foam streaks
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.72 * wfVis})`;
      ctx.lineWidth = 2.4 * z;
      for (let i = 0; i < 6; i++) {
        const flow = (time * 1.35 + i * 0.17) % 1;
        const lane = ((i % 3) - 1) * 7.5 * z;
        const x1 = topPos.x + (botPos.x - topPos.x) * flow + lane;
        const y1 = topPos.y + (botPos.y - topPos.y) * flow;
        const flow2 = Math.min(1, flow + 0.18);
        const x2 = topPos.x + (botPos.x - topPos.x) * flow2 + lane;
        const y2 = topPos.y + (botPos.y - topPos.y) * flow2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Splash foam rings & rising spray at the plunge pool
      for (let i = 0; i < 4; i++) {
        const cycle = (time * 0.9 + i * 0.25) % 1;
        ctx.strokeStyle = `rgba(240, 254, 255, ${(1 - cycle) * 0.72 * wfVis})`;
        ctx.lineWidth = 1.8 * z;
        ctx.beginPath();
        ctx.ellipse(
          botPos.x + (i - 1.5) * 7 * z,
          botPos.y + 4 * z,
          (8 + cycle * 18) * z,
          (4 + cycle * 9) * z,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      // Subtle golden treasure glint peeking behind the waterfall
      const glintPulse = 0.5 + 0.5 * Math.sin(time * 3.8);
      const midX = (topPos.x + botPos.x) * 0.5;
      const midY = (topPos.y + botPos.y) * 0.5;
      const glintGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, 14 * z);
      glintGrad.addColorStop(0, `rgba(255, 245, 170, ${(0.35 + glintPulse * 0.45) * wfVis})`);
      glintGrad.addColorStop(1, 'rgba(255, 224, 110, 0)');
      ctx.fillStyle = glintGrad;
      ctx.beginPath();
      ctx.arc(midX, midY, 14 * z, 0, Math.PI * 2);
      ctx.fill();

      // Gentle sunlit rainbow arc in the waterfall spray (day/dawn/sunset)
      const daySun = (1 - timeWeather.getStarAlpha()) * (1 - timeWeather.rainIntensity * 0.8);
      if (daySun > 0.15) {
        const rbAlpha = 0.28 * daySun * wfVis;
        const colors = [
          `rgba(255, 118, 118, ${rbAlpha})`,
          `rgba(255, 198, 102, ${rbAlpha})`,
          `rgba(130, 238, 152, ${rbAlpha})`,
          `rgba(116, 214, 255, ${rbAlpha})`,
          `rgba(182, 146, 255, ${rbAlpha})`,
        ];
        const rx = botPos.x - 10 * z;
        const ry = botPos.y - 6 * z;
        colors.forEach((col, idx) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = 3.2 * z;
          ctx.beginPath();
          ctx.arc(rx, ry, (34 + idx * 3.4) * z, Math.PI * 1.08, Math.PI * 1.92);
          ctx.stroke();
        });
      }
    }

    // 2. Swirling Waterfall Mist Veil hiding Les Crêtes de la Cascade until Chime Stones are solved
    if (mistAlpha > 0.01) {
      const mistAnchors: ReadonlyArray<[number, number, number]> = [
        [70, 33, 82],
        [73, 31, 96],
        [75, 35, 98],
        [78, 32, 112],
        [81, 35, 104],
        [77, 28, 106],
        [81, 28, 118],
        [84, 30, 102],
        [82, 24, 96],
        [74, 38, 92],
      ];
      for (let i = 0; i < mistAnchors.length; i++) {
        const [mx, my, baseR] = mistAnchors[i];
        const driftX = Math.sin(time * 0.45 + i * 1.1) * 0.6;
        const driftY = Math.cos(time * 0.38 + i * 0.9) * 0.4;
        const elev = tileMap.getInterpolatedElevation(mx, my);
        const pos = worldToScreen(mx + driftX, my + driftY, elev + 0.5, camera);
        const rad = baseR * camera.zoom;

        const grad = ctx.createRadialGradient(pos.x, pos.y, rad * 0.15, pos.x, pos.y, rad);
        grad.addColorStop(0, `rgba(244, 252, 255, ${0.95 * mistAlpha})`);
        grad.addColorStop(0.55, `rgba(222, 244, 252, ${0.78 * mistAlpha})`);
        grad.addColorStop(1, 'rgba(215, 240, 250, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  public drawStarsAndMoonbeams(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    timeWeather: TimeWeather,
    time: number
  ): void {
    const starAlpha = timeWeather.getStarAlpha();
    if (starAlpha <= 0.02) {
      return;
    }

    ctx.save();

    // Soft moonbeams shimmering across the water at night
    const moonGrad = ctx.createRadialGradient(
      camera.viewWidth * 0.78,
      camera.viewHeight * 0.14,
      8,
      camera.viewWidth * 0.78,
      camera.viewHeight * 0.14,
      190
    );
    moonGrad.addColorStop(0, `rgba(218, 236, 255, ${0.26 * starAlpha})`);
    moonGrad.addColorStop(1, 'rgba(180, 212, 255, 0)');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight);

    // Constellation lines
    ctx.strokeStyle = `rgba(188, 222, 255, ${0.22 * starAlpha})`;
    ctx.lineWidth = 1;
    for (const lines of CONSTELLATIONS) {
      ctx.beginPath();
      for (let i = 0; i < lines.length; i++) {
        const [nx, ny] = lines[i];
        const px = nx * camera.viewWidth;
        const py = ny * camera.viewHeight;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      for (const [nx, ny] of lines) {
        ctx.fillStyle = `rgba(235, 245, 255, ${0.72 * starAlpha})`;
        ctx.beginPath();
        ctx.arc(nx * camera.viewWidth, ny * camera.viewHeight, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Twinkling starfield & water reflections
    for (const s of this.stars) {
      const twinkle = 0.45 + 0.55 * Math.sin(time * 2.1 + s.phase);
      const alpha = starAlpha * twinkle;
      const sx = s.nx * camera.viewWidth;
      const sy = s.ny * camera.viewHeight;

      ctx.fillStyle = s.warm
        ? `rgba(255, 240, 198, ${alpha})`
        : `rgba(232, 244, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle reflected star shimmer on lower ocean water
      const ry = (0.72 + (1 - s.ny) * 0.25) * camera.viewHeight;
      ctx.fillStyle = `rgba(210, 234, 255, ${alpha * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(
        sx + Math.sin(time * 1.8 + s.phase) * 3,
        ry,
        s.radius * 2.2,
        s.radius * 0.55,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  public drawCloudShadows(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    timeWeather: TimeWeather,
    tileMap: TileMap
  ): void {
    const nightFade = 1 - timeWeather.getStarAlpha();
    const rainFade = 1 - timeWeather.rainIntensity;
    const strength = nightFade * rainFade;
    if (strength <= 0.1) {
      return;
    }

    ctx.save();
    ctx.fillStyle = `rgba(22, 68, 86, ${0.065 * strength})`;
    for (const c of this.clouds) {
      const elev = tileMap.getInterpolatedElevation(c.wx, c.wy);
      const pos = worldToScreen(c.wx, c.wy, elev, camera);
      ctx.beginPath();
      ctx.ellipse(
        pos.x,
        pos.y,
        c.rx * camera.zoom,
        c.ry * camera.zoom,
        -0.2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  public drawFireflies(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    timeWeather: TimeWeather,
    tileMap: TileMap,
    time: number
  ): void {
    const alpha = timeWeather.getFireflyAlpha();
    if (alpha <= 0.03) {
      return;
    }

    ctx.save();
    for (const f of this.fireflies) {
      const wx = f.wx + Math.sin(time * f.speed + f.phase) * 0.65;
      const wy = f.wy + Math.cos(time * f.speed * 0.8 + f.phase) * 0.65;
      const wz = tileMap.getInterpolatedElevation(wx, wy);
      const pos = worldToScreen(wx, wy, wz, camera);
      const bobY = -14 * camera.zoom + Math.sin(time * 2.2 + f.phase) * 5 * camera.zoom;
      const glow = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 3.4 + f.phase));

      const rad = f.radius * 4.5 * camera.zoom;
      const grad = ctx.createRadialGradient(pos.x, pos.y + bobY, 0, pos.x, pos.y + bobY, rad);
      grad.addColorStop(0, `rgba(235, 255, 145, ${0.9 * alpha * glow})`);
      grad.addColorStop(0.4, `rgba(182, 242, 92, ${0.38 * alpha * glow})`);
      grad.addColorStop(1, 'rgba(182, 242, 92, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + bobY, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 214, ${alpha * glow})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + bobY, 1.5 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  public drawRain(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    timeWeather: TimeWeather
  ): void {
    if (timeWeather.rainIntensity <= 0.01 && this.puddleRipples.length === 0) {
      return;
    }

    ctx.save();

    // Expanding puddle ripples on island & water
    for (const r of this.puddleRipples) {
      const p = r.age / r.duration;
      const pos = worldToScreen(r.wx, r.wy, r.wz, camera);
      const radius = (2.5 + p * 11) * camera.zoom;
      ctx.strokeStyle = `rgba(220, 248, 255, ${(1 - p) * 0.52})`;
      ctx.lineWidth = Math.max(1, 1.2 * camera.zoom);
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, radius, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Soft diagonal rain streaks
    if (timeWeather.rainIntensity > 0.01) {
      ctx.strokeStyle = `rgba(225, 245, 255, ${0.36 * timeWeather.rainIntensity})`;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (const drop of this.rainDrops) {
        const x = drop.nx * camera.viewWidth;
        const y = drop.ny * camera.viewHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - drop.len * 0.22, y + drop.len);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
