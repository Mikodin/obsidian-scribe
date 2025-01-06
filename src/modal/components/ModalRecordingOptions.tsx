import type { ScribeOptions } from 'src';

export function ModalRecordingOptions({
  options,
  setOptions,
}: {
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
}) {
  const handleChangeIsAppendToActiveFile = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // setIsAppendToActiveFile(event.target.checked);
    setOptions({ ...options, isAppendToActiveFile: event.target.checked });
  };
  const handleChangeIsOnlyTranscribeActive = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setOptions({ ...options, isOnlyTranscribeActive: event.target.checked });
    // setIsOnlyTranscribeActive(event.target.checked);
  };

  const { isAppendToActiveFile, isOnlyTranscribeActive } = options;

  return (
    <div className="scribe-recording-options">
      <label>
        <input
          type="checkbox"
          checked={isAppendToActiveFile}
          onChange={handleChangeIsAppendToActiveFile}
        />
        Append to active file
      </label>

      <label>
        <input
          type="checkbox"
          checked={isOnlyTranscribeActive}
          onChange={handleChangeIsOnlyTranscribeActive}
        />
        Only transcribe recording
      </label>
    </div>
  );
}
