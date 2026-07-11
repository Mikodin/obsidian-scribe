import { useEffect, useState } from 'react';
import { fetchOpenRouterModelIds } from 'src/aiProviders/llm/openRouterModels';

/**
 * Loads the OpenRouter model catalog for searchable model pickers.
 * Returns an empty list until loaded (or on failure), which degrades the
 * combobox to a plain free-text input.
 */
export default function useOpenRouterModelIds(isEnabled = true): string[] {
  const [modelIds, setModelIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let isMounted = true;

    fetchOpenRouterModelIds()
      .then((ids) => {
        if (isMounted) {
          setModelIds(ids);
        }
      })
      .catch((error) => {
        console.error('Scribe: failed to load OpenRouter model list', error);
      });

    return () => {
      isMounted = false;
    };
  }, [isEnabled]);

  return modelIds;
}
