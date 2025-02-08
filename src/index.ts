import { Notice, Plugin, type TFile, moment, normalizePath } from 'obsidian';
import type OpenAI from 'openai';
import {
  DEFAULT_SETTINGS,
  handleSettingsTab,
  TRANSCRIPT_PLATFORM,
  type ScribePluginSettings,
} from './settings/settings';
import { handleRibbon } from './ribbon/ribbon';
import { handleCommands } from './commands/commands';
import { getDefaultPathSettings } from './util/pathUtils';
import { AudioRecord } from './audioRecord/audioRecord';
import {
  appendTextToNote,
  createNewNote,
  renameFile,
  saveAudioRecording,
  setupFileFrontmatter,
} from './util/fileUtils';
import {
  chunkAndTranscribeWithOpenAi,
  llmFixMermaidChart,
  summarizeTranscript,
} from './util/openAiUtils';
import { ScribeControlsModal } from './modal/scribeControlsModal';
import {
  mimeTypeToFileExtension,
  type SupportedMimeType,
} from './util/mimeType';
import { extractMermaidChart } from './util/textUtil';
import { transcribeAudioWithAssemblyAi } from './util/assemblyAiUtil';
import { formatFilenamePrefix } from './util/filenameUtils';

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
  isAppendToActiveFile?: boolean;
  isOnlyTranscribeActive?: boolean;
  isSaveAudioFileActive?: boolean;
  isMultiSpeakerEnabled?: boolean;
}

export default class ScribePlugin extends Plugin {
  settings: ScribePluginSettings = DEFAULT_SETTINGS;
  state: ScribeState = DEFAULT_STATE;
  controlModal: ScribeControlsModal;

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

    newRecording.startRecording();
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
    if (this.state.audioRecord?.mediaRecorder) {
      new Notice('Scribe: 🛑️ Recording cancelled');
      await this.state.audioRecord?.stopRecording();
    }
  }

  async scribe(scribeOptions: ScribeOptions = {}) {
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
    scribeOptions: ScribeOptions = {},
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
        fixedMermaidChart = (
          await llmFixMermaidChart(
            this.settings.openAiApiKey,
            brokenMermaidChart,
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
    scribeOptions = {},
  }: {
    audioRecordingFile: TFile;
    audioRecordingBuffer: ArrayBuffer;
    scribeOptions?: ScribeOptions;
  }) {
    const {
      isAppendToActiveFile,
      isOnlyTranscribeActive,
      isSaveAudioFileActive,
      isMultiSpeakerEnabled,
    } = scribeOptions;
    const scribeNoteFilename = `${formatFilenamePrefix(
      this.settings.noteFilenamePrefix,
      this.settings.dateFilenameFormat,
    )}`;

    let note = isAppendToActiveFile
      ? this.app.workspace.getActiveFile()
      : await createNewNote(this, scribeNoteFilename);

    if (!note) {
      new Notice('Scribe: ⚠️ No active file to append to, creating new one!');
      note = await createNewNote(this, scribeNoteFilename);

      const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
      this.app.workspace.openLinkText(note?.path, currentPath, true);
    }

    if (isSaveAudioFileActive) {
      await setupFileFrontmatter(this, note, audioRecordingFile);
    } else {
      await setupFileFrontmatter(this, note);
    }

    await this.cleanup();

    const currentPath = this.app.workspace.getActiveFile()?.path ?? '';
    this.app.workspace.openLinkText(note?.path, currentPath, true);

    await appendTextToNote(this, note, '# Transcript in progress');

    const transcript = await this.handleTranscription(audioRecordingBuffer, {
      isMultiSpeakerEnabled,
    });

    const inProgressHeaderToReplace = isAppendToActiveFile
      ? '# Transcript in progress'
      : '\n# Transcript in progress';

    const transcriptTextToAppendToNote = isSaveAudioFileActive
      ? `# Transcript\n![[${audioRecordingFile.path}]]\n${transcript}`
      : `# Transcript\n${transcript}`;
    await appendTextToNote(
      this,
      note,
      transcriptTextToAppendToNote,
      inProgressHeaderToReplace,
    );

    if (isOnlyTranscribeActive) {
      return;
    }

    const llmSummary = await this.handleTranscriptSummary(transcript);
    await appendTextToNote(this, note, `## Summary\n${llmSummary.summary}`);
    await appendTextToNote(this, note, `## Insights\n${llmSummary.insights}`);

    if (llmSummary.answeredQuestions) {
      await appendTextToNote(
        this,
        note,
        `## Answered Questions\n${llmSummary.answeredQuestions}`,
      );
    }

    await appendTextToNote(
      this,
      note,
      `## Mermaid Chart\n\`\`\`mermaid\n${llmSummary.mermaidChart}\n\`\`\``,
    );

    const shouldRenameNote = !isAppendToActiveFile;
    if (shouldRenameNote) {
      const llmFileName = `${formatFilenamePrefix(
        this.settings.noteFilenamePrefix,
        this.settings.dateFilenameFormat,
      )}${normalizePath(llmSummary.title)}`;

      await renameFile(this, note, llmFileName);
    }
  }

  async handleTranscription(
    audioBuffer: ArrayBuffer,
    scribeOptions: ScribeOptions,
  ) {
    const { isMultiSpeakerEnabled } = scribeOptions;
    try {
      new Notice(
        `Scribe: 🎧 Beginning transcription w/ ${this.settings.transcriptPlatform}`,
      );
      const transcript =
        this.settings.transcriptPlatform === TRANSCRIPT_PLATFORM.assemblyAi
          ? await transcribeAudioWithAssemblyAi(
              this.settings.assemblyAiApiKey,
              audioBuffer,
              { isMultiSpeakerEnabled },
            )
          : await chunkAndTranscribeWithOpenAi(
              this.settings.openAiApiKey,
              audioBuffer,
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

  async handleTranscriptSummary(transcript: string) {
    new Notice('Scribe: 🧠 Sending to LLM to summarize');
    const llmSummary = await summarizeTranscript(
      this.settings.openAiApiKey,
      transcript,
      this.settings.llmModel,
    );
    new Notice('Scribe: 🧠 LLM summation complete');

    return llmSummary;
  }

  cleanup() {
    this.controlModal.close();

    if (this.state.audioRecord?.mediaRecorder?.state === 'recording') {
      this.state.audioRecord?.stopRecording();
    }

    this.state.audioRecord = null;
  }
}
