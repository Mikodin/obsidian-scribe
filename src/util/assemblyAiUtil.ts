import {
  AssemblyAI,
  type TranscriptParagraph,
  type TranscribeParams,
} from 'assemblyai';
import type { ScribeOptions } from 'src';
import { LanguageOptions } from './consts';

export async function transcribeAudioWithAssemblyAi(
  apiKey: string,
  audioFilePath: ArrayBuffer,
  options: Pick<ScribeOptions, 'isMultiSpeakerEnabled' | 'audioFileLanguage'>,
): Promise<string> {
  const { isMultiSpeakerEnabled = false, audioFileLanguage } = options || {};
  const client = new AssemblyAI({
    apiKey,
  });

  const useAudioFileLanguageSetting =
    audioFileLanguage && audioFileLanguage !== LanguageOptions.auto;

  const baseParams: TranscribeParams = {
    audio: audioFilePath,
    format_text: true,
    speaker_labels: isMultiSpeakerEnabled,
  };

  const params = useAudioFileLanguageSetting
    ? { ...baseParams, language_code: audioFileLanguage }
    : baseParams;

  const transcript = await client.transcripts.transcribe(params);

  let formattedParagraphs: TranscriptParagraph[] | undefined;
  try {
    const { paragraphs } = await client.transcripts.paragraphs(transcript.id);
    formattedParagraphs = paragraphs;
  } catch (error) {
    console.error(
      'Failed to fetch paragraphs from AssemblyAI, moving forward with raw text:',
      error,
    );
  }

  let transcriptText = '';

  if (isMultiSpeakerEnabled && transcript.utterances) {
    transcriptText = (transcript.utterances || [])
      .map((utterance) => `**Speaker ${utterance.speaker}**: ${utterance.text}`)
      .join('\n');
  } else if (formattedParagraphs) {
    transcriptText = formattedParagraphs
      .map((paragraph) => paragraph.text)
      .join('\n\n');
  } else {
    transcriptText = transcript.text || '';
  }

  if (transcript.error) {
    console.error(
      'Failed to transcribe with AssemblyAI, please try again',
      transcript.error,
    );
    throw new Error(transcript.error);
  }

  return transcriptText;
}
