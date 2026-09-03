import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from 'src/util/consts';
import { migrateTemplate } from 'src/util/templateSections';
import type { ScribePluginSettings } from './settings';

interface LegacySettings extends Partial<ScribePluginSettings> {
  useCustomOpenAiBaseUrl?: boolean;
  customOpenAiBaseUrl?: string;
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

  // v2 → v3: templates gain built-in Audio/Transcript system sections and
  // section headers become verbatim markdown lines (headerless ones become H2)
  if (migrated.noteTemplates) {
    migrated.noteTemplates = migrated.noteTemplates.map((template) => {
      const { template: repaired, didChange } = migrateTemplate(template);
      didMigrate = didMigrate || didChange;
      return repaired;
    });
  }
  if (migrated.activeNoteTemplate) {
    const { template: repaired, didChange } = migrateTemplate(
      migrated.activeNoteTemplate,
    );
    migrated.activeNoteTemplate = repaired;
    didMigrate = didMigrate || didChange;
  }

  // v3 → v4: the single customOpenAiBaseUrl was shared by the transcription and
  // summarization sections, so editing one overwrote the other. Seed both of
  // the new per-role URLs from it to preserve the old behaviour.
  if ('customOpenAiBaseUrl' in migrated) {
    const legacyBaseUrl = migrated.customOpenAiBaseUrl;
    if (legacyBaseUrl) {
      migrated.customTranscriptBaseUrl ||= legacyBaseUrl;
      migrated.customChatBaseUrl ||= legacyBaseUrl;
    }
    delete migrated.customOpenAiBaseUrl;
    didMigrate = true;
  }

  return { settings: migrated, didMigrate };
}
