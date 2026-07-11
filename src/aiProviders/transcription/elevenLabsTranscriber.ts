import type { ScribeOptions } from 'src';
import { LanguageOptions } from 'src/util/consts';
import { obsidianFetch } from 'src/util/obsidianFetch';
import {
  formatSpeakerSegments,
  type SpeakerSegment,
} from './diarizationFormat';

const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

interface ElevenLabsWord {
  text: string;
  type: 'word' | 'spacing' | 'audio_event';
  speaker_id?: string;
}

interface ElevenLabsTranscription {
  text?: string;
  words?: ElevenLabsWord[];
}

export async function transcribeAudioWithElevenLabs(
  apiKey: string,
  audioBuffer: ArrayBuffer,
  mimeType: string,
  options: Pick<ScribeOptions, 'isMultiSpeakerEnabled' | 'audioFileLanguage'>,
): Promise<string> {
  const { isMultiSpeakerEnabled = false, audioFileLanguage } = options;

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([audioBuffer], { type: mimeType }),
    `audio.${mimeTypeToExtension(mimeType)}`,
  );
  formData.append('model_id', 'scribe_v1');

  if (isMultiSpeakerEnabled) {
    formData.append('diarize', 'true');
  }

  if (audioFileLanguage && audioFileLanguage !== LanguageOptions.auto) {
    formData.append('language_code', audioFileLanguage);
  }

  const response = await obsidianFetch(ELEVENLABS_STT_URL, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      `ElevenLabs transcription failed (${response.status}): ${await response.text()}`,
    );
  }

  const result = (await response.json()) as ElevenLabsTranscription;

  if (isMultiSpeakerEnabled && result.words?.length) {
    const segments: SpeakerSegment[] = result.words
      .filter((word) => word.type !== 'audio_event')
      .map((word) => ({
        speaker: speakerIdToLabel(word.speaker_id),
        text: word.text,
      }));

    const formatted = formatDiarizedWords(segments);
    if (formatted) {
      return formatted;
    }
  }

  return result.text ?? '';
}

/**
 * ElevenLabs returns word-level granularity ('spacing' entries included), so
 * join words within a speaker run before handing off to the shared formatter.
 */
function formatDiarizedWords(wordSegments: SpeakerSegment[]): string {
  const runs: SpeakerSegment[] = [];

  for (const word of wordSegments) {
    const last = runs[runs.length - 1];
    if (last && last.speaker === word.speaker) {
      last.text += word.text;
    } else {
      runs.push({ speaker: word.speaker, text: word.text });
    }
  }

  return formatSpeakerSegments(runs);
}

function speakerIdToLabel(speakerId: string | undefined): string {
  const match = speakerId?.match(/^speaker_(\d+)$/);
  if (match) {
    return String(Number(match[1]) + 1);
  }
  return speakerId ?? '1';
}

function mimeTypeToExtension(mimeType: string): string {
  const subtype = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';
  return subtype === 'mpeg' ? 'mp3' : subtype;
}
