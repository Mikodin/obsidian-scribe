import { type App, PluginSettingTab, Setting } from 'obsidian';
import { type Root, createRoot } from 'react-dom/client';
import { useDebounce } from 'src/util/useDebounce';

import type ScribePlugin from 'src';

import { LLM_MODELS } from 'src/util/openAiUtils';

import { useState } from 'react';
import { LanguageOptions, type OutputLanguageOptions } from 'src/util/consts';
import GeneralSettingsTab from './GeneralSettingsTab';
import ProviderSettingsTab from './ProviderSettingsTab';
import { AiModelSettings } from './components/AiModelSettings';
import {
  DEFAULT_TEMPLATE,
  NoteTemplateSettings,
  type ScribeTemplate,
} from './components/NoteTemplateSettings';
import { SettingsFormProvider } from './provider/SettingsFormProvider';

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
  isDisableLlmTranscription: boolean;
  audioFileLanguage: LanguageOptions;
  scribeOutputLanguage: OutputLanguageOptions;
  activeNoteTemplate: ScribeTemplate;
  noteTemplates: ScribeTemplate[];
  isFrontMatterLinkToScribe: boolean;
  selectedAudioDeviceId: string;
  audioFileFormat: 'webm' | 'mp3';
  // Custom OpenAI settings
  useCustomOpenAiBaseUrl: boolean;
  customOpenAiBaseUrl: string;
  customTranscriptModel: string;
  customChatModel: string;
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
  isDisableLlmTranscription: false,
  audioFileLanguage: LanguageOptions.auto,
  scribeOutputLanguage: LanguageOptions.en,
  activeNoteTemplate: DEFAULT_TEMPLATE,
  noteTemplates: [DEFAULT_TEMPLATE],
  isFrontMatterLinkToScribe: true,
  selectedAudioDeviceId: '',
  audioFileFormat: 'webm',
  // Custom OpenAI settings
  useCustomOpenAiBaseUrl: false,
  customOpenAiBaseUrl: '',
  customTranscriptModel: 'whisper-1',
  customChatModel: 'gpt-4o',
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

    const reactWrapper = containerEl.createDiv({
      cls: 'scribe-settings-react',
    });

    this.reactRoot = createRoot(reactWrapper);
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
  const [selectedTab, setSelectedTab] = useState<SettingsTabsId>(
    SettingsTabsId.GENERAL,
  );
  const debouncedSaveSettings = useDebounce(() => {
    plugin.saveSettings();
  }, 500);

  const handleTabSelect = (tabId: SettingsTabsId) => {
    setSelectedTab(tabId);
  };

  return (
    <SettingsFormProvider plugin={plugin}>
      <div>
        <nav role="tabpanel">
          {settingsTabs.map((tab) => (
            <Tab
              onSelect={() => handleTabSelect(tab.id)}
              selected={tab.id === selectedTab}
              key={tab.id}
            >
              {tab.name}
            </Tab>
          ))}
        </nav>
        {(() => {
          switch (selectedTab) {
            case SettingsTabsId.GENERAL:
              return <GeneralSettingsTab />;
            case SettingsTabsId.AI_PROVIDERS:
              return (
                <>
                  <ProviderSettingsTab />
                  <AiModelSettings
                    plugin={plugin}
                    saveSettings={debouncedSaveSettings}
                  />
                </>
              );
            case SettingsTabsId.TEMPLATES:
              return (
                <NoteTemplateSettings
                  plugin={plugin}
                  saveSettings={debouncedSaveSettings}
                />
              );
            default:
              return <span>No tab selected</span>;
          }
        })()}
      </div>
    </SettingsFormProvider>
  );
};

enum SettingsTabsId {
  GENERAL = 'general',
  AI_PROVIDERS = 'ai-providers',
  TEMPLATES = 'templates',
}

const settingsTabs = [
  {
    name: 'General',
    id: SettingsTabsId.GENERAL,
  },
  {
    name: 'AI Providers',
    id: SettingsTabsId.AI_PROVIDERS,
  },
  {
    name: 'Templates',
    id: SettingsTabsId.TEMPLATES,
  },
];

const Tab: React.FC<{
  onSelect: () => void;
  children: string;
  selected?: boolean;
}> = ({ onSelect, selected, children }) => {
  return (
    <button
      onClick={onSelect}
      className="settings-tab scribe"
      type="button"
      aria-selected={selected}
      role="tab"
    >
      {children}
    </button>
  );
};
