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
  type LLM_MODELS,
  llmFixMermaidChart,
  summarizeTranscript,
} from './util/openAiUtils';
import { ScribeControlsModal } from './modal/scribeControlsModal';
import {
  mimeTypeToFileExtension,
  type SupportedMimeType,
} from './util/mimeType';
import { convertToSafeJsonKey, extractMermaidChart } from './util/textUtil';
import { transcribeAudioWithAssemblyAi } from './util/assemblyAiUtil';
import { formatFilenamePrefix } from './util/filenameUtils';
import type { LanguageOptions } from './util/consts';

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
  audioFileLanguage: LanguageOptions;
  scribeOutputLanguage: Exclude<LanguageOptions, 'auto'>;
  transcriptPlatform: TRANSCRIPT_PLATFORM;
  llmModel: LLM_MODELS;
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

  async scribe(
    scribeOptions: ScribeOptions = {
      isAppendToActiveFile: false,
      isOnlyTranscribeActive: this.settings.isOnlyTranscribeActive,
      isMultiSpeakerEnabled: this.settings.isMultiSpeakerEnabled,
      isSaveAudioFileActive: this.settings.isSaveAudioFileActive,
      audioFileLanguage: this.settings.audioFileLanguage,
      scribeOutputLanguage: this.settings.scribeOutputLanguage,
      transcriptPlatform: this.settings.transcriptPlatform,
      llmModel: this.settings.llmModel,
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
      isAppendToActiveFile: false,
      isOnlyTranscribeActive: this.settings.isOnlyTranscribeActive,
      isMultiSpeakerEnabled: this.settings.isMultiSpeakerEnabled,
      isSaveAudioFileActive: this.settings.isSaveAudioFileActive,
      audioFileLanguage: this.settings.audioFileLanguage,
      scribeOutputLanguage: this.settings.scribeOutputLanguage,
      transcriptPlatform: this.settings.transcriptPlatform,
      llmModel: this.settings.llmModel,
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

    const transcript = await this.handleTranscription(
      audioRecordingBuffer,
      scribeOptions,
    );

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

    const llmSummary = await this.handleTranscriptSummary(
      transcript,
      scribeOptions,
    );

    this.settings.activeNoteTemplate.forEach(async (section) => {
      const { sectionHeader, sectionOutputPrefix, isSectionOptional } = section;
      const sectionKey = convertToSafeJsonKey(sectionHeader);
      const sectionValue = llmSummary[sectionKey];

      if (isSectionOptional && !sectionValue) {
        return;
      }

      if (sectionOutputPrefix) {
        await appendTextToNote(
          this,
          note,
          `## ${sectionHeader}\n${sectionOutputPrefix}\n${sectionValue}\n\`\`\``,
        );

        return;
      }

      await appendTextToNote(
        this,
        note,
        `## ${sectionHeader}\n${sectionValue}`,
      );
    });

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
    try {
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
    const llmSummary = await summarizeTranscript(
      this.settings.openAiApiKey,
      transcript,
      scribeOptions,
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
