import { normalizePath } from 'obsidian';
import type ScribePlugin from 'src';

export async function getDefaultPathSettings(plugin: ScribePlugin) {
  const fileManager = plugin.app.fileManager;

  const activeFile = plugin.app.workspace.getActiveFile();
  /**
   * This will use the active file path IFF the user has the setting in Obsidian
   * Default Location for new notes set to "Same folder as active file".
   * Otherwise, it will use the default new file path set in Obsidian.
   */
  const defaultNewFilePath = normalizePath(
    fileManager.getNewFileParent(activeFile?.path || '', '').path,
  );

  const uniqueFileName = Date.now();
  const attachmentPathWithFileName = (
    await fileManager.getAvailablePathForAttachment(uniqueFileName.toString())
  ).split('/');

  const defaultNewResourcePath = normalizePath(
    attachmentPathWithFileName
      .splice(0, attachmentPathWithFileName.length - 1)
      .join('/'),
  );

  return {
    defaultNewFilePath,
    defaultNewResourcePath,
  };
}
