import { Notice } from 'obsidian';
import type { ScribeOptions } from 'src';
import audioDataToChunkedFiles from 'src/util/audioDataToChunkedFiles';
import { LanguageDisplayNames, LanguageOptions } from 'src/util/consts';
import { obsidianFetch } from 'src/util/obsidianFetch';

const GEMINI_GENERATE_CONTENT_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

// Stable GA flash model with audio input — cheap and fast for transcription.
const GEMINI_TRANSCRIPT_MODEL = 'gemini-3.5-flash';

/**
 * generateContent caps the total request at 20MB. Chunks are re-encoded as
 * 16-bit WAV (~maxSize / 2 bytes) and inflate ~4/3 when base64d, so 20MB
 * here yields ~13.4MB request bodies with headroom for the prompt.
 */
const MAX_CHUNK_SIZE = 20 * 1024 * 1024;

interface GeminiGenerateContentResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

/**
 * Gemini has no dedicated transcription endpoint — audio goes to
 * generateContent as inline data with a transcription prompt. Diarization is
 * prompt-driven, matching the shared `**Speaker N**:` output convention.
 */
export async function transcribeAudioWithGemini(
  apiKey: string,
  audioBuffer: ArrayBuffer,
  mimeType: string,
  options: Pick<ScribeOptions, 'isMultiSpeakerEnabled' | 'audioFileLanguage'>,
): Promise<string> {
  const { isMultiSpeakerEnabled = false, audioFileLanguage } = options;

  // Re-encode to WAV — Gemini does not accept webm/opus recordings.
  // (If decoding fails, this falls back to the original encoded buffer.)
  const audioFiles = await audioDataToChunkedFiles(audioBuffer, MAX_CHUNK_SIZE);
  if (audioFiles.length > 1) {
    new Notice(`Scribe: 🎧 Split transcript into ${audioFiles.length} files`);
  }

  const prompt = buildTranscriptionPrompt(
    isMultiSpeakerEnabled,
    audioFileLanguage,
  );

  const chunkTranscripts: string[] = [];
  for (const uploadable of audioFiles) {
    // audioDataToChunkedFiles builds these with openai's toFile, so each
    // chunk is a File (named .wav, or the original extension on fallback)
    const file = uploadable as File;
    const fileBuffer = await file.arrayBuffer();
    const chunkMimeType = file.name?.endsWith('.wav') ? 'audio/wav' : mimeType;

    chunkTranscripts.push(
      await transcribeChunk(apiKey, prompt, fileBuffer, chunkMimeType),
    );
  }

  return chunkTranscripts.join(isMultiSpeakerEnabled ? '\n' : ' ').trim();
}

async function transcribeChunk(
  apiKey: string,
  prompt: string,
  audioBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const response = await obsidianFetch(
    `${GEMINI_GENERATE_CONTENT_BASE_URL}/${GEMINI_TRANSCRIPT_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: arrayBufferToBase64(audioBuffer),
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google Gemini transcription failed (${response.status}): ${await response.text()}`,
    );
  }

  const result = (await response.json()) as GeminiGenerateContentResponse;
  const candidate = result.candidates?.[0];
  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('');

  if (!text) {
    const reason =
      result.promptFeedback?.blockReason ??
      candidate?.finishReason ??
      'no text returned';
    throw new Error(`Google Gemini transcription returned nothing (${reason})`);
  }

  return text.trim();
}

function buildTranscriptionPrompt(
  isMultiSpeakerEnabled: boolean,
  audioFileLanguage: LanguageOptions | undefined,
): string {
  const instructions = [
    'Transcribe this audio recording verbatim.',
    'Output only the transcript text — no preamble, commentary, or code fences.',
  ];

  if (isMultiSpeakerEnabled) {
    instructions.push(
      'Identify distinct speakers and start each speaker turn on its own line prefixed with **Speaker N**: (e.g. **Speaker 1**: Hello there.)',
    );
  }

  if (audioFileLanguage && audioFileLanguage !== LanguageOptions.auto) {
    instructions.push(
      `The audio is in ${LanguageDisplayNames[audioFileLanguage]} — transcribe it in that language.`,
    );
  }

  return instructions.join('\n');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const sliceSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += sliceSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + sliceSize),
    );
  }

  return btoa(binary);
}
