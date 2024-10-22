import { type App, Modal } from 'obsidian';
import type ScribePlugin from 'src';

export class SampleModal extends Modal {
  plugin: ScribePlugin;
  constructor(plugin: ScribePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen() {
    this.plugin.state.isOpen = true;
    this.initModal();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.plugin.state.isOpen = false;
  }

  initModal() {
    const { contentEl } = this;
    contentEl.innerHTML = '';

    const controlGroupWrapper = contentEl.createDiv({});
    const infoGroup = controlGroupWrapper.createDiv({});
    const counterText = infoGroup.createEl('span', {
      cls: 'scribe-counter',
    });
    counterText.setText(`Counter: ${this.plugin.state.counter}`);

    const controlGroup = controlGroupWrapper.createDiv({});

    const counterButton = controlGroup.createEl('button');
    counterButton.setText('Inc Counter');

    counterButton.addEventListener('click', async () => {
      this.plugin.state.counter++;
      this.updateCounterElement(contentEl, this.plugin.state.counter);
    });
  }

  updateCounterElement(container: HTMLElement, count: number) {
    const counterTextEl = container.find('.scribe-counter');
    counterTextEl.setText(`Counter: ${this.plugin.state.counter}`);
  }
}