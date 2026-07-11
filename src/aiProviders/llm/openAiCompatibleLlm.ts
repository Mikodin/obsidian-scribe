import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { PROCESS_PLATFORM } from 'src/util/consts';
import { obsidianFetch } from 'src/util/obsidianFetch';
import {
  buildMermaidFixPrompt,
  buildSummaryExtraInstructions,
  buildSummarySystemPrompt,
  buildSummaryZodSchema,
  type LlmSummary,
  MERMAID_FIX_SCHEMA,
  type SummaryOptions,
} from '../prompts';
import type { LlmAdapter, LlmAdapterConfig } from './llmAdapter';

export enum LLM_MODELS {
  'gpt-5.6-sol' = 'gpt-5.6-sol',
  'gpt-5.6-terra' = 'gpt-5.6-terra',
  'gpt-5.6-luna' = 'gpt-5.6-luna',
  'gpt-5.5' = 'gpt-5.5',
  'gpt-5.1' = 'gpt-5.1',
  'gpt-5' = 'gpt-5',
  'gpt-5-mini' = 'gpt-5-mini',
  'gpt-5-nano' = 'gpt-5-nano',
  'gpt-4.1' = 'gpt-4.1',
  'gpt-4.1-mini' = 'gpt-4.1-mini',
  'gpt-4o' = 'gpt-4o',
  'gpt-4o-mini' = 'gpt-4o-mini',
  'gpt-4-turbo' = 'gpt-4-turbo',
}

export enum GEMINI_MODELS {
  'gemini-3.5-flash' = 'gemini-3.5-flash',
  'gemini-3.1-pro-preview' = 'gemini-3.1-pro-preview',
  'gemini-3-flash-preview' = 'gemini-3-flash-preview',
  'gemini-3.1-flash-lite' = 'gemini-3.1-flash-lite',
  'gemini-2.5-pro' = 'gemini-2.5-pro',
  'gemini-2.5-flash' = 'gemini-2.5-flash',
}

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS['gemini-3.5-flash'];

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Gemini's OpenAI-compatible endpoint — keeps Google off LangChain's
// @langchain/google-genai package, which bundles node:async_hooks and
// crashes Obsidian mobile (the PR #101 revert).
export const GEMINI_OPENAI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai';

/**
 * GPT-5 family and o-series reasoning models only accept the default
 * temperature (1) on the Chat Completions API and 400 on anything else.
 */
function supportsCustomTemperature(model: string) {
  return !/^(gpt-5|o\d)/.test(model);
}

function createChatModel(config: LlmAdapterConfig, temperature: number) {
  // The model-name heuristic only holds for OpenAI's own catalog; OpenRouter
  // routes to arbitrary providers, so let those models use their defaults.
  const useTemperature =
    config.platform !== PROCESS_PLATFORM.openRouter &&
    supportsCustomTemperature(config.model);

  return new ChatOpenAI({
    model: config.model,
    apiKey: config.apiKey,
    ...(useTemperature && { temperature }),
    configuration: {
      fetch: obsidianFetch,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    },
  });
}

export function createOpenAiCompatibleLlmAdapter(
  config: LlmAdapterConfig,
): LlmAdapter {
  return {
    async summarizeTranscript(
      transcript: string,
      options: SummaryOptions,
    ): Promise<LlmSummary> {
      const model = createChatModel(config, 0.5);

      const messages = [
        new SystemMessage(buildSummarySystemPrompt(transcript)),
        ...buildSummaryExtraInstructions(options).map(
          (instruction) => new SystemMessage(instruction),
        ),
        // Gemini's OpenAI-compat endpoint maps system messages to
        // system_instruction and 400s ("contents is not specified") if no
        // user message remains — same requirement as the Anthropic adapter.
        new HumanMessage(
          'Produce the structured note sections for the transcript now.',
        ),
      ];

      const structuredLlm = model.withStructuredOutput(
        buildSummaryZodSchema(options.activeNoteTemplate),
      );
      const result = (await structuredLlm.invoke(messages)) as LlmSummary;

      return result;
    },

    async fixMermaidChart(brokenMermaidChart: string) {
      const model = createChatModel(config, 0.3);
      const messages = [
        new HumanMessage(buildMermaidFixPrompt(brokenMermaidChart)),
      ];

      const structuredLlm = model.withStructuredOutput(MERMAID_FIX_SCHEMA);
      const { mermaidChart } = await structuredLlm.invoke(messages);

      return { mermaidChart };
    },
  };
}
