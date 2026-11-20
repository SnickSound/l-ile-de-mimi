import { isShelterType, type CampItemType, type PlacedCampItem } from '../entities/CampItem';
import type { ResourceId } from '../entities/Flora';
import type { GameState } from '../game/GameState';
import { FR_CA } from '../i18n/frCA';
import {
  CAMP_RECIPES,
  TOOL_RECIPES,
  canAffordRecipe,
  canAffordTool,
  findRoastableFruit,
  getNextShelterUpgrade,
  getRecipeForType,
  type ToolId,
} from '../systems/Crafting';

type CraftTab = 'tools' | 'shelter' | 'decor';

export interface CraftModalCallbacks {
  onStartPlacement: (type: CampItemType, movingItemId?: string) => void;
  onUpgradeShelter: () => void;
  onCraftTool: (toolId: Exclude<ToolId, 'hand_basket'>) => void;
  onRestAtCamp: (item: PlacedCampItem, skipTo?: 'morning' | 'night') => void;
  onRoastFruit: () => void;
  onOpenJournalFromCamp: () => void;
  onRingWindchime: () => void;
}

export class CraftModal {
  private readonly backdrop: HTMLElement;
  private readonly card: HTMLElement;
  private readonly callbacks: CraftModalCallbacks;
  private activeTab: CraftTab = 'shelter';

  constructor(callbacks: CraftModalCallbacks) {
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

  public openCatalog(state: GameState): void {
    this.card.innerHTML = '';

    const header = this.createHeader(FR_CA.camp.modalTitle, FR_CA.camp.modalSubtitle);

    // Cozy category tabs
    const tabs = document.createElement('div');
    tabs.className = 'journal-tabs';
    const tabDefs: Array<{ id: CraftTab; label: string }> = [
      { id: 'shelter', label: FR_CA.camp.tabShelter },
      { id: 'decor', label: FR_CA.camp.tabDecor },
      { id: 'tools', label: FR_CA.camp.tabTools },
    ];
    for (const def of tabDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        this.activeTab === def.id ? 'journal-tab journal-tab--active' : 'journal-tab';
      btn.textContent = def.label;
      btn.addEventListener('click', () => {
        this.activeTab = def.id;
        this.openCatalog(state);
      });
      tabs.appendChild(btn);
    }

    const list = document.createElement('div');
    list.className = 'recipe-list';

    if (this.activeTab === 'tools') {
      this.renderToolsTab(list, state);
    } else if (this.activeTab === 'shelter') {
      this.renderShelterTab(list, state);
    } else {
      this.renderDecorTab(list, state);
    }

    this.card.append(header, tabs, list);
    this.backdrop.classList.remove('hidden');
  }

  private renderToolsTab(container: HTMLElement, state: GameState): void {
    for (const recipe of TOOL_RECIPES) {
      const info = FR_CA.tools[recipe.id];
      const owned = state.tools[recipe.id];
      const affordable = canAffordTool(state.inventory, recipe);

      const itemCard = this.createRecipeCard(
        info.icon,
        info.name,
        info.description,
        owned ? FR_CA.tools.ownedBadge : null,
        recipe.costs,
        state.inventory
      );

      if (!owned) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'modal-primary-btn';
        if (affordable) {
          btn.textContent = FR_CA.tools.craftToolBtn;
          btn.addEventListener('click', () => {
            this.callbacks.onCraftTool(recipe.id);
            this.openCatalog(state);
          });
        } else {
          btn.textContent = FR_CA.camp.missingResourcesBtn;
          btn.disabled = true;
        }
        itemCard.appendChild(btn);
      }

      container.appendChild(itemCard);
    }
  }

  private renderShelterTab(container: HTMLElement, state: GameState): void {
    // 1. Campfire & Hammock (Hammock supports up to 3 for Scenic Outpost Nooks)
    for (const type of ['campfire', 'hammock'] as const) {
      const recipe = getRecipeForType(type)!;
      const info = FR_CA.camp.items[type];
      const placedInstances = state.campItems.filter((c) => c.type === type);
      const placedCount = placedInstances.length;
      const affordable = canAffordRecipe(state.inventory, recipe);

      const badge =
        placedCount > 0
          ? recipe.maxCount > 1
            ? FR_CA.camp.countBadge(placedCount, recipe.maxCount)
            : FR_CA.camp.alreadyPlacedBadge
          : null;

      const card = this.createRecipeCard(
        info.icon,
        info.name,
        info.description,
        badge,
        placedCount < recipe.maxCount ? recipe.costs : {},
        state.inventory
      );

      const row = document.createElement('div');
      row.className = 'save-btn-row';

      if (placedCount < recipe.maxCount) {
        const buildBtn = document.createElement('button');
        buildBtn.type = 'button';
        buildBtn.className = 'modal-primary-btn';
        buildBtn.style.flex = '1';
        if (affordable) {
          buildBtn.textContent =
            placedCount > 0 ? FR_CA.camp.placeAnotherBtn : FR_CA.camp.installBtn;
          buildBtn.addEventListener('click', () => {
            this.close();
            this.callbacks.onStartPlacement(type);
          });
        } else {
          buildBtn.textContent = FR_CA.camp.missingResourcesBtn;
          buildBtn.disabled = true;
        }
        row.appendChild(buildBtn);
      }

      if (placedCount > 0) {
        const lastPlaced = placedInstances[placedInstances.length - 1];
        const moveBtn = document.createElement('button');
        moveBtn.type = 'button';
        moveBtn.className = 'modal-secondary-btn';
        moveBtn.textContent = placedCount >= recipe.maxCount ? FR_CA.camp.moveBtn : '📐';
        if (placedCount >= recipe.maxCount) {
          moveBtn.style.flex = '1';
        }
        moveBtn.title = FR_CA.camp.moveCampItemBtn;
        moveBtn.addEventListener('click', () => {
          this.close();
          this.callbacks.onStartPlacement(lastPlaced.type, lastPlaced.id);
        });
        row.appendChild(moveBtn);
      }

      card.appendChild(row);
      container.appendChild(card);
    }

    // 2. Progressive Shelter Card (Stage 1 -> Stage 2 -> Stage 3)
    const placedShelter = state.getPlacedShelter();
    if (!placedShelter) {
      const recipe = getRecipeForType('shelter_stage_1')!;
      const info = FR_CA.camp.items.shelter_stage_1;
      const affordable = canAffordRecipe(state.inventory, recipe);
      const card = this.createRecipeCard(
        info.icon,
        info.name,
        info.description,
        null,
        recipe.costs,
        state.inventory
      );

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-primary-btn';
      if (affordable) {
        btn.textContent = FR_CA.camp.installBtn;
        btn.addEventListener('click', () => {
          this.close();
          this.callbacks.onStartPlacement('shelter_stage_1');
        });
      } else {
        btn.textContent = FR_CA.camp.missingResourcesBtn;
        btn.disabled = true;
      }
      card.appendChild(btn);
      container.appendChild(card);
      return;
    }

    const nextUpgrade = getNextShelterUpgrade(placedShelter.type);
    if (nextUpgrade) {
      const upgradeInfo = FR_CA.camp.items[nextUpgrade.type];
      const affordable = canAffordRecipe(state.inventory, nextUpgrade);
      const currentInfo = FR_CA.camp.items[placedShelter.type];
      const card = this.createRecipeCard(
        upgradeInfo.icon,
        upgradeInfo.name,
        upgradeInfo.description,
        `${currentInfo.icon} ${FR_CA.camp.alreadyPlacedBadge}`,
        nextUpgrade.costs,
        state.inventory
      );

      const row = document.createElement('div');
      row.className = 'save-btn-row';

      const upgradeBtn = document.createElement('button');
      upgradeBtn.type = 'button';
      upgradeBtn.className = 'modal-primary-btn';
      upgradeBtn.style.flex = '1';
      upgradeBtn.textContent = affordable
        ? nextUpgrade.type === 'shelter_stage_2'
          ? FR_CA.camp.upgradeToStage2Btn
          : FR_CA.camp.upgradeToStage3Btn
        : FR_CA.camp.missingResourcesBtn;
      upgradeBtn.disabled = !affordable;
      if (affordable) {
        upgradeBtn.addEventListener('click', () => {
          this.callbacks.onUpgradeShelter();
          this.openCatalog(state);
        });
      }

      const moveBtn = document.createElement('button');
      moveBtn.type = 'button';
      moveBtn.className = 'modal-secondary-btn';
      moveBtn.textContent = '📐';
      moveBtn.title = FR_CA.camp.moveCampItemBtn;
      moveBtn.addEventListener('click', () => {
        this.close();
        this.callbacks.onStartPlacement(placedShelter.type, placedShelter.id);
      });

      row.append(upgradeBtn, moveBtn);
      card.appendChild(row);
      container.appendChild(card);
    } else {
      const maxInfo = FR_CA.camp.items.shelter_stage_3;
      const card = this.createRecipeCard(
        maxInfo.icon,
        maxInfo.name,
        maxInfo.description,
        FR_CA.camp.alreadyPlacedBadge,
        {},
        state.inventory
      );
      const moveBtn = document.createElement('button');
      moveBtn.type = 'button';
      moveBtn.className = 'modal-secondary-btn';
      moveBtn.textContent = FR_CA.camp.moveBtn;
      moveBtn.addEventListener('click', () => {
        this.close();
        this.callbacks.onStartPlacement(placedShelter.type, placedShelter.id);
      });
      card.appendChild(moveBtn);
      container.appendChild(card);
    }
  }

  private renderDecorTab(container: HTMLElement, state: GameState): void {
    const decorRecipes = CAMP_RECIPES.filter((r) => r.category === 'decor');

    for (const recipe of decorRecipes) {
      const info = FR_CA.camp.items[recipe.type];
      const placedInstances = state.campItems.filter((c) => c.type === recipe.type);
      const placedCount = placedInstances.length;
      const affordable = canAffordRecipe(state.inventory, recipe);

      const badge =
        placedCount > 0
          ? recipe.maxCount > 1
            ? FR_CA.camp.countBadge(placedCount, recipe.maxCount)
            : FR_CA.camp.alreadyPlacedBadge
          : null;

      const card = this.createRecipeCard(
        info.icon,
        info.name,
        info.description,
        badge,
        placedCount < recipe.maxCount ? recipe.costs : {},
        state.inventory
      );

      const row = document.createElement('div');
      row.className = 'save-btn-row';

      if (placedCount < recipe.maxCount) {
        const buildBtn = document.createElement('button');
        buildBtn.type = 'button';
        buildBtn.className = 'modal-primary-btn';
        buildBtn.style.flex = '1';
        if (affordable) {
          buildBtn.textContent =
            placedCount > 0 ? FR_CA.camp.placeAnotherBtn : FR_CA.camp.installBtn;
          buildBtn.addEventListener('click', () => {
            this.close();
            this.callbacks.onStartPlacement(recipe.type);
          });
        } else {
          buildBtn.textContent = FR_CA.camp.missingResourcesBtn;
          buildBtn.disabled = true;
        }
        row.appendChild(buildBtn);
      }

      if (placedCount > 0) {
        const lastPlaced = placedInstances[placedInstances.length - 1];
        const moveBtn = document.createElement('button');
        moveBtn.type = 'button';
        moveBtn.className = 'modal-secondary-btn';
        moveBtn.textContent =
          placedCount >= recipe.maxCount ? FR_CA.camp.moveBtn : '📐';
        if (placedCount >= recipe.maxCount) {
          moveBtn.style.flex = '1';
        }
        moveBtn.title = FR_CA.camp.moveCampItemBtn;
        moveBtn.addEventListener('click', () => {
          this.close();
          this.callbacks.onStartPlacement(lastPlaced.type, lastPlaced.id);
        });
        row.appendChild(moveBtn);
      }

      card.appendChild(row);
      container.appendChild(card);
    }
  }

  private createRecipeCard(
    iconChar: string,
    titleText: string,
    descText: string,
    badgeText: string | null,
    costs: Partial<Record<ResourceId, number>>,
    inventory: Record<ResourceId, number>
  ): HTMLElement {
    const itemCard = document.createElement('div');
    itemCard.className = 'recipe-card';

    const top = document.createElement('div');
    top.className = 'recipe-card-top';

    const icon = document.createElement('div');
    icon.className = 'recipe-icon';
    icon.textContent = iconChar;

    const textBox = document.createElement('div');
    const nameRow = document.createElement('div');
    nameRow.className = 'recipe-name-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'recipe-name';
    nameEl.textContent = titleText;
    nameRow.appendChild(nameEl);

    if (badgeText) {
      const badge = document.createElement('span');
      badge.className = 'recipe-badge';
      badge.textContent = badgeText;
      nameRow.appendChild(badge);
    }

    const desc = document.createElement('p');
    desc.className = 'recipe-desc';
    desc.textContent = descText;

    textBox.append(nameRow, desc);
    top.append(icon, textBox);

    itemCard.appendChild(top);

    const costEntries = Object.entries(costs) as Array<[ResourceId, number]>;
    if (costEntries.length > 0) {
      const costRow = document.createElement('div');
      costRow.className = 'cost-row';
      for (const [resId, needed] of costEntries) {
        const resInfo = FR_CA.resources[resId];
        const owned = inventory[resId] ?? 0;
        const chip = document.createElement('span');
        chip.className = owned >= needed ? 'cost-chip' : 'cost-chip cost-chip--missing';
        chip.textContent = `${resInfo.icon} ${owned}/${needed} ${resInfo.name}`;
        costRow.appendChild(chip);
      }
      itemCard.appendChild(costRow);
    }

    return itemCard;
  }

  public openItemInteraction(item: PlacedCampItem, state: GameState): void {
    this.card.innerHTML = '';
    const info = FR_CA.camp.items[item.type];
    const header = this.createHeader(`${info.icon} ${info.name}`, info.description);

    const actions = document.createElement('div');
    actions.className = 'modal-actions-col';

    if (item.type === 'campfire') {
      const roastable = findRoastableFruit(state.inventory);
      const roastBtn = document.createElement('button');
      roastBtn.type = 'button';
      roastBtn.className = 'modal-primary-btn';
      roastBtn.textContent = FR_CA.camp.roastFruitBtn;
      if (!roastable) {
        roastBtn.title = FR_CA.camp.roastNeedFruitToast;
      }
      roastBtn.addEventListener('click', () => {
        this.callbacks.onRoastFruit();
        this.close();
      });
      actions.appendChild(roastBtn);
    } else if (item.type === 'hammock' || isShelterType(item.type)) {
      const napBtn = document.createElement('button');
      napBtn.type = 'button';
      napBtn.className = 'modal-primary-btn';
      napBtn.textContent = FR_CA.camp.restNapBtn;
      napBtn.addEventListener('click', () => {
        this.callbacks.onRestAtCamp(item);
        this.close();
      });

      const morningBtn = document.createElement('button');
      morningBtn.type = 'button';
      morningBtn.className = 'modal-secondary-btn';
      morningBtn.textContent = FR_CA.camp.restUntilMorningBtn;
      morningBtn.addEventListener('click', () => {
        this.callbacks.onRestAtCamp(item, 'morning');
        this.close();
      });

      const nightBtn = document.createElement('button');
      nightBtn.type = 'button';
      nightBtn.className = 'modal-secondary-btn';
      nightBtn.textContent = FR_CA.camp.restUntilNightBtn;
      nightBtn.addEventListener('click', () => {
        this.callbacks.onRestAtCamp(item, 'night');
        this.close();
      });

      actions.append(napBtn, morningBtn, nightBtn);

      if (isShelterType(item.type)) {
        const nextUpgrade = getNextShelterUpgrade(item.type);
        if (nextUpgrade && canAffordRecipe(state.inventory, nextUpgrade)) {
          const upgradeBtn = document.createElement('button');
          upgradeBtn.type = 'button';
          upgradeBtn.className = 'modal-primary-btn';
          upgradeBtn.textContent =
            nextUpgrade.type === 'shelter_stage_2'
              ? FR_CA.camp.upgradeToStage2Btn
              : FR_CA.camp.upgradeToStage3Btn;
          upgradeBtn.addEventListener('click', () => {
            this.callbacks.onUpgradeShelter();
            this.close();
          });
          actions.appendChild(upgradeBtn);
        }
      }
    } else if (item.type === 'herbarium_table') {
      const journalBtn = document.createElement('button');
      journalBtn.type = 'button';
      journalBtn.className = 'modal-primary-btn';
      journalBtn.textContent = `📖 ${FR_CA.journal.modalTitle}`;
      journalBtn.addEventListener('click', () => {
        this.close();
        this.callbacks.onOpenJournalFromCamp();
      });
      actions.appendChild(journalBtn);
    } else if (item.type === 'shell_windchime') {
      const chimeBtn = document.createElement('button');
      chimeBtn.type = 'button';
      chimeBtn.className = 'modal-primary-btn';
      chimeBtn.textContent = '🎐 Faire tinter le carillon';
      chimeBtn.addEventListener('click', () => {
        this.callbacks.onRingWindchime();
        this.close();
      });
      actions.appendChild(chimeBtn);
    }

    const moveBtn = document.createElement('button');
    moveBtn.type = 'button';
    moveBtn.className = 'modal-secondary-btn';
    moveBtn.textContent = FR_CA.camp.moveCampItemBtn;
    moveBtn.addEventListener('click', () => {
      this.close();
      this.callbacks.onStartPlacement(item.type, item.id);
    });
    actions.appendChild(moveBtn);

    this.card.append(header, actions);
    this.backdrop.classList.remove('hidden');
  }

  private createHeader(titleText: string, subtitleText: string): HTMLElement {
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = titleText;

    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = subtitleText;

    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = FR_CA.camp.closeBtn;
    closeBtn.addEventListener('click', () => this.close());

    header.append(titleWrap, closeBtn);
    return header;
  }
}
