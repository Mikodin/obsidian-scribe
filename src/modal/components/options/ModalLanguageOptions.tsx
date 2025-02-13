import { useEffect } from 'react';
import type { ScribeOptions } from 'src';
import type ScribePlugin from 'src';
import { TRANSCRIPT_PLATFORM } from 'src/settings/settings';
import type { ScribeModelOptions } from '../ModalOptionsContainer';
import { SettingsItem } from 'src/settings/components/SettingsItem';
import {
  LanguageDisplayNames,
  LanguageOptions,
  type OutputLanguageOptions,
} from 'src/util/consts';

export function ModalLanguageOptions({
  plugin,
  options,
  setOptions,
  modelOptions,
}: {
  plugin: ScribePlugin;
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
  modelOptions: ScribeModelOptions;
}) {
  const handleOptionsChange = (updatedOptions: ScribeOptions) => {
    setOptions({
      ...options,
      ...updatedOptions,
    });
  };

  const { audioFileLanguage, scribeOutputLanguage } = options;

  return (
    <div className="scribe-recording-options">
      <SettingsItem
        name="Spoken language"
        description=""
        control={
          <select
            defaultValue={audioFileLanguage}
            className="dropdown"
            onChange={(e) => {
              handleOptionsChange({
                audioFileLanguage: e.target.value as LanguageOptions,
              });
            }}
          >
            {Object.keys(LanguageOptions).map((lang) => (
              <option key={lang} value={lang}>
                {LanguageDisplayNames[lang as LanguageOptions]}
              </option>
            ))}
          </select>
        }
      />

      <SettingsItem
        name="Scribe output language"
        description=""
        control={
          <select
            defaultValue={scribeOutputLanguage}
            className="dropdown"
            onChange={(e) => {
              handleOptionsChange({
                scribeOutputLanguage: e.target.value as OutputLanguageOptions,
              });
            }}
          >
            {Object.keys(LanguageOptions)
              .filter((lang) => lang !== LanguageOptions.auto) // Remove auto
              .map((lang) => (
                <option key={lang} value={lang}>
                  {LanguageDisplayNames[lang as LanguageOptions]}
                </option>
              ))}
          </select>
        }
      />
    </div>
  );
}
