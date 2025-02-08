import { AssemblyAI, type TranscribeParams } from 'assemblyai';
import type { ScribeOptions } from 'src';

export async function transcribeAudioWithAssemblyAi(
  apiKey: string,
  audioFilePath: ArrayBuffer,
  options: Pick<ScribeOptions, 'isMultiSpeakerEnabled'>,
): Promise<string> {
  const { isMultiSpeakerEnabled = false } = options || {};
  const client = new AssemblyAI({
    apiKey,
  });

  const params: TranscribeParams = {
    audio: audioFilePath,
    format_text: true,
    speaker_labels: isMultiSpeakerEnabled,
  };

  const transcript = await client.transcripts.transcribe(params);

  let transcriptText = '';

  if (isMultiSpeakerEnabled && transcript.utterances) {
    transcriptText = (transcript.utterances || [])
      .map((utterance) => `Speaker ${utterance.speaker}: ${utterance.text}`)
      .join('\n');
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
