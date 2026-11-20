export const DAY_CYCLE_SECONDS = 1200; // 20 minutes per full day/night cycle

export type DayPhase = 'dawn' | 'day' | 'sunset' | 'night';
export type WeatherKind = 'clear' | 'rain';
export type TimeWeatherEvent =
  | 'dawn'
  | 'sunset'
  | 'night'
  | 'biolum_night'
  | 'rain_start'
  | 'rain_end';

export interface AmbientTint {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface OceanBackdropPalette {
  top: string;
  mid: string;
  bottom: string;
}

interface ColorStop {
  t: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

const TINT_STOPS: ReadonlyArray<ColorStop> = [
  { t: 0.0, r: 10, g: 22, b: 56, a: 0.72 },
  { t: 0.13, r: 14, g: 26, b: 64, a: 0.66 },
  { t: 0.21, r: 232, g: 162, b: 148, a: 0.25 },
  { t: 0.28, r: 255, g: 248, b: 228, a: 0.02 },
  { t: 0.6, r: 255, g: 245, b: 214, a: 0.02 },
  { t: 0.7, r: 238, g: 138, b: 92, a: 0.3 },
  { t: 0.79, r: 24, g: 34, b: 78, a: 0.64 },
  { t: 0.88, r: 10, g: 22, b: 56, a: 0.72 },
  { t: 1.0, r: 10, g: 22, b: 56, a: 0.72 },
];

const OCEAN_TOP_STOPS: ReadonlyArray<ColorStop> = [
  { t: 0.0, r: 10, g: 24, b: 62, a: 1 },
  { t: 0.14, r: 18, g: 38, b: 84, a: 1 },
  { t: 0.22, r: 212, g: 136, b: 146, a: 1 },
  { t: 0.3, r: 30, g: 133, b: 184, a: 1 },
  { t: 0.61, r: 30, g: 133, b: 184, a: 1 },
  { t: 0.71, r: 188, g: 106, b: 120, a: 1 },
  { t: 0.81, r: 18, g: 34, b: 78, a: 1 },
  { t: 0.9, r: 10, g: 24, b: 62, a: 1 },
  { t: 1.0, r: 10, g: 24, b: 62, a: 1 },
];

const OCEAN_BOTTOM_STOPS: ReadonlyArray<ColorStop> = [
  { t: 0.0, r: 19, g: 52, b: 96, a: 1 },
  { t: 0.14, r: 26, g: 72, b: 118, a: 1 },
  { t: 0.22, r: 146, g: 176, b: 196, a: 1 },
  { t: 0.3, r: 51, g: 181, b: 205, a: 1 },
  { t: 0.61, r: 51, g: 181, b: 205, a: 1 },
  { t: 0.71, r: 120, g: 146, b: 175, a: 1 },
  { t: 0.81, r: 24, g: 64, b: 108, a: 1 },
  { t: 0.9, r: 19, g: 52, b: 96, a: 1 },
  { t: 1.0, r: 19, g: 52, b: 96, a: 1 },
];

function lerpStops(stops: ReadonlyArray<ColorStop>, t: number): AmbientTint {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const ratio = span > 0 ? (t - a.t) / span : 0;
      return {
        r: Math.round(a.r + (b.r - a.r) * ratio),
        g: Math.round(a.g + (b.g - a.g) * ratio),
        b: Math.round(a.b + (b.b - a.b) * ratio),
        a: a.a + (b.a - a.a) * ratio,
      };
    }
  }
  const last = stops[stops.length - 1];
  return { r: last.r, g: last.g, b: last.b, a: last.a };
}

function rgbString(c: AmbientTint): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

export class TimeWeather {
  public timeOfDay = 0.34;
  public weather: WeatherKind = 'clear';
  public rainIntensity = 0;
  public weatherTimer = 95;
  public isBioluminescentNight = false;
  public nightCount = 0;

  private lastPhase: DayPhase = 'day';

  public reset(): void {
    this.timeOfDay = 0.34;
    this.weather = 'clear';
    this.rainIntensity = 0;
    this.weatherTimer = 95;
    this.isBioluminescentNight = false;
    this.nightCount = 0;
    this.lastPhase = this.getPhase();
  }

  public isBioluminescentTideActive(): boolean {
    return this.isBioluminescentNight && this.getStarAlpha() > 0.25;
  }

  public setTimeOfDay(value: number): void {
    const normalized = ((value % 1) + 1) % 1;
    this.timeOfDay = normalized;
    this.lastPhase = this.getPhase();
  }

  public getPhase(): DayPhase {
    const t = this.timeOfDay;
    if (t >= 0.16 && t < 0.27) {
      return 'dawn';
    }
    if (t >= 0.27 && t < 0.65) {
      return 'day';
    }
    if (t >= 0.65 && t < 0.77) {
      return 'sunset';
    }
    return 'night';
  }

  public getStarAlpha(): number {
    const t = this.timeOfDay;
    let alpha = 0;
    if (t >= 0.8 || t < 0.12) {
      alpha = 1;
    } else if (t >= 0.7 && t < 0.8) {
      alpha = (t - 0.7) / 0.1;
    } else if (t >= 0.12 && t < 0.22) {
      alpha = 1 - (t - 0.12) / 0.1;
    }
    return Math.max(0, Math.min(1, alpha * (1 - this.rainIntensity * 0.85)));
  }

  public getFireflyAlpha(): number {
    const t = this.timeOfDay;
    let alpha = 0;
    if (t >= 0.72 || t < 0.1) {
      alpha = 1;
    } else if (t >= 0.66 && t < 0.72) {
      alpha = (t - 0.66) / 0.06;
    } else if (t >= 0.1 && t < 0.17) {
      alpha = 1 - (t - 0.1) / 0.07;
    }
    return Math.max(0, Math.min(1, alpha * (1 - this.rainIntensity * 0.65)));
  }

  public isNightLanternActive(): boolean {
    return this.timeOfDay >= 0.68 || this.timeOfDay < 0.2;
  }

  public getAmbientTint(): AmbientTint {
    const base = lerpStops(TINT_STOPS, this.timeOfDay);
    if (this.rainIntensity <= 0.005) {
      return base;
    }
    const rainBlend = this.rainIntensity * 0.62;
    const targetA = Math.max(base.a, 0.28);
    return {
      r: Math.round(base.r + (28 - base.r) * rainBlend),
      g: Math.round(base.g + (74 - base.g) * rainBlend),
      b: Math.round(base.b + (96 - base.b) * rainBlend),
      a: base.a + (targetA - base.a) * rainBlend,
    };
  }

  public getOceanPalette(): OceanBackdropPalette {
    const top = lerpStops(OCEAN_TOP_STOPS, this.timeOfDay);
    const bottom = lerpStops(OCEAN_BOTTOM_STOPS, this.timeOfDay);

    if (this.rainIntensity > 0.01) {
      const f = this.rainIntensity * 0.45;
      top.r = Math.round(top.r + (34 - top.r) * f);
      top.g = Math.round(top.g + (92 - top.g) * f);
      top.b = Math.round(top.b + (120 - top.b) * f);
      bottom.r = Math.round(bottom.r + (46 - bottom.r) * f);
      bottom.g = Math.round(bottom.g + (128 - bottom.g) * f);
      bottom.b = Math.round(bottom.b + (152 - bottom.b) * f);
    }

    const mid: AmbientTint = {
      r: Math.round((top.r + bottom.r) / 2),
      g: Math.round((top.g + bottom.g) / 2),
      b: Math.round((top.b + bottom.b) / 2),
      a: 1,
    };

    return {
      top: rgbString(top),
      mid: rgbString(mid),
      bottom: rgbString(bottom),
    };
  }

  public skipTo(target: 'morning' | 'night'): void {
    this.timeOfDay = target === 'morning' ? 0.24 : 0.84;
    this.weather = 'clear';
    this.rainIntensity = 0;
    this.weatherTimer = 120;
    if (target === 'night') {
      this.nightCount += 1;
      this.isBioluminescentNight = this.nightCount % 2 === 1;
    } else {
      this.isBioluminescentNight = false;
    }
    this.lastPhase = this.getPhase();
  }

  public update(dt: number, onEvent?: (event: TimeWeatherEvent) => void): void {
    this.timeOfDay = (this.timeOfDay + dt / DAY_CYCLE_SECONDS) % 1;

    const currentPhase = this.getPhase();
    if (currentPhase !== this.lastPhase) {
      this.lastPhase = currentPhase;
      if (currentPhase === 'night') {
        this.nightCount += 1;
        this.isBioluminescentNight = this.nightCount % 2 === 1;
        onEvent?.(this.isBioluminescentNight ? 'biolum_night' : 'night');
      } else if (currentPhase === 'dawn') {
        this.isBioluminescentNight = false;
        onEvent?.('dawn');
      } else if (currentPhase === 'sunset') {
        onEvent?.('sunset');
      }
    }

    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      if (this.weather === 'clear') {
        this.weather = 'rain';
        this.weatherTimer = 45 + Math.random() * 20;
        onEvent?.('rain_start');
      } else {
        this.weather = 'clear';
        this.weatherTimer = 110 + Math.random() * 50;
        onEvent?.('rain_end');
      }
    }

    const targetRain = this.weather === 'rain' ? 1 : 0;
    const rate = dt / 3.5;
    if (this.rainIntensity < targetRain) {
      this.rainIntensity = Math.min(1, this.rainIntensity + rate);
    } else if (this.rainIntensity > targetRain) {
      this.rainIntensity = Math.max(0, this.rainIntensity - rate);
    }
  }
}
