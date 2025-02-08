import type ScribePlugin from 'src';
import { ScribeControlsModal } from 'src/modal/scribeControlsModal';

export function handleCommands(plugin: ScribePlugin) {
  plugin.addCommand({
    id: 'scribe-recording-modal',
    name: 'Begin recording',
    callback: () => {
      plugin.state.isOpen = true;
      new ScribeControlsModal(plugin).open();
    },
  });
  plugin.addCommand({
    id: 'scribe-transcribe-summarize',
    name: 'Transcribe & summarize current file',
    callback: async () => {
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile) {
        plugin.scribeExistingFile(activeFile, {
          isOnlyTranscribeActive: plugin.settings.isOnlyTranscribeActive,
          isMultiSpeakerEnabled: plugin.settings.isMultiSpeakerEnabled,
        });
      }
    },
  });
  plugin.addCommand({
    id: 'scribe-fix-mermaid-chart',
    name: 'Fix mermaid chart',
    callback: () => {
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile) {
        plugin.fixMermaidChart(activeFile);
      }
    },
  });
}
