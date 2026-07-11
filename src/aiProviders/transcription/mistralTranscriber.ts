import type { ScribeOptions } from 'src';
import { LanguageOptions } from 'src/util/consts';
import { obsidianFetch } from 'src/util/obsidianFetch';

const MISTRAL_TRANSCRIPTION_URL =
  'https://api.mistral.ai/v1/audio/transcriptions';

/**
 * Mistral's audio limits are lower than ElevenLabs/Deepgram; if users hit
 * size errors, audioDataToChunkedFiles (used by the OpenAI transcriber) is
 * the ready-made chunking fallback.
 */
export async function transcribeAudioWithMistral(
  apiKey: string,
  audioBuffer: ArrayBuffer,
  mimeType: string,
  options: Pick<ScribeOptions, 'audioFileLanguage'>,
): Promise<string> {
  const { audioFileLanguage } = options;

  const subtype = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';
  const extension = subtype === 'mpeg' ? 'mp3' : subtype;

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([audioBuffer], { type: mimeType }),
    `audio.${extension}`,
  );
  formData.append('model', 'voxtral-mini-latest');

  if (audioFileLanguage && audioFileLanguage !== LanguageOptions.auto) {
    formData.append('language', audioFileLanguage);
  }

  const response = await obsidianFetch(MISTRAL_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      `Mistral transcription failed (${response.status}): ${await response.text()}`,
    );
  }

  const result = await response.json();
  return result.text ?? '';
}
