import type { ReactNode } from 'react';
import type { ScribePluginSettings } from '../settings';

interface SettingsToggleProps<K extends keyof ScribePluginSettings>
  extends Omit<SettingsControlProps<K>, 'children'> {
  onChange(this: void, value: ScribePluginSettings[K] & boolean): void;
  value: ScribePluginSettings[K] & boolean;
  disabled?: boolean;
}

/**
 * Toggle component for settings tab
 */
export function SettingsToggle(
  props: SettingsToggleProps<keyof ScribePluginSettings>,
) {
  const { id, onChange, value, disabled } = props;
  if (typeof value !== 'boolean') {
    console.error(`Can't use checkbox input for non-boolean value: ${id}`);
    return null;
  }

  const handleToggle = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  return (
    <SettingsControl {...props}>
      <div className={`checkbox-container ${value ? 'is-enabled' : ''}`}>
        <input
          type="checkbox"
          checked={value}
          disabled={disabled}
          onChange={handleToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleToggle();
            }
          }}
        />
      </div>
    </SettingsControl>
  );
}

interface SettingsSelectProps<K extends keyof ScribePluginSettings>
  extends Omit<SettingsControlProps<K>, 'children'> {
  // Method syntax keeps the param bivariant so register()'s narrowly-typed
  // onChange remains assignable under strictFunctionTypes
  onChange(this: void, value: ScribePluginSettings[K]): void;
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
  onChange(this: void, value: ScribePluginSettings[K]): void;
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

interface SettingsComboboxProps<K extends keyof ScribePluginSettings>
  extends Omit<SettingsControlProps<K>, 'children'> {
  onChange(this: void, value: ScribePluginSettings[K]): void;
  value: ScribePluginSettings[K];
  options: readonly string[];
  placeholder?: string;
}

/**
 * Text input with a searchable suggestion dropdown (native datalist).
 * Typing filters the options; free-text values outside the list are allowed.
 */
export function SettingsCombobox(
  props: SettingsComboboxProps<keyof ScribePluginSettings>,
) {
  const { id, onChange, value, options, placeholder } = props;
  if (typeof value !== 'string') {
    console.error(`Can't use combobox input for non-string value: ${id}`);
    return null;
  }

  const datalistId = `scribe-${id}-datalist`;

  return (
    <SettingsControl {...props}>
      <input
        type="text"
        list={datalistId}
        defaultValue={value}
        placeholder={placeholder}
        onChange={(e) => {
          const value = e.currentTarget.value;
          onChange(value);
        }}
      />
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </SettingsControl>
  );
}

interface SettingsControlProps<K extends keyof ScribePluginSettings> {
  id: K;
  name: string;
  description?: string;
  value: ScribePluginSettings[K];
  children: ReactNode;
}

/**
 * Generic component to build different types of controls for plugin settings tab
 * Used in specific wrappers ie <SettingsCheckbox>
 */
function SettingsControl({
  description,
  name,
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
