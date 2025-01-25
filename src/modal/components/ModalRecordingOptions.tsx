import type { ScribeOptions } from 'src';

export function ModalRecordingOptions({
  options,
  setOptions,
}: {
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
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
    </div>
  );
}
