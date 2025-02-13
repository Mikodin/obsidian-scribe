import type { ScribeOptions } from 'src';
import { SettingsItem } from 'src/settings/components/SettingsItem';
import { TRANSCRIPT_PLATFORM } from 'src/settings/settings';
import {
  LanguageDisplayNames,
  LanguageOptions,
  type OutputLanguageOptions,
} from 'src/util/consts';
import { LLM_MODELS } from 'src/util/openAiUtils';

export function ModalAiModelOptions({
  options,
  setOptions,
}: {
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
}) {
  const handleOptionsChange = (updatedOptions: Partial<ScribeOptions>) => {
    setOptions({
      ...options,
      ...updatedOptions,
    });
  };

  const { transcriptPlatform, llmModel } = options;

  return (
    <div className="scribe-recording-options">
      <SettingsItem
        name="LLM model"
        description=""
        control={
          <select
            defaultValue={llmModel}
            className="dropdown"
            onChange={(e) => {
              handleOptionsChange({
                llmModel: e.target.value as LLM_MODELS,
              });
            }}
          >
            {Object.keys(LLM_MODELS).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        }
      />

      <SettingsItem
        name="Transcript platform"
        description=""
        control={
          <select
            defaultValue={transcriptPlatform}
            className="dropdown"
            onChange={(e) => {
              handleOptionsChange({
                transcriptPlatform: e.target.value as TRANSCRIPT_PLATFORM,
              });
            }}
          >
            {Object.keys(TRANSCRIPT_PLATFORM).map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        }
      />
    </div>
  );
}
