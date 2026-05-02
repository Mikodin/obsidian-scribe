import type ScribePlugin from 'src';
import { ScribeControlsModal } from 'src/modal/scribeControlsModal';

export function handleCommands(plugin: ScribePlugin) {
  plugin.addCommand({
    id: 'scribe-recording-modal',
    name: 'Open recording modal',
    callback: () => {
      plugin.state.isOpen = true;
      new ScribeControlsModal(plugin).open();
    },
  });
  plugin.addCommand({
    id: 'scribe-recording-toggle-recording',
    name: 'Start/Stop recording',
    callback: async () => {
      const isRecordingInProgress = plugin.isRecordingActive();

      if (isRecordingInProgress) {
        await plugin.scribe();
      } else {
        await plugin.startRecording();
      }
    },
  });
  plugin.addCommand({
    id: 'scribe-recording-toggle-pause',
    name: 'Pause/Resume recording',
    callback: async () => {
      if (!plugin.isRecordingActive()) {
        return;
      }

      await plugin.handlePauseResumeRecording();
    },
  });
  plugin.addCommand({
    id: 'scribe-transcribe-summarize',
    name: 'Transcribe & summarize current file',
    callback: async () => {
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile) {
        plugin.scribeExistingFile(activeFile);
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
