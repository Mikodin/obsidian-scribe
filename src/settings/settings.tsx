import { type App, PluginSettingTab, Setting } from 'obsidian';
import { type Root, createRoot } from 'react-dom/client';
import { useDebounce } from 'src/util/useDebounce';

import type ScribePlugin from 'src';

import {
  type ANTHROPIC_MODELS,
  DEFAULT_ANTHROPIC_MODEL,
} from 'src/aiProviders/llm/anthropicLlm';
import {
  DEFAULT_ASSEMBLYAI_LLM_MODEL,
  DEFAULT_GEMINI_MODEL,
  type GEMINI_MODELS,
  LLM_MODELS,
} from 'src/aiProviders/llm/openAiCompatibleLlm';

import { useState } from 'react';
import {
  LanguageOptions,
  type OutputLanguageOptions,
  PROCESS_PLATFORM,
  TRANSCRIPT_PLATFORM,
} from 'src/util/consts';
import GeneralSettingsTab from './GeneralSettingsTab';
import ProviderSettingsTab from './ProviderSettingsTab';
import {
  DEFAULT_TEMPLATE,
  NoteTemplateSettings,
  type ScribeTemplate,
} from './components/NoteTemplateSettings';
import { SettingsFormProvider } from './provider/SettingsFormProvider';

export const OBSIDIAN_PATHS = {
  noteFolder: 'matchObsidianNoteFolder',
  resourceFolder: 'matchObsidianResourceFolder',
} as const;
export interface ScribePluginSettings {
  assemblyAiApiKey: string;
  openAiApiKey: string;
  anthropicApiKey: string;
  googleApiKey: string;
  openRouterApiKey: string;
  elevenLabsApiKey: string;
  deepgramApiKey: string;
  mistralApiKey: string;
  recordingDirectory: string;
  transcriptDirectory: string;
  transcriptPlatform: TRANSCRIPT_PLATFORM;
  processPlatform: PROCESS_PLATFORM;
  isMultiSpeakerEnabled: boolean;
  llmModel: LLM_MODELS;
  anthropicModel: ANTHROPIC_MODELS;
  geminiModel: GEMINI_MODELS;
  openRouterModel: string;
  assemblyAiLlmModel: string;
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
  // Custom OpenAI-compatible endpoint settings.
  // Transcription and summarization each get their own endpoint + key so a
  // local Whisper server and a separate chat server can be used together.
  customTranscriptBaseUrl: string;
  customTranscriptApiKey: string;
  customTranscriptModel: string;
  customChatBaseUrl: string;
  customChatApiKey: string;
  customChatModel: string;
}

export const DEFAULT_SETTINGS: ScribePluginSettings = {
  assemblyAiApiKey: '',
  openAiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: '',
  openRouterApiKey: '',
  elevenLabsApiKey: '',
  deepgramApiKey: '',
  mistralApiKey: '',
  recordingDirectory: OBSIDIAN_PATHS.resourceFolder,
  transcriptDirectory: OBSIDIAN_PATHS.noteFolder,
  transcriptPlatform: TRANSCRIPT_PLATFORM.openAi,
  processPlatform: PROCESS_PLATFORM.openAi,
  isMultiSpeakerEnabled: false,
  llmModel: LLM_MODELS['gpt-5.6-terra'],
  anthropicModel: DEFAULT_ANTHROPIC_MODEL,
  geminiModel: DEFAULT_GEMINI_MODEL,
  openRouterModel: 'anthropic/claude-sonnet-5',
  assemblyAiLlmModel: DEFAULT_ASSEMBLYAI_LLM_MODEL,
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
  // Custom OpenAI-compatible endpoint settings
  customTranscriptBaseUrl: '',
  customTranscriptApiKey: '',
  customTranscriptModel: 'whisper-1',
  customChatBaseUrl: '',
  customChatApiKey: '',
  customChatModel: 'gpt-4o',
};

export function handleSettingsTab(plugin: ScribePlugin) {
  plugin.addSettingTab(new ScribeSettingsTab(plugin.app, plugin));
}

export class ScribeSettingsTab extends PluginSettingTab {
  plugin: ScribePlugin;
  reactRoot: Root | null = null;

  constructor(app: App, plugin: ScribePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    void this.plugin.loadSettings();

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
          anthropicApiKey: this.plugin.settings.anthropicApiKey,
          googleApiKey: this.plugin.settings.googleApiKey,
          openRouterApiKey: this.plugin.settings.openRouterApiKey,
          elevenLabsApiKey: this.plugin.settings.elevenLabsApiKey,
          deepgramApiKey: this.plugin.settings.deepgramApiKey,
          mistralApiKey: this.plugin.settings.mistralApiKey,
          customTranscriptApiKey: this.plugin.settings.customTranscriptApiKey,
          customChatApiKey: this.plugin.settings.customChatApiKey,
        };

        this.saveSettings();
        this.display();
      });
    });
  }

  saveSettings() {
    void this.plugin.saveSettings();
  }
}

const ScribeSettings: React.FC<{ plugin: ScribePlugin }> = ({ plugin }) => {
  const [selectedTab, setSelectedTab] = useState<SettingsTabsId>(
    SettingsTabsId.GENERAL,
  );
  const debouncedSaveSettings = useDebounce(() => {
    void plugin.saveSettings();
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
              return <ProviderSettingsTab />;
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
