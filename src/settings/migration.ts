import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from 'src/util/consts';
import { ensureSystemSections } from 'src/util/templateSections';
import type { ScribePluginSettings } from './settings';

interface LegacySettings extends Partial<ScribePluginSettings> {
  useCustomOpenAiBaseUrl?: boolean;
}

/**
 * Migrates settings saved by older plugin versions to the current shape.
 * Called during loadSettings before merging with DEFAULT_SETTINGS.
 * Returns whether anything changed so the caller can persist once.
 */
export function migrateSettings(saved: LegacySettings | null | undefined): {
  settings: Partial<ScribePluginSettings>;
  didMigrate: boolean;
} {
  if (!saved) {
    return { settings: {}, didMigrate: false };
  }

  const migrated = { ...saved };
  let didMigrate = false;

  // v1 → v2: useCustomOpenAiBaseUrl replaced by processPlatform/transcriptPlatform
  if (migrated.useCustomOpenAiBaseUrl === true) {
    if (!migrated.processPlatform) {
      migrated.processPlatform = PROCESS_PLATFORM.customOpenAi;
    }
    if (
      !migrated.transcriptPlatform ||
      migrated.transcriptPlatform === TRANSCRIPT_PLATFORM.openAi
    ) {
      migrated.transcriptPlatform = TRANSCRIPT_PLATFORM.customOpenAi;
    }
  }

  if ('useCustomOpenAiBaseUrl' in migrated) {
    delete migrated.useCustomOpenAiBaseUrl;
    didMigrate = true;
  }

  // v2 → v3: templates gain built-in Audio/Transcript system sections
  if (migrated.noteTemplates) {
    migrated.noteTemplates = migrated.noteTemplates.map((template) => {
      const { template: repaired, didChange } = ensureSystemSections(template);
      didMigrate = didMigrate || didChange;
      return repaired;
    });
  }
  if (migrated.activeNoteTemplate) {
    const { template: repaired, didChange } = ensureSystemSections(
      migrated.activeNoteTemplate,
    );
    migrated.activeNoteTemplate = repaired;
    didMigrate = didMigrate || didChange;
  }

  return { settings: migrated, didMigrate };
}
