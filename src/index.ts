import { Notice, normalizePath, Plugin, type TFile } from 'obsidian';

import {
  createLlmAdapter,
  resolveLlmConfig,
} from './aiProviders/llm/llmAdapter';
import type { LlmSummary } from './aiProviders/prompts';
import {
  getMissingApiKeys,
  LLM_PROVIDERS,
  TRANSCRIPT_PROVIDERS,
} from './aiProviders/providerMetadata';
import { transcribeAudio } from './aiProviders/transcription/transcriptionAdapter';
import { AudioRecord } from './audioRecord/audioRecord';
import { handleCommands } from './commands/commands';
import { ScribeControlsModal } from './modal/scribeControlsModal';
import { handleRibbon } from './ribbon/ribbon';
import type { ScribeTemplate } from './settings/components/NoteTemplateSettings';
import { migrateSettings } from './settings/migration';
import {
  DEFAULT_SETTINGS,
  handleSettingsTab,
  type ScribePluginSettings,
} from './settings/settings';
import type {
  LanguageOptions,
  PROCESS_PLATFORM,
  TRANSCRIPT_PLATFORM,
} from './util/consts';
import { formatFilenamePrefix } from './util/filenameUtils';
import {
  appendSkeletonToNote,
  createNewNote,
  renameFile,
  replaceTextInNote,
  saveAudioRecording,
  updateFrontMatter,
} from './util/fileUtils';
import {
  mimeTypeToFileExtension,
  type SupportedMimeType,
} from './util/mimeType';
import { getDefaultPathSettings } from './util/pathUtils';
import {
  buildNoteSkeleton,
  ensureSystemSections,
  renderLlmSection,
  renderTranscriptSection,
  type SkeletonBlocks,
} from './util/templateSections';
import { convertToSafeJsonKey, extractMermaidChart } from './util/textUtil';

export interface ScribeState {
  isOpen: boolean;
  counter: number;
  audioRecord: AudioRecord | null;
  isProcessing: boolean;
  sessionScribeOptions: ScribeOptions | null;
}

const DEFAULT_STATE: ScribeState = {
  isOpen: false,
  counter: 0,
  audioRecord: null,
  isProcessing: false,
  sessionScribeOptions: null,
};

export interface ScribeOptions {
  isAppendToActiveFile: boolean;
  isOnlyTranscribeActive: boolean;
  isSaveAudioFileActive: boolean;
  isMultiSpeakerEnabled: boolean;
  isDisableLlmTranscription: boolean;
  audioFileLanguage: LanguageOptions;
  scribeOutputLanguage: Exclude<LanguageOptions, 'auto'>;
  transcriptPlatform: TRANSCRIPT_PLATFORM;
  processPlatform: PROCESS_PLATFORM;
  llmModel: string;
  activeNoteTemplate: ScribeTemplate;
  additionalSystemPrompt?: string;
}

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings = DEFAULT_SETTINGS;
  state: ScribeState = DEFAULT_STATE;
  controlModal!: ScribeControlsModal;
  private recordingNotice: Notice | null = null;
  private recordingNoticeIntervalId: number | null = null;
  public recordingNoticeStartTime: number | null = null;

  async onload() {
    /**
     * Ensures that Obsidian is fully bootstrapped before plugging in.
     * Helps with load time
     * Ensures that when we get the default folders for settings, they are available
     * https://docs.obsidian.md/Plugins/Guides/Optimizing+plugin+load+time#Listening+to+%60vault.on('create')%60
     */
    this.app.workspace.onLayoutReady(async () => {
      await this.loadSettings();
      handleRibbon(this);
      handleCommands(this);
      handleSettingsTab(this);
      this.controlModal = new ScribeControlsModal(this);
    });
  }

  onunload() {}

  async loadSettings() {
    const savedUserData: ScribePluginSettings = await this.loadData();
    const { settings: migratedUserData, didMigrate } =
      migrateSettings(savedUserData);
    this.settings = { ...DEFAULT_SETTINGS, ...migratedUserData };

    if (didMigrate) {
      await this.saveData(this.settings);
    }

    const defaultPathSettings = await getDefaultPathSettings(this);

    for (const missingKey of getMissingApiKeys(this.settings)) {
      console.error(
        `${missingKey.provider} API key is needed in Scribes settings - ${missingKey.consoleUrl}`,
      );
      new Notice(`⚠️ Scribe: ${missingKey.provider} API key is missing`);
    }

    if (!this.settings.recordingDirectory) {
      this.settings.recordingDirectory =
        defaultPathSettings.defaultNewResourcePath;
    }
    if (!this.settings.transcriptDirectory) {
      this.settings.transcriptDirectory =
        defaultPathSettings.defaultNewFilePath;
    }
  }

  async saveSettings() {
    new Notice('Scribe: ✅ Settings saved');
    await this.saveData(this.settings);
  }

  async startRecording() {
    if (this.state.isProcessing) {
      new Notice('Scribe: ⏳ Processing in progress. Please wait...');
      return;
    }

    const newRecording = new AudioRecord();
    this.state.audioRecord = newRecording;

    try {
      await newRecording.startRecording(this.settings.selectedAudioDeviceId);
      this.recordingNoticeStartTime = newRecording.startTime;
      new Notice('Scribe: 🎙️ Recording started');
    } catch (error) {
      this.state.audioRecord = null;
      new Notice('Scribe: ⚠️ Unable to start recording');
      throw error;
    }

    if (!this.state.isOpen) {
      this.showRecordingNotice();
    }
  }

  async handlePauseResumeRecording() {
    const audioRecord = this.state.audioRecord;
    if (!audioRecord) {
      throw new Error('There is no active recording');
    }

    const updatedState = await audioRecord.handlePauseResume();

    if (updatedState === 'recording') {
      new Notice('Scribe: ▶️🎙️ Resuming recording');
    }

    if (updatedState === 'paused') {
      new Notice('Scribe: ⏸️🎙️ Recording paused');
    }

    this.updateRecordingNotice();

    return updatedState;
  }

  async cancelRecording() {
    this.hideRecordingNotice();
    this.state.sessionScribeOptions = null;
    if (this.state.audioRecord?.mediaRecorder) {
      new Notice('Scribe: 🛑️ Recording cancelled');
      await this.state.audioRecord?.stopRecording();
    }
  }

  async scribe(scribeOptionsOverride?: ScribeOptions) {
    const scribeOptions: ScribeOptions = scribeOptionsOverride ??
      this.state.sessionScribeOptions ?? {
        isAppendToActiveFile: this.settings.isAppendToActiveFile,
        isOnlyTranscribeActive: this.settings.isOnlyTranscribeActive,
        isMultiSpeakerEnabled: this.settings.isMultiSpeakerEnabled,
        isSaveAudioFileActive: this.settings.isSaveAudioFileActive,
        isDisableLlmTranscription: this.settings.isDisableLlmTranscription,
        audioFileLanguage: this.settings.audioFileLanguage,
        scribeOutputLanguage: this.settings.scribeOutputLanguage,
        transcriptPlatform: this.settings.transcriptPlatform,
        processPlatform: this.settings.processPlatform,
        llmModel: resolveLlmConfig(this.settings).model,
        activeNoteTemplate: this.settings.activeNoteTemplate,
      };

    this.state.isProcessing = true;
    try {
      const baseFileName = formatFilenamePrefix(
        this.settings.recordingFilenamePrefix,
        this.settings.dateFilenameFormat,
      );

      const { recordingBuffer, recordingFile } =
        await this.handleStopAndSaveRecording(baseFileName);

      const note = await this.resolveTargetNote(
        baseFileName,
        scribeOptions.isAppendToActiveFile,
      );

      if (scribeOptions.isSaveAudioFileActive) {
        await updateFrontMatter(this, note, recordingFile);
      } else {
        await updateFrontMatter(this, note);
      }

      await this.handleScribeFile({
        note,
        audioRecordingFile: recordingFile,
        audioRecordingBuffer: recordingBuffer,
        scribeOptions: scribeOptions,
      });

      if (!scribeOptions.isSaveAudioFileActive) {
        const fileName = recordingFile.name;
        await this.app.fileManager.trashFile(recordingFile);
        new Notice(`Scribe: ✅🗑️ Audio file deleted ${fileName}`);
      }
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${String(error)}`);
      console.error('Scribe: Something went wrong', error);
    } finally {
      this.cleanup();
    }
  }

  async scribeExistingFile(
    audioFile: TFile,
    scribeOptions: ScribeOptions = {
      isAppendToActiveFile: this.settings.isAppendToActiveFile,
      isOnlyTranscribeActive: this.settings.isOnlyTranscribeActive,
      isMultiSpeakerEnabled: this.settings.isMultiSpeakerEnabled,
      isSaveAudioFileActive: this.settings.isSaveAudioFileActive,
      isDisableLlmTranscription: this.settings.isDisableLlmTranscription,
      audioFileLanguage: this.settings.audioFileLanguage,
      scribeOutputLanguage: this.settings.scribeOutputLanguage,
      transcriptPlatform: this.settings.transcriptPlatform,
      processPlatform: this.settings.processPlatform,
      llmModel: resolveLlmConfig(this.settings).model,
      activeNoteTemplate: this.settings.activeNoteTemplate,
    },
  ) {
    this.state.isProcessing = true;
    try {
      if (
        !mimeTypeToFileExtension(
          `audio/${audioFile.extension}` as SupportedMimeType,
        )
      ) {
        new Notice('Scribe: ⚠️ This file type is not supported.');
        return;
      }
      const baseFileName = formatFilenamePrefix(
        this.settings.recordingFilenamePrefix,
        this.settings.dateFilenameFormat,
      );

      const audioFileBuffer = await this.app.vault.readBinary(audioFile);

      const note = await this.resolveTargetNote(
        baseFileName,
        scribeOptions.isAppendToActiveFile,
      );

      if (scribeOptions.isSaveAudioFileActive) {
        await updateFrontMatter(this, note, audioFile);
      } else {
        await updateFrontMatter(this, note);
      }

      await this.handleScribeFile({
        note,
        audioRecordingFile: audioFile,
        audioRecordingBuffer: audioFileBuffer,
        scribeOptions: scribeOptions,
      });
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${String(error)}`);
      console.error('Scribe: Something went wrong', error);
    } finally {
      this.cleanup();
    }
  }

  async fixMermaidChart(file: TFile) {
    this.state.isProcessing = true;
    try {
      let brokenMermaidChart: string | undefined;
      await this.app.vault.process(file, (data) => {
        brokenMermaidChart = extractMermaidChart(data);
        return data;
      });

      let fixedMermaidChart: string | undefined;
      if (brokenMermaidChart) {
        const llmConfig = resolveLlmConfig(this.settings);
        const llmAdapter = createLlmAdapter(llmConfig);

        fixedMermaidChart = (
          await llmAdapter.fixMermaidChart(brokenMermaidChart)
        ).mermaidChart;
      }

      if (brokenMermaidChart && fixedMermaidChart) {
        await this.app.vault.process(file, (data) => {
          brokenMermaidChart = extractMermaidChart(data);

          return data.replace(
            brokenMermaidChart as string,
            `${fixedMermaidChart}
`,
          );
        });
      }
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${String(error)}`);
    } finally {
      this.cleanup();
    }
  }

  async handleStopAndSaveRecording(baseFileName: string) {
    const audioRecord = this.state.audioRecord as AudioRecord;

    const audioBlob = await audioRecord.stopRecording();
    const recordingBuffer = await audioBlob.arrayBuffer();

    const recordingFile = await saveAudioRecording(
      this,
      recordingBuffer,
      baseFileName,
    );
    new Notice(`Scribe: ✅ Audio file saved ${recordingFile.name}`);

    return { recordingBuffer, recordingFile };
  }

  private async resolveTargetNote(
    baseFileName: string,
    isAppendToActiveFile: boolean,
  ): Promise<TFile> {
    if (isAppendToActiveFile) {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile) {
        return activeFile;
      }

      new Notice('Scribe: ⚠️ No active file to append to, creating new one!');
      const note = await createNewNote(this, baseFileName);
      await this.app.workspace.openLinkText(note.path, '', true);
      return note;
    }

    return createNewNote(this, baseFileName);
  }

  async handleScribeFile({
    note,
    audioRecordingFile,
    audioRecordingBuffer,
    scribeOptions,
  }: {
    note: TFile;
    audioRecordingFile: TFile;
    audioRecordingBuffer: ArrayBuffer;
    scribeOptions: ScribeOptions;
  }) {
    const {
      isAppendToActiveFile,
      isOnlyTranscribeActive,
      isSaveAudioFileActive,
      activeNoteTemplate,
    } = scribeOptions;

    if (!isAppendToActiveFile) {
      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      await this.app.workspace.openLinkText(note.path, currentPath, true);
    }

    const { template } = ensureSystemSections(activeNoteTemplate);

    const { skeleton, transcriptSection, transcriptBlock, llmBlocks } =
      buildNoteSkeleton(template, {
        audioEmbedPath: isSaveAudioFileActive ? audioRecordingFile.path : null,
        includeLlmSections: !isOnlyTranscribeActive,
      });
    await appendSkeletonToNote(this, note, skeleton);

    const audioExtension = audioRecordingFile.extension;
    const audioMimeType =
      audioExtension === 'mp3' ? 'audio/mpeg' : `audio/${audioExtension}`;

    let transcript: string;
    try {
      transcript = await this.handleTranscription(
        audioRecordingBuffer,
        scribeOptions,
        audioMimeType,
      );
    } catch (error) {
      if (transcriptSection && transcriptBlock) {
        await replaceTextInNote(
          this,
          note,
          transcriptBlock,
          renderTranscriptSection(
            transcriptSection,
            '⚠️ *Transcription failed*',
          ),
        );
      }
      await this.removeLlmSkeleton(note, llmBlocks);
      throw error;
    }

    if (transcriptSection && transcriptBlock) {
      await replaceTextInNote(
        this,
        note,
        transcriptBlock,
        renderTranscriptSection(transcriptSection, transcript),
      );
    }

    if (isOnlyTranscribeActive) {
      return;
    }

    if (!transcript.trim()) {
      new Notice('Scribe: ⚠️ Skipping LLM processing — transcript is empty');
      await this.removeLlmSkeleton(note, llmBlocks);
      return;
    }

    let llmSummary: LlmSummary;
    try {
      llmSummary = await this.handleTranscriptSummary(
        transcript,
        scribeOptions,
      );
    } catch (error) {
      await this.removeLlmSkeleton(note, llmBlocks);
      throw error;
    }

    await this.app.vault.process(note, (data) => {
      let updated = data;
      for (const { section, block } of llmBlocks) {
        const sectionValue =
          llmSummary[convertToSafeJsonKey(section.sectionHeader)];

        if (section.isSectionOptional && !sectionValue) {
          const withoutBlock = updated.replace(`\n${block}`, () => '');
          updated =
            withoutBlock === updated
              ? updated.replace(block, () => '')
              : withoutBlock;
          continue;
        }

        updated = updated.replace(block, () =>
          renderLlmSection(section, sectionValue ?? ''),
        );
      }
      return updated;
    });

    const shouldRenameNote = !isAppendToActiveFile;
    if (shouldRenameNote && llmSummary.fileTitle) {
      const llmFileName = `${formatFilenamePrefix(
        this.settings.noteFilenamePrefix,
        this.settings.dateFilenameFormat,
      )}${normalizePath(llmSummary.fileTitle)}`;

      await renameFile(this, note, llmFileName);
    }
  }

  private async removeLlmSkeleton(
    note: TFile,
    llmBlocks: SkeletonBlocks['llmBlocks'],
  ) {
    if (!llmBlocks.length) {
      return;
    }

    await this.app.vault.process(note, (data) => {
      let updated = data;
      for (const { block } of llmBlocks) {
        const withoutBlock = updated.replace(`\n${block}`, () => '');
        updated =
          withoutBlock === updated
            ? updated.replace(block, () => '')
            : withoutBlock;
      }
      return updated;
    });
  }

  async handleTranscription(
    audioBuffer: ArrayBuffer,
    scribeOptions: ScribeOptions,
    audioMimeType: string,
  ) {
    const provider = TRANSCRIPT_PROVIDERS[scribeOptions.transcriptPlatform];
    try {
      if (this.settings.isDisableLlmTranscription) {
        new Notice('Scribe: 🎧 Transcription is disabled in settings');
        return '';
      }

      if (!this.settings[provider.apiKeySettingsField]) {
        new Notice(
          `Scribe: ⚠️ Missing ${provider.displayName} API key — add it in settings`,
        );
        throw new Error(`Missing ${provider.displayName} API key`);
      }

      new Notice(
        `Scribe: 🎧 Beginning transcription w/ ${provider.displayName}`,
      );
      const transcript = await transcribeAudio(
        this.settings,
        scribeOptions,
        audioBuffer,
        audioMimeType,
      );

      new Notice(
        `Scribe: 🎧 Completed transcription  w/ ${provider.displayName}`,
      );
      return transcript;
    } catch (error) {
      new Notice(
        `Scribe: 🎧 🛑 Something went wrong trying to Transcribe w/  ${
          provider.displayName
        }
        ${String(error)}`,
      );

      console.error('Scribe: transcription failed', error);
      throw error;
    }
  }

  async handleTranscriptSummary(
    transcript: string,
    scribeOptions: ScribeOptions,
  ) {
    const llmConfig = resolveLlmConfig(this.settings, {
      platform: scribeOptions.processPlatform,
      model: scribeOptions.llmModel,
    });
    const provider = LLM_PROVIDERS[llmConfig.platform];

    if (!llmConfig.apiKey) {
      new Notice(
        `Scribe: ⚠️ Missing ${provider.displayName} API key — add it in settings`,
      );
      throw new Error(`Missing ${provider.displayName} API key`);
    }

    new Notice(`Scribe: 🧠 Sending to ${provider.displayName} to summarize`);

    const llmAdapter = createLlmAdapter(llmConfig);
    const llmSummary = await llmAdapter.summarizeTranscript(
      transcript,
      scribeOptions,
    );

    new Notice('Scribe: 🧠 LLM summation complete');

    return llmSummary;
  }

  cleanup() {
    this.hideRecordingNotice();
    this.controlModal.close();
    this.state.audioRecord = null;
    this.state.isProcessing = false;
    this.state.sessionScribeOptions = null;
  }

  showRecordingNotice() {
    this.hideRecordingNotice();

    this.recordingNoticeStartTime =
      this.state.audioRecord?.startTime ?? this.recordingNoticeStartTime;
    const notice = new Notice(this.formatRecordingNoticeMessage(), 0);
    notice.containerEl.addClass('scribe-recording-notice');
    notice.containerEl.addEventListener('click', () => {
      void this.scribe();
    });
    this.recordingNotice = notice;

    this.recordingNoticeIntervalId = window.setInterval(() => {
      this.updateRecordingNotice();
    }, 1000);
    this.registerInterval(this.recordingNoticeIntervalId);
  }

  hideRecordingNotice() {
    if (this.recordingNoticeIntervalId !== null) {
      window.clearInterval(this.recordingNoticeIntervalId);
      this.recordingNoticeIntervalId = null;
    }
    if (this.recordingNotice) {
      this.recordingNotice.hide();
      this.recordingNotice = null;
    }
    this.recordingNoticeStartTime = null;
  }

  isRecordingActive() {
    return this.state.audioRecord?.isRecordingOrPaused() ?? false;
  }

  getRecordingState(): RecordingState {
    return this.state.audioRecord?.getRecorderState() ?? 'inactive';
  }

  getRecordingDurationMs() {
    return this.state.audioRecord?.getRecordingDurationMs() ?? 0;
  }

  private updateRecordingNotice() {
    if (!this.recordingNotice) return;
    this.recordingNotice.setMessage(this.formatRecordingNoticeMessage());
  }

  private formatRecordingNoticeMessage(): string {
    const elapsed = Math.floor(this.getRecordingDurationMs() / 1000);
    const minutes = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    const recordingState = this.getRecordingState();
    if (recordingState === 'paused') {
      return `⏸️ Scribe: Recording ${minutes}:${seconds} — Tap to save`;
    }

    return `🔴 Scribe: Recording ${minutes}:${seconds} — Tap to save`;
  }
}
