import { Notice, normalizePath, Plugin, type TFile } from 'obsidian';
import type OpenAI from 'openai';

import { AudioRecord } from './audioRecord/audioRecord';
import { handleCommands } from './commands/commands';
import { ScribeControlsModal } from './modal/scribeControlsModal';
import { handleRibbon } from './ribbon/ribbon';
import type { ScribeTemplate } from './settings/components/NoteTemplateSettings';
import {
  DEFAULT_SETTINGS,
  handleSettingsTab,
  type ScribePluginSettings,
  TRANSCRIPT_PLATFORM,
} from './settings/settings';
import { transcribeAudioWithAssemblyAi } from './util/assemblyAiUtil';
import type { LanguageOptions } from './util/consts';
import { formatFilenamePrefix } from './util/filenameUtils';
import {
  appendTextToNote,
  createNewNote,
  renameFile,
  saveAudioRecording,
  setupFileFrontmatter,
} from './util/fileUtils';
import {
  mimeTypeToFileExtension,
  type SupportedMimeType,
} from './util/mimeType';
import {
  chunkAndTranscribeWithOpenAi,
  type LLM_MODELS,
  llmFixMermaidChart,
  summarizeTranscript,
} from './util/openAiUtils';
import { getDefaultPathSettings } from './util/pathUtils';
import { convertToSafeJsonKey, extractMermaidChart } from './util/textUtil';

export interface ScribeState {
  isOpen: boolean;
  counter: number;
  audioRecord: AudioRecord | null;
  openAiClient: OpenAI | null;
}

const DEFAULT_STATE: ScribeState = {
  isOpen: false,
  counter: 0,
  audioRecord: null,
  openAiClient: null,
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
  llmModel: LLM_MODELS;
  activeNoteTemplate: ScribeTemplate;
}

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings = DEFAULT_SETTINGS;
  state: ScribeState = DEFAULT_STATE;
  controlModal: ScribeControlsModal;
  private recordingNotice: Notice | null = null;
  private recordingNoticeIntervalId: number | null = null;
  private recordingNoticeStartTime: number | null = null;

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
    this.settings = { ...DEFAULT_SETTINGS, ...savedUserData };

    const defaultPathSettings = await getDefaultPathSettings(this);

    if (!this.settings.openAiApiKey) {
      console.error(
        'OpenAI API key is needed in Scribes settings - https://platform.openai.com/settings',
      );
      new Notice('⚠️ Scribe: OpenAI API key is missing for Scribe');
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
    new Notice('Scribe: 🎙️ Recording started');
    const newRecording = new AudioRecord();
    this.state.audioRecord = newRecording;

    newRecording.startRecording(this.settings.selectedAudioDeviceId);

    if (!this.state.isOpen) {
      this.showRecordingNotice();
    }
  }

  async handlePauseResumeRecording() {
    this.state.audioRecord?.handlePauseResume();
    if (this.state.audioRecord?.mediaRecorder?.state === 'recording') {
      new Notice('Scribe: ▶️🎙️ Resuming recording');
    }
    if (this.state.audioRecord?.mediaRecorder?.state === 'paused') {
      new Notice('Scribe: ⏸️🎙️ Recording paused');
    }
  }

  async cancelRecording() {
    this.hideRecordingNotice();
    if (this.state.audioRecord?.mediaRecorder) {
      new Notice('Scribe: 🛑️ Recording cancelled');
      await this.state.audioRecord?.stopRecording();
    }
  }

  async scribe(
    scribeOptions: ScribeOptions = {
      isAppendToActiveFile: this.settings.isAppendToActiveFile,
      isOnlyTranscribeActive: this.settings.isOnlyTranscribeActive,
      isMultiSpeakerEnabled: this.settings.isMultiSpeakerEnabled,
      isSaveAudioFileActive: this.settings.isSaveAudioFileActive,
      isDisableLlmTranscription: this.settings.isDisableLlmTranscription,
      audioFileLanguage: this.settings.audioFileLanguage,
      scribeOutputLanguage: this.settings.scribeOutputLanguage,
      transcriptPlatform: this.settings.transcriptPlatform,
      llmModel: this.settings.llmModel,
      activeNoteTemplate: this.settings.activeNoteTemplate,
    },
  ) {
    try {
      const baseFileName = formatFilenamePrefix(
        this.settings.recordingFilenamePrefix,
        this.settings.dateFilenameFormat,
      );

      const { recordingBuffer, recordingFile } =
        await this.handleStopAndSaveRecording(baseFileName);

      await this.handleScribeFile({
        audioRecordingFile: recordingFile,
        audioRecordingBuffer: recordingBuffer,
        scribeOptions: scribeOptions,
      });

      if (!scribeOptions.isSaveAudioFileActive) {
        const fileName = recordingFile.name;
        await this.app.vault.delete(recordingFile);
        new Notice(`Scribe: ✅🗑️ Audio file deleted ${fileName}`);
      }
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
      console.error('Scribe: Something went wrong', error);
    } finally {
      await this.cleanup();
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
      llmModel: this.settings.llmModel,
      activeNoteTemplate: this.settings.activeNoteTemplate,
    },
  ) {
    try {
      if (
        !mimeTypeToFileExtension(
          `audio/${audioFile.extension}` as SupportedMimeType,
        )
      ) {
        new Notice('Scribe: ⚠️ This file type is not supported.');
        return;
      }

      const audioFileBuffer = await this.app.vault.readBinary(audioFile);

      await this.handleScribeFile({
        audioRecordingFile: audioFile,
        audioRecordingBuffer: audioFileBuffer,
        scribeOptions: scribeOptions,
      });
    } catch (error) {
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
      console.error('Scribe: Something went wrong', error);
    } finally {
      await this.cleanup();
    }
  }

  async fixMermaidChart(file: TFile) {
    try {
      let brokenMermaidChart: string | undefined;
      await this.app.vault.process(file, (data) => {
        brokenMermaidChart = extractMermaidChart(data);
        return data;
      });

      let fixedMermaidChart: string | undefined;
      if (brokenMermaidChart) {
        const customBaseUrl = this.settings.useCustomOpenAiBaseUrl
          ? this.settings.customOpenAiBaseUrl
          : undefined;
        const customChatModel = this.settings.useCustomOpenAiBaseUrl
          ? this.settings.customChatModel
          : undefined;

        fixedMermaidChart = (
          await llmFixMermaidChart(
            this.settings.openAiApiKey,
            brokenMermaidChart,
            this.settings.llmModel,
            customBaseUrl,
            customChatModel,
          )
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
      new Notice(`Scribe: Something went wrong ${error.toString()}`);
    } finally {
      await this.cleanup();
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

  async handleScribeFile({
    audioRecordingFile,
    audioRecordingBuffer,
    scribeOptions,
  }: {
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
    const scribeNoteFilename = `${formatFilenamePrefix(
      this.settings.noteFilenamePrefix,
      this.settings.dateFilenameFormat,
    )}`;

    let note = isAppendToActiveFile
      ? (this.app.workspace.getActiveFile() as TFile)
      : await createNewNote(this, scribeNoteFilename);

    if (!note) {
      new Notice('Scribe: ⚠️ No active file to append to, creating new one!');
      note = (await createNewNote(this, scribeNoteFilename)) as TFile;

      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(note?.path, currentPath, true);
    }

    if (isSaveAudioFileActive) {
      await setupFileFrontmatter(this, note, audioRecordingFile);
    } else {
      await setupFileFrontmatter(this, note);
    }

    await this.cleanup();

    if (!isAppendToActiveFile) {
      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(note?.path, currentPath, true);
    }

    await appendTextToNote(this, note, '# Audio in progress');

    const transcript = await this.handleTranscription(
      audioRecordingBuffer,
      scribeOptions,
    );

    const inProgressHeaderToReplace = isAppendToActiveFile
      ? '# Audio in progress'
      : '\n# Audio in progress';

    const transcriptTextToAppendToNote = isSaveAudioFileActive
      ? `# Audio\n![[${audioRecordingFile.path}]]\n${transcript}`
      : `# Audio\n${transcript}`;
    await appendTextToNote(
      this,
      note,
      transcriptTextToAppendToNote,
      inProgressHeaderToReplace,
    );

    if (isOnlyTranscribeActive) {
      return;
    }

    const llmSummary = await this.handleTranscriptSummary(
      transcript,
      scribeOptions,
    );

    activeNoteTemplate.sections.forEach(async (section) => {
      const {
        sectionHeader,
        sectionOutputPrefix,
        sectionOutputPostfix,
        isSectionOptional,
      } = section;
      const sectionKey = convertToSafeJsonKey(sectionHeader);
      const sectionValue = llmSummary[sectionKey];

      if (isSectionOptional && !sectionValue) {
        return;
      }

      if (sectionOutputPrefix || sectionOutputPostfix) {
        const textToAppend = `## ${sectionHeader}\n${sectionOutputPrefix || ''}\n${sectionValue}\n${sectionOutputPostfix || ''}`;

        await appendTextToNote(this, note, textToAppend);

        return;
      }

      await appendTextToNote(
        this,
        note,
        `## ${sectionHeader}\n${sectionValue}`,
      );
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

  async handleTranscription(
    audioBuffer: ArrayBuffer,
    scribeOptions: ScribeOptions,
  ) {
    try {
      if (this.settings.isDisableLlmTranscription) {
        new Notice('Scribe: 🎧 Transcription is disabled in settings');
        return '';
      }

      new Notice(
        `Scribe: 🎧 Beginning transcription w/ ${this.settings.transcriptPlatform}`,
      );
      const transcript =
        this.settings.transcriptPlatform === TRANSCRIPT_PLATFORM.assemblyAi
          ? await transcribeAudioWithAssemblyAi(
              this.settings.assemblyAiApiKey,
              audioBuffer,
              scribeOptions,
            )
          : await chunkAndTranscribeWithOpenAi(
              this.settings.openAiApiKey,
              audioBuffer,
              scribeOptions,
              this.settings.useCustomOpenAiBaseUrl
                ? this.settings.customOpenAiBaseUrl
                : undefined,
              this.settings.useCustomOpenAiBaseUrl
                ? this.settings.customTranscriptModel
                : undefined,
            );

      new Notice(
        `Scribe: 🎧 Completed transcription  w/ ${this.settings.transcriptPlatform}`,
      );
      return transcript;
    } catch (error) {
      new Notice(
        `Scribe: 🎧 🛑 Something went wrong trying to Transcribe w/  ${
          this.settings.transcriptPlatform
        }
        ${error.toString()}`,
      );

      console.error;
      throw error;
    }
  }

  async handleTranscriptSummary(
    transcript: string,
    scribeOptions: ScribeOptions,
  ) {
    new Notice('Scribe: 🧠 Sending to LLM to summarize');

    const customBaseUrl = this.settings.useCustomOpenAiBaseUrl
      ? this.settings.customOpenAiBaseUrl
      : undefined;
    const customChatModel = this.settings.useCustomOpenAiBaseUrl
      ? this.settings.customChatModel
      : undefined;

    const llmSummary = await summarizeTranscript(
      this.settings.openAiApiKey,
      transcript,
      scribeOptions,
      this.settings.llmModel,
      customBaseUrl,
      customChatModel,
    );

    new Notice('Scribe: 🧠 LLM summation complete');

    return llmSummary;
  }

  cleanup() {
    this.hideRecordingNotice();
    this.controlModal.close();

    if (this.state.audioRecord?.mediaRecorder?.state === 'recording') {
      this.state.audioRecord?.stopRecording();
    }

    this.state.audioRecord = null;
  }

  showRecordingNotice() {
    this.hideRecordingNotice();

    this.recordingNoticeStartTime = Date.now();
    const notice = new Notice(this.formatRecordingNoticeMessage(), 0);
    notice.containerEl.addClass('scribe-recording-notice');
    notice.containerEl.addEventListener('click', () => {
      this.scribe();
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

  private updateRecordingNotice() {
    if (!this.recordingNotice || !this.recordingNoticeStartTime) return;
    this.recordingNotice.setMessage(this.formatRecordingNoticeMessage());
  }

  private formatRecordingNoticeMessage(): string {
    const elapsed = this.recordingNoticeStartTime
      ? Math.floor((Date.now() - this.recordingNoticeStartTime) / 1000)
      : 0;
    const minutes = Math.floor(elapsed / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    return `🔴 Scribe: Recording ${minutes}:${seconds} — Tap to save`;
  }
}
