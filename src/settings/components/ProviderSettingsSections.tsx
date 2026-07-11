import { ANTHROPIC_MODELS } from 'src/aiProviders/llm/anthropicLlm';
import {
  GEMINI_MODELS,
  LLM_MODELS,
} from 'src/aiProviders/llm/openAiCompatibleLlm';
import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from 'src/util/consts';
import useOpenRouterModelIds from '../hooks/useOpenRouterModelIds';
import useSettingsForm from '../hooks/useSettingsForm';
import {
  SettingsCombobox,
  SettingsInput,
  SettingsSelect,
  SettingsToggle,
} from './SettingsControl';

/**
 * Per-provider settings sections. API keys live inside the section for the
 * selected provider; fields shared between providers (openAiApiKey, custom
 * endpoint fields) bind to the same settings entry, so edits stay in sync.
 */

export function TranscriptProviderSection({
  platform,
}: {
  platform: TRANSCRIPT_PLATFORM;
}) {
  switch (platform) {
    case TRANSCRIPT_PLATFORM.assemblyAi:
      return (
        <>
          <AssemblyAiApiKeyInput />
          <MultiSpeakerToggle />
        </>
      );
    case TRANSCRIPT_PLATFORM.elevenLabs:
      return (
        <>
          <ElevenLabsApiKeyInput />
          <MultiSpeakerToggle />
        </>
      );
    case TRANSCRIPT_PLATFORM.deepgram:
      return (
        <>
          <DeepgramApiKeyInput />
          <MultiSpeakerToggle />
        </>
      );
    case TRANSCRIPT_PLATFORM.mistral:
      return <MistralApiKeyInput />;
    case TRANSCRIPT_PLATFORM.google:
      return (
        <>
          <GoogleApiKeyInput />
          <MultiSpeakerToggle />
        </>
      );
    case TRANSCRIPT_PLATFORM.customOpenAi:
      return (
        <>
          <OpenAiApiKeyInput />
          <CustomBaseUrlInput />
          <CustomTranscriptModelInput />
        </>
      );
    default:
      return <OpenAiApiKeyInput />;
  }
}

export function LlmProviderSection({
  platform,
}: {
  platform: PROCESS_PLATFORM;
}) {
  switch (platform) {
    case PROCESS_PLATFORM.anthropic:
      return (
        <>
          <AnthropicApiKeyInput />
          <AnthropicModelSelect />
        </>
      );
    case PROCESS_PLATFORM.google:
      return (
        <>
          <GoogleApiKeyInput />
          <GeminiModelSelect />
        </>
      );
    case PROCESS_PLATFORM.openRouter:
      return (
        <>
          <OpenRouterApiKeyInput />
          <OpenRouterModelInput />
        </>
      );
    case PROCESS_PLATFORM.customOpenAi:
      return (
        <>
          <OpenAiApiKeyInput />
          <CustomBaseUrlInput />
          <CustomChatModelInput />
        </>
      );
    default:
      return (
        <>
          <OpenAiApiKeyInput />
          <OpenAiModelSelect />
        </>
      );
  }
}

function OpenAiApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('openAiApiKey')}
      name="OpenAI API key"
      description="You can find this in your OpenAI dev console - https://platform.openai.com/settings"
      placeholder="sk-..."
    />
  );
}

function AssemblyAiApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('assemblyAiApiKey')}
      name="AssemblyAI API key"
      description="You can find this in your AssemblyAI dev console - https://www.assemblyai.com/app/account"
      placeholder="c3p0..."
    />
  );
}

function AnthropicApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('anthropicApiKey')}
      name="Anthropic API key"
      description="You can find this in the Anthropic console - https://console.anthropic.com/settings/keys"
      placeholder="sk-ant-..."
    />
  );
}

function GoogleApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('googleApiKey')}
      name="Google API key"
      description="You can find this in Google AI Studio - https://aistudio.google.com/apikey"
      placeholder="AIza..."
    />
  );
}

function OpenRouterApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('openRouterApiKey')}
      name="OpenRouter API key"
      description="You can find this in your OpenRouter settings - https://openrouter.ai/keys"
      placeholder="sk-or-..."
    />
  );
}

function ElevenLabsApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('elevenLabsApiKey')}
      name="ElevenLabs API key"
      description="You can find this in your ElevenLabs settings - https://elevenlabs.io/app/settings/api-keys"
      placeholder="xi-..."
    />
  );
}

function DeepgramApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('deepgramApiKey')}
      name="Deepgram API key"
      description="You can find this in your Deepgram console - https://console.deepgram.com"
      placeholder="dg-..."
    />
  );
}

function MistralApiKeyInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('mistralApiKey')}
      name="Mistral API key"
      description="You can find this in your Mistral console - https://console.mistral.ai/api-keys"
      placeholder="..."
    />
  );
}

function MultiSpeakerToggle() {
  const { register } = useSettingsForm();
  return (
    <SettingsToggle
      {...register('isMultiSpeakerEnabled')}
      name="Multi-speaker enabled"
      description="Enable this if you have multiple speakers in your recording"
    />
  );
}

function OpenAiModelSelect() {
  const { register } = useSettingsForm();
  return (
    <SettingsSelect
      {...register('llmModel')}
      name="LLM model for creating the summary"
      description="The transcript is sent to this model"
      valuesMapping={Object.values(LLM_MODELS).map((model) => ({
        displayName: model,
        value: model,
      }))}
    />
  );
}

function AnthropicModelSelect() {
  const { register } = useSettingsForm();
  return (
    <SettingsSelect
      {...register('anthropicModel')}
      name="Claude model for creating the summary"
      description="The transcript is sent to this model"
      valuesMapping={Object.values(ANTHROPIC_MODELS).map((model) => ({
        displayName: model,
        value: model,
      }))}
    />
  );
}

function GeminiModelSelect() {
  const { register } = useSettingsForm();
  return (
    <SettingsSelect
      {...register('geminiModel')}
      name="Gemini model for creating the summary"
      description="The transcript is sent to this model"
      valuesMapping={Object.values(GEMINI_MODELS).map((model) => ({
        displayName: model,
        value: model,
      }))}
    />
  );
}

function OpenRouterModelInput() {
  const { register } = useSettingsForm();
  const modelIds = useOpenRouterModelIds();
  return (
    <SettingsCombobox
      {...register('openRouterModel')}
      name="OpenRouter model"
      description="Type to search the OpenRouter catalog, or enter any model id from https://openrouter.ai/models"
      placeholder="anthropic/claude-sonnet-5"
      options={modelIds}
    />
  );
}

function CustomBaseUrlInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('customOpenAiBaseUrl')}
      name="Custom base URL"
      description="The base URL for your OpenAI-compatible API (e.g., http://localhost:1234/v1, https://your-instance.openai.azure.com/)"
      placeholder="http://localhost:1234/v1"
    />
  );
}

function CustomTranscriptModelInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('customTranscriptModel')}
      name="Custom transcription model"
      description="The model name to use for audio transcription (e.g., whisper-1, faster-whisper, etc.)"
      placeholder="whisper-1"
    />
  );
}

function CustomChatModelInput() {
  const { register } = useSettingsForm();
  return (
    <SettingsInput
      {...register('customChatModel')}
      name="Custom chat model"
      description="The model name to use for chat/summarization (e.g., gpt-5.6-terra, llama-3.1-8b-instruct, etc.)"
      placeholder="gpt-5.6-terra"
    />
  );
}
