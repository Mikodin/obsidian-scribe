import { obsidianFetch } from 'src/util/obsidianFetch';
import { OPENROUTER_BASE_URL } from './openAiCompatibleLlm';

let cachedModelIds: Promise<string[]> | null = null;

/**
 * Model ids from OpenRouter's public catalog (no API key required).
 * Cached for the plugin's lifetime; a failed fetch clears the cache so the
 * next caller retries.
 */
export function fetchOpenRouterModelIds(): Promise<string[]> {
  cachedModelIds ??= loadModelIds().catch((error) => {
    cachedModelIds = null;
    throw error;
  });

  return cachedModelIds;
}

async function loadModelIds(): Promise<string[]> {
  const response = await obsidianFetch(`${OPENROUTER_BASE_URL}/models`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter model list request failed (${response.status})`,
    );
  }

  const result = (await response.json()) as { data?: { id?: string }[] };

  return (result.data ?? [])
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id))
    .sort();
}
