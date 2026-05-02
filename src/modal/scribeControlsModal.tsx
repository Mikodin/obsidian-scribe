import { Modal } from 'obsidian';
import { useEffect, useState } from 'react';
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
  const isRecordingInProgress = plugin.isRecordingActive();
  const initialRecordingState = plugin.getRecordingState();

  const [isActive, setIsActive] = useState(isRecordingInProgress);
  const [recordingState, setRecordingState] = useState<RecordingState>(
    initialRecordingState,
  );
  const [isScribing, setIsScribing] = useState(false);
  const [elapsedRecordingTimeMs, setElapsedRecordingTimeMs] = useState<number>(
    plugin.getRecordingDurationMs(),
  );
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

  useEffect(() => {
    let timer: number | null = null;

    if (isActive) {
      timer = window.setInterval(() => {
        setElapsedRecordingTimeMs(plugin.getRecordingDurationMs());
      }, 10);
    }

    return () => {
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [isActive, plugin]);

  const hasOpenAiApiKey = Boolean(plugin.settings.openAiApiKey);

  const handleStart = async () => {
    try {
      await plugin.startRecording();

      const currentState = plugin.getRecordingState();
      setRecordingState(currentState);
      setElapsedRecordingTimeMs(plugin.getRecordingDurationMs());
      setIsActive(currentState === 'recording' || currentState === 'paused');
    } catch (error) {
      setRecordingState('inactive');
      setIsActive(false);
      setElapsedRecordingTimeMs(0);
      console.error('Scribe: failed to start recording in modal', error);
    }
  };

  const handlePauseResume = async () => {
    try {
      const updatedState = await plugin.handlePauseResumeRecording();

      setRecordingState(updatedState);
      setIsActive(updatedState === 'recording' || updatedState === 'paused');
      setElapsedRecordingTimeMs(plugin.getRecordingDurationMs());
    } catch (error) {
      console.error('Scribe: failed to pause/resume recording in modal', error);
    }
  };

  const handleComplete = async () => {
    plugin.hideRecordingNotice();
    setIsScribing(true);
    setElapsedRecordingTimeMs(0);
    setRecordingState('inactive');
    await plugin.scribe(scribeOptions);
    setIsActive(false);
    setIsScribing(false);
  };

  const handleReset = async () => {
    await plugin.cancelRecording();

    setRecordingState('inactive');
    setIsActive(false);
    setElapsedRecordingTimeMs(0);
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
          <ModalRecordingTimer elapsedTimeMs={elapsedRecordingTimeMs} />

          <ModalRecordingButtons
            recordingState={recordingState}
            active={isActive}
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
