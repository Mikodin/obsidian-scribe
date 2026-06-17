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

  let bodyBuffer = req.body ? await req.arrayBuffer() : undefined;

  // Groq, Gemini's OpenAI-compat endpoint, and several other providers reject
  // JSON schemas that include meta-fields like `$schema`, `title`, or
  // `additionalProperties`. Strip them from every schema the request carries:
  // both `response_format.json_schema.schema` (OpenAI's strict structured
  // output) and `tools[*].function.parameters` (function-calling, which is
  // the only structured-output path supported by Gemini-compat).
  if (
    bodyBuffer &&
    (headersObj['content-type'] ?? '').includes('application/json')
  ) {
    try {
      const bodyJson = JSON.parse(new TextDecoder().decode(bodyBuffer));
      let touched = false;

      const stripSchemaMeta = (schema: Record<string, unknown>) => {
        if ('$schema' in schema) {
          delete schema.$schema;
          touched = true;
        }
        if ('title' in schema) {
          delete schema.title;
          touched = true;
        }
        if ('additionalProperties' in schema) {
          delete schema.additionalProperties;
          touched = true;
        }
      };

      const jsonSchema = bodyJson?.response_format?.json_schema?.schema;
      if (jsonSchema && typeof jsonSchema === 'object') {
        stripSchemaMeta(jsonSchema);
      }

      const tools = Array.isArray(bodyJson?.tools) ? bodyJson.tools : [];
      for (const tool of tools) {
        const params = tool?.function?.parameters;
        if (params && typeof params === 'object') {
          stripSchemaMeta(params as Record<string, unknown>);
        }
      }

      if (touched) {
        bodyBuffer = new TextEncoder().encode(JSON.stringify(bodyJson))
          .buffer as ArrayBuffer;
      }
    } catch {
      // Not valid JSON or no schema to strip — leave body unchanged
    }
  }

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
  if (
    bodyBuffer &&
    (headersObj['content-type'] ?? '').includes('application/json')
  ) {
    console.debug(
      '[obsidianFetch] request body (parsed):',
      fullJsonForLog(JSON.parse(new TextDecoder().decode(bodyBuffer))),
    );
  }

  const obsidianResponse = await requestUrl(obsidianParams);
  console.debug('[obsidianFetch] ←', obsidianResponse.status, url);
  if (obsidianResponse.status >= 400) {
    console.debug('[obsidianFetch] error body:', obsidianResponse.text);
  } else if ((headersObj['content-type'] ?? '').includes('application/json')) {
    try {
      console.debug(
        '[obsidianFetch] response body (parsed):',
        fullJsonForLog(JSON.parse(obsidianResponse.text)),
      );
    } catch {
      // not JSON — leave alone
    }
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

/**
 * Compact JSON dump for console.debug:
 *  - Stringifies keys + types at every level
 *  - Truncates long string values (so the transcript / system prompt doesn't
 *    drown the console) but keeps the first ~200 chars so you can see the
 *    actual prompt + model + messages structure sent to Gemini.
 *  - Drops tool/function `parameters` schemas (they're huge).
 */
function summarizeJsonForLog(value: unknown, maxStringLen = 200): unknown {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'string' && value.length > maxStringLen
      ? `${value.slice(0, maxStringLen)}… [+${value.length - maxStringLen} chars]`
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => summarizeJsonForLog(v, maxStringLen));
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      (k === 'parameters' || k === 'json_schema') &&
      v &&
      typeof v === 'object'
    ) {
      const nested = v as Record<string, unknown>;
      out[k] = `<omitted schema: keys=${Object.keys(nested).join(',')}>`;
      continue;
    }
    out[k] = summarizeJsonForLog(v, maxStringLen);
  }
  return out;
}

/**
 * Like summarizeJsonForLog but does NOT truncate strings or omit nested
 * schemas — used when you want the full transcript/system-prompt contents
 * in the console.
 */
function fullJsonForLog(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(fullJsonForLog);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = fullJsonForLog(v);
  }
  return out;
}
