import type ScribePlugin from 'src';
import { useState } from 'react';
import { SettingsItem } from './SettingsItem';
import { set } from 'zod';
import { TRANSCRIPT_PLATFORM } from '../settings';
import { LLM_MODELS } from 'src/util/openAiUtils';
import { LanguageDisplayNames, LanguageOptions } from 'src/util/consts';

export const AiModelSettings: React.FC<{
  plugin: ScribePlugin;
  saveSettings: () => void;
}> = ({ plugin, saveSettings }) => {
  const [transcriptPlatform, setTranscriptPlatform] =
    useState<TRANSCRIPT_PLATFORM>(plugin.settings.transcriptPlatform);
  const [llmModel, setLlmModel] = useState<LLM_MODELS>(
    plugin.settings.llmModel,
  );
  const [isMultiSpeakerEnabled, setIsMultiSpeakerEnabled] = useState(
    plugin.settings.isMultiSpeakerEnabled,
  );

  const handleToggleMultiSpeaker = () => {
    const value = !isMultiSpeakerEnabled;
    setIsMultiSpeakerEnabled(value);
    plugin.settings.isMultiSpeakerEnabled = value;
    saveSettings();
  };

  return (
    <div>
      <h2>AI model options</h2>
      <SettingsItem
        name="Transcript platform"
        description="Your recording is uploaded to this service"
        control={
          <select
            defaultValue={transcriptPlatform}
            className="dropdown"
            onChange={(e) => {
              const value = e.target.value as TRANSCRIPT_PLATFORM;
              setTranscriptPlatform(value);
              plugin.settings.transcriptPlatform = value;
              saveSettings();
            }}
          >
            <option value={TRANSCRIPT_PLATFORM.openAi}>OpenAi</option>
            <option value={TRANSCRIPT_PLATFORM.assemblyAi}>AssemblyAI</option>
          </select>
        }
      />

      {transcriptPlatform === TRANSCRIPT_PLATFORM.assemblyAi && (
        <SettingsItem
          name="Multi-speaker enabled"
          description="Enable this if you have multiple speakers in your recording"
          control={
            <div
              className={`checkbox-container ${isMultiSpeakerEnabled ? 'is-enabled' : ''}`}
              onClick={(e) => {
                handleToggleMultiSpeaker();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleToggleMultiSpeaker();
                }
              }}
            >
              <input
                type="checkbox"
                checked={isMultiSpeakerEnabled}
                onChange={handleToggleMultiSpeaker}
              />
            </div>
          }
        />
      )}
      <SettingsItem
        name="Spoken language"
        description="The default spoken language for audio transcription, changing from auto may increase accuracy"
        control={
          <select
            defaultValue={plugin.settings.audioFileLanguage}
            className="dropdown"
            onChange={(e) => {
              const value = e.target.value;
              plugin.settings.audioFileLanguage = value as LanguageOptions;
              saveSettings();
            }}
          >
            {Object.keys(LanguageOptions).map((lang) => (
              <option key={lang} value={lang}>
                {LanguageDisplayNames[lang as LanguageOptions]}
              </option>
            ))}
          </select>
        }
      />

      <SettingsItem
        name="LLM model for creating the summary"
        description="The transcript is sent to this service"
        control={
          <select
            defaultValue={llmModel}
            className="dropdown"
            onChange={(e) => {
              const value = e.target.value as LLM_MODELS;
              setLlmModel(value);
              plugin.settings.llmModel = value;
              saveSettings();
            }}
          >
            {Object.keys(LLM_MODELS).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        }
      />
    </div>
  );
};
