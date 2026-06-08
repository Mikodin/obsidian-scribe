import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { type BaseMessage, HumanMessage, SystemMessage } from 'langchain';
import type { ScribeOptions } from 'src';
import { z } from 'zod';
import { convertToSafeJsonKey } from './textUtil';

export enum LLM_MODELS {
  'gemini-flash-latest' = 'gemini-flash-latest',
  'gemini-flash-light-latest' = 'gemini-flash-light-latest',
  'gemini-2.5-flash' = 'gemini-2.5-flash',
  'gemini-2.5-flash-lite' = 'gemini-2.5-flash-lite',
  'gemini-2.5-pro' = 'gemini-2.5-pro',
  'gemini-2.0-flash' = 'gemini-2.0-flash',
  'gemini-2.0-flash-lite' = 'gemini-2.0-flash-lite',
}

// interface TranscriptionOptions {
//   audioFiles: FileLike[]; // FIX
//   onChunkStart?: (i: number, totalChunks: number) => void;
//   audioFileLanguage?: LanguageOptions;
//   model;
// }

// async function transcribeAudioGemini({
//   audioFiles,
//   onChunkStart,
//   audioFileLanguage,
//   model,
// }: TranscriptionOptions): Promise<string> {
//   // Write function which uses langchain + google AI to transcribe audio.
//   return transcript;
// }

export async function summarizeTranscriptGemini(
  openAiKey: string,
  transcript: string,
  { scribeOutputLanguage, activeNoteTemplate }: ScribeOptions,
  llmModel: LLM_MODELS = LLM_MODELS['gemini-2.0-flash-lite'],
) {
  const systemPrompt = `
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
  - Use actual line breaks in your Markdown output (e.g. newlines between bullet points, code block lines, etc.). Do NOT write literal \\n characters.
  - Do not mention "the speaker" anywhere in your response.
  - The notes should be written as if I were writing them.
  - CRITICAL: Each JSON field value must contain ONLY the section content. Do NOT open the value with a heading that repeats the section name (e.g. never start a value with "## Summary" or "## Insights"). Jump straight into the content.
  ${scribeOutputLanguage ? `- Please respond in ${scribeOutputLanguage} language.` : ''}
  `;

  const humanMessage = `
  The following is the transcribed audio:
  <transcript>
  ${transcript}
  </transcript>
  `;

  const model = new ChatGoogleGenerativeAI({
    model: llmModel,
    apiKey: openAiKey,
    temperature: 0.5,
  });

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(humanMessage),
  ];

  // Strip any leading markdown heading line Gemini injects before the content.
  const stripLeadingHeading = (s: string) =>
    s.replace(/^#{1,6}\s+[^\n]*\n?/, '').trimStart();

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
      ? z
          .string()
          .nullable()
          .transform((v) => (v ? stripLeadingHeading(v) : v))
          .describe(sectionInstructions)
      : z.string().transform(stripLeadingHeading).describe(sectionInstructions);
  });

  const structuredOutput = z.object(schema);
  const structuredLlm = model.withStructuredOutput(structuredOutput);

  console.debug('[gemini] → summarizeTranscript', llmModel, `transcript: ${transcript.length} chars`);
  const result = (await structuredLlm.invoke(messages)) as Record<
    string,
    string
  > & { fileTitle: string };
  console.debug('[gemini] ← summarizeTranscript', `fileTitle: "${result.fileTitle}"`);

  return await result;
}

export async function llmFixMermaidChartGemini(
  googleAiKey: string,
  brokenMermaidChart: string,
  llmModel: LLM_MODELS = LLM_MODELS['gemini-2.0-flash-lite'],
) {
  const systemPrompt = `You are an expert in mermaid charts and Obsidian (the note taking app).
You will be given a broken mermaid chart that isn't rendering correctly in Obsidian.
There may be some new line characters, or tab characters, or special characters.
Strip them out and only return a fully valid unicode Mermaid chart that will render properly in Obsidian.
Remove any special characters in the nodes text that isn't valid.
CRITICAL: Use actual newline characters between each line of the chart. Do NOT write literal \\n characters.`;

  const humanMessage = `Please fix the following broken mermaid chart:

<broken-mermaid-chart>
${brokenMermaidChart}
</broken-mermaid-chart>`;

  const model = new ChatGoogleGenerativeAI({
    model: llmModel,
    apiKey: googleAiKey,
    temperature: 0.3,
  });

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(humanMessage),
  ];
  const structuredOutput = z.object({
    mermaidChart: z
      .string()
      .transform((s) => s.replace(/\\n/g, '\n'))
      .describe(
        'A fully valid unicode mermaid chart with real newline characters between each line',
      ),
  });

  const structuredLlm = model.withStructuredOutput(structuredOutput);

  console.debug('[gemini] → fixMermaidChart', llmModel, `chart: ${brokenMermaidChart.length} chars`);
  const { mermaidChart } = await structuredLlm.invoke(messages);
  console.debug('[gemini] ← fixMermaidChart', `result: ${mermaidChart.length} chars`);

  return { mermaidChart };
}
