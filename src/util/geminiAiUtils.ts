/**
 * Gemini (Google AI) LLM helpers used by Scribe.
 *
 * Talks to Gemini via its OpenAI-compatible endpoint at
 * `https://generativelanguage.googleapis.com/v1beta/openai`. That compat
 * layer only supports the `tools` (function-calling) path for structured
 * output — not `response_format: { type: "json_schema" }`. We therefore
 * always call `withStructuredOutput(schema, { method: "functionCalling" })`.
 *
 * Gemini also rejects request bodies whose only role is `system`: its native
 * `generateContent` requires a `contents[]` turn. We therefore split the
 * original prompt into a role-only system message and a user message that
 * carries the transcript.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { ScribeOptions } from 'src';
import { z } from 'zod';
import { obsidianFetch } from './obsidianFetch';
import {
  mermaidRolePrompt,
  mermaidUserPrompt,
  scribeRolePrompt,
  scribeUserPrompt,
} from './scribePrompts';
import { convertToSafeJsonKey } from './textUtil';

export const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai';

export enum GEMINI_LLM_MODELS {
  'gemini-flash-latest' = 'gemini-flash-latest',
  'gemini-flash-light-latest' = 'gemini-flash-light-latest',
  'gemini-2.5-flash' = 'gemini-2.5-flash',
  'gemini-2.5-flash-lite' = 'gemini-2.5-flash-lite',
  'gemini-2.5-pro' = 'gemini-2.5-pro',
  'gemini-2.0-flash' = 'gemini-2.0-flash',
  'gemini-2.0-flash-lite' = 'gemini-2.0-flash-lite',
}

export async function geminiSummarizeTranscript(
  geminiKey: string,
  transcript: string,
  { scribeOutputLanguage, activeNoteTemplate }: ScribeOptions,
  geminiModel: GEMINI_LLM_MODELS = GEMINI_LLM_MODELS['gemini-flash-latest'],
) {
  const model = new ChatOpenAI({
    model: geminiModel,
    apiKey: geminiKey,
    temperature: 0.5,
    configuration: {
      baseURL: GEMINI_BASE_URL,
      fetch: obsidianFetch,
    },
  });

  const schema: Record<string, z.ZodType<string | null | undefined>> = {
    fileTitle: z
      .string()
      .describe(
        'A suggested title for the Obsidian Note. Ensure that it is in the proper format for a file on mac, windows and linux, do not include any special characters',
      ),
  };

  activeNoteTemplate.sections.forEach((section) => {
    const { sectionHeader, sectionInstructions, isSectionOptional } = section;
    schema[convertToSafeJsonKey(sectionHeader)] = isSectionOptional
      ? z.string().nullable().describe(sectionInstructions)
      : z.string().describe(sectionInstructions);
  });

  const structuredOutput = z.object(schema);

  const systemParts: string[] = [scribeRolePrompt()];
  if (scribeOutputLanguage) {
    systemParts.push(`Please respond in ${scribeOutputLanguage} language.`);
  }

  const messages: BaseMessage[] = [
    new SystemMessage(systemParts.join('\n\n')),
    new HumanMessage(scribeUserPrompt(transcript)),
  ];

  const structuredLlm = model.withStructuredOutput(structuredOutput, {
    method: 'functionCalling',
  });

  return (await structuredLlm.invoke(messages)) as Record<string, string> & {
    fileTitle: string;
  };
}

export async function geminiFixMermaidChart(
  geminiKey: string,
  brokenMermaidChart: string,
  geminiModel: GEMINI_LLM_MODELS = GEMINI_LLM_MODELS['gemini-flash-latest'],
) {
  const model = new ChatOpenAI({
    model: geminiModel,
    apiKey: geminiKey,
    temperature: 0.3,
    configuration: {
      baseURL: GEMINI_BASE_URL,
      fetch: obsidianFetch,
    },
  });

  const messages: BaseMessage[] = [
    new SystemMessage(mermaidRolePrompt()),
    new HumanMessage(mermaidUserPrompt(brokenMermaidChart)),
  ];

  const structuredOutput = z.object({
    mermaidChart: z.string().describe('A fully valid unicode mermaid chart'),
  });

  const structuredLlm = model.withStructuredOutput(structuredOutput, {
    method: 'functionCalling',
  });

  const { mermaidChart } = await structuredLlm.invoke(messages);
  return { mermaidChart };
}
