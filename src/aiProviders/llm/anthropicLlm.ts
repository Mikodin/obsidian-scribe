import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
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

export enum ANTHROPIC_MODELS {
  'claude-opus-4-8' = 'claude-opus-4-8',
  'claude-sonnet-5' = 'claude-sonnet-5',
  'claude-sonnet-4-6' = 'claude-sonnet-4-6',
  'claude-haiku-4-5' = 'claude-haiku-4-5',
}

export const DEFAULT_ANTHROPIC_MODEL = ANTHROPIC_MODELS['claude-sonnet-5'];

// obsidianFetch buffers via requestUrl, so all calls must be non-streaming.
// Never send `temperature` — current Claude models reject non-default values.
export function createAnthropicLlmAdapter(
  config: LlmAdapterConfig,
): LlmAdapter {
  const client = new Anthropic({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
    fetch: obsidianFetch,
  });

  return {
    async summarizeTranscript(
      transcript: string,
      options: SummaryOptions,
    ): Promise<LlmSummary> {
      const system = [
        buildSummarySystemPrompt(transcript),
        ...buildSummaryExtraInstructions(options),
      ].join('\n\n');

      const response = await client.messages.parse({
        model: config.model,
        max_tokens: 8192,
        system,
        messages: [
          {
            role: 'user',
            content:
              'Produce the structured note sections for the transcript now.',
          },
        ],
        output_config: {
          format: zodOutputFormat(
            buildSummaryZodSchema(options.activeNoteTemplate),
          ),
        },
      });

      assertCompleted(response.stop_reason);

      if (!response.parsed_output) {
        throw new Error(
          'Anthropic returned no parsable structured output — try again or switch models',
        );
      }

      return response.parsed_output as LlmSummary;
    },

    async fixMermaidChart(brokenMermaidChart: string) {
      const response = await client.messages.parse({
        model: config.model,
        max_tokens: 4096,
        messages: [
          { role: 'user', content: buildMermaidFixPrompt(brokenMermaidChart) },
        ],
        output_config: {
          format: zodOutputFormat(MERMAID_FIX_SCHEMA),
        },
      });

      assertCompleted(response.stop_reason);

      if (!response.parsed_output) {
        throw new Error('Anthropic returned no parsable structured output');
      }

      return { mermaidChart: response.parsed_output.mermaidChart };
    },
  };
}

function assertCompleted(stopReason: string | null) {
  if (stopReason === 'refusal') {
    throw new Error(
      'Anthropic declined this request — try rephrasing or a different model',
    );
  }
  if (stopReason === 'max_tokens') {
    throw new Error(
      'Anthropic hit its output token limit before finishing — try a shorter template or transcript',
    );
  }
}
