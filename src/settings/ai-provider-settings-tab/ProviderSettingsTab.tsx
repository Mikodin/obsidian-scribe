import { SettingsSelect } from '../components/SettingsControl';
import { SettingsItemHeader } from '../components/SettingsItem';
import useSettingsForm, {} from '../hooks/useSettingsForm';
import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from '../settings';
import {
  AssemblyTranscriptSettings,
  CustomOpenAiProcessingSettings,
  CustomOpenAiTranscriptSettings,
  GeminiProcessingSettings,
  OpenAiProcessingSettings,
  OpenAiTranscriptSettings,
} from './ProviderSettingsSections';

const transcriptSelectMapping = [
  {
    displayName: 'OpenAI',
    value: TRANSCRIPT_PLATFORM.openAi,
  },
  {
    displayName: 'AssemblyAI',
    value: TRANSCRIPT_PLATFORM.assemblyAi,
  },
  // {
  //   displayName: 'GoogleAI',
  //   value: TRANSCRIPT_PLATFORM.google,
  // },
  {
    displayName: 'Custom endpoint (OpenAI-compatible)',
    value: TRANSCRIPT_PLATFORM.customOpenAi,
  },
];
const processSelectMapping = [
  {
    displayName: 'OpenAI',
    value: PROCESS_PLATFORM.openAi,
  },
  {
    displayName: 'GoogleAI',
    value: PROCESS_PLATFORM.google,
  },
  {
    displayName: 'Custom endpoint (OpenAI-compatible)',
    value: PROCESS_PLATFORM.customOpenAi,
  },
];

/**
 * Tab, containing AI provider settings
 */
function ProviderSettingsTab() {
  const { register, settings } = useSettingsForm();

  return (
    <div>
      <SettingsItemHeader name="Transcription" />
      <SettingsSelect
        {...register('transcriptPlatform')}
        name="Transcript platform"
        description="Your recording is uploaded to this service"
        valuesMapping={transcriptSelectMapping}
      />
      {settings.transcriptPlatform === TRANSCRIPT_PLATFORM.assemblyAi && (
        <AssemblyTranscriptSettings register={register} />
      )}
      {settings.transcriptPlatform === TRANSCRIPT_PLATFORM.openAi && (
        <OpenAiTranscriptSettings register={register} />
      )}
      {settings.transcriptPlatform === TRANSCRIPT_PLATFORM.customOpenAi && (
        <CustomOpenAiTranscriptSettings register={register} />
      )}

      <SettingsItemHeader name="Processing" />
      <SettingsSelect
        {...register('processPlatform')}
        name="Processing platform"
        description="Your transcriptions is uploaded to this service"
        valuesMapping={processSelectMapping}
      />
      {settings.processPlatform === PROCESS_PLATFORM.openAi && (
        <OpenAiProcessingSettings register={register} />
      )}
      {settings.processPlatform === PROCESS_PLATFORM.google && (
        <GeminiProcessingSettings register={register} />
      )}
      {settings.processPlatform === PROCESS_PLATFORM.customOpenAi && (
        <CustomOpenAiProcessingSettings register={register} />
      )}
    </div>
  );
}

export default ProviderSettingsTab;
