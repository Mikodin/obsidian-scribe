import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM, type ScribePluginSettings } from './settings';

interface LegacySettings extends Partial<ScribePluginSettings> {
  useCustomOpenAiBaseUrl?: boolean;
}

/**
 * Migrates settings saved by older plugin versions to the current shape.
 * Called once during loadSettings before merging with DEFAULT_SETTINGS.
 */
export function migrateSettings(saved: LegacySettings): Partial<ScribePluginSettings> {
  const migrated = { ...saved } as LegacySettings & Partial<ScribePluginSettings>;

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

  delete (migrated as LegacySettings).useCustomOpenAiBaseUrl;

  return migrated;
}
