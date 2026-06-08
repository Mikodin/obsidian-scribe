import { LLM_MODELS as GOOGLE_MODELS } from 'src/util/geminiAiUtils';
import { LLM_MODELS } from 'src/util/openAiUtils';
import {
  SettingsInput,
  SettingsSelect,
  SettingsToggle,
} from '../components/SettingsControl';
import type { RegisterOptions } from '../hooks/useSettingsForm';
import type { ScribePluginSettings } from '../settings';

const GoogleModelMapping = Object.values(GOOGLE_MODELS).map((model) => ({
  value: model,
  displayName: model,
}));

const OpenAiModelMapping = Object.values(LLM_MODELS).map((model) => ({
  value: model,
  displayName: model,
}));

type RegisterFn = <K extends keyof ScribePluginSettings>(
  id: K,
  options?: RegisterOptions<K>,
) => {
  onChange: (value: ScribePluginSettings[K]) => void;
  value: ScribePluginSettings[K];
  id: K;
};

type SettingsSectionProps = {
  register: RegisterFn;
};

export function CustomOpenAiProcessingSettings({
  register,
}: SettingsSectionProps) {
  return (
    <>
      <SettingsInput
        {...register('openAiApiKey')}
        name="API key"
        description="Your api key"
        placeholder="sk-..."
      />
      <SettingsInput
        {...register('customOpenAiBaseUrl')}
        name="Custom OpenAI base URL"
        description="The base URL for your custom OpenAI-compatible API (e.g., http://localhost:1234/v1, https://your-instance.openai.azure.com/)"
      />
      <SettingsInput
        {...register('customChatModel')}
        name="Custom processing model"
        description="The model name to use for chat/summarization (e.g., gpt-4, llama-3.1-8b-instruct, etc.)"
        placeholder="gpt-4o"
      />
    </>
  );
}

export function GeminiProcessingSettings({ register }: SettingsSectionProps) {
  return (
    <>
      <SettingsInput
        {...register('googleAiApiKey')}
        name="Google AI API key"
        placeholder="AIza..."
      />
      <SettingsSelect
        {...register('googleModel')}
        name="Google AI model for creating the summary"
        valuesMapping={GoogleModelMapping}
      />
    </>
  );
}

export function OpenAiProcessingSettings({ register }: SettingsSectionProps) {
  return (
    <>
      <SettingsInput
        {...register('openAiApiKey')}
        name="OpenAI API key"
        description="You can find this in your OpenAI dev console - https://platform.openai.com/settings"
        placeholder="sk-..."
      />
      <SettingsSelect
        {...register('llmModel')}
        name="OpenAI model for creating the summary"
        valuesMapping={OpenAiModelMapping}
      />
    </>
  );
}

export function AssemblyTranscriptSettings({ register }: SettingsSectionProps) {
  return (
    <>
      <SettingsInput
        {...register('assemblyAiApiKey')}
        name="AssemblyAI API key"
        description="You can find this in your AssemblyAI dev console - https://www.assemblyai.com/app/account"
        placeholder="c3p0..."
      />
      <SettingsToggle
        {...register('isMultiSpeakerEnabled')}
        name="Multi-speaker enabled"
        description="Enable this if you have multiple speakers in your recording"
      />
    </>
  );
}

export function CustomOpenAiTranscriptSettings({
  register,
}: SettingsSectionProps) {
  // TODO Implement customOpenAi Transcription API Input
  return (
    <>
      <SettingsInput
        {...register('openAiApiKey')}
        name="OpenAI API key"
        description="You can find this in your OpenAI dev console - https://platform.openai.com/settings"
        placeholder="sk-..."
      />
      <SettingsInput
        {...register('customTranscriptModel')}
        name="Custom transcription model"
        description="The model name to use for audio transcription (e.g., whisper-1, faster-whisper, etc.)"
        placeholder="whisper-1"
      />
      <SettingsInput
        {...register('customOpenAiBaseUrl')}
        name="Custom OpenAI base URL"
        description="The base URL for your custom OpenAI-compatible API (e.g., http://localhost:1234/v1, https://your-instance.openai.azure.com/)"
      />
    </>
  );
}
export function OpenAiTranscriptSettings({ register }: SettingsSectionProps) {
  // TODO Implement OpenAi Transcription API Input
  // TODO Implement transcription model selection
  return (
    <>
      <SettingsInput
        {...register('openAiApiKey')}
        name="OpenAI API key"
        description="You can find this in your OpenAI dev console - https://platform.openai.com/settings"
        placeholder="sk-..."
      />
    </>
  );
}
