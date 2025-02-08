import { useState } from 'react';
import { ModalRecordingOptions } from './options/ModalRecordingOptions';
import { ModalAiModelOptions } from './options/ModalAiModelOptions';

import type ScribePlugin from 'src';
import type { ScribeOptions } from 'src';
import type { LLM_MODELS } from 'src/util/openAiUtils';
import type { TRANSCRIPT_PLATFORM } from 'src/settings/settings';

export interface ScribeModelOptions {
  llmModel: LLM_MODELS;
  transcriptPlatform: TRANSCRIPT_PLATFORM;
}

export function ModalOptionsContainer({
  plugin,
  options,
  setOptions,
}: {
  plugin: ScribePlugin;
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
}) {
  const [isModelOptionsExpanded, setIsModalOptionsExpanded] = useState(false);
  const [modelOptions, setModelOptions] = useState<ScribeModelOptions>({
    llmModel: plugin.settings.llmModel,
    transcriptPlatform: plugin.settings.transcriptPlatform,
  });

  return (
    <div>
      <div className="scribe-options-container">
        <button
          onClick={() => setIsModalOptionsExpanded(!isModelOptionsExpanded)}
          type="button"
          className="scribe-settings-btn"
        >
          Settings
        </button>
        <ModalRecordingOptions
          plugin={plugin}
          options={options}
          setOptions={setOptions}
          modelOptions={modelOptions}
        />
      </div>
      {isModelOptionsExpanded && (
        <ModalAiModelOptions
          plugin={plugin}
          modelOptions={modelOptions}
          setModelOptions={setModelOptions}
        />
      )}
    </div>
  );
}
