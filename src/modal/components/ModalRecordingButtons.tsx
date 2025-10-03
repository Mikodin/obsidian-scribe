import { 
  TrashIcon, 
  SaveIcon, 
  PauseIcon, 
  ResumeIcon, 
  MicVocal } from '../icons/icons';

export function ModalRecordingButtons({
  active,
  isPaused,
  isScribing,
  recordingState,
  handleStart,
  handlePauseResume,
  handleReset,
  handleComplete,
}: {
  active: boolean;
  isPaused: boolean;
  isScribing: boolean;
  recordingState: RecordingState;
  handleStart: () => void;
  handlePauseResume: () => void;
  handleReset: () => void;
  handleComplete: () => void;
}) {
  const StartButton = (
    <button
      className="scribe-btn scribe-btn-start"
      onClick={handleStart}
      type="button"
    >
      <MicVocal />
      Start
    </button>
  );
  const ActiveButtons = (
    <div className="scribe-active-buttons-container">
      <div className="scribe-buttons-row">
        <button
          className="scribe-btn"
          onClick={handleReset}
          type="button"
          disabled={isScribing}
        >
          <TrashIcon />
          Reset
        </button>

        <button
          className="scribe-btn"
          onClick={handlePauseResume}
          type="button"
          disabled={isScribing}
        >
          {recordingState === "recording" && (
            <>
              <PauseIcon /> Pause
            </>
          )}
          {recordingState === "paused" && (
            <>
              <ResumeIcon /> Resume
            </>
          )}
        </button>

        {/**
         * 
        <button
          className="scribe-btn"
          onClick={handlePauseResume}
          type="button"
          disabled={isScribing}
        >
          {recordingState === 'recording' && 'Pause'}
          {recordingState === 'paused' && 'Resume'}
        </button>
         */}

        <button
          className="scribe-btn scribe-btn-save"
          onClick={handleComplete}
          type="button"
          disabled={isScribing}
        >
          <SaveIcon />
          Complete
        </button>
      </div>
      {isScribing && <h2>♽ Scribe in progress</h2>}
    </div>
  );

  return (
    <div className="scribe-control-buttons-container">
      {active ? ActiveButtons : StartButton}
    </div>
  );
}
