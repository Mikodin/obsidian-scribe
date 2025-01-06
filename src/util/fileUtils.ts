import { moment, normalizePath, type TFile } from 'obsidian';

import type ScribePlugin from 'src';
import type { LLMSummary } from './openAiUtils';

export function createBaseFileName() {
  const now = moment();

  const fileName = `${now.format('YYYY-MM-DD.HH.mm.ss')}`;
  return fileName;
}

export async function saveAudioRecording(
  plugin: ScribePlugin,
  recordingBuffer: ArrayBuffer,
  baseFileName: string,
) {
  const fileName = baseFileName;
  const pathToSave = plugin.settings.recordingDirectory;
  const fullPath = normalizePath(
    `${pathToSave}/scribe-recording-${fileName}.${plugin.state.audioRecord?.fileExtension}`,
  );

  try {
    const savedFile = await plugin.app.vault.createBinary(
      fullPath,
      recordingBuffer,
    );
    return savedFile;
  } catch (error) {
    console.error(`Failed to save file in: ${fullPath}`, error);
    throw error;
  }
}

export async function createNewNote(
  plugin: ScribePlugin,
  fileName: string,
): Promise<TFile> {
  try {
    const pathToSave = plugin.settings.transcriptDirectory;
    const fullPath = `${pathToSave}/${fileName}.md`;
    const notePath = normalizePath(fullPath);

    const savedFile = await plugin.app.vault.create(notePath, '');

    return savedFile;
  } catch (error) {
    console.error('Failed to save file', error);
    throw error;
  }
}

const TRANSCRIPT_IN_PROGRESS_HEADER = '# Transcription In Progress';
export async function addAudioSourceToFrontmatter(
  plugin: ScribePlugin,
  noteFile: TFile,
  audioFile: TFile,
) {
  try {
    const noteContent = `${TRANSCRIPT_IN_PROGRESS_HEADER}\n![[${audioFile.path}]]`;

    await plugin.app.vault.process(noteFile, (data) => {
      if (data.length) {
        return `${data}\n${noteContent}`;
      }
      return noteContent;
    });

    await plugin.app.fileManager.processFrontMatter(noteFile, (frontMatter) => {
      const newFrontMatter = {
        ...frontMatter,
        source: [...(frontMatter.source || []), `[[${audioFile.path}]]`],
        created_by: '[[Scribe]]',
      };

      Object.assign(frontMatter, newFrontMatter);
    });

    return noteFile;
  } catch (error) {
    console.error('Failed to addAudioSourceToFrontmatter', error);
    throw error;
  }
}

const SUMMARY_IN_PROGRESS_HEADER = '# Summary In Progress';
const TRANSCRIPT_HEADER = '# Transcript';
export async function addTranscriptToNote(
  plugin: ScribePlugin,
  noteFile: TFile,
  transcript: string,
  isOnlyTranscribeActive?: boolean,
) {
  try {
    const textToAdd = isOnlyTranscribeActive
      ? `${transcript}`
      : `${transcript}
${SUMMARY_IN_PROGRESS_HEADER}`;

    await plugin.app.vault.process(noteFile, (data) => {
      const newData = data.replace(
        TRANSCRIPT_IN_PROGRESS_HEADER,
        TRANSCRIPT_HEADER,
      );
      return `${newData}\n${textToAdd}`;
    });

    return noteFile;
  } catch (error) {
    console.error('Failed to addAudioSourceToFrontmatter', error);
    throw error;
  }
}

const SUMMARY_HEADER = '## Summary';
const INSIGHTS_HEADER = '## Insights';
const MERMAID_CHART_HEADER = '## Mermaid Chart';
const ANSWERED_QUESTIONS_HEADER = '## Answers from Scribe';
export async function addSummaryToNote(
  plugin: ScribePlugin,
  noteFile: TFile,
  llmSummary: LLMSummary,
) {
  const { summary, insights, mermaidChart, answeredQuestions } = llmSummary;
  try {
    const textToAdd = `${SUMMARY_HEADER}
${summary}
${INSIGHTS_HEADER}
${insights}
${answeredQuestions ? `${ANSWERED_QUESTIONS_HEADER}\n${answeredQuestions}` : ''}
${MERMAID_CHART_HEADER}
\`\`\`mermaid
${mermaidChart}
\`\`\``;

    await plugin.app.vault.process(noteFile, (data) => {
      return data.replace(SUMMARY_IN_PROGRESS_HEADER, textToAdd);
    });

    return noteFile;
  } catch (error) {
    console.error('Failed to addAudioSourceToFrontmatter', error);
    throw error;
  }
}

export async function renameFile(
  plugin: ScribePlugin,
  originalNote: TFile,
  newFileName: string,
) {
  const filePath = originalNote.path.replace(originalNote.name, '');
  const preferredFullFileNameAndPath = `${filePath}/${newFileName}`;
  try {
    plugin.app.fileManager.renameFile(
      originalNote,
      `${preferredFullFileNameAndPath}.md`,
    );
  } catch (error) {
    plugin.app.fileManager.renameFile(
      originalNote,
      `${preferredFullFileNameAndPath}.${Date.now().toString().slice(0, 2)}`,
    );
  }
}
