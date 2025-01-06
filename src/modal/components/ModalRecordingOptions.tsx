export function ModalRecordingOptions({
  isAppendToActiveFile,
  setIsAppendToActiveFile,
  isOnlyTranscribeActive,
  setIsOnlyTranscribeActive,
}: {
  isAppendToActiveFile: boolean;
  setIsAppendToActiveFile: (value: boolean) => void;
  isOnlyTranscribeActive: boolean;
  setIsOnlyTranscribeActive: (value: boolean) => void;
}) {
  const handleChangeIsAppendToActiveFile = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsAppendToActiveFile(event.target.checked);
  };
  const handleChangeIsOnlyTranscribeActive = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsOnlyTranscribeActive(event.target.checked);
  };

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
