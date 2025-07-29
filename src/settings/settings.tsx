import { type App, Notice, PluginSettingTab, Setting, moment } from 'obsidian';
import { createRoot, type Root } from 'react-dom/client';
import { useDebounce } from 'src/util/useDebounce';

import type ScribePlugin from 'src';

import { LLM_MODELS } from 'src/util/openAiUtils';

import { FileNameSettings } from './components/FileNameSettings';
import { AiModelSettings } from './components/AiModelSettings';
import { AudioDeviceSettings } from './components/AudioDeviceSettings';
import { LanguageOptions, type OutputLanguageOptions } from 'src/util/consts';
import {
  DEFAULT_TEMPLATE,
  type ScribeTemplate,
  NoteTemplateSettings,
} from './components/NoteTemplateSettings';
import { getDefaultPathSettings } from 'src/util/pathUtils';

export enum TRANSCRIPT_PLATFORM {
  assemblyAi = 'assemblyAi',
  openAi = 'openAi',
}

export enum OBSIDIAN_PATHS {
  noteFolder = 'matchObsidianNoteFolder',
  resourceFolder = 'matchObsidianResourceFolder',
}
export interface ScribePluginSettings {
  assemblyAiApiKey: string;
  openAiApiKey: string;
  recordingDirectory: string;
  transcriptDirectory: string;
  transcriptPlatform: TRANSCRIPT_PLATFORM;
  isMultiSpeakerEnabled: boolean;
  llmModel: LLM_MODELS;
  recordingFilenamePrefix: string;
  noteFilenamePrefix: string;
  dateFilenameFormat: string;
  isSaveAudioFileActive: boolean;
  isOnlyTranscribeActive: boolean;
  isAppendToActiveFile: boolean;
  audioFileLanguage: LanguageOptions;
  scribeOutputLanguage: OutputLanguageOptions;
  activeNoteTemplate: ScribeTemplate;
  noteTemplates: ScribeTemplate[];
  isFrontMatterLinkToScribe: boolean;
  selectedAudioDeviceId: string;
  audioFileFormat: 'webm' | 'mp3';
}

export const DEFAULT_SETTINGS: ScribePluginSettings = {
  assemblyAiApiKey: '',
  openAiApiKey: '',
  recordingDirectory: OBSIDIAN_PATHS.resourceFolder,
  transcriptDirectory: OBSIDIAN_PATHS.noteFolder,
  transcriptPlatform: TRANSCRIPT_PLATFORM.openAi,
  isMultiSpeakerEnabled: false,
  llmModel: LLM_MODELS['gpt-4o'],
  noteFilenamePrefix: 'scribe-{{date}}-',
  recordingFilenamePrefix: 'scribe-recording-{{date}}',
  dateFilenameFormat: 'YYYY-MM-DD',
  isSaveAudioFileActive: true,
  isOnlyTranscribeActive: false,
  isAppendToActiveFile: false,
  audioFileLanguage: LanguageOptions.auto,
  scribeOutputLanguage: LanguageOptions.en,
  activeNoteTemplate: DEFAULT_TEMPLATE,
  noteTemplates: [DEFAULT_TEMPLATE],
  isFrontMatterLinkToScribe: true,
  selectedAudioDeviceId: '',
  audioFileFormat: 'webm',
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
        component.addOption(
          OBSIDIAN_PATHS.resourceFolder,
          'Obsidian resource folder',
        );
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
      .addDropdown(async (component) => {
        const defaultPathSettings = await getDefaultPathSettings(this.plugin);

        component.addOption('', 'Vault folder');
        component.addOption(OBSIDIAN_PATHS.noteFolder, 'Obsidian note folder');
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
      .setName('Audio file format')
      .setDesc(
        'Choose the format for saving audio recordings. MP3 format will be converted from WebM on the client side.',
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption('webm', 'WebM')
          .addOption('mp3', 'MP3')
          .setValue(this.plugin.settings.audioFileFormat)
          .onChange(async (value: 'webm' | 'mp3') => {
            this.plugin.settings.audioFileFormat = value;
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

    new Setting(containerEl)
      .setName('Append to active file by default')
      .setDesc(
        'If true, the default behavior will be to append the transcription to the active file. If false, it will create a new note with the transcription.',
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.isAppendToActiveFile);
        toggle.onChange(async (value) => {
          this.plugin.settings.isAppendToActiveFile = value;
          await this.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Link to Scribe in "created_by" frontmatter')
      .setDesc(
        'If true, we will add a link to the Scribe in the frontmatter of the note.  This is useful for knowing which notes were created by Scribe.',
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.isFrontMatterLinkToScribe);
        toggle.onChange(async (value) => {
          this.plugin.settings.isFrontMatterLinkToScribe = value;
          await this.saveSettings();
        });
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
  }, 500);

  return (
    <div>
      <AudioDeviceSettings plugin={plugin} saveSettings={debouncedSaveSettings} />
      <AiModelSettings plugin={plugin} saveSettings={debouncedSaveSettings} />
      <FileNameSettings plugin={plugin} saveSettings={debouncedSaveSettings} />
      <NoteTemplateSettings
        plugin={plugin}
        saveSettings={debouncedSaveSettings}
      />
    </div>
  );
};
