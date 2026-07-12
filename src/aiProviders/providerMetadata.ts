import type { ScribePluginSettings } from 'src/settings/settings';
import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from 'src/util/consts';
import { ANTHROPIC_MODELS } from './llm/anthropicLlm';
import { GEMINI_MODELS, LLM_MODELS } from './llm/openAiCompatibleLlm';

const GOOGLE_PRIVACY: ProviderPrivacyInfo = {
  retentionSummary:
    'Paid tier: retained ~55 days for abuse monitoring, not used for training. Free tier: Google may use your data to improve its products',
  trainsOnApiData: 'no',
  policyUrl: 'https://ai.google.dev/gemini-api/terms',
};

export interface ProviderPrivacyInfo {
  retentionSummary: string;
  trainsOnApiData: 'yes' | 'no' | 'opt-out';
  policyUrl: string;
}

export interface ProviderMetadata {
  displayName: string;
  apiKeySettingsField: keyof ScribePluginSettings;
  keyConsoleUrl: string;
  /** undefined ⇒ the model is a free-text settings field */
  models?: readonly string[];
  /** transcription providers only */
  supportsDiarization?: boolean;
  /** null ⇒ privacy depends on a user-configured endpoint */
  privacy: ProviderPrivacyInfo | null;
}

/**
 * Privacy summaries are point-in-time snapshots (verified July 2026) —
 * policies drift, so the UI shows a "check the provider's policy" disclaimer.
 */
export const TRANSCRIPT_PROVIDERS: Record<
  TRANSCRIPT_PLATFORM,
  ProviderMetadata
> = {
  [TRANSCRIPT_PLATFORM.openAi]: {
    displayName: 'OpenAI Whisper',
    apiKeySettingsField: 'openAiApiKey',
    keyConsoleUrl: 'https://platform.openai.com/settings',
    supportsDiarization: false,
    privacy: {
      retentionSummary:
        'API audio/text retained up to 30 days for abuse monitoring, then deleted',
      trainsOnApiData: 'no',
      policyUrl: 'https://openai.com/enterprise-privacy/',
    },
  },
  [TRANSCRIPT_PLATFORM.assemblyAi]: {
    displayName: 'AssemblyAI',
    apiKeySettingsField: 'assemblyAiApiKey',
    keyConsoleUrl: 'https://www.assemblyai.com/app/account',
    supportsDiarization: true,
    privacy: {
      retentionSummary:
        'Uploaded audio deleted within ~24–48h; transcripts retained until you delete them',
      trainsOnApiData: 'opt-out',
      policyUrl:
        'https://www.assemblyai.com/docs/faq/what-is-your-data-retention-policy',
    },
  },
  [TRANSCRIPT_PLATFORM.elevenLabs]: {
    displayName: 'ElevenLabs Scribe',
    apiKeySettingsField: 'elevenLabsApiKey',
    keyConsoleUrl: 'https://elevenlabs.io/app/settings/api-keys',
    supportsDiarization: true,
    privacy: {
      retentionSummary:
        'Retained per workspace settings; Zero Retention Mode available',
      trainsOnApiData: 'no',
      policyUrl:
        'https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode',
    },
  },
  [TRANSCRIPT_PLATFORM.deepgram]: {
    displayName: 'Deepgram Nova-3',
    apiKeySettingsField: 'deepgramApiKey',
    keyConsoleUrl: 'https://console.deepgram.com',
    supportsDiarization: true,
    privacy: {
      retentionSummary:
        'Retained for service operation; no training on your data unless you opt in',
      trainsOnApiData: 'no',
      policyUrl: 'https://deepgram.com/privacy',
    },
  },
  [TRANSCRIPT_PLATFORM.mistral]: {
    displayName: 'Mistral Voxtral',
    apiKeySettingsField: 'mistralApiKey',
    keyConsoleUrl: 'https://console.mistral.ai/api-keys',
    supportsDiarization: false,
    privacy: {
      retentionSummary:
        'API data retained ~30 days for abuse monitoring, then deleted',
      trainsOnApiData: 'no',
      policyUrl: 'https://mistral.ai/terms',
    },
  },
  [TRANSCRIPT_PLATFORM.google]: {
    displayName: 'Google (Gemini)',
    apiKeySettingsField: 'googleApiKey',
    keyConsoleUrl: 'https://aistudio.google.com/apikey',
    supportsDiarization: true,
    privacy: GOOGLE_PRIVACY,
  },
  [TRANSCRIPT_PLATFORM.customOpenAi]: {
    displayName: 'Custom (OpenAI-compatible)',
    apiKeySettingsField: 'openAiApiKey',
    keyConsoleUrl: 'https://platform.openai.com/settings',
    supportsDiarization: false,
    privacy: null,
  },
};

export const LLM_PROVIDERS: Record<PROCESS_PLATFORM, ProviderMetadata> = {
  [PROCESS_PLATFORM.openAi]: {
    displayName: 'OpenAI',
    apiKeySettingsField: 'openAiApiKey',
    keyConsoleUrl: 'https://platform.openai.com/settings',
    models: Object.values(LLM_MODELS),
    privacy: {
      retentionSummary:
        'API data retained up to 30 days for abuse monitoring, then deleted',
      trainsOnApiData: 'no',
      policyUrl: 'https://openai.com/enterprise-privacy/',
    },
  },
  [PROCESS_PLATFORM.anthropic]: {
    displayName: 'Anthropic (Claude)',
    apiKeySettingsField: 'anthropicApiKey',
    keyConsoleUrl: 'https://console.anthropic.com/settings/keys',
    models: Object.values(ANTHROPIC_MODELS),
    privacy: {
      retentionSummary:
        'API data retained short-term (days, not months) unless flagged for trust & safety',
      trainsOnApiData: 'no',
      policyUrl: 'https://privacy.anthropic.com',
    },
  },
  [PROCESS_PLATFORM.google]: {
    displayName: 'Google (Gemini)',
    apiKeySettingsField: 'googleApiKey',
    keyConsoleUrl: 'https://aistudio.google.com/apikey',
    models: Object.values(GEMINI_MODELS),
    privacy: GOOGLE_PRIVACY,
  },
  [PROCESS_PLATFORM.openRouter]: {
    displayName: 'OpenRouter',
    apiKeySettingsField: 'openRouterApiKey',
    keyConsoleUrl: 'https://openrouter.ai/keys',
    privacy: {
      retentionSummary:
        'OpenRouter stores metadata only by default; retention/training depends on the routed provider',
      trainsOnApiData: 'no',
      policyUrl: 'https://openrouter.ai/docs/features/privacy-and-logging',
    },
  },
  [PROCESS_PLATFORM.assemblyAi]: {
    displayName: 'AssemblyAI (LLM Gateway)',
    apiKeySettingsField: 'assemblyAiApiKey',
    keyConsoleUrl: 'https://www.assemblyai.com/app/account',
    privacy: {
      retentionSummary:
        'Routed through AssemblyAI to the selected model provider; retention/training depend on that provider and your AssemblyAI settings',
      trainsOnApiData: 'opt-out',
      policyUrl:
        'https://www.assemblyai.com/docs/faq/what-is-your-data-retention-policy',
    },
  },
  [PROCESS_PLATFORM.customOpenAi]: {
    displayName: 'Custom (OpenAI-compatible)',
    apiKeySettingsField: 'openAiApiKey',
    keyConsoleUrl: 'https://platform.openai.com/settings',
    privacy: null,
  },
};

export interface MissingApiKey {
  provider: string;
  consoleUrl: string;
}

/**
 * Returns the providers whose API key is missing, scoped to the selected
 * platforms. Pass overrides when per-run options differ from settings.
 */
export function getMissingApiKeys(
  settings: ScribePluginSettings,
  platforms?: {
    transcriptPlatform?: TRANSCRIPT_PLATFORM;
    processPlatform?: PROCESS_PLATFORM;
  },
): MissingApiKey[] {
  const selected = [
    TRANSCRIPT_PROVIDERS[
      platforms?.transcriptPlatform ?? settings.transcriptPlatform
    ],
    LLM_PROVIDERS[platforms?.processPlatform ?? settings.processPlatform],
  ];

  const missing: MissingApiKey[] = [];
  const seenFields = new Set<string>();

  for (const provider of selected) {
    const field = provider.apiKeySettingsField;
    if (seenFields.has(field)) {
      continue;
    }
    seenFields.add(field);

    if (!settings[field]) {
      missing.push({
        provider: provider.displayName,
        consoleUrl: provider.keyConsoleUrl,
      });
    }
  }

  return missing;
}
