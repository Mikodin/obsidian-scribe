import { type App, Notice, PluginSettingTab, Setting, moment } from 'obsidian';
import { createRoot, type Root } from 'react-dom/client';
import { useDebounce } from 'src/util/useDebounce';

import type ScribePlugin from 'src';

import { LLM_MODELS } from 'src/util/openAiUtils';

import { FileNameSettings } from './components/FileNameSettings';

export enum TRANSCRIPT_PLATFORM {
  assemblyAi = 'assemblyAi',
  openAi = 'openAi',
}
export interface ScribePluginSettings {
  assemblyAiApiKey: string;
  openAiApiKey: string;
  recordingDirectory: string;
  transcriptDirectory: string;
  transcriptPlatform: TRANSCRIPT_PLATFORM;
  llmModel: LLM_MODELS;
  recordingFilenamePrefix: string;
  noteFilenamePrefix: string;
  dateFilenameFormat: string;
  isSaveAudioFileActive: boolean;
  isOnlyTranscribeActive: boolean;
}

export const DEFAULT_SETTINGS: ScribePluginSettings = {
  assemblyAiApiKey: '',
  openAiApiKey: '',
  recordingDirectory: '',
  transcriptDirectory: '',
  transcriptPlatform: TRANSCRIPT_PLATFORM.openAi,
  llmModel: LLM_MODELS['gpt-4o'],
  noteFilenamePrefix: 'scribe-{{date}}-',
  recordingFilenamePrefix: 'scribe-recording-{{date}}-',
  dateFilenameFormat: 'YYYY-MM-DD',
  isSaveAudioFileActive: true,
  isOnlyTranscribeActive: false,
};

export async function handleSettingsTab(plugin: ScribePlugin) {
  plugin.addSettingTab(new ScribeSettingsTab(plugin.app, plugin));
}

export class ScribeSettingsTab extends PluginSettingTab {
  plugin: ScribePlugin;
  reactRoot: Root | null;

  constructor(app: App, plugin: ScribePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    this.plugin.loadSettings();

    new Setting(containerEl)
      .setName('Open AI API key')
      .setDesc(
        'You can find this in your OpenAI dev console - https://platform.openai.com/settings',
      )
      .addText((text) =>
        text
          .setPlaceholder('sk-....')
          .setValue(this.plugin.settings.openAiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openAiApiKey = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('AssemblyAI API key')
      .setDesc(
        'You can find this in your AssemblyAI dev console - https://www.assemblyai.com/app/account',
      )
      .addText((text) =>
        text
          .setPlaceholder('c3p0....')
          .setValue(this.plugin.settings.assemblyAiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.assemblyAiApiKey = value;
            await this.plugin.saveSettings();
          }),
      );

    const foldersInVault = this.plugin.app.vault.getAllFolders();

    new Setting(containerEl)
      .setName('Directory for recordings')
      .setDesc('Defaults to your resources folder')
      .addDropdown((component) => {
        component.addOption('', 'Vault folder');
        for (const folder of foldersInVault) {
          const folderName = folder.path ? folder.path : 'Vault Folder';
          component.addOption(folder.path, folderName);
        }
        component.onChange(async (value) => {
          this.plugin.settings.recordingDirectory = value;
          await this.saveSettings();
        });

        component.setValue(this.plugin.settings.recordingDirectory);
      });

    new Setting(containerEl)
      .setName('Directory for transcripts')
      .setDesc('Defaults to your new note folder')
      .addDropdown((component) => {
        component.addOption('', 'Vault folder');
        for (const folder of foldersInVault) {
          const folderName = folder.path === '' ? 'Vault Folder' : folder.path;
          component.addOption(folder.path, folderName);
        }
        component.onChange(async (value) => {
          this.plugin.settings.transcriptDirectory = value;
          await this.saveSettings();
        });

        component.setValue(this.plugin.settings.transcriptDirectory);
      });

    containerEl.createEl('h2', { text: 'Default recording options' });
    new Setting(containerEl)
      .setName('Save audio file')
      .setDesc(
        `Save the audio file after Scribing it. If false, the audio file will be permanently deleted after transcription. This will not affect the Command for "Transcribe existing file"`,
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.isSaveAudioFileActive);
        toggle.onChange(async (value) => {
          this.plugin.settings.isSaveAudioFileActive = value;
          await this.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Only transcribe recording')
      .setDesc(
        'If true, we will only transcribe the recording and not generate anything additional like a summary, insights or a new filename.',
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.isOnlyTranscribeActive);
        toggle.onChange(async (value) => {
          this.plugin.settings.isOnlyTranscribeActive = value;
          await this.saveSettings();
        });
      });

    containerEl.createEl('h2', { text: 'AI model options' });
    new Setting(containerEl)
      .setName('LLM model for creating the summary')
      .addDropdown((component) => {
        for (const model of Object.keys(LLM_MODELS)) {
          component.addOption(model, model);
        }
        component.onChange(async (value: LLM_MODELS) => {
          this.plugin.settings.llmModel = value;
          await this.saveSettings();
        });

        component.setValue(this.plugin.settings.llmModel);
      });

    new Setting(containerEl)
      .setName(
        'Transcript platform:  Your recording is uploaded to this service',
      )
      .addDropdown((component) => {
        for (const platform of Object.keys(TRANSCRIPT_PLATFORM)) {
          component.addOption(platform, platform);
        }
        component.onChange(async (value: TRANSCRIPT_PLATFORM) => {
          this.plugin.settings.transcriptPlatform = value;
          await this.saveSettings();
        });

        component.setValue(this.plugin.settings.transcriptPlatform);
      });

    const reactTestWrapper = containerEl.createDiv({
      cls: 'scribe-settings-react',
    });

    this.reactRoot = createRoot(reactTestWrapper);
    this.reactRoot.render(<ScribeSettings plugin={this.plugin} />);

    new Setting(containerEl).addButton((button) => {
      button.setButtonText('Reset to default');
      button.onClick(async () => {
        this.plugin.settings = {
          ...DEFAULT_SETTINGS,
          openAiApiKey: this.plugin.settings.openAiApiKey,
          assemblyAiApiKey: this.plugin.settings.assemblyAiApiKey,
        };

        this.saveSettings();
        this.display();
      });
    });
  }

  saveSettings() {
    this.plugin.saveSettings();
  }
}

const ScribeSettings: React.FC<{ plugin: ScribePlugin }> = ({ plugin }) => {
  const debouncedSaveSettings = useDebounce(() => {
    plugin.saveSettings();
  }, 700);

  return (
    <div>
      <FileNameSettings plugin={plugin} saveSettings={debouncedSaveSettings} />
    </div>
  );
};
