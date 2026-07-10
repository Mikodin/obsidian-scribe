import type { ReactElement } from 'react';
import type { ScribePluginSettings } from '../settings';

interface SettingsToggleProps<K extends keyof ScribePluginSettings>
  extends Omit<SettingsControlProps<K>, 'children'> {
  onChange(value: ScribePluginSettings[K] & boolean): void;
  value: ScribePluginSettings[K] & boolean;
}

/**
 * Toggle component for settings tab
 */
export function SettingsToggle(
  props: SettingsToggleProps<keyof ScribePluginSettings>,
) {
  const { id, onChange, value } = props;
  if (typeof value !== 'boolean') {
    console.error(`Can't use checkbox input for non-boolean value: ${id}`);
    return null;
  }

  return (
    <SettingsControl {...props}>
      <div
        className={`checkbox-container ${value ? 'is-enabled' : ''}`}
        onClick={(e) => {
          onChange(!value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onChange(!value);
          }
        }}
      >
        <input
          type="checkbox"
          checked={value}
          onChange={() => onChange(!value)}
        />
      </div>
    </SettingsControl>
  );
}

interface SettingsSelectProps<K extends keyof ScribePluginSettings>
  extends Omit<SettingsControlProps<K>, 'children'> {
  // Method syntax keeps the param bivariant so register()'s narrowly-typed
  // onChange remains assignable under strictFunctionTypes
  onChange(value: ScribePluginSettings[K]): void;
  value: ScribePluginSettings[K];
  valuesMapping: {
    displayName: string;
    value: ScribePluginSettings[K] & string;
  }[];
}

export function SettingsSelect(
  props: SettingsSelectProps<keyof ScribePluginSettings>,
) {
  const { id, onChange, value, valuesMapping } = props;
  if (typeof value !== 'string') {
    console.error(`Can't use select input for non-string value: ${id}`);
    return null;
  }

  return (
    <SettingsControl {...props}>
      <select
        defaultValue={value}
        className="dropdown"
        onChange={(e) => {
          const value = e.currentTarget.value;
          onChange(value);
        }}
      >
        {valuesMapping.map(({ displayName, value }) => (
          <option key={value} value={value}>
            {displayName}
          </option>
        ))}
      </select>
    </SettingsControl>
  );
}
interface SettingsInputProps<K extends keyof ScribePluginSettings>
  extends Omit<SettingsControlProps<K>, 'children'> {
  onChange(value: ScribePluginSettings[K]): void;
  value: ScribePluginSettings[K];
  disabled?: boolean;
  placeholder?: string;
}

export function SettingsInput(
  props: SettingsInputProps<keyof ScribePluginSettings>,
) {
  const { id, onChange, value, disabled, placeholder } = props;
  if (typeof value !== 'string') {
    console.error(`Can't use text input for non-string value: ${id}`);
    return null;
  }

  return (
    <SettingsControl {...props}>
      <input
        disabled={disabled}
        defaultValue={value}
        placeholder={placeholder}
        type="text"
        onChange={(e) => {
          const value = e.currentTarget.value;
          onChange(value);
        }}
      />
    </SettingsControl>
  );
}

interface SettingsControlProps<K extends keyof ScribePluginSettings> {
  id: K;
  name: string;
  description?: string;
  value: ScribePluginSettings[K];
  children: ReactElement;
}

/**
 * Generic component to build different types of controls for plugin settings tab
 * Used in specific wrappers ie <SettingsCheckbox>
 */
function SettingsControl({
  description,
  id,
  name,
  value,
  children,
}: SettingsControlProps<keyof ScribePluginSettings>) {
  return (
    <div className="setting-item">
      <div className="setting-item-info">
        <div className="setting-item-name">{name}</div>
        {description && (
          <div className="setting-item-description">{description}</div>
        )}
      </div>
      <div className="setting-item-control">{children}</div>
    </div>
  );
}
