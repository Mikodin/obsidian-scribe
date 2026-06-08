import { SettingsInput } from './components/SettingsControl';
import { SettingsItemHeader } from './components/SettingsItem';
import useSettingsForm from './hooks/useSettingsForm';

/**
 * Tab, containing general settings
 */
function ProviderSettingsTab() {
  const { register, settings } = useSettingsForm();

  return (
    <div>
      <SettingsItemHeader name="API keys" />
      <SettingsInput
        {...register('openAiApiKey')}
        name="OpenAI API key"
        description="You can find this in your OpenAI dev console - https://platform.openai.com/settings"
        placeholder="sk-..."
      />
      <SettingsInput
        {...register('assemblyAiApiKey')}
        name="AssemblyAI API key"
        description="You can find this in your AssemblyAI dev console - https://www.assemblyai.com/app/account"
        placeholder="c3p0..."
      />
    </div>
  );
}

export default ProviderSettingsTab;
