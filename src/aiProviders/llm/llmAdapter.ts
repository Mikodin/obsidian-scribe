import type { ScribePluginSettings } from 'src/settings/settings';
import { PROCESS_PLATFORM } from 'src/util/consts';
import type { LlmSummary, SummaryOptions } from '../prompts';
import { createAnthropicLlmAdapter } from './anthropicLlm';
import {
  createOpenAiCompatibleLlmAdapter,
  GEMINI_OPENAI_BASE_URL,
  OPENROUTER_BASE_URL,
} from './openAiCompatibleLlm';

export interface LlmAdapter {
  summarizeTranscript(
    transcript: string,
    options: SummaryOptions,
  ): Promise<LlmSummary>;
  fixMermaidChart(
    brokenMermaidChart: string,
  ): Promise<{ mermaidChart: string }>;
}

export interface LlmAdapterConfig {
  platform: PROCESS_PLATFORM;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * Maps the selected process platform to its API key, model, and base URL.
 * Overrides come from per-run ScribeOptions (the modal).
 */
export function resolveLlmConfig(
  settings: ScribePluginSettings,
  overrides?: { platform?: PROCESS_PLATFORM; model?: string },
): LlmAdapterConfig {
  const platform = overrides?.platform ?? settings.processPlatform;

  switch (platform) {
    case PROCESS_PLATFORM.anthropic:
      return {
        platform,
        apiKey: settings.anthropicApiKey,
        model: overrides?.model ?? settings.anthropicModel,
      };
    case PROCESS_PLATFORM.google:
      return {
        platform,
        apiKey: settings.googleApiKey,
        model: overrides?.model ?? settings.geminiModel,
        baseUrl: GEMINI_OPENAI_BASE_URL,
      };
    case PROCESS_PLATFORM.openRouter:
      return {
        platform,
        apiKey: settings.openRouterApiKey,
        model: overrides?.model ?? settings.openRouterModel,
        baseUrl: OPENROUTER_BASE_URL,
      };
    case PROCESS_PLATFORM.customOpenAi:
      return {
        platform,
        apiKey: settings.openAiApiKey,
        model: overrides?.model ?? settings.customChatModel,
        baseUrl: settings.customOpenAiBaseUrl,
      };
    default:
      return {
        platform: PROCESS_PLATFORM.openAi,
        apiKey: settings.openAiApiKey,
        model: overrides?.model ?? settings.llmModel,
      };
  }
}

export function createLlmAdapter(config: LlmAdapterConfig): LlmAdapter {
  if (config.platform === PROCESS_PLATFORM.anthropic) {
    return createAnthropicLlmAdapter(config);
  }
  return createOpenAiCompatibleLlmAdapter(config);
}
