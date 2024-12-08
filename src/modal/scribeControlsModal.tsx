import { createRoot, type Root } from 'react-dom/client';
import { Modal } from 'obsidian';
import type ScribePlugin from 'src';
import { useState } from 'react';
import { ModalSettings } from './components/ModalSettings';
import { ModalRecordingTimer } from './components/ModalRecordingTimer';
import { ModalRecordingButtons } from './components/ModalRecordingButtons';

export class ScribeControlsModal extends Modal {
  plugin: ScribePlugin;
  root: Root | null;

  constructor(plugin: ScribePlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  async onOpen() {
    this.plugin.state.isOpen = true;
    this.initModal();
  }

  async onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.plugin.state.isOpen = false;
    this.plugin.cancelRecording();
    this.root?.unmount();
  }

  initModal() {
    const { contentEl } = this;
    this.modalEl.addClass('scribe-modal');

    const reactTestWrapper = contentEl.createDiv({
      cls: 'scribe-controls-modal-react',
    });

    this.root = createRoot(reactTestWrapper);
    this.root.render(<ScribeModal plugin={this.plugin} />);
  }
}

const ScribeModal: React.FC<{ plugin: ScribePlugin }> = ({ plugin }) => {
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [recordingState, setRecordingState] =
    useState<RecordingState>('inactive');
  const [isScribing, setIsScribing] = useState(false);
  const [recordingStartTimeMs, setRecordingStartTimeMs] = useState<
    number | null
  >(null);

  const handleStart = async () => {
    setRecordingState('recording');
    await plugin.startRecording();
    setRecordingStartTimeMs(Date.now());

    setIsActive(true);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    const updatedIsPauseState = !isPaused;
    setIsPaused(updatedIsPauseState);

    if (updatedIsPauseState) {
      setRecordingState('paused');
    } else {
      setRecordingState('recording');
    }

    plugin.handlePauseResumeRecording();
  };

  const handleComplete = async () => {
    setIsPaused(true);
    setIsScribing(true);
    setRecordingStartTimeMs(null);
    setRecordingState('inactive');
    await plugin.scribe();
    setIsPaused(false);
    setIsActive(false);
    setIsScribing(false);
  };

  const handleReset = () => {
    plugin.cancelRecording();

    setRecordingState('inactive');
    setIsActive(false);
    setRecordingStartTimeMs(null);
  };

  return (
    <div className="scribe-modal-container">
      <ModalRecordingTimer startTimeMs={recordingStartTimeMs} />
      <ModalRecordingButtons
        recordingState={recordingState}
        active={isActive}
        isPaused={isPaused}
        isScribing={isScribing}
        handleStart={handleStart}
        handlePauseResume={handlePauseResume}
        handleComplete={handleComplete}
        handleReset={handleReset}
      />

      <hr />
      <button onClick={() => setIsSettingsExpanded(!isSettingsExpanded)} type="button" className="scribe-settings-btn">
        Settings
      </button>
      {isSettingsExpanded && (

      <ModalSettings plugin={plugin} />
      )}
    </div>
  );
};
