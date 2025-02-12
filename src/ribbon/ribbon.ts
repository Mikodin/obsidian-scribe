import { Menu, Notice } from 'obsidian';
import type ScribePlugin from 'src';
import { ScribeControlsModal } from 'src/modal/scribeControlsModal';

export function handleRibbon(plugin: ScribePlugin) {
  // This creates an icon in the left ribbon.
  const ribbonIconEl = plugin.addRibbonIcon(
    'mic-vocal',
    'Scribe',
    (evt: MouseEvent) => {
      scribeDropDownMenu(plugin).showAtMouseEvent(evt);
    },
  );
  // Perform additional things with the ribbon
  ribbonIconEl.addClass('scribe-plugin-ribbon');
}

function scribeDropDownMenu(plugin: ScribePlugin): Menu {
  const menu = new Menu();

  const showRecordingInProgressControls =
    plugin.state.audioRecord?.mediaRecorder?.state === 'recording';

  if (showRecordingInProgressControls) {
    menu.addItem((item) => {
      item.setIcon('trash-2');
      item.setTitle('Cancel Recording');
      item.onClick(() => {
        plugin.cancelRecording();
      });
    });
    menu.addItem((item) => {
      item.setIcon('save');
      item.setTitle('Stop Recording');
      item.onClick(() => {
        plugin.scribe();
      });
    });
  } else {
    menu.addItem((item) => {
      item.setIcon('joystick');
      item.setTitle('Open Controls');
      item.onClick(() => {
        plugin.state.isOpen = true;
        plugin.controlModal.open();
      });
    });
    menu.addItem((item) => {
      item.setIcon('mic-vocal');
      item.setTitle('Start Recording');
      item.onClick(() => {
        plugin.startRecording();
      });
    });
  }

  return menu;
}
