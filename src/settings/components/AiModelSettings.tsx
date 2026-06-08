import { useState } from 'react';
import type ScribePlugin from 'src';
import { LLM_MODELS } from 'src/util/openAiUtils';
import { TRANSCRIPT_PLATFORM } from '../settings';
import { SettingsItem } from './SettingsItem';

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
  const [isDisableLlmTranscription, setIsDisableLlmTranscription] = useState(
    plugin.settings.isDisableLlmTranscription,
  );
  const [useCustomOpenAiBaseUrl, setUseCustomOpenAiBaseUrl] = useState(
    plugin.settings.useCustomOpenAiBaseUrl,
  );
  const [customOpenAiBaseUrl, setCustomOpenAiBaseUrl] = useState(
    plugin.settings.customOpenAiBaseUrl,
  );
  const [customTranscriptModel, setCustomTranscriptModel] = useState(
    plugin.settings.customTranscriptModel,
  );
  const [customChatModel, setCustomChatModel] = useState(
    plugin.settings.customChatModel,
  );

  const handleToggleMultiSpeaker = () => {
    const value = !isMultiSpeakerEnabled;
    setIsMultiSpeakerEnabled(value);
    plugin.settings.isMultiSpeakerEnabled = value;
    saveSettings();
  };

  const handleToggleDisableLlmTranscription = () => {
    const value = !isDisableLlmTranscription;
    setIsDisableLlmTranscription(value);
    plugin.settings.isDisableLlmTranscription = value;
    saveSettings();
  };

  const handleToggleCustomOpenAiBaseUrl = () => {
    const value = !useCustomOpenAiBaseUrl;
    setUseCustomOpenAiBaseUrl(value);
    plugin.settings.useCustomOpenAiBaseUrl = value;
    saveSettings();
  };

  const handleCustomOpenAiBaseUrlChange = (value: string) => {
    setCustomOpenAiBaseUrl(value);
    plugin.settings.customOpenAiBaseUrl = value;
    saveSettings();
  };

  const handleCustomTranscriptModelChange = (value: string) => {
    setCustomTranscriptModel(value);
    plugin.settings.customTranscriptModel = value;
    saveSettings();
  };

  const handleCustomChatModelChange = (value: string) => {
    setCustomChatModel(value);
    plugin.settings.customChatModel = value;
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

      <h3>Custom OpenAI Configuration</h3>
      <SettingsItem
        name="Use custom OpenAI base URL"
        description="Enable this to use a custom OpenAI-compatible API endpoint (e.g., local LLM server, Azure OpenAI, etc.)"
        control={
          <div
            className={`checkbox-container ${useCustomOpenAiBaseUrl ? 'is-enabled' : ''}`}
            onClick={(e) => {
              handleToggleCustomOpenAiBaseUrl();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleToggleCustomOpenAiBaseUrl();
              }
            }}
          >
            <input
              type="checkbox"
              checked={useCustomOpenAiBaseUrl}
              onChange={handleToggleCustomOpenAiBaseUrl}
            />
          </div>
        }
      />

      {useCustomOpenAiBaseUrl && (
        <>
          <SettingsItem
            name="Custom OpenAI base URL"
            description="The base URL for your custom OpenAI-compatible API (e.g., http://localhost:1234/v1, https://your-instance.openai.azure.com/)"
            control={
              <input
                type="text"
                placeholder="http://localhost:1234/v1"
                value={customOpenAiBaseUrl}
                onChange={(e) =>
                  handleCustomOpenAiBaseUrlChange(e.target.value)
                }
                className="text-input"
              />
            }
          />

          <SettingsItem
            name="Custom transcription model"
            description="The model name to use for audio transcription (e.g., whisper-1, faster-whisper, etc.)"
            control={
              <input
                type="text"
                placeholder="whisper-1"
                value={customTranscriptModel}
                onChange={(e) =>
                  handleCustomTranscriptModelChange(e.target.value)
                }
                className="text-input"
              />
            }
          />

          <SettingsItem
            name="Custom chat model"
            description="The model name to use for chat/summarization (e.g., gpt-4, llama-3.1-8b-instruct, etc.)"
            control={
              <input
                type="text"
                placeholder="gpt-4o"
                value={customChatModel}
                onChange={(e) => handleCustomChatModelChange(e.target.value)}
                className="text-input"
              />
            }
          />
        </>
      )}
    </div>
  );
};
