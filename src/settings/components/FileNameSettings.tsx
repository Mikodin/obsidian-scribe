import { useState } from 'react';
import type ScribePlugin from 'src/index';

import { formatFilenamePrefix } from 'src/util/filenameUtils';
import { SettingsItem } from './SettingsItem';

export const FileNameSettings: React.FC<{
  plugin: ScribePlugin;
  saveSettings: () => void;
}> = ({ plugin, saveSettings }) => {
  const [noteFilenamePrefix, setNoteFilenamePrefix] = useState(
    plugin.settings.noteFilenamePrefix,
  );
  const [recordingFilenamePrefix, setRecordingFilenamePrefix] = useState(
    plugin.settings.recordingFilenamePrefix,
  );
  const [dateFilenameFormat, setDateFilenameFormat] = useState(
    plugin.settings.dateFilenameFormat,
  );
  const isDateInPrefix =
    (noteFilenamePrefix || '').includes('{{date}}') ||
    (recordingFilenamePrefix || '').includes('{{date}}');
  return (
    <div>
      <h2>File name properties</h2>
      <SettingsItem
        name="Transcript filename prefix"
        description="This will be the prefix of the note filename, use {{date}} to include the date"
        control={
          <input
            type="text"
            placeholder="scribe-"
            value={noteFilenamePrefix}
            onChange={(e) => {
              setNoteFilenamePrefix(e.target.value);
              plugin.settings.noteFilenamePrefix = e.target.value;
              saveSettings();
            }}
          />
        }
      />
      <SettingsItem
        name="Audio recording filename prefix"
        description="This will be the prefix of the audio recording filename, use {{date}} to include the date"
        control={
          <input
            type="text"
            placeholder="scribe-"
            value={recordingFilenamePrefix}
            onChange={(e) => {
              setRecordingFilenamePrefix(e.target.value);
              plugin.settings.recordingFilenamePrefix = e.target.value;
              saveSettings();
            }}
          />
        }
      />
      <SettingsItem
        name="Date format"
        description="This will only be used if {{date}} is in the transcript or audio recording filename prefix above."
        control={
          <div>
            <input
              type="text"
              placeholder="YYYY-MM-DD"
              disabled={!isDateInPrefix}
              value={dateFilenameFormat}
              onChange={(e) => {
                setDateFilenameFormat(e.target.value);
                plugin.settings.dateFilenameFormat = e.target.value;
                saveSettings();
              }}
            />
          </div>
        }
      />
      {isDateInPrefix && (
        <div>
          <p>
            {formatFilenamePrefix(`${noteFilenamePrefix}`, dateFilenameFormat)}
            filename
          </p>
          <p>
            {formatFilenamePrefix(
              `${recordingFilenamePrefix}`,
              dateFilenameFormat,
            )}
            filename
          </p>
        </div>
      )}
    </div>
  );
};
