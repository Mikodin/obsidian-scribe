import type ScribePlugin from 'src';
import type { ScribeOptions } from 'src';
import { resolveLlmConfig } from 'src/aiProviders/llm/llmAdapter';
import {
  LLM_PROVIDERS,
  TRANSCRIPT_PROVIDERS,
} from 'src/aiProviders/providerMetadata';
import { SettingsItem } from 'src/settings/components/SettingsItem';
import useOpenRouterModelIds from 'src/settings/hooks/useOpenRouterModelIds';
import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from 'src/util/consts';

export function ModalAiModelOptions({
  plugin,
  options,
  setOptions,
}: {
  plugin: ScribePlugin;
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
}) {
  const handleOptionsChange = (updatedOptions: Partial<ScribeOptions>) => {
    setOptions({
      ...options,
      ...updatedOptions,
    });
  };

  const { transcriptPlatform, processPlatform, llmModel } = options;
  const llmProviderModels = LLM_PROVIDERS[processPlatform].models;

  return (
    <div className="scribe-recording-options">
      <SettingsItem
        name="Summarization provider"
        description=""
        control={
          <select
            value={processPlatform}
            className="dropdown"
            onChange={(e) => {
              const platform = e.target.value as PROCESS_PLATFORM;
              handleOptionsChange({
                processPlatform: platform,
                // Reset to the model configured for the newly picked provider
                llmModel: resolveLlmConfig(plugin.settings, { platform }).model,
              });
            }}
          >
            {Object.values(PROCESS_PLATFORM).map((platform) => (
              <option key={platform} value={platform}>
                {LLM_PROVIDERS[platform].displayName}
              </option>
            ))}
          </select>
        }
      />

      <SettingsItem
        name="LLM model"
        description=""
        control={
          <ModalLlmModelPicker
            processPlatform={processPlatform}
            llmModel={llmModel}
            llmProviderModels={llmProviderModels}
            onModelChange={(model) => handleOptionsChange({ llmModel: model })}
          />
        }
      />

      <SettingsItem
        name="Transcription platform"
        description=""
        control={
          <select
            value={transcriptPlatform}
            className="dropdown"
            onChange={(e) => {
              handleOptionsChange({
                transcriptPlatform: e.target.value as TRANSCRIPT_PLATFORM,
              });
            }}
          >
            {Object.values(TRANSCRIPT_PLATFORM).map((platform) => (
              <option key={platform} value={platform}>
                {TRANSCRIPT_PROVIDERS[platform].displayName}
              </option>
            ))}
          </select>
        }
      />
    </div>
  );
}

function ModalLlmModelPicker({
  processPlatform,
  llmModel,
  llmProviderModels,
  onModelChange,
}: {
  processPlatform: PROCESS_PLATFORM;
  llmModel: string;
  llmProviderModels?: readonly string[];
  onModelChange: (model: string) => void;
}) {
  const isOpenRouter = processPlatform === PROCESS_PLATFORM.openRouter;
  const openRouterModelIds = useOpenRouterModelIds(isOpenRouter);

  if (llmProviderModels) {
    return (
      <select
        value={llmModel}
        className="dropdown"
        onChange={(e) => onModelChange(e.target.value)}
      >
        {llmProviderModels.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    );
  }

  // Searchable combobox: typing filters the catalog, free text still allowed
  if (isOpenRouter) {
    return (
      <>
        <input
          type="text"
          list="scribe-modal-openrouter-models"
          value={llmModel}
          placeholder="anthropic/claude-sonnet-5"
          onChange={(e) => onModelChange(e.target.value)}
        />
        <datalist id="scribe-modal-openrouter-models">
          {openRouterModelIds.map((modelId) => (
            <option key={modelId} value={modelId} />
          ))}
        </datalist>
      </>
    );
  }

  // Free-text providers (custom endpoint) configure their model in settings
  return <input type="text" value={llmModel} disabled />;
}
