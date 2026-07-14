import { useState } from 'react';
import type { ScribeOptions } from 'src';

export function ModalSystemPromptOption({
  options,
  setOptions,
}: {
  options: ScribeOptions;
  setOptions: React.Dispatch<ScribeOptions>;
}) {
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  const handleOptionsChange = (updatedOptions: Partial<ScribeOptions>) => {
    setOptions({
      ...options,
      ...updatedOptions,
    });
  };

  const hasSystemPrompt = Boolean(options.additionalSystemPrompt?.trim());

  return (
    <div className="scribe-system-prompt-option">
      <button
        onClick={() => setIsPromptExpanded(!isPromptExpanded)}
        type="button"
        className="scribe-settings-btn"
      >
        Add to system prompt{hasSystemPrompt && ' ✅'}
      </button>
      {isPromptExpanded && (
        <>
          <textarea
            placeholder="Additional context or instructions for the summary"
            value={options.additionalSystemPrompt ?? ''}
            onChange={(e) => {
              handleOptionsChange({ additionalSystemPrompt: e.target.value });
            }}
            rows={3}
            style={{
              width: '100%',
              overflow: 'visible',
              height: 'auto',
            }}
            onFocus={(e) => {
              const target = e.currentTarget;
              target.style.height = `${target.scrollHeight}px`;
            }}
            onInput={(e) => {
              const target = e.currentTarget;
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <button
            onClick={() => setIsPromptExpanded(false)}
            type="button"
            className="scribe-settings-btn"
          >
            Ok
          </button>
        </>
      )}
    </div>
  );
}
