import { moment } from 'obsidian';

// TS 7's always-on esModuleInterop drops the call signature from Obsidian's
// `typeof Moment` re-export, so restore it via the module's own export type
const momentFn = moment as unknown as typeof import('moment');

export function formatFilenamePrefix(prefix: string, format: string) {
  if (prefix.includes('{{date}}')) {
    const formatted = prefix.replace('{{date}}', momentFn().format(format));
    return formatted;
  }
  return prefix;
}
