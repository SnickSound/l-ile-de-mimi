import type { TimeWeather } from '../game/TimeWeather';
import { FR_CA } from '../i18n/frCA';
import type { TileMap } from '../world/TileMap';
import type { HarvestableResourceId, ResourceId } from './Flora';
import type { Player } from './Player';

export type FaunaSpeciesId =
  | 'hermit_crab'
  | 'capybara'
  | 'hummingbird'
  | 'sea_turtle'
  | 'firefly'
  | 'tree_frog'
  | 'spoonbill'
  | 'rainbow_toucan'
  | 'blue_starfish'
  | 'manta_ray'
  | 'blue_morpho'
  | 'kingfisher';

export interface FaunaEntity {
  id: string;
  species: FaunaSpeciesId;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeY: number;
  targetX: number;
  targetY: number;
  facingX: number;
  moveTimer: number;
  animPhase: number;
  trust: number;
  heartTimer: number;
  giftCooldown: number;
  nightOnly: boolean;
  waterOnly: boolean;
}

export interface FaunaInteractionResult {
  reaction: string;
  gift: HarvestableResourceId | null;
  newTrust: number;
}

const GIFT_POOL: Record<FaunaSpeciesId, HarvestableResourceId> = {
  hermit_crab: 'shell',
  capybara: 'mango',
  hummingbird: 'coconut',
  sea_turtle: 'starfruit',
  firefly: 'bamboo',
  tree_frog: 'mango',
  spoonbill: 'shell',
  rainbow_toucan: 'starfruit',
  blue_starfish: 'sea_glass',
  manta_ray: 'sea_glass',
  blue_morpho: 'pink_guava',
  kingfisher: 'shell',
};

export function createInitialFauna(tileMap: TileMap): FaunaEntity[] {
  const specs: Array<{
    id: string;
    species: FaunaSpeciesId;
    x: number;
    y: number;
    nightOnly?: boolean;
    waterOnly?: boolean;
  }> = [
    { id: 'crab_1', species: 'hermit_crab', x: 40, y: 48 },
    { id: 'crab_2', species: 'hermit_crab', x: 47, y: 47 },
    { id: 'capy_1', species: 'capybara', x: 51, y: 36 },
    { id: 'capy_2', species: 'capybara', x: 55, y: 36 },
    { id: 'capy_3', species: 'capybara', x: 60, y: 20 },
    { id: 'humming_1', species: 'hummingbird', x: 33, y: 36 },
    { id: 'humming_2', species: 'hummingbird', x: 35, y: 35 },
    { id: 'turtle_1', species: 'sea_turtle', x: 42, y: 27 },
    { id: 'turtle_2', species: 'sea_turtle', x: 47, y: 26 },
    { id: 'firefly_1', species: 'firefly', x: 44, y: 35, nightOnly: true },
    { id: 'firefly_2', species: 'firefly', x: 43, y: 28, nightOnly: true },
    { id: 'firefly_3', species: 'firefly', x: 18, y: 26, nightOnly: true },
    { id: 'frog_1', species: 'tree_frog', x: 61, y: 21 },
    { id: 'frog_2', species: 'tree_frog', x: 64, y: 17 },
    { id: 'spoonbill_1', species: 'spoonbill', x: 60, y: 51 },
    { id: 'spoonbill_2', species: 'spoonbill', x: 63, y: 48 },
    { id: 'toucan_1', species: 'rainbow_toucan', x: 36, y: 12 },
    { id: 'toucan_2', species: 'rainbow_toucan', x: 42, y: 13 },
    { id: 'starfish_1', species: 'blue_starfish', x: 34, y: 63 },
    { id: 'starfish_2', species: 'blue_starfish', x: 44, y: 71 },
    { id: 'manta_1', species: 'manta_ray', x: 38, y: 65, waterOnly: true },
    { id: 'manta_2', species: 'manta_ray', x: 42, y: 68, waterOnly: true },
    { id: 'morpho_1', species: 'blue_morpho', x: 77, y: 34 },
    { id: 'morpho_2', species: 'blue_morpho', x: 80, y: 27 },
    { id: 'kingfisher_1', species: 'kingfisher', x: 76, y: 31 },
    { id: 'kingfisher_2', species: 'kingfisher', x: 81, y: 32 },
  ];

  return specs.map((s, idx) => ({
    id: s.id,
    species: s.species,
    x: s.x,
    y: s.y,
    z: tileMap.getInterpolatedElevation(s.x, s.y),
    homeX: s.x,
    homeY: s.y,
    targetX: s.x,
    targetY: s.y,
    facingX: idx % 2 === 0 ? 1 : -1,
    moveTimer: 1.5 + idx * 0.4,
    animPhase: idx * 1.1,
    trust: 0,
    heartTimer: 0,
    giftCooldown: 0,
    nightOnly: Boolean(s.nightOnly),
    waterOnly: Boolean(s.waterOnly),
  }));
}

export function isFaunaActive(critter: FaunaEntity, timeWeather: TimeWeather): boolean {
  if (!critter.nightOnly) {
    return true;
  }
  return timeWeather.getFireflyAlpha() > 0.15;
}

export function updateFauna(
  faunaList: FaunaEntity[],
  dt: number,
  tileMap: TileMap,
  player: Player,
  timeWeather: TimeWeather
): void {
  for (const critter of faunaList) {
    critter.animPhase += dt * (critter.species === 'hummingbird' ? 14 : 3.2);
    if (critter.heartTimer > 0) {
      critter.heartTimer = Math.max(0, critter.heartTimer - dt);
    }
    if (critter.giftCooldown > 0) {
      critter.giftCooldown = Math.max(0, critter.giftCooldown - dt);
    }
    if (!isFaunaActive(critter, timeWeather)) {
      continue;
    }

    const dxToPlayer = player.x - critter.x;
    const dyToPlayer = player.y - critter.y;
    const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer);

    if (distToPlayer < 1.9) {
      const screenDx = dxToPlayer - dyToPlayer;
      if (Math.abs(screenDx) > 0.05) {
        critter.facingX = screenDx >= 0 ? 1 : -1;
      }
      critter.z = tileMap.getInterpolatedElevation(critter.x, critter.y);
      continue;
    }

    const dx = critter.targetX - critter.x;
    const dy = critter.targetY - critter.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.08) {
      const speed =
        critter.species === 'hummingbird' || critter.species === 'firefly'
          ? 1.15
          : critter.species === 'manta_ray'
            ? 0.95
            : critter.species === 'blue_starfish'
              ? 0.18
              : critter.species === 'capybara'
                ? 0.65
                : 0.8;
      const step = Math.min(dist, speed * dt);
      const nx = critter.x + (dx / dist) * step;
      const ny = critter.y + (dy / dist) * step;
      const nextTile = tileMap.getTile(Math.round(nx), Math.round(ny));
      const canMove = critter.waterOnly
        ? nextTile?.terrain === 'shallow_water'
        : critter.species === 'hummingbird' ||
            critter.species === 'firefly' ||
            critter.species === 'rainbow_toucan' ||
            critter.species === 'blue_morpho' ||
            tileMap.isWalkable(Math.round(nx), Math.round(ny));
      if (canMove) {
        critter.x = nx;
        critter.y = ny;
        const screenDx = dx - dy;
        if (Math.abs(screenDx) > 0.02) {
          critter.facingX = screenDx >= 0 ? 1 : -1;
        }
      } else {
        critter.targetX = critter.x;
        critter.targetY = critter.y;
      }
    } else {
      critter.moveTimer -= dt;
      if (critter.moveTimer <= 0) {
        critter.moveTimer =
          critter.species === 'blue_starfish' ? 6.0 + Math.random() * 4.0 : 2.6 + Math.random() * 3.4;
        const rx = critter.homeX + Math.round((Math.random() - 0.5) * 3);
        const ry = critter.homeY + Math.round((Math.random() - 0.5) * 3);
        const targetTile = tileMap.getTile(rx, ry);
        const validTarget = critter.waterOnly
          ? targetTile?.terrain === 'shallow_water'
          : critter.species === 'hummingbird' ||
              critter.species === 'firefly' ||
              critter.species === 'rainbow_toucan' ||
              critter.species === 'blue_morpho' ||
              tileMap.isWalkable(rx, ry);
        if (validTarget) {
          critter.targetX = rx;
          critter.targetY = ry;
        }
      }
    }

    critter.z = tileMap.getInterpolatedElevation(critter.x, critter.y);
  }
}

export function interactWithFauna(
  critter: FaunaEntity,
  inventory: Record<ResourceId, number>
): FaunaInteractionResult {
  const prevTrust = critter.trust;
  critter.trust = Math.min(3, critter.trust + 1);
  critter.heartTimer = 2.4;

  let gift: HarvestableResourceId | null = null;
  if (critter.giftCooldown <= 0 && (prevTrust < 3 || Math.random() < 0.55)) {
    gift = GIFT_POOL[critter.species];
    inventory[gift] = (inventory[gift] ?? 0) + 1;
    critter.giftCooldown = 45;
  }

  const reactions = FR_CA.fauna.species[critter.species].reactions;
  const reaction = reactions[prevTrust % reactions.length];

  return {
    reaction,
    gift,
    newTrust: critter.trust,
  };
}
