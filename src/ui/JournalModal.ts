import type { FaunaSpeciesId } from '../entities/Fauna';
import type { GameState } from '../game/GameState';
import { FR_CA } from '../i18n/frCA';
import { JOURNAL_CATALOG, type JournalSpeciesId } from '../systems/Journal';

type JournalFilter = 'all' | 'flora' | 'fauna';

function renderSketchIcon(canvas: HTMLCanvasElement, id: JournalSpeciesId, discovered: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Soft parchment circle
  ctx.fillStyle = discovered ? '#fff5dc' : '#eae7dc';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = discovered ? '#dfbf88' : '#cbc7bc';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (!discovered) {
    ctx.fillStyle = '#9aa3a0';
    ctx.font = '800 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h / 2 + 1);
    return;
  }

  const entry = FR_CA.journal.entries[id];
  ctx.font = '24px "Segoe UI Emoji", "Apple Color Emoji", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.icon, w / 2, h / 2 + 2);
}

export class JournalModal {
  private readonly backdrop: HTMLElement;
  private readonly card: HTMLElement;
  private currentFilter: JournalFilter = 'all';

  constructor() {
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
    title.textContent = `📖 ${FR_CA.journal.modalTitle}`;

    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = FR_CA.journal.modalSubtitle;

    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = FR_CA.camp.closeBtn;
    closeBtn.addEventListener('click', () => this.close());
    header.append(titleWrap, closeBtn);

    // Discovery progress bar
    const foundCount = JOURNAL_CATALOG.filter((item) => state.discoveredJournal.has(item.id)).length;
    const totalCount = JOURNAL_CATALOG.length;

    const progressWrap = document.createElement('div');
    progressWrap.className = 'journal-progress-wrap';

    const progressLabel = document.createElement('div');
    progressLabel.className = 'journal-progress-label';
    progressLabel.textContent = FR_CA.journal.progressLabel(foundCount, totalCount);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'journal-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'journal-progress-fill';
    progressFill.style.width = `${Math.round((foundCount / totalCount) * 100)}%`;
    progressTrack.appendChild(progressFill);
    progressWrap.append(progressLabel, progressTrack);

    // Filter tabs
    const tabs = document.createElement('div');
    tabs.className = 'journal-tabs';
    const tabDefs: Array<{ id: JournalFilter; label: string }> = [
      { id: 'all', label: FR_CA.journal.filterAll },
      { id: 'flora', label: FR_CA.journal.filterFlora },
      { id: 'fauna', label: FR_CA.journal.filterFauna },
    ];
    for (const def of tabDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        this.currentFilter === def.id ? 'journal-tab journal-tab--active' : 'journal-tab';
      btn.textContent = def.label;
      btn.addEventListener('click', () => {
        this.currentFilter = def.id;
        this.open(state);
      });
      tabs.appendChild(btn);
    }

    // Species entries
    const list = document.createElement('div');
    list.className = 'recipe-list';

    if (state.worldFlags.sabrevoixFound) {
      const treasureCard = document.createElement('div');
      treasureCard.className = 'journal-card';
      treasureCard.style.background = 'linear-gradient(135deg, #fff7d6, #e6fbfa)';
      treasureCard.style.borderColor = '#e6b84c';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'recipe-icon';
      iconWrap.textContent = '✨';

      const tBody = document.createElement('div');
      tBody.className = 'journal-body';

      const nameRow = document.createElement('div');
      nameRow.className = 'recipe-name-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'recipe-name';
      nameEl.textContent = FR_CA.tools.sabrevoixName;

      const badge = document.createElement('span');
      badge.className = 'recipe-badge';
      badge.style.background = '#ffe8a3';
      badge.style.color = '#8a5a00';
      badge.textContent = `💎 ${FR_CA.tools.sabrevoixBadge}`;

      nameRow.append(nameEl, badge);

      const descEl = document.createElement('p');
      descEl.className = 'recipe-desc';
      descEl.textContent = FR_CA.tools.sabrevoixDesc;

      tBody.append(nameRow, descEl);
      treasureCard.append(iconWrap, tBody);
      list.appendChild(treasureCard);
    }

    const maxTrustBySpecies = new Map<FaunaSpeciesId, number>();
    for (const critter of state.fauna) {
      const cur = maxTrustBySpecies.get(critter.species) ?? 0;
      if (critter.trust > cur) {
        maxTrustBySpecies.set(critter.species, critter.trust);
      }
    }

    for (const meta of JOURNAL_CATALOG) {
      if (this.currentFilter !== 'all' && meta.category !== this.currentFilter) {
        continue;
      }

      const discovered = state.discoveredJournal.has(meta.id);
      const entry = FR_CA.journal.entries[meta.id];

      const cardEl = document.createElement('div');
      cardEl.className = discovered ? 'journal-card' : 'journal-card journal-card--locked';

      const sketch = document.createElement('canvas');
      sketch.width = 56;
      sketch.height = 56;
      sketch.className = 'journal-sketch';
      renderSketchIcon(sketch, meta.id, discovered);

      const body = document.createElement('div');
      body.className = 'journal-body';

      const nameEl = document.createElement('div');
      nameEl.className = 'recipe-name';
      nameEl.textContent = discovered ? entry.name : FR_CA.journal.undiscoveredName;

      const noteEl = document.createElement('p');
      noteEl.className = 'recipe-desc';
      noteEl.textContent = discovered
        ? entry.note
        : `${FR_CA.journal.undiscoveredHintPrefix}${entry.hint}`;

      body.append(nameEl, noteEl);

      if (discovered) {
        const metaRow = document.createElement('div');
        metaRow.className = 'journal-meta-row';

        const habitatChip = document.createElement('span');
        habitatChip.className = 'journal-tag';
        habitatChip.textContent = `📍 ${entry.habitat}`;

        const timeChip = document.createElement('span');
        timeChip.className = 'journal-tag';
        timeChip.textContent = `🕒 ${entry.activeTime}`;

        metaRow.append(habitatChip, timeChip);

        if (meta.category === 'fauna') {
          const trust = maxTrustBySpecies.get(meta.id as FaunaSpeciesId) ?? 0;
          const trustChip = document.createElement('span');
          trustChip.className = 'journal-tag';
          trustChip.textContent = FR_CA.fauna.trustLevel(trust);
          metaRow.appendChild(trustChip);
        }

        body.appendChild(metaRow);
      }

      cardEl.append(sketch, body);
      list.appendChild(cardEl);
    }

    this.card.append(header, progressWrap, tabs, list);
    this.backdrop.classList.remove('hidden');
  }
}
