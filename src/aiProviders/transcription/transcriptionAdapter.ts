import type { ScribeOptions } from 'src';
import type { ScribePluginSettings } from 'src/settings/settings';
import { TRANSCRIPT_PLATFORM } from 'src/util/consts';
import { transcribeAudioWithAssemblyAi } from './assemblyAiTranscriber';
import { transcribeAudioWithDeepgram } from './deepgramTranscriber';
import { transcribeAudioWithElevenLabs } from './elevenLabsTranscriber';
import { transcribeAudioWithGemini } from './geminiTranscriber';
import { transcribeAudioWithMistral } from './mistralTranscriber';
import { chunkAndTranscribeWithOpenAi } from './openAiTranscriber';

/**
 * Dispatches to the transcription provider selected in the per-run options
 * (the modal can override the settings default).
 */
export async function transcribeAudio(
  settings: ScribePluginSettings,
  scribeOptions: ScribeOptions,
  audioBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  switch (scribeOptions.transcriptPlatform) {
    case TRANSCRIPT_PLATFORM.assemblyAi:
      return transcribeAudioWithAssemblyAi(
        settings.assemblyAiApiKey,
        audioBuffer,
        scribeOptions,
      );
    case TRANSCRIPT_PLATFORM.elevenLabs:
      return transcribeAudioWithElevenLabs(
        settings.elevenLabsApiKey,
        audioBuffer,
        mimeType,
        scribeOptions,
      );
    case TRANSCRIPT_PLATFORM.deepgram:
      return transcribeAudioWithDeepgram(
        settings.deepgramApiKey,
        audioBuffer,
        mimeType,
        scribeOptions,
      );
    case TRANSCRIPT_PLATFORM.google:
      return transcribeAudioWithGemini(
        settings.googleApiKey,
        audioBuffer,
        mimeType,
        scribeOptions,
      );
    case TRANSCRIPT_PLATFORM.mistral:
      return transcribeAudioWithMistral(
        settings.mistralApiKey,
        audioBuffer,
        mimeType,
        scribeOptions,
      );
    case TRANSCRIPT_PLATFORM.customOpenAi:
      return chunkAndTranscribeWithOpenAi(
        settings.openAiApiKey,
        audioBuffer,
        scribeOptions,
        settings.customOpenAiBaseUrl,
        settings.customTranscriptModel,
      );
    default:
      return chunkAndTranscribeWithOpenAi(
        settings.openAiApiKey,
        audioBuffer,
        scribeOptions,
      );
  }
}
