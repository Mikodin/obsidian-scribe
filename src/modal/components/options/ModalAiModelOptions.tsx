import type ScribePlugin from 'src';
import { useEffect, useState } from 'react';
import { LLM_MODELS } from 'src/util/openAiUtils';
import { TRANSCRIPT_PLATFORM } from 'src/settings/settings';
import type { ScribeModelOptions } from '../ModalOptionsContainer';

interface Props {
  plugin: ScribePlugin;
  modelOptions: ScribeModelOptions;
  setModelOptions: (options: ScribeModelOptions) => void;
}
export const ModalAiModelOptions = ({
  plugin,
  modelOptions,
  setModelOptions,
}: Props) => {
  const { llmModel, transcriptPlatform } = modelOptions;
  useEffect(() => {
    const saveSettings = async () => {
      const { llmModel, transcriptPlatform } = modelOptions;
      plugin.settings.llmModel = llmModel;
      plugin.settings.transcriptPlatform = transcriptPlatform;
      await plugin.saveSettings();
    };

    saveSettings();
  }, [modelOptions, plugin]);

  return (
    <div>
      <div>
        <label htmlFor="llmModelSelect">
          LLM model for creating the summary
        </label>
        <select
          id="llmModelSelect"
          value={llmModel}
          onChange={(e) =>
            setModelOptions({
              ...modelOptions,
              llmModel: e.target.value as LLM_MODELS,
            })
          }
        >
          {Object.keys(LLM_MODELS).map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="transcriptPlatformSelect">Transcript platform</label>
        <select
          id="transcriptPlatformSelect"
          value={transcriptPlatform}
          onChange={(e) =>
            setModelOptions({
              ...modelOptions,
              transcriptPlatform: e.target.value as TRANSCRIPT_PLATFORM,
            })
          }
        >
          {Object.keys(TRANSCRIPT_PLATFORM).map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
