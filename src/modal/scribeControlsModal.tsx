import { createRoot, type Root } from 'react-dom/client';
import { Modal } from 'obsidian';
import type ScribePlugin from 'src';
import type { ScribeOptions } from 'src';
import { useEffect, useState } from 'react';
import { ModalRecordingTimer } from './components/ModalRecordingTimer';
import { ModalRecordingButtons } from './components/ModalRecordingButtons';
import { CircleAlert } from './icons/icons';
import { ModalOptionsContainer } from './components/ModalOptionsContainer';

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
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [recordingState, setRecordingState] =
    useState<RecordingState>('inactive');
  const [isScribing, setIsScribing] = useState(false);
  const [accumulatedElapsedMs, setAccumulatedElapsedMs] = useState(0);
  const [displayElapsedMs, setDisplayElapsedMs] = useState(0);
  const [lastResumeTimestampMs, setLastResumeTimestampMs] =
    useState<number | null>(null);
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

  useEffect(() => {
    if (!isActive) {
      setDisplayElapsedMs(0);
      return;
    }

    if (isPaused || lastResumeTimestampMs === null) {
      setDisplayElapsedMs(accumulatedElapsedMs);
      return;
    }

    const updateElapsed = () => {
      setDisplayElapsedMs(
        accumulatedElapsedMs + (Date.now() - lastResumeTimestampMs),
      );
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 50);

    return () => window.clearInterval(interval);
  }, [isActive, isPaused, lastResumeTimestampMs, accumulatedElapsedMs]);

  const handleStart = async () => {
    const now = Date.now();
    setAccumulatedElapsedMs(0);
    setDisplayElapsedMs(0);
    setLastResumeTimestampMs(now);
    setRecordingState('recording');
    setIsActive(true);
    setIsPaused(false);
    await plugin.startRecording();
  };

  const handlePauseResume = () => {
    if (isPaused) {
      setLastResumeTimestampMs(Date.now());
      setRecordingState('recording');
      setIsPaused(false);
    } else {
      const now = Date.now();
      let updatedElapsed = accumulatedElapsedMs;
      if (lastResumeTimestampMs !== null) {
        updatedElapsed += now - lastResumeTimestampMs;
      }
      setAccumulatedElapsedMs(updatedElapsed);
      setDisplayElapsedMs(updatedElapsed);
      setLastResumeTimestampMs(null);
      setRecordingState('paused');
      setIsPaused(true);
    }

    plugin.handlePauseResumeRecording();
  };

  const handleComplete = async () => {
    let finalElapsed = accumulatedElapsedMs;
    if (!isPaused && lastResumeTimestampMs !== null) {
      finalElapsed += Date.now() - lastResumeTimestampMs;
    }

    setAccumulatedElapsedMs(finalElapsed);
    setDisplayElapsedMs(finalElapsed);
    setLastResumeTimestampMs(null);
    setIsPaused(true);
    setIsScribing(true);
    setRecordingState('inactive');
    await plugin.scribe(scribeOptions);
    setAccumulatedElapsedMs(0);
    setDisplayElapsedMs(0);
    setIsPaused(false);
    setIsActive(false);
    setIsScribing(false);
  };

  const handleReset = () => {
    plugin.cancelRecording();

    setRecordingState('inactive');
    setIsActive(false);
    setAccumulatedElapsedMs(0);
    setDisplayElapsedMs(0);
    setLastResumeTimestampMs(null);
    setIsPaused(true);
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
          <ModalRecordingTimer elapsedMs={displayElapsedMs} />

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
      <ModalOptionsContainer
        plugin={plugin}
        options={scribeOptions}
        setOptions={setScribeOptions}
      />
    </div>
  );
};
