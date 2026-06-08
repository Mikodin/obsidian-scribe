import type ScribePlugin from 'src';
import {
  useSettings,
  useSettingsUpdater,
} from '../provider/SettingsFormProvider';
import type { ScribePluginSettings } from '../settings';

interface UseSettingsFormProps {
  plugin: ScribePlugin;
}

export interface RegisterOptions<K extends keyof ScribePluginSettings> {
  /**
   * Callback to run on value in state before displaying it in input
   */
  displayValue?(value: ScribePluginSettings[K]): ScribePluginSettings[K];
  /**
   * Callback to run on value before saving it to state
   */
  setValueAs?(value: ScribePluginSettings[K]): ScribePluginSettings[K];
}

/**
 * New component
 */
function useSettingsForm() {
  const settings = useSettings();
  const setSettings = useSettingsUpdater();

  function register<K extends keyof ScribePluginSettings>(
    id: K,
    options?: RegisterOptions<K>,
  ) {
    const { displayValue, setValueAs } = options || {};
    const stateValue = settings[id];

    const onChange = (value: ScribePluginSettings[K]) => {
      const newValue = setValueAs ? setValueAs(value) : value;
      setSettings(id, newValue);
    };
    const value: ScribePluginSettings[K] = displayValue
      ? displayValue(stateValue)
      : stateValue;

    return {
      onChange,
      value,
      id,
    };
  }

  return { register, settings };
}

export default useSettingsForm;
