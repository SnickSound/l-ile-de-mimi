import type { GameState } from '../game/GameState';
import { FR_CA } from '../i18n/frCA';

export interface SaveModalCallbacks {
  onImportCode: (code: string) => boolean;
  onResetIsland: () => void;
  onNotify: (message: string) => void;
  canInstallPwa: () => boolean;
  onTriggerPwaInstall: () => Promise<boolean>;
}

export class SaveModal {
  private readonly backdrop: HTMLElement;
  private readonly card: HTMLElement;
  private readonly callbacks: SaveModalCallbacks;

  constructor(callbacks: SaveModalCallbacks) {
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

  public open(state: GameState): void {
    state.saveToLocalStorage();
    this.card.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = FR_CA.save.modalTitle;

    const lastSavedStr = state.lastSavedAt
      ? new Intl.DateTimeFormat('fr-CA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date(state.lastSavedAt))
      : FR_CA.save.neverSaved;

    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = `${FR_CA.save.modalSubtitle} (${FR_CA.save.lastSavedPrefix}${lastSavedStr})`;

    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = FR_CA.camp.closeBtn;
    closeBtn.addEventListener('click', () => this.close());
    header.append(titleWrap, closeBtn);

    this.card.appendChild(header);

    // Optional Android PWA Install Card when prompt is available
    if (this.callbacks.canInstallPwa()) {
      const pwaSection = document.createElement('div');
      pwaSection.className = 'save-section';

      const pwaTitle = document.createElement('h3');
      pwaTitle.className = 'save-section-title';
      pwaTitle.textContent = FR_CA.pwa.installTitle;

      const pwaDesc = document.createElement('p');
      pwaDesc.className = 'save-section-desc';
      pwaDesc.textContent = FR_CA.pwa.installDesc;

      const installBtn = document.createElement('button');
      installBtn.type = 'button';
      installBtn.className = 'modal-primary-btn';
      installBtn.textContent = FR_CA.pwa.installBtn;
      installBtn.addEventListener('click', async () => {
        const installed = await this.callbacks.onTriggerPwaInstall();
        if (installed) {
          this.callbacks.onNotify(FR_CA.pwa.installedToast);
          pwaSection.remove();
        }
      });

      pwaSection.append(pwaTitle, pwaDesc, installBtn);
      this.card.appendChild(pwaSection);
    }

    // Export save code section
    const exportSection = document.createElement('div');
    exportSection.className = 'save-section';

    const exportTitle = document.createElement('h3');
    exportTitle.className = 'save-section-title';
    exportTitle.textContent = FR_CA.save.copyCodeTitle;

    const exportDesc = document.createElement('p');
    exportDesc.className = 'save-section-desc';
    exportDesc.textContent = FR_CA.save.copyCodeDesc;

    const exportArea = document.createElement('textarea');
    exportArea.className = 'save-textarea';
    exportArea.readOnly = true;
    exportArea.value = state.exportSaveCode();

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'modal-primary-btn';
    copyBtn.textContent = FR_CA.save.copyCodeBtn;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(exportArea.value);
      } catch {
        exportArea.select();
        document.execCommand('copy');
      }
      this.callbacks.onNotify(FR_CA.save.copiedToast);
    });

    exportSection.append(exportTitle, exportDesc, exportArea, copyBtn);

    // Import save code section
    const importSection = document.createElement('div');
    importSection.className = 'save-section';

    const importTitle = document.createElement('h3');
    importTitle.className = 'save-section-title';
    importTitle.textContent = FR_CA.save.importCodeTitle;

    const importArea = document.createElement('textarea');
    importArea.className = 'save-textarea';
    importArea.placeholder = FR_CA.save.importPlaceholder;

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'modal-secondary-btn';
    importBtn.textContent = FR_CA.save.importCodeBtn;
    importBtn.addEventListener('click', () => {
      if (this.callbacks.onImportCode(importArea.value)) {
        this.callbacks.onNotify(FR_CA.save.importSuccessToast);
        this.close();
      } else {
        this.callbacks.onNotify(FR_CA.save.importErrorToast);
      }
    });

    importSection.append(importTitle, importArea, importBtn);

    // File download/upload section
    const fileSection = document.createElement('div');
    fileSection.className = 'save-section';

    const fileTitle = document.createElement('h3');
    fileTitle.className = 'save-section-title';
    fileTitle.textContent = FR_CA.save.fileSectionTitle;

    const fileRow = document.createElement('div');
    fileRow.className = 'save-btn-row';

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'modal-secondary-btn';
    downloadBtn.textContent = FR_CA.save.downloadBtn;
    downloadBtn.addEventListener('click', () => {
      const json = JSON.stringify(state.toSaveData(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ile-de-mimi-sauvegarde.json';
      link.click();
      URL.revokeObjectURL(url);
    });

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) {
        return;
      }
      const text = await file.text();
      if (this.callbacks.onImportCode(text)) {
        this.callbacks.onNotify(FR_CA.save.importSuccessToast);
        this.close();
      } else {
        this.callbacks.onNotify(FR_CA.save.importErrorToast);
      }
    });

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'modal-secondary-btn';
    uploadBtn.textContent = FR_CA.save.uploadBtn;
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileRow.append(downloadBtn, uploadBtn, fileInput);
    fileSection.append(fileTitle, fileRow);

    // Two-step Reset button
    let armedReset = false;
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'modal-danger-btn';
    resetBtn.style.width = '100%';
    resetBtn.textContent = FR_CA.save.resetBtn;
    resetBtn.addEventListener('click', () => {
      if (!armedReset) {
        armedReset = true;
        resetBtn.textContent = FR_CA.save.resetConfirmBtn;
        return;
      }
      this.callbacks.onResetIsland();
      this.callbacks.onNotify(FR_CA.save.resetDoneToast);
      this.close();
    });

    this.card.append(exportSection, importSection, fileSection, resetBtn);
    this.backdrop.classList.remove('hidden');
  }
}
