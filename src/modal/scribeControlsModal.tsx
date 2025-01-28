import { createRoot, type Root } from 'react-dom/client';
import { Modal } from 'obsidian';
import type ScribePlugin from 'src';
import type { ScribeOptions } from 'src';
import { useState } from 'react';
import { ModalSettings } from './components/ModalSettings';
import { ModalRecordingTimer } from './components/ModalRecordingTimer';
import { ModalRecordingButtons } from './components/ModalRecordingButtons';
import { ModalRecordingOptions } from './components/ModalRecordingOptions';
import { CircleAlert } from './icons/icons';

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
  const [scribeOptions, setScribeOptions] = useState<ScribeOptions>({
    isAppendToActiveFile: false,
    isOnlyTranscribeActive: plugin.settings.isOnlyTranscribeActive,
    isSaveAudioFileActive: plugin.settings.isSaveAudioFileActive,
  });

  const hasOpenAiApiKey = Boolean(plugin.settings.openAiApiKey);

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
    await plugin.scribe(scribeOptions);
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
      {!hasOpenAiApiKey && (
        <div className="scribe-settings-warning-container">
          <h1>
            ️<CircleAlert /> Missing Open AI API key
          </h1>
          <h2 className="scribe-settings-warning">
            Please enter the key in the plugin settings.
          </h2>
          <p>You can get your API key here</p>
          <a href="https://platform.openai.com/settings">OpenAI Platform</a>
        </div>
      )}
      {hasOpenAiApiKey && (
        <>
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
        </>
      )}

      <hr />
      <div className="scribe-options-container">
        <button
          onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
          type="button"
          className="scribe-settings-btn"
        >
          Settings
        </button>
        <ModalRecordingOptions
          options={scribeOptions}
          setOptions={setScribeOptions}
        />
      </div>

      {isSettingsExpanded && <ModalSettings plugin={plugin} />}
    </div>
  );
};
