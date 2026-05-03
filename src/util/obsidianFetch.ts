import {
  type RequestUrlParam,
  type RequestUrlResponse,
  requestUrl,
} from 'obsidian';
import type { Fetch } from 'openai/internal/builtin-types';

/**
 * A custom 'fetch' implementation that wraps Obsidian's 'requestUrl()' to
 * avoid CORS issues with OpenAI-compatible providers (e.g. Fireworks, Gemini).
 * Works with both the OpenAI SDK and LangChain's ChatOpenAI.
 * @example
 * const client = new OpenAI({ fetch: obsidianFetch })
 * const model = new ChatOpenAI({ configuration: { fetch: obsidianFetch } })
 */
export const obsidianFetch: Fetch = async (requestInfo, init) => {
  // Always normalize to a Request object so the browser handles FormData
  // serialization, including generating the multipart/form-data boundary in
  // the content-type header. Without this, passing FormData through init.body
  // and calling .toString() on it produces "[object FormData]".
  const req =
    requestInfo instanceof Request
      ? requestInfo
      : new Request(requestInfo, init ?? undefined);

  const { url } = req;

  // The OpenAI SDK occasionally calls fetch('data:,...') internally to read
  // file content. Delegate to native fetch — Obsidian's requestUrl only
  // handles http/https.
  if (url.startsWith('data:')) {
    console.debug(
      '[obsidianFetch] data: URL — delegating to native fetch',
      url.slice(0, 40),
    );
    return fetch(requestInfo, init);
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const msg =
      `Invalid URL protocol — only http/https are supported. Got: "${url}". ` +
      `If you're using a custom base URL, make sure it includes "https://".`;
    console.error('[obsidianFetch]', msg);
    throw new Error(msg);
  }

  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  const bodyBuffer = req.body ? await req.arrayBuffer() : undefined;

  const obsidianParams: RequestUrlParam = {
    url,
    method: req.method,
    headers: headersObj,
    body: bodyBuffer,
    throw: false, // Don't throw on non-2xx — let the OpenAI SDK handle error responses
  };

  const bodySize = bodyBuffer ? `${bodyBuffer.byteLength} bytes` : 'none';
  const contentType = headersObj['content-type'] ?? '(none)';
  console.debug(
    '[obsidianFetch] →',
    req.method,
    url,
    '| content-type:',
    contentType,
    '| body:',
    bodySize,
  );

  const obsidianResponse = await requestUrl(obsidianParams);
  console.debug('[obsidianFetch] ←', obsidianResponse.status, url);
  if (obsidianResponse.status >= 400) {
    console.debug('[obsidianFetch] error body:', obsidianResponse.text);
  }
  return obsidianResponseToResponse(obsidianResponse);
};

function obsidianResponseToResponse(
  obsidianResponse: RequestUrlResponse,
): Response {
  return new Response(obsidianResponse.text, {
    status: obsidianResponse.status,
    statusText: '',
    headers: new Headers(obsidianResponse.headers),
  });
}
