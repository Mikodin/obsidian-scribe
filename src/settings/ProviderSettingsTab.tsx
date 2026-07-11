import {
  LLM_PROVIDERS,
  TRANSCRIPT_PROVIDERS,
} from 'src/aiProviders/providerMetadata';
import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from 'src/util/consts';
import { ProviderPrivacyCard } from './components/ProviderPrivacyCard';
import {
  LlmProviderSection,
  TranscriptProviderSection,
} from './components/ProviderSettingsSections';
import { SettingsSelect } from './components/SettingsControl';
import { SettingsItemHeader } from './components/SettingsItem';
import useSettingsForm from './hooks/useSettingsForm';

/**
 * Tab for choosing the transcription + summarization providers. Each
 * provider's API key, model options, and privacy summary render inline
 * for the selected platform.
 */
function ProviderSettingsTab() {
  const { register, settings } = useSettingsForm();

  return (
    <div>
      <SettingsItemHeader name="Transcription" />
      <SettingsSelect
        {...register('transcriptPlatform')}
        name="Transcription platform"
        description="Your recording is uploaded to this service"
        valuesMapping={Object.values(TRANSCRIPT_PLATFORM).map((platform) => ({
          displayName: TRANSCRIPT_PROVIDERS[platform].displayName,
          value: platform,
        }))}
      />
      <TranscriptProviderSection platform={settings.transcriptPlatform} />
      <ProviderPrivacyCard
        metadata={TRANSCRIPT_PROVIDERS[settings.transcriptPlatform]}
      />

      <SettingsItemHeader name="Summarization" />
      <SettingsSelect
        {...register('processPlatform')}
        name="Summarization provider"
        description="The transcript is sent to this service"
        valuesMapping={Object.values(PROCESS_PLATFORM).map((platform) => ({
          displayName: LLM_PROVIDERS[platform].displayName,
          value: platform,
        }))}
      />
      <LlmProviderSection platform={settings.processPlatform} />
      <ProviderPrivacyCard metadata={LLM_PROVIDERS[settings.processPlatform]} />
    </div>
  );
}

export default ProviderSettingsTab;
