export function extractMermaidChart(inputString: string): string | undefined {
  const mermaidRegex = /```mermaid\s+([\s\S]*?)```/g;
  const matches = mermaidRegex.exec(inputString);

  if (matches && matches.length > 1) {
    return matches[1];
  }

  return undefined;
}

export function convertToSafeJsonKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}
