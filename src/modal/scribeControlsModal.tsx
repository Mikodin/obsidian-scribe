import { Modal } from 'obsidian';
import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type ScribePlugin from 'src';
import type { ScribeOptions } from 'src';
import { ModalOptionsContainer } from './components/ModalOptionsContainer';
import { ModalRecordingButtons } from './components/ModalRecordingButtons';
import { ModalRecordingTimer } from './components/ModalRecordingTimer';
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
  // Initialize state based on whether recording is already in progress
  const isRecordingInProgress =
    plugin.state.audioRecord?.mediaRecorder?.state === 'recording';

  const [isActive, setIsActive] = useState(isRecordingInProgress);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>(
    isRecordingInProgress ? 'recording' : 'inactive',
  );
  const [isScribing, setIsScribing] = useState(false);
  const [recordingStartTimeMs, setRecordingStartTimeMs] = useState<
    number | null
  >(plugin.recordingNoticeStartTime);
  const [scribeOptions, setScribeOptions] = useState<ScribeOptions>({
    isAppendToActiveFile: plugin.settings.isAppendToActiveFile,
    isOnlyTranscribeActive: plugin.settings.isOnlyTranscribeActive,
    isSaveAudioFileActive: plugin.settings.isSaveAudioFileActive,
    isMultiSpeakerEnabled: plugin.settings.isMultiSpeakerEnabled,
    isDisableLlmTranscription: plugin.settings.isDisableLlmTranscription,
    audioFileLanguage: plugin.settings.audioFileLanguage,
    scribeOutputLanguage: plugin.settings.scribeOutputLanguage,
    transcriptPlatform: plugin.settings.transcriptPlatform,
    llmModel: plugin.settings.llmModel,
    activeNoteTemplate: plugin.settings.activeNoteTemplate,
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
            isProcessing={plugin.state.isProcessing}
            handleStart={handleStart}
            handlePauseResume={handlePauseResume}
            handleComplete={handleComplete}
            handleReset={handleReset}
          />
        </>
      )}

      <hr />
      <ModalOptionsContainer
        plugin={plugin}
        options={scribeOptions}
        setOptions={setScribeOptions}
      />
    </div>
  );
};
