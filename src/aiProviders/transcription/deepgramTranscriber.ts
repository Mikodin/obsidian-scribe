import type { ScribeOptions } from 'src';
import { LanguageOptions } from 'src/util/consts';
import { obsidianFetch } from 'src/util/obsidianFetch';
import { formatSpeakerSegments } from './diarizationFormat';

const DEEPGRAM_LISTEN_URL = 'https://api.deepgram.com/v1/listen';

interface DeepgramParagraph {
  speaker?: number;
  sentences?: { text: string }[];
}

interface DeepgramAlternative {
  transcript?: string;
  paragraphs?: {
    transcript?: string;
    paragraphs?: DeepgramParagraph[];
  };
}

export async function transcribeAudioWithDeepgram(
  apiKey: string,
  audioBuffer: ArrayBuffer,
  mimeType: string,
  options: Pick<ScribeOptions, 'isMultiSpeakerEnabled' | 'audioFileLanguage'>,
): Promise<string> {
  const { isMultiSpeakerEnabled = false, audioFileLanguage } = options;

  const params = new URLSearchParams({
    model: 'nova-3',
    smart_format: 'true',
  });

  if (isMultiSpeakerEnabled) {
    params.set('diarize', 'true');
  }

  if (audioFileLanguage && audioFileLanguage !== LanguageOptions.auto) {
    params.set('language', audioFileLanguage);
  } else {
    params.set('detect_language', 'true');
  }

  const response = await obsidianFetch(
    `${DEEPGRAM_LISTEN_URL}?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mimeType,
      },
      body: audioBuffer,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Deepgram transcription failed (${response.status}): ${await response.text()}`,
    );
  }

  const result = await response.json();
  const alternative: DeepgramAlternative | undefined =
    result?.results?.channels?.[0]?.alternatives?.[0];

  if (!alternative) {
    throw new Error('Deepgram returned no transcription results');
  }

  const diarizedParagraphs = alternative.paragraphs?.paragraphs;
  if (isMultiSpeakerEnabled && diarizedParagraphs?.length) {
    return formatSpeakerSegments(
      diarizedParagraphs.map((paragraph) => ({
        speaker: String((paragraph.speaker ?? 0) + 1),
        text: (paragraph.sentences ?? [])
          .map((sentence) => sentence.text)
          .join(' '),
      })),
    );
  }

  return alternative.paragraphs?.transcript ?? alternative.transcript ?? '';
}
