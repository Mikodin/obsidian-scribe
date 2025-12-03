// import { LLM_MODELS as GOOGLE_MODELS } from 'src/util/geminiAiUtils';
import { LLM_MODELS } from 'src/util/openAiUtils';
import {
  SettingsInput,
  SettingsSelect,
  SettingsToggle,
} from './components/SettingsControl';
import { SettingsItemHeader } from './components/SettingsItem';
import useSettingsForm from './hooks/useSettingsForm';
import { PROCESS_PLATFORM, TRANSCRIPT_PLATFORM } from './settings';

const transcriptSelectMapping = [
  {
    displayName: 'OpenAI',
    value: TRANSCRIPT_PLATFORM.openAi,
  },
  {
    displayName: 'AssemblyAI',
    value: TRANSCRIPT_PLATFORM.assemblyAi,
  },
  // {
  //   displayName: 'GoogleAI',
  //   value: TRANSCRIPT_PLATFORM.google,
  // },
  {
    displayName: 'Custom endpoint (OpenAI-compatible)',
    value: TRANSCRIPT_PLATFORM.customOpenAi,
  },
];
const processSelectMapping = [
  {
    displayName: 'OpenAI',
    value: TRANSCRIPT_PLATFORM.openAi,
  },
  // {
  //   displayName: 'GoogleAI',
  //   value: TRANSCRIPT_PLATFORM.google,
  // },
  {
    displayName: 'Custom endpoint (OpenAI-compatible)',
    value: TRANSCRIPT_PLATFORM.customOpenAi,
  },
];

// 'gpt-4.1' = 'gpt-4.1',
//   'gpt-4.1-mini' = 'gpt-4.1-mini',
//   'gpt-4o' = 'gpt-4o',
//   'gpt-4o-mini' = 'gpt-4o-mini',
//   'gpt-4-turbo' = 'gpt-4-turbo',

const OpenAiModelMapping = Object.values(LLM_MODELS).map((model) => ({
  value: model,
  displayName: model,
}));
// const GoogleModelMapping = Object.values(GOOGLE_MODELS).map((model) => ({
//   value: model,
//   displayName: model,
// }));

/**
 * Tab, containing AI provider settings
 */
function ProviderSettingsTab() {
  const { register, settings } = useSettingsForm();

  return (
    <div>
      <SettingsItemHeader name="Transcription" />
      <SettingsSelect
        {...register('transcriptPlatform')}
        name="Transcript platform"
        description="Your recording is uploaded to this service"
        valuesMapping={transcriptSelectMapping}
      />
      {settings.transcriptPlatform === TRANSCRIPT_PLATFORM.assemblyAi && (
        <>
          <SettingsInput
            {...register('assemblyAiApiKey')}
            name="AssemblyAI API key"
            description="You can find this in your AssemblyAI dev console - https://www.assemblyai.com/app/account"
            placeholder="c3p0..."
          />
          <SettingsToggle
            {...register('isMultiSpeakerEnabled')}
            name="Multi-speaker enabled"
            description="Enable this if you have multiple speakers in your recording"
          />
        </>
      )}
      {(settings.transcriptPlatform === TRANSCRIPT_PLATFORM.openAi ||
        settings.transcriptPlatform === TRANSCRIPT_PLATFORM.customOpenAi) && (
        <SettingsInput
          {...register('openAiApiKey')}
          name="OpenAI API key"
          description="You can find this in your OpenAI dev console - https://platform.openai.com/settings"
          placeholder="sk-..."
        />
      )}
      {settings.transcriptPlatform === TRANSCRIPT_PLATFORM.customOpenAi && (
        <>
          <SettingsInput
            {...register('customTranscriptModel')}
            name="Custom transcription model"
            description="The model name to use for audio transcription (e.g., whisper-1, faster-whisper, etc.)"
            placeholder="whisper-1"
          />
          <SettingsInput
            {...register('customOpenAiBaseUrl')}
            name="Custom OpenAI base URL"
            description="The base URL for your custom OpenAI-compatible API (e.g., http://localhost:1234/v1, https://your-instance.openai.azure.com/)"
          />
        </>
      )}
      <SettingsItemHeader name="Processing" />
      <SettingsSelect
        {...register('processPlatform')}
        name="Processing platform"
        description="Your transcriptions is uploaded to this service"
        valuesMapping={processSelectMapping}
      />
      {settings.processPlatform === PROCESS_PLATFORM.openAi && (
        <SettingsSelect
          {...register('llmModel')}
          name="OpenAI model for creating the summary"
          valuesMapping={OpenAiModelMapping}
        />
      )}
      {/* {settings.processPlatform === PROCESS_PLATFORM.google && (
        <>
          <SettingsInput
            {...register('googleAiApiKey')}
            name="Google AI API key"
            placeholder="AIza..."
          />
          {
            // <SettingsSelect
            // {...register('googleModel')}
            // name="Google AI model for creating the summary"
            // valuesMapping={GoogleModelMapping}
            // />
          }
        </>
      )} */}
      {settings.processPlatform === PROCESS_PLATFORM.customOpenAi && (
        <>
          <SettingsInput
            {...register('customOpenAiBaseUrl')}
            name="Custom OpenAI base URL"
            description="The base URL for your custom OpenAI-compatible API (e.g., http://localhost:1234/v1, https://your-instance.openai.azure.com/)"
          />
          <SettingsInput
            {...register('customTranscriptModel')}
            name="Custom processing model"
            description="The model name to use for chat/summarization (e.g., gpt-4, llama-3.1-8b-instruct, etc.)"
            placeholder="gpt-4o"
          />
        </>
      )}
    </div>
  );
}

export default ProviderSettingsTab;

//  <SettingsItem
//           name="Custom transcription model"
//           description="The model name to use for audio transcription (e.g., whisper-1, faster-whisper, etc.)"
//           control={
//             <input
//               type="text"
//               placeholder="whisper-1"
//               value={customTranscriptModel}
//               onChange={(e) =>
//                 handleCustomTranscriptModelChange(e.target.value)
//               }
//               className="text-input"
//             />
//           }
//         />
