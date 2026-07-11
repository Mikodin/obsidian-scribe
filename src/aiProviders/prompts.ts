import { z } from 'zod';
import type { ScribeTemplate } from 'src/settings/components/NoteTemplateSettings';
import { convertToSafeJsonKey } from 'src/util/textUtil';

/**
 * The subset of ScribeOptions the LLM adapters need. Kept structural so
 * ScribeOptions satisfies it without the adapters importing from src/index.
 */
export interface SummaryOptions {
  activeNoteTemplate: ScribeTemplate;
  scribeOutputLanguage?: string;
  additionalSystemPrompt?: string;
}

export type LlmSummary = Record<string, string> & { fileTitle: string };

export function buildSummarySystemPrompt(transcript: string): string {
  return `
  You are "Scribe" an expert note-making AI for Obsidian you specialize in the Linking Your Thinking (LYK) strategy.
  The following is the transcription generated from a recording of someone talking aloud or multiple people in a conversation.
  There may be a lot of random things said given fluidity of conversation or thought process and the microphone's ability to pick up all audio.

  The transcription may address you by calling you "Scribe" or saying "Hey Scribe" and asking you a question, they also may just allude to you by asking "you" to do something.
  Give them the answers to this question

  Give me notes in Markdown language on what was said, they should be
  - Easy to understand
  - Succinct
  - Clean
  - Logical
  - Insightful

  It will be nested under a h2 # tag, feel free to nest headers underneath it
  Rules:
  - Do not include escaped new line characters
  - Do not mention "the speaker" anywhere in your response.
  - The notes should be written as if I were writing them.

  The following is the transcribed audio:
  <transcript>
  ${transcript}
  </transcript>
  `;
}

export function buildSummaryExtraInstructions({
  scribeOutputLanguage,
  additionalSystemPrompt,
}: Pick<
  SummaryOptions,
  'scribeOutputLanguage' | 'additionalSystemPrompt'
>): string[] {
  const instructions: string[] = [];

  if (scribeOutputLanguage) {
    instructions.push(`Please respond in ${scribeOutputLanguage} language`);
  }

  if (additionalSystemPrompt?.trim()) {
    instructions.push(
      `The user has provided additional context and instructions for this summary:\n<user-context>\n${additionalSystemPrompt}\n</user-context>`,
    );
  }

  return instructions;
}

export function buildSummaryZodSchema(activeNoteTemplate: ScribeTemplate) {
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

  return z.object(schema);
}

export function buildMermaidFixPrompt(brokenMermaidChart: string): string {
  return `
You are an expert in mermaid charts and Obsidian (the note taking app)
Below is a <broken-mermaid-chart> that isn't rendering correctly in Obsidian
There may be some new line characters, or tab characters, or special characters.
Strip them out and only return a fully valid unicode Mermaid chart that will render properly in Obsidian
Remove any special characters in the nodes text that isn't valid.

<broken-mermaid-chart>
${brokenMermaidChart}
</broken-mermaid-chart>

Thank you
  `;
}

export const MERMAID_FIX_SCHEMA = z.object({
  mermaidChart: z.string().describe('A fully valid unicode mermaid chart'),
});
