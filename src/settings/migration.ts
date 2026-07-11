import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from 'src/util/consts';
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

  return { settings: migrated, didMigrate };
}
