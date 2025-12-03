import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { type BaseMessage, HumanMessage, SystemMessage } from 'langchain';
import type { ScribeOptions } from 'src';
import { z } from 'zod';
import type { LanguageOptions } from './consts';
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
  - Do not include escaped new line characters
  - Do not mention "the speaker" anywhere in your response.  
  - The notes should be written as if I were writing them.

  ${scribeOutputLanguage ? `Respond in ${scribeOutputLanguage} language` : ''}
  `;

  const transcriptMessage = `
  The following is the transcribed audio:
  <transcript>
  ${transcript.trim()}
  </transcript>
  `;

  const modelToUse = llmModel;

  const model = new ChatGoogleGenerativeAI({
    model: modelToUse,
    apiKey: openAiKey,
    temperature: 0.5,
  });

  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt.trim()),
    new HumanMessage(transcriptMessage),
  ];

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
      ? z.string().optional().describe(sectionInstructions)
      : z.string().describe(sectionInstructions);
  });

  const structuredOutput = z.object(schema);
  const structuredLlm = model.withStructuredOutput(structuredOutput);

  const result = (await structuredLlm.invoke(messages)) as Record<
    string,
    string
  > & { fileTitle: string };

  return result;
}

// export async function llmFixMermaidChart(
//   openAiKey: string,
//   brokenMermaidChart: string,
//   llmModel: LLM_MODELS = LLM_MODELS['gpt-4o'],
//   customBaseUrl?: string,
//   customChatModel?: string,
// ) {
//   const systemPrompt = `
// You are an expert in mermaid mindmaps and Obsidian (the note taking app)
// Below is a <broken-mermaid-mindmap> that isn't rendering correctly in Obsidian
// There may be some new line characters, or tab characters, or special characters.
// Strip them out and only return a fully valid unicode Mermaid mindmap that will render properly in Obsidian
// Remove any special characters in the nodes text that isn't valid.

// <broken-mermaid-mindmap>
// ${brokenMermaidChart}
// </broken-mermaid-mindmap>

// Thank you
//   `;
//   const modelToUse = customChatModel || llmModel;
//   const model = new ChatOpenAI({
//     model: modelToUse,
//     apiKey: openAiKey,
//     temperature: 0.3,
//     ...(customBaseUrl && { configuration: { baseURL: customBaseUrl } }),
//   });
//   const messages = [new SystemMessage(systemPrompt)];
//   const structuredOutput = z.object({
//     mermaidChart: z
//       .string()
//       .describe('A fully valid unicode mermaid mindmap diagram'),
//   });

//   const structuredLlm = model.withStructuredOutput(structuredOutput);
//   const { mermaidChart } = await structuredLlm.invoke(messages);

//   return { mermaidChart };
// }
