import { normalizePath, type TFile } from 'obsidian';

import type ScribePlugin from 'src';
import { OBSIDIAN_PATHS } from 'src/settings/settings';
import { getDefaultPathSettings } from './pathUtils';

export async function saveAudioRecording(
  plugin: ScribePlugin,
  recordingBuffer: ArrayBuffer,
  baseFileName: string,
) {
  const defaultPaths = await getDefaultPathSettings(plugin);
  const pathToSave =
    plugin.settings.recordingDirectory === OBSIDIAN_PATHS.resourceFolder
      ? defaultPaths.defaultNewResourcePath
      : plugin.settings.recordingDirectory;
  let fullPath = normalizePath(
    `${pathToSave}/${baseFileName}.${plugin.state.audioRecord?.fileExtension}`,
  );

  console.log('Saving audio to path:', fullPath);

  const fileAlreadyExists = await plugin.app.vault.adapter.exists(
    fullPath,
    true,
  );
  if (fileAlreadyExists) {
    const uuid = Math.floor(Math.random() * 1000);
    fullPath = `${pathToSave}/${baseFileName}.${uuid}.${plugin.state.audioRecord?.fileExtension}`;
  }
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
    const defaultPaths = await getDefaultPathSettings(plugin);
    const pathToSave =
      plugin.settings.transcriptDirectory === OBSIDIAN_PATHS.noteFolder
        ? defaultPaths.defaultNewFilePath
        : plugin.settings.transcriptDirectory;

    const fullPath = `${pathToSave}/${fileName}.md`;
    let notePath = normalizePath(fullPath);

    console.log('Saving note to path:', notePath);

    const fileAlreadyExists = await plugin.app.vault.adapter.exists(
      notePath,
      true,
    );
    if (fileAlreadyExists) {
      const uuid = Math.floor(Math.random() * 1000);
      notePath = normalizePath(`${pathToSave}/${fileName}.${uuid}.md`);
    }

    const savedFile = await plugin.app.vault.create(notePath, '');

    return savedFile;
  } catch (error) {
    console.error('Failed to save file', error);
    if (error === 'Error: File already exists') {
      createNewNote(plugin, `${fileName}.${Math.random() * 100}`);
    }
    throw error;
  }
}

export async function renameFile(
  plugin: ScribePlugin,
  originalNote: TFile,
  newFileName: string,
) {
  const filePath = originalNote.path.replace(originalNote.name, '');
  let preferredFullFileNameAndPath = `${filePath}/${newFileName}.md`;

  const fileAlreadyExists = await plugin.app.vault.adapter.exists(
    preferredFullFileNameAndPath,
    true,
  );
  if (fileAlreadyExists) {
    const uuid = Math.floor(Math.random() * 1000);
    preferredFullFileNameAndPath = `${filePath}/${newFileName}.${uuid}.md`;
  }

  await plugin.app.fileManager.renameFile(
    originalNote,
    `${preferredFullFileNameAndPath}`,
  );
}

function normalizeAudioFrontmatterValues(audio: unknown): string[] {
  if (Array.isArray(audio)) {
    return audio.filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
  }

  if (typeof audio === 'string' && audio.length > 0) {
    return [audio];
  }

  return [];
}

export async function updateFrontMatter(
  plugin: ScribePlugin,
  noteFile: TFile,
  audioFile?: TFile,
) {
  try {
    await plugin.app.fileManager.processFrontMatter(noteFile, (frontMatter) => {
      const existingAudio = normalizeAudioFrontmatterValues(frontMatter.audio);

      if (audioFile) {
        frontMatter.audio = [...existingAudio, `[[${audioFile.path}]]`];
      } else if (frontMatter.audio !== undefined) {
        frontMatter.audio = existingAudio;
      }

      if (plugin.settings.isFrontMatterLinkToScribe) {
        frontMatter.created_by = '[[Scribe]]';
      }
    });

    return noteFile;
  } catch (error) {
    console.error('Failed to update frontmatter', error);
    throw error;
  }
}

export async function appendTextToNote(
  plugin: ScribePlugin,
  noteFile: TFile,
  text: string,
  textToReplace?: string,
) {
  try {
    await plugin.app.vault.process(noteFile, (data) => {
      try {
        if (textToReplace) {
          return data.replace(textToReplace, text);
        }
      } catch (error) {
        console.error('Failed to replace text', error);
        // Append anyway
        return `${data}\n${text}`;
      }

      return `${data.length && `${data}\n`}${text}`;
    });

    return noteFile;
  } catch (error) {
    console.error('Failed to addAudioSourceToFrontmatter', error);
    throw error;
  }
}
