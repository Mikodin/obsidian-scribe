/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */
import OpenAI from 'openai';
import type { Uploadable } from 'openai/uploads';

import { Notice } from 'obsidian';
import type { ScribeOptions } from 'src';
import audioDataToChunkedFiles from 'src/util/audioDataToChunkedFiles';
import { LanguageOptions } from 'src/util/consts';
import { obsidianFetch } from 'src/util/obsidianFetch';

const MAX_CHUNK_SIZE = 25 * 1024 * 1024;

export async function chunkAndTranscribeWithOpenAi(
  openAiKey: string,
  audioBuffer: ArrayBuffer,
  { audioFileLanguage }: Pick<ScribeOptions, 'audioFileLanguage'>,
  customBaseUrl?: string,
  customModel?: string,
) {
  const openAiClient = new OpenAI({
    apiKey: openAiKey,
    dangerouslyAllowBrowser: true,
    fetch: obsidianFetch,
    ...(customBaseUrl && { baseURL: customBaseUrl }),
  });
  const audioFiles = await audioDataToChunkedFiles(audioBuffer, MAX_CHUNK_SIZE);
  new Notice(`Scribe: 🎧 Split transcript into ${audioFiles.length} files`);

  const transcript = await transcribeAudioChunks(openAiClient, {
    audioFiles,
    audioFileLanguage,
    customModel,
  });

  return transcript;
}

/**
 * Transcribe an audio file with OpenAI's Whisper model
 *
 * Handles splitting the file into chunks, processing each chunk, and
 * concatenating the results.
 */

interface TranscriptionOptions {
  audioFiles: Uploadable[];
  onChunkStart?: (i: number, totalChunks: number) => void;
  audioFileLanguage?: LanguageOptions;
  customModel?: string;
}

async function transcribeAudioChunks(
  client: OpenAI,
  {
    audioFiles,
    onChunkStart,
    audioFileLanguage,
    customModel,
  }: TranscriptionOptions,
): Promise<string> {
  let transcript = '';
  for (const [i, file] of audioFiles.entries()) {
    if (onChunkStart) {
      onChunkStart(i, audioFiles.length);
    }

    const useAudioFileLanguageSetting =
      audioFileLanguage && audioFileLanguage !== LanguageOptions.auto;

    const modelToUse = customModel || 'whisper-1';
    const baseOptions = {
      model: modelToUse,
      file,
    };
    const whisperOptions = useAudioFileLanguageSetting
      ? { ...baseOptions, language: audioFileLanguage }
      : baseOptions;

    const res = await client.audio.transcriptions.create(whisperOptions);
    const sep = i === 0 ? '' : ' ';
    transcript += sep + res.text.trim();
  }
  return transcript;
}
