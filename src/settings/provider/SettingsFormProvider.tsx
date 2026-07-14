import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import type ScribePlugin from 'src';
import { useDebounce } from 'src/util/useDebounce';
import type { ScribePluginSettings } from '../settings';

const SettingsFormContext = createContext<ScribePluginSettings | undefined>(
  undefined,
);

const PluginContext = createContext<ScribePlugin | undefined>(undefined);

const SettingsFormUpdaterContext = createContext<
  | (<K extends keyof ScribePluginSettings>(
      id: K,
      value: ScribePluginSettings[K],
    ) => void)
  | undefined
>(undefined);

interface SettingsFormProviderProps {
  plugin: ScribePlugin;
  children: ReactNode;
}

export function SettingsFormProvider({
  plugin,
  children,
}: SettingsFormProviderProps) {
  const [settings, setSettings] = useState(plugin.settings);

  const debouncedSaveSettings = useDebounce(() => {
    void plugin.saveSettings();
  }, 500);

  function handleSettingChange<K extends keyof ScribePluginSettings>(
    id: K,
    value: ScribePluginSettings[K],
  ) {
    setSettings((state) => ({ ...state, [id]: value }));
  }

  useEffect(() => {
    plugin.settings = settings;
    debouncedSaveSettings();
  }, [plugin, settings, debouncedSaveSettings]);

  return (
    <PluginContext.Provider value={plugin}>
      <SettingsFormContext.Provider value={settings}>
        <SettingsFormUpdaterContext.Provider value={handleSettingChange}>
          {children}
        </SettingsFormUpdaterContext.Provider>
      </SettingsFormContext.Provider>
    </PluginContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsFormContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsFormProvider');
  }
  return context;
}

export function useSettingsUpdater() {
  const context = useContext(SettingsFormUpdaterContext);
  if (context === undefined) {
    throw new Error(
      'useSettingsUpdater must be used within a SettingsFormProvider',
    );
  }
  return context;
}

export function usePlugin() {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error('usePlugin must be used within a SettingsFormProvider');
  }
  return context;
}
