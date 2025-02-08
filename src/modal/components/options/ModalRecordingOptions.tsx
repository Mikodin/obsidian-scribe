import { useEffect } from 'react';
import type { ScribeOptions } from 'src';
import type ScribePlugin from 'src';
import { TRANSCRIPT_PLATFORM } from 'src/settings/settings';
import type { ScribeModelOptions } from '../ModalOptionsContainer';

export function ModalRecordingOptions({
  plugin,
  options,
  setOptions,
  modelOptions,
}: {
  plugin: ScribePlugin;
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
  modelOptions: ScribeModelOptions;
}) {
  const handleOptionsChange = (updatedOptions: ScribeOptions) => {
    setOptions({
      ...options,
      ...updatedOptions,
    });
  };

  const {
    isAppendToActiveFile,
    isOnlyTranscribeActive,
    isSaveAudioFileActive,
    isMultiSpeakerEnabled,
  } = options;

  return (
    <div className="scribe-recording-options">
      <label>
        <input
          type="checkbox"
          checked={isAppendToActiveFile}
          onChange={(event) => {
            handleOptionsChange({
              isAppendToActiveFile: event.target.checked,
            });
          }}
        />
        Append to active file
      </label>

      <label>
        <input
          type="checkbox"
          checked={isOnlyTranscribeActive}
          onChange={(event) => {
            handleOptionsChange({
              isOnlyTranscribeActive: event.target.checked,
            });
          }}
        />
        Only transcribe recording
      </label>
      <label>
        <input
          type="checkbox"
          checked={isSaveAudioFileActive}
          onChange={(event) => {
            handleOptionsChange({
              isSaveAudioFileActive: event.target.checked,
            });
          }}
        />
        Save audio file
      </label>

      {modelOptions.transcriptPlatform === TRANSCRIPT_PLATFORM.assemblyAi && (
        <label>
          <input
            type="checkbox"
            checked={isMultiSpeakerEnabled}
            onChange={(event) => {
              handleOptionsChange({
                isMultiSpeakerEnabled: event.target.checked,
              });
            }}
          />
          Multi-speaker enabled
        </label>
      )}
    </div>
  );
}
