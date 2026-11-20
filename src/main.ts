import './style.css';
import { isCampItemWalkable, isValidPlacementTile } from './entities/CampItem';
import { interactWithFauna, isFaunaActive, updateFauna } from './entities/Fauna';
import {
  harvestFloraNode,
  isFloraBlooming,
  isFloraReady,
  updateFloraNodes,
  type FloraNodeData,
  type ResourceId,
} from './entities/Flora';
import type { PlayerInteraction } from './entities/Player';
import { AudioEngine } from './game/AudioEngine';
import { GameState } from './game/GameState';
import { FR_CA } from './i18n/frCA';
import { ArtCache } from './render/ArtCache';
import { Renderer } from './render/Renderer';
import {
  canAffordRecipe,
  canAffordTool,
  deductRecipeCost,
  deductToolCost,
  findRoastableFruit,
  getRecipeForType,
  TOOL_RECIPES,
} from './systems/Crafting';
import { discoverJournalSpecies, type JournalSpeciesId } from './systems/Journal';
import { CraftModal } from './ui/CraftModal';
import { Hud } from './ui/Hud';
import { JournalModal } from './ui/JournalModal';
import { MapModal } from './ui/MapModal';
import { SaveModal } from './ui/SaveModal';
import { screenToGrid, type GridPoint } from './world/IsoMath';
import type { PropType } from './world/TileMap';
import {
  BRIDGE_TILES,
  CASCADE_WATERFALL_POS,
  CHIME_STONE_POSITIONS,
  LIGHTHOUSE_POS,
  MANGROVE_BOARDWALK_TILES,
  OUTRIGGER_CHANNEL_TILES,
} from './world/WorldData';

const MIN_ZOOM = 0.65;
const MAX_ZOOM = 1.95;

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

function isTypingInField(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;
}

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const hudRoot = document.getElementById('hud-root');

  if (!canvas || !hudRoot) {
    throw new Error('Éléments DOM principaux introuvables.');
  }

  const artCache = new ArtCache();
  const state = new GameState();
  const audio = new AudioEngine();
  const renderer = new Renderer(canvas, artCache);

  renderer.resize(state.camera);
  renderer.snapCameraToPlayer(state.camera, state.player);

  let saveDirty = false;
  let autoSaveTimer = 0;
  let hotSpringsThoughtCooldown = 0;

  const markDirty = (): void => {
    saveDirty = true;
  };

  let hud: Hud;
  let craftModal: CraftModal;
  let journalModal: JournalModal;
  let mapModal: MapModal;
  let saveModal: SaveModal;

  const refreshHud = (): void => {
    hud.updateBiome(state.player.currentBiome, false);
    hud.updateStamina(state.player.stamina);
    hud.updateInventory(state.inventory);
    hud.updateTools(state.tools);
    hud.setPlacementBanner(state.placementMode?.type ?? null);
    hud.updateTimeWeather(
      state.timeWeather.getPhase(),
      state.timeWeather.weather === 'rain',
      state.timeWeather.isBioluminescentTideActive()
    );
    hud.updateAudioMuted(audio.muted);
  };

  const recordDiscovery = (speciesId: JournalSpeciesId): void => {
    const added = discoverJournalSpecies(state.discoveredJournal, speciesId);
    if (added) {
      hud.showToast(FR_CA.journal.discoveredToast(added.icon, added.name), 3200);
      markDirty();
    }
  };

  const handleInspectProp = (prop: PropType): void => {
    if (prop === 'hibiscus') {
      recordDiscovery('hibiscus');
    } else if (prop === 'fern') {
      recordDiscovery('fern');
    }
  };

  const handleArrivalInteraction = (interaction: PlayerInteraction): void => {
    if (interaction.kind === 'landmark') {
      if (interaction.landmark === 'sundial') {
        state.player.restoreStamina(0.25);
        state.player.showThought(FR_CA.gathering.sundialThought, 4.0);
        audio.playWindchime();
        hud.updateStamina(state.player.stamina);
        markDirty();
        return;
      }
      if (interaction.landmark === 'signpost') {
        const tileBiome = state.tileMap.getBiomeAt(interaction.gx, interaction.gy);
        if (tileBiome !== 'ocean') {
          const unlockedNow = state.unlockBiomeAndSignpost(tileBiome);
          if (unlockedNow) {
            const bInfo = FR_CA.biomes[tileBiome];
            hud.showToast(FR_CA.map.signpostUnlockedToast(bInfo.icon, bInfo.name), 3000);
          }
        }
        mapModal.open(state);
        return;
      }
      if (interaction.landmark === 'lighthouse') {
        if (state.worldFlags.lighthouseRestored) {
          state.player.showThought(FR_CA.tools.lighthouseAlreadyRestoredThought, 4.2);
          audio.playWindchime();
          return;
        }
        if (
          (state.inventory.driftwood ?? 0) < 3 ||
          (state.inventory.bamboo ?? 0) < 2 ||
          (state.inventory.shell ?? 0) < 2
        ) {
          state.player.showThought(FR_CA.tools.lighthouseNeedThought, 4.6);
          return;
        }
        state.inventory.driftwood -= 3;
        state.inventory.bamboo -= 2;
        state.inventory.shell -= 2;
        if (state.restoreLighthouse()) {
          audio.playBuildChime();
          state.player.showThought(FR_CA.tools.lighthouseRestoredThought, 4.6);
          hud.showToast(FR_CA.tools.lighthouseRestoredToast, 3400);
          hud.updateInventory(state.inventory);
          renderer.addTapRipple(
            LIGHTHOUSE_POS.x,
            LIGHTHOUSE_POS.y,
            state.tileMap.getElevation(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.y)
          );
          state.saveToLocalStorage();
          saveDirty = false;
        }
        return;
      }
      if (interaction.landmark === 'mountain_cairn') {
        state.player.restoreStamina(0.25);
        state.player.showThought(FR_CA.tools.cairnThought, 4.4);
        audio.playWindchime();
        hud.updateStamina(state.player.stamina);
        markDirty();
        return;
      }
      if (interaction.landmark === 'waterfall_slide') {
        if (state.player.waterfallSlide) {
          return;
        }
        audio.playWaterfallSlide();
        state.player.showThought(FR_CA.tools.waterfallSlideThought, 2.2);
        state.player.startWaterfallSlide(() => {
          renderer.addTapRipple(78, 34, state.tileMap.getElevation(78, 34));
          if (!state.worldFlags.sabrevoixFound) {
            state.worldFlags.sabrevoixFound = true;
            state.player.restoreStamina(1.0);
            hud.updateStamina(state.player.stamina);
            audio.playTreasureFanfare();
            state.player.showThought(FR_CA.tools.sabrevoixFoundThought, 6.0);
            hud.showToast(FR_CA.tools.sabrevoixFoundToast, 5000);
            state.saveToLocalStorage();
            saveDirty = false;
          } else {
            state.player.restoreStamina(0.25);
            hud.updateStamina(state.player.stamina);
            state.player.showThought(FR_CA.tools.waterfallSlideThought, 3.6);
            markDirty();
          }
        });
        return;
      }
      if (interaction.landmark === 'chime_stone') {
        const step = interaction.step ?? 1;
        if (!state.worldFlags.cascadeMistCleared && !state.tools.sea_glass_prism) {
          state.player.showThought(FR_CA.tools.chimeNeedPrismThought, 4.6);
          return;
        }
        const outcome = state.activateChimeStone(step);
        renderer.addTapRipple(
          interaction.gx,
          interaction.gy,
          state.tileMap.getElevation(interaction.gx, interaction.gy)
        );
        if (outcome === 'already_cleared') {
          audio.playChimeStone(step);
          state.player.showThought(FR_CA.thoughts.props[`chime_stone_${step}`], 3.2);
        } else if (outcome === 'already_lit') {
          audio.playChimeStone(step);
          state.player.showThought(FR_CA.tools.chimeAlreadyLitThought, 3.6);
        } else if (outcome === 'wrong_order') {
          audio.playHarvestChime();
          state.player.showThought(FR_CA.tools.chimeWrongOrderThought, 4.4);
        } else if (outcome === 'step_lit') {
          audio.playChimeStone(step);
          state.player.showThought(FR_CA.tools.chimeStepThought(step), 4.4);
          hud.showToast(FR_CA.tools.chimeStepToast(step), 2800);
          state.saveToLocalStorage();
          saveDirty = false;
        } else if (outcome === 'mist_cleared') {
          audio.playMistClearedFanfare();
          state.player.showThought(FR_CA.tools.mistClearedThought, 5.2);
          hud.showToast(FR_CA.tools.mistClearedToast, 4000);
          state.saveToLocalStorage();
          saveDirty = false;
        }
        return;
      }
    }

    if (interaction.kind === 'barrier') {
      if (interaction.barrier === 'vines') {
        if (!state.tools.bamboo_shears) {
          state.player.showThought(FR_CA.tools.vinesNeedShearsThought, 4.4);
          return;
        }
        if (state.cutJungleVines()) {
          audio.playBuildChime();
          state.player.showThought(FR_CA.tools.vinesCutThought, 4.2);
          hud.showToast(FR_CA.tools.vinesCutToast);
          state.saveToLocalStorage();
          saveDirty = false;
        }
        return;
      }

      if (interaction.barrier === 'bridge') {
        if (!state.tools.bamboo_bridge_kit) {
          state.player.showThought(FR_CA.tools.bridgeNeedKitThought, 4.4);
          return;
        }
        if (state.buildLagoonBridge()) {
          audio.playBuildChime();
          state.player.showThought(FR_CA.tools.bridgeBuiltThought, 4.2);
          hud.showToast(FR_CA.tools.bridgeBuiltToast);
          state.saveToLocalStorage();
          saveDirty = false;
        }
        return;
      }

      if (interaction.barrier === 'mangrove_boardwalk') {
        if (!state.tools.bamboo_bridge_kit && (state.inventory.driftwood ?? 0) < 2) {
          state.player.showThought(FR_CA.tools.mangroveBridgeNeedThought, 4.4);
          return;
        }
        if (!state.tools.bamboo_bridge_kit) {
          state.inventory.driftwood -= 2;
          hud.updateInventory(state.inventory);
        }
        if (state.buildMangroveBoardwalk()) {
          audio.playBuildChime();
          state.player.showThought(FR_CA.tools.mangroveBridgeBuiltThought, 4.2);
          hud.showToast(FR_CA.tools.mangroveBridgeBuiltToast);
          state.saveToLocalStorage();
          saveDirty = false;
        }
        return;
      }

      if (interaction.barrier === 'outrigger_crossing') {
        if (!state.tools.bamboo_outrigger) {
          state.player.showThought(FR_CA.tools.outriggerNeedThought, 4.4);
          return;
        }
        if (state.launchOutrigger()) {
          audio.playBuildChime();
          state.player.showThought(FR_CA.tools.outriggerLaunchedThought, 4.4);
          hud.showToast(FR_CA.tools.outriggerLaunchedToast);
          state.saveToLocalStorage();
          saveDirty = false;
        }
        return;
      }

      if (interaction.barrier === 'cascade_mist') {
        state.player.showThought(FR_CA.tools.mistNeedPrismThought, 4.6);
        return;
      }
    }

    if (interaction.kind === 'fauna') {
      const critter = state.fauna.find((f) => f.id === interaction.id);
      if (!critter || !isFaunaActive(critter, state.timeWeather)) {
        return;
      }
      const result = interactWithFauna(critter, state.inventory);
      const speciesInfo = FR_CA.fauna.species[critter.species];
      state.player.happyTimer = 1.4;
      state.player.showThought(result.reaction, 4.0);
      audio.playHarvestChime();

      if (result.gift) {
        const resInfo = FR_CA.resources[result.gift];
        hud.showToast(FR_CA.fauna.giftToast(speciesInfo.icon, resInfo.icon, resInfo.name), 3200);
        hud.updateInventory(state.inventory);
      } else {
        hud.showToast(`${speciesInfo.icon} ${FR_CA.fauna.trustLevel(result.newTrust)}`);
      }
      recordDiscovery(critter.species);
      markDirty();
      return;
    }

    if (interaction.kind === 'flora') {
      const node = state.floraNodes.find((n) => n.id === interaction.id);
      if (!node) {
        return;
      }

      if (!isFloraBlooming(node, state.timeWeather)) {
        if (node.type === 'moonflower_node') {
          state.player.showThought(FR_CA.reactiveFlora.moonflowerClosedThought, 4.2);
        } else if (node.type === 'raindrop_orchid_node') {
          state.player.showThought(FR_CA.reactiveFlora.orchidClosedThought, 4.2);
        } else if (node.type === 'glow_mushroom_node') {
          state.player.showThought(FR_CA.reactiveFlora.glowMushroomClosedThought, 4.2);
        } else if (node.type === 'sea_glass_spot') {
          state.player.showThought(FR_CA.reactiveFlora.seaGlassClosedThought, 4.2);
        }
        return;
      }

      if (!isFloraReady(node)) {
        state.player.showThought(FR_CA.gathering.regrowingThought, 3.2);
        hud.showToast(FR_CA.gathering.regrowingSeconds(Math.ceil(node.regrowTimer)));
        return;
      }

      const harvested = harvestFloraNode(node);
      if (harvested) {
        state.inventory[harvested] = (state.inventory[harvested] ?? 0) + 1;
        state.player.consumeStamina(node.staminaCost);
        const resInfo = FR_CA.resources[harvested];
        state.player.showThought(FR_CA.gathering.harvestThoughts[harvested], 3.2);
        hud.showToast(FR_CA.gathering.harvestedToast(resInfo.icon, resInfo.name));
        audio.playHarvestChime();
        hud.updateInventory(state.inventory);
        hud.updateStamina(state.player.stamina);
        if (node.speciesId) {
          recordDiscovery(node.speciesId);
        }
        markDirty();
        return;
      }

      if (node.speciesId) {
        state.player.restoreStamina(0.15);
        hud.updateStamina(state.player.stamina);
        audio.playHarvestChime();

        const thoughtMap: Partial<Record<JournalSpeciesId, string>> = {
          moonflower: FR_CA.reactiveFlora.moonflowerBloomThought,
          raindrop_orchid: FR_CA.reactiveFlora.orchidBloomThought,
          wild_ginger: FR_CA.reactiveFlora.wildGingerThought,
          monstera: FR_CA.reactiveFlora.monsteraThought,
          thermal_lotus: FR_CA.reactiveFlora.thermalLotusThought,
          golden_fern: FR_CA.reactiveFlora.goldenFernThought,
          wild_vanilla: FR_CA.reactiveFlora.wildVanillaThought,
          glow_mushroom: FR_CA.reactiveFlora.glowMushroomBloomThought,
          frangipani: FR_CA.reactiveFlora.frangipaniThought,
          bird_of_paradise: FR_CA.reactiveFlora.birdOfParadiseThought,
          dwarf_palm: FR_CA.reactiveFlora.dwarfPalmThought,
          mist_begonia: FR_CA.reactiveFlora.mistBegoniaThought,
        };
        const msg = thoughtMap[node.speciesId];
        if (msg) {
          state.player.showThought(msg, 4.0);
        }

        const entry = FR_CA.journal.entries[node.speciesId];
        hud.showToast(FR_CA.gathering.admiredFloraToast(entry.icon, entry.name));
        recordDiscovery(node.speciesId);
        markDirty();
      }
      return;
    }

    if (interaction.kind === 'camp') {
      const item = state.campItems.find((c) => c.id === interaction.id);
      if (!item) {
        return;
      }
      if (item.type === 'herbarium_table') {
        audio.playHarvestChime();
        state.player.showThought(FR_CA.camp.herbariumThought, 3.4);
        journalModal.open(state);
        return;
      }
      if (item.type === 'shell_windchime') {
        audio.playWindchime();
        state.player.showThought(FR_CA.camp.windchimeThought, 3.8);
        return;
      }
      if (item.type === 'flower_planter') {
        state.player.showThought(FR_CA.camp.planterThought, 3.4);
      } else if (item.type === 'paper_lantern') {
        state.player.showThought(FR_CA.camp.lanternThought, 3.4);
      }
      craftModal.openItemInteraction(item, state);
    }
  };

  const handleEatResource = (resId: ResourceId): void => {
    audio.unlock();
    const info = FR_CA.resources[resId];
    if (!info.edible || (state.inventory[resId] ?? 0) <= 0) {
      return;
    }
    if (state.player.stamina >= 0.99) {
      hud.showToast(FR_CA.stamina.alreadyFullToast);
      return;
    }
    state.inventory[resId] -= 1;
    state.player.restoreStamina(info.staminaRestore);
    state.player.showThought(FR_CA.stamina.ateThought(info.name), 3.4);
    hud.showToast(FR_CA.stamina.ateToast(info.icon, Math.round(info.staminaRestore * 100)));
    audio.playEatChime();
    hud.updateInventory(state.inventory);
    hud.updateStamina(state.player.stamina);
    markDirty();
  };

  journalModal = new JournalModal();

  mapModal = new MapModal({
    onFastTravel: (biome) => {
      audio.unlock();
      if (state.fastTravelToBiome(biome)) {
        renderer.snapCameraToPlayer(state.camera, state.player);
        audio.playWindchime();
        const bInfo = FR_CA.biomes[biome];
        hud.updateBiome(biome, true);
        hud.showToast(FR_CA.map.traveledToast(bInfo.icon, bInfo.name));
        markDirty();
      }
    },
  });

  hud = new Hud(hudRoot, state.player.currentBiome, {
    onZoomIn: () => {
      state.camera.targetZoom = clampZoom(state.camera.targetZoom + 0.18);
    },
    onZoomOut: () => {
      state.camera.targetZoom = clampZoom(state.camera.targetZoom - 0.18);
    },
    onRecenter: () => {
      renderer.snapCameraToPlayer(state.camera, state.player);
    },
    onOpenCraft: () => {
      audio.unlock();
      saveModal.close();
      journalModal.close();
      mapModal.close();
      craftModal.openCatalog(state);
    },
    onOpenJournal: () => {
      audio.unlock();
      saveModal.close();
      craftModal.close();
      mapModal.close();
      journalModal.open(state);
    },
    onOpenMap: () => {
      audio.unlock();
      saveModal.close();
      craftModal.close();
      journalModal.close();
      mapModal.open(state);
    },
    onOpenSave: () => {
      audio.unlock();
      craftModal.close();
      journalModal.close();
      mapModal.close();
      saveModal.open(state);
    },
    onToggleMute: () => {
      audio.unlock();
      const nowMuted = audio.toggleMute();
      hud.updateAudioMuted(nowMuted);
      hud.showToast(nowMuted ? FR_CA.audio.mutedToast : FR_CA.audio.unmutedToast);
    },
    onEatResource: handleEatResource,
    onCancelPlacement: () => {
      state.placementMode = null;
      hud.setPlacementBanner(null);
    },
  });

  craftModal = new CraftModal({
    onStartPlacement: (type, movingItemId) => {
      state.placementMode = { type, movingItemId };
      hud.setPlacementBanner(type);
    },
    onUpgradeShelter: () => {
      audio.unlock();
      const upgraded = state.upgradeShelter();
      if (!upgraded) {
        return;
      }
      const info = FR_CA.camp.items[upgraded.type];
      audio.playBuildChime();
      hud.showToast(FR_CA.camp.upgradedToast(info.icon, info.name));
      renderer.addTapRipple(upgraded.gx, upgraded.gy, state.tileMap.getElevation(upgraded.gx, upgraded.gy));
      refreshHud();
      state.saveToLocalStorage();
      saveDirty = false;
    },
    onCraftTool: (toolId) => {
      audio.unlock();
      const recipe = TOOL_RECIPES.find((r) => r.id === toolId);
      if (!recipe || state.tools[toolId] || !canAffordTool(state.inventory, recipe)) {
        return;
      }
      deductToolCost(state.inventory, recipe);
      state.tools[toolId] = true;
      const info = FR_CA.tools[toolId];
      audio.playBuildChime();
      hud.showToast(FR_CA.tools.craftedToast(info.icon, info.name));
      hud.updateInventory(state.inventory);
      hud.updateTools(state.tools);
      state.saveToLocalStorage();
      saveDirty = false;
    },
    onRestAtCamp: (item, skipTo) => {
      audio.unlock();
      state.player.restoreStamina(1.0);
      audio.playRestLullaby();

      if (skipTo) {
        state.timeWeather.skipTo(skipTo);
        const biolumNow = state.timeWeather.isBioluminescentTideActive();
        hud.updateTimeWeather(state.timeWeather.getPhase(), false, biolumNow);
        const toast =
          skipTo === 'morning'
            ? FR_CA.camp.restMorningToast
            : biolumNow
              ? FR_CA.timeWeather.biolumNightToast
              : FR_CA.camp.restNightToast;
        const thought =
          skipTo === 'morning'
            ? FR_CA.timeWeather.dawnThought
            : biolumNow
              ? FR_CA.timeWeather.biolumNightThought
              : FR_CA.timeWeather.nightThought;
        state.player.showThought(thought, 4.8);
        hud.showToast(toast, 3400);
      } else {
        state.player.showThought(
          item.type === 'hammock'
            ? FR_CA.stamina.restedHammockThought
            : FR_CA.stamina.restedShelterThought,
          4.2
        );
        hud.showToast(FR_CA.stamina.restedToast);
      }

      hud.updateStamina(state.player.stamina);
      state.saveToLocalStorage();
      saveDirty = false;
    },
    onRoastFruit: () => {
      audio.unlock();
      const fruit = findRoastableFruit(state.inventory);
      if (!fruit) {
        hud.showToast(FR_CA.camp.roastNeedFruitToast);
        return;
      }
      state.inventory[fruit] -= 1;
      state.inventory.roasted_fruit = (state.inventory.roasted_fruit ?? 0) + 1;
      audio.playEatChime();
      hud.showToast(FR_CA.camp.roastSuccessToast);
      hud.updateInventory(state.inventory);
      state.saveToLocalStorage();
      saveDirty = false;
    },
    onOpenJournalFromCamp: () => {
      journalModal.open(state);
    },
    onRingWindchime: () => {
      audio.unlock();
      audio.playWindchime();
      state.player.showThought(FR_CA.camp.windchimeThought, 3.8);
    },
  });

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
  });

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignore offline SW registration issues in restricted environments
      });
    });
  }

  saveModal = new SaveModal({
    onImportCode: (code) => {
      const ok = state.importSaveCode(code);
      if (ok) {
        renderer.snapCameraToPlayer(state.camera, state.player);
        refreshHud();
        saveDirty = false;
      }
      return ok;
    },
    onResetIsland: () => {
      state.resetIsland();
      renderer.snapCameraToPlayer(state.camera, state.player);
      refreshHud();
      saveDirty = false;
    },
    onNotify: (msg) => hud.showToast(msg),
    canInstallPwa: () => deferredInstallPrompt !== null,
    onTriggerPwaInstall: async () => {
      if (!deferredInstallPrompt) {
        return false;
      }
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return choice.outcome === 'accepted';
    },
  });

  refreshHud();

  const keysPressed = new Set<string>();
  let hoverTile: GridPoint | null = null;

  interface PointerTracker {
    x: number;
    y: number;
    startX: number;
    startY: number;
  }
  const activePointers = new Map<number, PointerTracker>();
  let multiTouchUsed = false;
  let lastPinchDist: number | null = null;

  const findNearbyInteractable = (): {
    gx: number;
    gy: number;
    interaction: PlayerInteraction;
  } | null => {
    let bestDist = 2.05;
    let best: { gx: number; gy: number; interaction: PlayerInteraction } | null = null;

    for (const critter of state.fauna) {
      if (!isFaunaActive(critter, state.timeWeather)) {
        continue;
      }
      const d = Math.hypot(critter.x - state.player.x, critter.y - state.player.y);
      const reach = critter.waterOnly ? 3.2 : bestDist;
      if (d <= reach && d <= (critter.waterOnly ? 3.2 : bestDist)) {
        bestDist = Math.min(bestDist, d);
        best = {
          gx: Math.round(critter.x),
          gy: Math.round(critter.y),
          interaction: { kind: 'fauna', id: critter.id },
        };
      }
    }

    for (const item of state.campItems) {
      const d = Math.hypot(item.gx - state.player.x, item.gy - state.player.y);
      if (d <= bestDist) {
        bestDist = d;
        best = { gx: item.gx, gy: item.gy, interaction: { kind: 'camp', id: item.id } };
      }
    }

    for (const node of state.floraNodes) {
      if (!isFloraReady(node)) {
        continue;
      }
      const d = Math.hypot(node.gx - state.player.x, node.gy - state.player.y);
      if (d <= bestDist) {
        bestDist = d;
        best = { gx: node.gx, gy: node.gy, interaction: { kind: 'flora', id: node.id } };
      }
    }

    if (!best && !state.worldFlags.vinesCut) {
      const d = Math.hypot(38 - state.player.x, 36 - state.player.y);
      if (d <= 2.3) {
        best = { gx: 38, gy: 36, interaction: { kind: 'barrier', barrier: 'vines', gx: 38, gy: 36 } };
      }
    }

    if (!best && !state.worldFlags.bridgeBuilt) {
      const d = Math.hypot(44.5 - state.player.x, 32 - state.player.y);
      if (d <= 2.5) {
        best = { gx: 44, gy: 32, interaction: { kind: 'barrier', barrier: 'bridge', gx: 44, gy: 32 } };
      }
    }

    if (!best && !state.worldFlags.mangroveBoardwalkBuilt) {
      const d = Math.hypot(65 - state.player.x, 50.5 - state.player.y);
      if (d <= 2.5) {
        best = {
          gx: 65,
          gy: 50,
          interaction: { kind: 'barrier', barrier: 'mangrove_boardwalk', gx: 65, gy: 50 },
        };
      }
    }

    if (!best && !state.worldFlags.outriggerLaunched) {
      const d = Math.hypot(43.5 - state.player.x, 54 - state.player.y);
      if (d <= 2.6) {
        best = {
          gx: 43,
          gy: 54,
          interaction: { kind: 'barrier', barrier: 'outrigger_crossing', gx: 43, gy: 54 },
        };
      }
    }

    if (!best) {
      const d = Math.hypot(LIGHTHOUSE_POS.x - state.player.x, LIGHTHOUSE_POS.y - state.player.y);
      if (d <= 2.5) {
        best = {
          gx: LIGHTHOUSE_POS.x,
          gy: LIGHTHOUSE_POS.y,
          interaction: {
            kind: 'landmark',
            landmark: 'lighthouse',
            gx: LIGHTHOUSE_POS.x,
            gy: LIGHTHOUSE_POS.y,
          },
        };
      }
    }

    if (!best) {
      for (const stone of CHIME_STONE_POSITIONS) {
        const d = Math.hypot(stone.x - state.player.x, stone.y - state.player.y);
        if (d <= 2.3) {
          best = {
            gx: stone.x,
            gy: stone.y,
            interaction: {
              kind: 'landmark',
              landmark: 'chime_stone',
              step: stone.step,
              gx: stone.x,
              gy: stone.y,
            },
          };
          break;
        }
      }
    }

    if (!best && !state.worldFlags.cascadeMistCleared) {
      const d = Math.hypot(68 - state.player.x, 33 - state.player.y);
      if (d <= 2.5) {
        best = {
          gx: 68,
          gy: 33,
          interaction: { kind: 'barrier', barrier: 'cascade_mist', gx: 68, gy: 33 },
        };
      }
    }

    if (!best) {
      const d = Math.hypot(83 - state.player.x, 27 - state.player.y);
      if (d <= 2.3) {
        best = {
          gx: 83,
          gy: 27,
          interaction: { kind: 'landmark', landmark: 'mountain_cairn', gx: 83, gy: 27 },
        };
      }
    }

    if (!best && state.worldFlags.cascadeMistCleared) {
      const d = Math.hypot(79 - state.player.x, 28 - state.player.y);
      if (d <= 2.4) {
        best = {
          gx: 79,
          gy: 27,
          interaction: { kind: 'landmark', landmark: 'waterfall_slide', gx: 79, gy: 27 },
        };
      }
    }

    return best;
  };

  const handleCampPlacementTap = (gx: number, gy: number): void => {
    const mode = state.placementMode;
    if (!mode) {
      return;
    }

    if (
      !isValidPlacementTile(
        state.tileMap,
        state.floraNodes,
        state.campItems,
        mode.type,
        gx,
        gy,
        mode.movingItemId
      )
    ) {
      hud.showToast(FR_CA.camp.placementHintInvalid);
      return;
    }

    if (mode.movingItemId) {
      const existing = state.campItems.find((c) => c.id === mode.movingItemId);
      if (existing) {
        existing.gx = gx;
        existing.gy = gy;
      }
    } else {
      const recipe = getRecipeForType(mode.type);
      if (!recipe || !canAffordRecipe(state.inventory, recipe)) {
        state.placementMode = null;
        hud.setPlacementBanner(null);
        return;
      }
      deductRecipeCost(state.inventory, recipe);
      state.campItems.push({
        id: `${mode.type}_${Date.now()}`,
        type: mode.type,
        gx,
        gy,
      });
    }

    if (Math.round(state.player.x) === gx && Math.round(state.player.y) === gy) {
      const safe = state.tileMap.findNearestWalkable(gx, gy, gx, gy, 3);
      if (safe) {
        state.player.x = safe.x;
        state.player.y = safe.y;
        state.player.z = state.tileMap.getInterpolatedElevation(safe.x, safe.y);
      }
    }

    const itemInfo = FR_CA.camp.items[mode.type];
    state.placementMode = null;
    refreshHud();
    audio.playBuildChime();
    hud.showToast(FR_CA.camp.placedToast(itemInfo.icon, itemInfo.name));
    renderer.addTapRipple(gx, gy, state.tileMap.getElevation(gx, gy));
    state.saveToLocalStorage();
    saveDirty = false;
  };

  const handleTap = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const gridPos = screenToGrid(sx, sy, state.camera, (gx, gy) =>
      state.tileMap.getElevation(gx, gy)
    );

    const clampedX = Math.max(0, Math.min(state.tileMap.width - 1, gridPos.x));
    const clampedY = Math.max(0, Math.min(state.tileMap.height - 1, gridPos.y));

    if (state.placementMode) {
      handleCampPlacementTap(clampedX, clampedY);
      return;
    }

    const tappedTile = state.tileMap.getTile(clampedX, clampedY);
    if (!tappedTile) {
      return;
    }

    renderer.addTapRipple(tappedTile.x, tappedTile.y, tappedTile.elevation);

    // 1. Placed Camp Item
    const campItem = state.getCampItemAt(tappedTile.x, tappedTile.y);
    if (campItem && !isCampItemWalkable(campItem.type)) {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'camp', id: campItem.id },
        handleArrivalInteraction
      );
      return;
    }

    // 2. Friendly Fauna
    const critter = state.getFaunaAt(tappedTile.x, tappedTile.y);
    if (critter) {
      state.player.setTapTarget(
        Math.round(critter.x),
        Math.round(critter.y),
        state.tileMap,
        { kind: 'fauna', id: critter.id },
        handleArrivalInteraction
      );
      return;
    }

    // 3. Progression barriers (vines, lagoon bridge, mangrove boardwalk)
    if (!state.worldFlags.vinesCut && tappedTile.prop === 'vine_barrier') {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'barrier', barrier: 'vines', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }

    const isLagoonBridgeSpot = BRIDGE_TILES.some(
      (b) => b.x === tappedTile.x && b.y === tappedTile.y
    );
    if (!state.worldFlags.bridgeBuilt && isLagoonBridgeSpot) {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'barrier', barrier: 'bridge', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }

    const isMangroveSpot = MANGROVE_BOARDWALK_TILES.some(
      (b) => b.x === tappedTile.x && b.y === tappedTile.y
    );
    if (!state.worldFlags.mangroveBoardwalkBuilt && isMangroveSpot) {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'barrier', barrier: 'mangrove_boardwalk', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }

    const isOutriggerSpot =
      tappedTile.prop === 'outrigger_dock' ||
      tappedTile.prop === 'outrigger_post' ||
      OUTRIGGER_CHANNEL_TILES.some((b) => b.x === tappedTile.x && b.y === tappedTile.y);
    if (!state.worldFlags.outriggerLaunched && isOutriggerSpot) {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'barrier', barrier: 'outrigger_crossing', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }

    if (!state.worldFlags.cascadeMistCleared && tappedTile.prop === 'mist_barrier') {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'barrier', barrier: 'cascade_mist', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }

    // 4. Landmarks (Sundial, Trail Signposts, Old Lighthouse, Chime Stones & Mountain Cairn)
    if (
      tappedTile.prop === 'chime_stone_1' ||
      tappedTile.prop === 'chime_stone_2' ||
      tappedTile.prop === 'chime_stone_3'
    ) {
      const step = (
        tappedTile.prop === 'chime_stone_1' ? 1 : tappedTile.prop === 'chime_stone_2' ? 2 : 3
      ) as 1 | 2 | 3;
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'landmark', landmark: 'chime_stone', step, gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }
    if (tappedTile.prop === 'mountain_cairn') {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'landmark', landmark: 'mountain_cairn', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }
    if (state.worldFlags.cascadeMistCleared && tappedTile.terrain === 'cascade_pool') {
      state.player.setTapTarget(
        79,
        27,
        state.tileMap,
        { kind: 'landmark', landmark: 'waterfall_slide', gx: 79, gy: 27 },
        handleArrivalInteraction
      );
      return;
    }
    if (tappedTile.prop === 'lighthouse_overgrown' || tappedTile.prop === 'lighthouse_restored') {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'landmark', landmark: 'lighthouse', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }
    if (tappedTile.prop === 'sundial') {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'landmark', landmark: 'sundial', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }
    if (tappedTile.prop === 'trail_signpost') {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'landmark', landmark: 'signpost', gx: tappedTile.x, gy: tappedTile.y },
        handleArrivalInteraction
      );
      return;
    }

    // 5. Interactive Flora
    const floraNode: FloraNodeData | null = state.getFloraAt(tappedTile.x, tappedTile.y);
    if (
      floraNode &&
      !(floraNode.type === 'sea_glass_spot' && !isFloraBlooming(floraNode, state.timeWeather))
    ) {
      state.player.setTapTarget(
        tappedTile.x,
        tappedTile.y,
        state.tileMap,
        { kind: 'flora', id: floraNode.id },
        handleArrivalInteraction
      );
      return;
    }

    // 6. Normal ground walk & static prop inspection
    state.player.setTapTarget(
      tappedTile.x,
      tappedTile.y,
      state.tileMap,
      null,
      undefined,
      handleInspectProp
    );
  };

  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock();
    canvas.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
    });

    if (activePointers.size === 1) {
      multiTouchUsed = false;
      lastPinchDist = null;
    } else if (activePointers.size === 2) {
      multiTouchUsed = true;
      const pts = Array.from(activePointers.values());
      lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const tracked = activePointers.get(e.pointerId);
    if (tracked) {
      tracked.x = e.clientX;
      tracked.y = e.clientY;
    }

    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist && lastPinchDist > 8) {
        const ratio = dist / lastPinchDist;
        state.camera.targetZoom = clampZoom(state.camera.targetZoom * ratio);
      }
      lastPinchDist = dist;
      return;
    }

    if (e.pointerType === 'mouse' && activePointers.size === 0) {
      const rect = canvas.getBoundingClientRect();
      hoverTile = screenToGrid(
        e.clientX - rect.left,
        e.clientY - rect.top,
        state.camera,
        (gx, gy) => state.tileMap.getElevation(gx, gy)
      );
    }
  });

  const endPointer = (e: PointerEvent, allowTap: boolean): void => {
    const tracked = activePointers.get(e.pointerId);
    activePointers.delete(e.pointerId);

    if (activePointers.size < 2) {
      lastPinchDist = null;
    }

    if (allowTap && tracked && !multiTouchUsed && e.button <= 0) {
      const movedDist = Math.hypot(e.clientX - tracked.startX, e.clientY - tracked.startY);
      if (movedDist < 14) {
        handleTap(e.clientX, e.clientY);
      }
    }
  };

  canvas.addEventListener('pointerup', (e) => endPointer(e, true));
  canvas.addEventListener('pointercancel', (e) => endPointer(e, false));
  canvas.addEventListener('pointerleave', () => {
    hoverTile = null;
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      state.camera.targetZoom = clampZoom(state.camera.targetZoom + delta);
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e) => {
    audio.unlock();

    if (isTypingInField()) {
      return;
    }

    if (e.code === 'Escape') {
      if (craftModal.isOpen()) {
        craftModal.close();
      } else if (journalModal.isOpen()) {
        journalModal.close();
      } else if (mapModal.isOpen()) {
        mapModal.close();
      } else if (saveModal.isOpen()) {
        saveModal.close();
      } else if (state.placementMode) {
        state.placementMode = null;
        hud.setPlacementBanner(null);
      }
      return;
    }

    if (e.code === 'KeyB') {
      e.preventDefault();
      saveModal.close();
      journalModal.close();
      mapModal.close();
      if (craftModal.isOpen()) {
        craftModal.close();
      } else {
        craftModal.openCatalog(state);
      }
      return;
    }

    if (e.code === 'KeyJ') {
      e.preventDefault();
      saveModal.close();
      craftModal.close();
      mapModal.close();
      if (journalModal.isOpen()) {
        journalModal.close();
      } else {
        journalModal.open(state);
      }
      return;
    }

    if (e.code === 'KeyM') {
      e.preventDefault();
      saveModal.close();
      craftModal.close();
      journalModal.close();
      if (mapModal.isOpen()) {
        mapModal.close();
      } else {
        mapModal.open(state);
      }
      return;
    }

    if (craftModal.isOpen() || journalModal.isOpen() || mapModal.isOpen() || saveModal.isOpen()) {
      return;
    }

    if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'Space'
    ) {
      e.preventDefault();
    }

    if (e.code === 'Space' || e.code === 'KeyE') {
      const nearby = findNearbyInteractable();
      if (nearby) {
        handleArrivalInteraction(nearby.interaction);
      }
      return;
    }

    keysPressed.add(e.code);

    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      state.camera.targetZoom = clampZoom(state.camera.targetZoom + 0.15);
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      state.camera.targetZoom = clampZoom(state.camera.targetZoom - 0.15);
    } else if (e.code === 'KeyC' || e.code === 'Home') {
      renderer.snapCameraToPlayer(state.camera, state.player);
    }
  });

  window.addEventListener('keyup', (e) => {
    keysPressed.delete(e.code);
  });

  window.addEventListener('blur', () => {
    keysPressed.clear();
  });

  window.addEventListener('resize', () => {
    renderer.resize(state.camera);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      state.saveToLocalStorage();
      saveDirty = false;
    }
  });

  window.addEventListener('pagehide', () => {
    state.saveToLocalStorage();
    saveDirty = false;
  });

  let lastFrameTime = performance.now();
  let lastPhase = state.timeWeather.getPhase();
  let lastIsRaining = state.timeWeather.weather === 'rain';
  let lastIsBiolum = state.timeWeather.isBioluminescentTideActive();

  const frame = (now: number): void => {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    state.elapsedTime += dt;

    updateFloraNodes(state.floraNodes, dt);
    updateFauna(state.fauna, dt, state.tileMap, state.player, state.timeWeather);

    state.timeWeather.update(dt, (event) => {
      if (event === 'dawn') {
        state.player.showThought(FR_CA.timeWeather.dawnThought, 4.4);
      } else if (event === 'sunset') {
        state.player.showThought(FR_CA.timeWeather.sunsetThought, 4.4);
      } else if (event === 'night') {
        state.player.showThought(FR_CA.timeWeather.nightThought, 4.4);
      } else if (event === 'biolum_night') {
        state.player.showThought(FR_CA.timeWeather.biolumNightThought, 5.0);
        hud.showToast(FR_CA.timeWeather.biolumNightToast, 3600);
      } else if (event === 'rain_start') {
        state.player.showThought(FR_CA.timeWeather.rainStartThought, 4.2);
      } else if (event === 'rain_end') {
        state.player.showThought(FR_CA.timeWeather.rainEndThought, 3.8);
      }
    });

    const curPhase = state.timeWeather.getPhase();
    const curRaining = state.timeWeather.weather === 'rain';
    const curBiolum = state.timeWeather.isBioluminescentTideActive();
    if (curPhase !== lastPhase || curRaining !== lastIsRaining || curBiolum !== lastIsBiolum) {
      lastPhase = curPhase;
      lastIsRaining = curRaining;
      lastIsBiolum = curBiolum;
      hud.updateTimeWeather(curPhase, curRaining, curBiolum);
    }

    const modalOpen =
      craftModal.isOpen() || journalModal.isOpen() || mapModal.isOpen() || saveModal.isOpen();
    const activeKeys = modalOpen ? new Set<string>() : keysPressed;

    state.player.update(
      dt,
      activeKeys,
      state.tileMap,
      (biome) => {
        hud.updateBiome(biome, true);
        if (state.unlockBiomeAndSignpost(biome) && biome !== 'ocean') {
          const bInfo = FR_CA.biomes[biome];
          hud.showToast(FR_CA.map.signpostUnlockedToast(bInfo.icon, bInfo.name), 3000);
          markDirty();
        }
      },
      (x, y, z, terrain) => {
        renderer.addFootstep(x, y, z, terrain);
        audio.playFootstep(terrain);
      },
      handleArrivalInteraction,
      handleInspectProp
    );

    // Smoothly dissipate waterfall mist veil once the 3 Chime Stones are solved
    const targetMist = state.worldFlags.cascadeMistCleared ? 0 : 1;
    if (state.cascadeMistAlpha > targetMist) {
      state.cascadeMistAlpha = Math.max(0, state.cascadeMistAlpha - dt / 2.6);
    } else if (state.cascadeMistAlpha < targetMist) {
      state.cascadeMistAlpha = Math.min(1, state.cascadeMistAlpha + dt / 1.5);
    }

    // Passive soothing stamina regeneration near Misty Thermal Hot Springs & Cascade Waterfall
    if (hotSpringsThoughtCooldown > 0) {
      hotSpringsThoughtCooldown = Math.max(0, hotSpringsThoughtCooldown - dt);
    }
    const distToThermalPool = Math.hypot(state.player.x - 62, state.player.y - 18.5);
    const distToWaterfallPool = Math.hypot(
      state.player.x - CASCADE_WATERFALL_POS.x,
      state.player.y - (CASCADE_WATERFALL_POS.y + 2)
    );
    if (distToThermalPool <= 3.2 && state.player.stamina < 0.995) {
      state.player.restoreStamina(dt * 0.06);
      hud.updateStamina(state.player.stamina);
      if (hotSpringsThoughtCooldown <= 0) {
        hotSpringsThoughtCooldown = 18;
        state.player.showThought(FR_CA.gathering.hotSpringsSoakThought, 4.0);
      }
    } else if (
      state.worldFlags.cascadeMistCleared &&
      distToWaterfallPool <= 3.8 &&
      state.player.stamina < 0.995
    ) {
      state.player.restoreStamina(dt * 0.055);
      hud.updateStamina(state.player.stamina);
      if (hotSpringsThoughtCooldown <= 0) {
        hotSpringsThoughtCooldown = 18;
        state.player.showThought(FR_CA.gathering.cascadeFreshThought, 4.0);
      }
    }

    const nearOceanFactor = Math.max(0, Math.min(1, (state.player.y - 36) / 14));
    let nearCampfireFactor = 0;
    for (const item of state.campItems) {
      if (item.type === 'campfire') {
        const d = Math.hypot(item.gx - state.player.x, item.gy - state.player.y);
        nearCampfireFactor = Math.max(nearCampfireFactor, Math.max(0, 1 - d / 10));
      }
    }
    const rawWaterfallFactor = Math.max(0, 1 - distToWaterfallPool / 16);
    const nearWaterfallFactor = state.worldFlags.cascadeMistCleared
      ? rawWaterfallFactor
      : rawWaterfallFactor * 0.35;
    audio.updateAmbience(
      dt,
      state.elapsedTime,
      state.timeWeather,
      nearOceanFactor,
      nearCampfireFactor,
      nearWaterfallFactor
    );

    autoSaveTimer += dt;
    if (autoSaveTimer >= 10) {
      autoSaveTimer = 0;
      if (saveDirty || state.player.isMoving) {
        state.saveToLocalStorage();
        saveDirty = false;
      }
    }

    renderer.render(state.elapsedTime, dt, state, hoverTile);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

bootstrap();
