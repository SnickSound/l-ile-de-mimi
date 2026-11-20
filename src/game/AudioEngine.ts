import type { TimeWeather } from '../game/TimeWeather';

const MUTE_STORAGE_KEY = 'l_ile_de_mimi_mute_v1';

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function createPinkNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
    b6 = white * 0.115926;
    data[i] = Math.max(-0.85, Math.min(0.85, pink));
  }

  return buffer;
}

export class AudioEngine {
  public muted = false;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oceanFilter: BiquadFilterNode | null = null;
  private oceanGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private waterfallGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private crackleTimer = 0.8;

  constructor() {
    if (canUseBrowserStorage()) {
      try {
        this.muted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
      } catch {
        this.muted = false;
      }
    }
  }

  public unlock(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      this.ctx = new AudioCtx();
      this.setupGraph(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private setupGraph(ctx: AudioContext): void {
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.72;
    this.masterGain.connect(ctx.destination);

    this.noiseBuffer = createPinkNoiseBuffer(ctx, 4);

    // 1. Ocean surf loop
    const oceanSource = ctx.createBufferSource();
    oceanSource.buffer = this.noiseBuffer;
    oceanSource.loop = true;

    this.oceanFilter = ctx.createBiquadFilter();
    this.oceanFilter.type = 'lowpass';
    this.oceanFilter.frequency.value = 240;

    this.oceanGain = ctx.createGain();
    this.oceanGain.gain.value = 0.05;

    oceanSource.connect(this.oceanFilter);
    this.oceanFilter.connect(this.oceanGain);
    this.oceanGain.connect(this.masterGain);
    oceanSource.start();

    // 2. Tropical rain loop
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = this.noiseBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1150;
    rainFilter.Q.value = 0.65;

    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;

    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSource.start();

    // 3. Campfire warmth hum
    const fireSource = ctx.createBufferSource();
    fireSource.buffer = this.noiseBuffer;
    fireSource.loop = true;

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'lowpass';
    fireFilter.frequency.value = 460;

    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;

    fireSource.connect(fireFilter);
    fireFilter.connect(this.fireGain);
    this.fireGain.connect(this.masterGain);
    fireSource.start();

    // 4. Mountain waterfall rush
    const wfSource = ctx.createBufferSource();
    wfSource.buffer = this.noiseBuffer;
    wfSource.loop = true;

    const wfFilter = ctx.createBiquadFilter();
    wfFilter.type = 'bandpass';
    wfFilter.frequency.value = 640;
    wfFilter.Q.value = 0.5;

    this.waterfallGain = ctx.createGain();
    this.waterfallGain.gain.value = 0;

    wfSource.connect(wfFilter);
    wfFilter.connect(this.waterfallGain);
    this.waterfallGain.connect(this.masterGain);
    wfSource.start();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (canUseBrowserStorage()) {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, this.muted ? '1' : '0');
      } catch {
        // Ignore storage quota errors
      }
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.06);
    }
    return this.muted;
  }

  public updateAmbience(
    dt: number,
    elapsed: number,
    timeWeather: TimeWeather,
    nearOceanFactor: number,
    nearCampfireFactor: number,
    nearWaterfallFactor = 0
  ): void {
    if (!this.ctx || !this.oceanGain || !this.oceanFilter || !this.rainGain || !this.fireGain) {
      return;
    }

    const now = this.ctx.currentTime;
    const waveLfo = 0.5 + 0.5 * Math.sin(elapsed * 0.52);
    const oceanTarget = (0.035 + waveLfo * 0.055) * (0.45 + nearOceanFactor * 0.55);
    this.oceanGain.gain.setTargetAtTime(oceanTarget, now, 0.25);
    this.oceanFilter.frequency.setTargetAtTime(175 + waveLfo * 185, now, 0.25);

    this.rainGain.gain.setTargetAtTime(timeWeather.rainIntensity * 0.14, now, 0.25);
    this.fireGain.gain.setTargetAtTime(nearCampfireFactor * 0.055, now, 0.2);
    if (this.waterfallGain) {
      this.waterfallGain.gain.setTargetAtTime(nearWaterfallFactor * 0.13, now, 0.25);
    }

    if (!this.muted && nearCampfireFactor > 0.15) {
      this.crackleTimer -= dt;
      if (this.crackleTimer <= 0) {
        this.crackleTimer = 0.35 + Math.random() * 0.9;
        this.playCracklePop(nearCampfireFactor);
      }
    }
  }

  private playCracklePop(intensity: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) {
      return;
    }
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2100 + Math.random() * 1600;
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    const peak = 0.035 * intensity;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 2.5, 0.035);
  }

  public playFootstep(terrain: string): void {
    if (!this.ctx || !this.masterGain || this.muted) {
      return;
    }
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq =
      terrain === 'tidepool' || terrain === 'wet_sand'
        ? 250
        : terrain === 'coastal_grass' || terrain === 'clearing_grass'
          ? 165
          : 128;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 22, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, now + 0.045);

    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  private playKalimbaNote(freq: number, delaySec: number, durationSec: number, volume = 0.09): void {
    if (!this.ctx || !this.masterGain || this.muted) {
      return;
    }
    const start = this.ctx.currentTime + delaySec;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + durationSec + 0.02);
  }

  public playHarvestChime(): void {
    this.playKalimbaNote(523.25, 0, 0.24, 0.085);
    this.playKalimbaNote(659.25, 0.075, 0.3, 0.085);
  }

  public playEatChime(): void {
    this.playKalimbaNote(587.33, 0, 0.22, 0.085);
    this.playKalimbaNote(783.99, 0.075, 0.32, 0.085);
  }

  public playBuildChime(): void {
    this.playKalimbaNote(523.25, 0, 0.25, 0.09);
    this.playKalimbaNote(659.25, 0.07, 0.25, 0.09);
    this.playKalimbaNote(783.99, 0.14, 0.38, 0.1);
  }

  public playRestLullaby(): void {
    this.playKalimbaNote(783.99, 0, 0.3, 0.075);
    this.playKalimbaNote(659.25, 0.12, 0.3, 0.075);
    this.playKalimbaNote(523.25, 0.24, 0.35, 0.075);
    this.playKalimbaNote(392.0, 0.36, 0.45, 0.075);
  }

  public playWindchime(): void {
    this.playKalimbaNote(1046.5, 0, 0.38, 0.055);
    this.playKalimbaNote(1174.66, 0.08, 0.38, 0.055);
    this.playKalimbaNote(1318.51, 0.16, 0.42, 0.06);
    this.playKalimbaNote(1567.98, 0.25, 0.48, 0.055);
    this.playKalimbaNote(1760.0, 0.35, 0.55, 0.05);
  }

  public playChimeStone(step: 1 | 2 | 3): void {
    const notes: Record<1 | 2 | 3, [number, number]> = {
      1: [523.25, 659.25],
      2: [659.25, 783.99],
      3: [783.99, 1046.5],
    };
    const [a, b] = notes[step];
    this.playKalimbaNote(a, 0, 0.45, 0.09);
    this.playKalimbaNote(b, 0.09, 0.55, 0.095);
  }

  public playMistClearedFanfare(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    chord.forEach((freq, idx) => {
      this.playKalimbaNote(freq, idx * 0.09, 0.65, 0.085);
    });
  }

  public playWaterfallSlide(): void {
    const notes = [1046.5, 932.33, 783.99, 659.25, 587.33, 523.25, 783.99];
    notes.forEach((freq, idx) => {
      this.playKalimbaNote(freq, idx * 0.12, 0.28, 0.075);
    });
  }

  public playTreasureFanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1174.66, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      this.playKalimbaNote(freq, idx * 0.085, 0.72, 0.095);
    });
  }
}
