import { useState } from 'react';
import { ModalRecordingOptions } from './options/ModalRecordingOptions';
import { ModalAiModelOptions } from './options/ModalAiModelOptions';

import type ScribePlugin from 'src';
import type { ScribeOptions } from 'src';
import type { LLM_MODELS } from 'src/util/openAiUtils';
import type { TRANSCRIPT_PLATFORM } from 'src/settings/settings';
import { ModalLanguageOptions } from './options/ModalLanguageOptions';

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
  const [isLanguageOptionsExpanded, setIsLanguageOptionsExpanded] =
    useState(false);

  return (
    <div>
      <p>Session settings</p>
      <div className="scribe-options-container">
        <ModalRecordingOptions options={options} setOptions={setOptions} />
      </div>

      <button
        onClick={() => setIsLanguageOptionsExpanded(!isLanguageOptionsExpanded)}
        type="button"
        className="scribe-settings-btn"
      >
        Language options
      </button>

      <button
        onClick={() => setIsModalOptionsExpanded(!isModelOptionsExpanded)}
        type="button"
        className="scribe-settings-btn"
      >
        Model options
      </button>
      {isLanguageOptionsExpanded && (
        <>
          <h5>Language options</h5>
          <ModalLanguageOptions options={options} setOptions={setOptions} />
        </>
      )}
      {isModelOptionsExpanded && (
        <>
          <h5>AI model options</h5>
          <ModalAiModelOptions options={options} setOptions={setOptions} />
        </>
      )}
    </div>
  );
}
