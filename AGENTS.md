# Obsidian-Scribe Agent Instructions

## Project Overview

Obsidian plugin (TypeScript + React) that records voice, transcribes audio (OpenAI Whisper or AssemblyAI), summarizes via LLM (LangChain + OpenAI), and writes structured Markdown notes into the vault. Built with esbuild, formatted with Biome.

## Available commands

### After writing code - Format and Build

After writing code, always run these commands before completing the task:

1. `npm run format:write` — auto-format with Biome
2. `npm run build:prod` — typecheck + production build

Both must pass cleanly. Fix any errors before finishing.

Entry: `main.ts` → re-exports default class from `src/index.ts`. Output: `build/main.js` (CJS bundle).

### Commands to never run
`npm run dev            # Never run this command.  You will get stuck.
`npm run update-all-deps # Never run this command.

## Project Structure

```
main.ts                          # Entrypoint, re-exports plugin class
src/
  index.ts                       # ScribePlugin class — the god object, all orchestration
  styles.css                     # Global plugin CSS
  audioRecord/audioRecord.ts     # MediaRecorder wrapper
  commands/commands.ts           # Obsidian command registrations
  ribbon/ribbon.ts               # Ribbon icon + dropdown menu
  modal/
    scribeControlsModal.tsx      # Modal class + React root mount
    components/                  # Modal UI components
      options/                   # Modal option sub-panels
    icons/icons.tsx              # SVG icon components
  settings/
    settings.tsx                 # Settings tab class, interfaces, defaults, React root mount
    GeneralSettingsTab.tsx        # General settings page
    ProviderSettingsTab.tsx       # AI provider settings page
    components/                  # Reusable settings UI controls
    hooks/useSettingsForm.tsx     # register()-pattern hook for settings controls
    provider/SettingsFormProvider.tsx  # React context for settings state
  util/
    assemblyAiUtil.ts            # AssemblyAI transcription
    audioDataToChunkedFiles.ts   # Audio decode, mono conversion, WAV chunking
    consts.ts                    # Shared enums (LanguageOptions, RECORDING_STATUS)
    filenameUtils.ts             # Date-based filename formatting
    fileUtils.ts                 # Vault file operations (save, create, rename, append)
    mimeType.ts                  # MIME type detection and mapping
    openAiUtils.ts               # OpenAI Whisper transcription + LangChain summarization
    pathUtils.ts                 # Obsidian path resolution
    textUtil.ts                  # Mermaid extraction, JSON key sanitization
    useDebounce.tsx              # Debounce hook
```

### Folder Conventions
- **Feature-folder grouping**: each domain (modal, settings, audioRecord, commands, ribbon) gets its own folder
- **Flat util folder**: one concern per file in `src/util/`
- **Components nest under parent feature**: `modal/components/`, `settings/components/`
- **No barrel/index re-exports**: every consumer imports directly from the source file path

## Naming Conventions

| Category | Convention | Examples |
|---|---|---|
| Local variables | camelCase | `audioBuffer`, `scribeOptions`, `baseFileName` |
| Booleans | `is`/`has`/`should` prefix | `isActive`, `isPaused`, `hasOpenAiApiKey` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_SETTINGS`, `MAX_CHUNK_SIZE` |
| Enums | PascalCase name | `TRANSCRIPT_PLATFORM`, `LanguageOptions`, `LLM_MODELS` |
| Interfaces/Types | PascalCase, no `I` prefix | `ScribeState`, `ScribeOptions`, `ScribePluginSettings` |
| Handlers | `handle` prefix | `handleStart`, `handlePauseResume`, `handleComplete` |
| CSS classes | `scribe-` prefix, kebab-case | `scribe-modal`, `scribe-btn-start` |

## Export Patterns

- **Plugin class**: `export default class` in `src/index.ts`
- **Page-level components & hooks**: `export default function` (`GeneralSettingsTab`, `useSettingsForm`, `AudioDeviceSettings`)
- **Utility functions & sub-components**: named `export function` (`handleCommands`, `ModalRecordingButtons`, `SettingsToggle`)
- **Constants & display components**: named `export const` (`DEFAULT_SETTINGS`, `SettingsItem`, `AiModelSettings`)
- **Enums**: named `export enum` (`TRANSCRIPT_PLATFORM`, `LLM_MODELS`, `LanguageOptions`)
- **Types/Interfaces**: named `export interface` / `export type`
- No barrel re-exports. Import directly from source paths.

## Code Style

- **Formatter**: Biome — 2-space indent, single quotes, semicolons, trailing commas
- **File extensions**: `.ts` for pure logic, `.tsx` for anything with JSX
- **Imports**: `import type` for type-only imports; `src/` base path alias for cross-feature imports, relative `./` within the same feature
- **Async**: `async/await` throughout
- **Error handling**: `try/catch/finally` with `new Notice(...)` for user feedback, `console.error` for dev logs
- **Comments**: sparse — JSDoc for attribution, occasional inline explanations. No pervasive function docs.
- **No tests**: no test files exist

## Architecture

### React-in-Obsidian Bridge

React cannot render directly into Obsidian. Two mount points create the bridge:

1. **Settings Tab** (`ScribeSettingsTab.display()`): creates a `<div>` via `containerEl.createDiv()`, mounts React via `createRoot()`. Obsidian calls `display()` on open, `containerEl.empty()` tears down.
2. **Controls Modal** (`ScribeControlsModal.onOpen()`): creates a `<div>` via `contentEl.createDiv()`, mounts React via `createRoot()`. `onClose()` calls `root.unmount()` + `contentEl.empty()`.

**Non-React (imperative Obsidian API)**: ribbon icon + Menu, command palette registrations, the "Reset to default" button in settings.

When adding new UI, decide: is this Obsidian-native (ribbon, commands, simple buttons) or complex enough for React (forms, stateful controls, timers)?

### State — Three Tiers

1. **Plugin instance** (`ScribePlugin` class fields):
   - `this.settings: ScribePluginSettings` — persisted config. Merged from `DEFAULT_SETTINGS` + `loadData()` on startup, written via `saveData()`.
   - `this.state: ScribeState` — ephemeral runtime: `isOpen`, `audioRecord`, `openAiClient`. Never persisted. Reset on cleanup.
   - `this.controlModal` — long-lived modal instance, reused across openings.

2. **React Context** (Settings UI only):
   - `SettingsFormProvider` wraps settings pages, provides `useSettings()`, `useSettingsUpdater()`, `usePlugin()`.
   - React state is the source of truth during editing → `useEffect` syncs back to `plugin.settings` + debounced `saveData()`.
   - The `useSettingsForm().register(key)` hook returns `{ onChange, value, id }` props — similar to react-hook-form's pattern.

3. **Local `useState`** (Modal, templates):
  - Modal maintains recording UI state (`isActive`, `recordingState`, elapsed timer display, etc.) and syncs transitions from plugin/recorder outcomes rather than optimistic toggles.
   - `scribeOptions: ScribeOptions` — a **per-session copy** of settings, modifiable without affecting persisted config.

**Caveat**: Two settings mutation patterns coexist. Newer components use the context system (`register()`). Older ones (`AiModelSettings`, `NoteTemplateSettings`) directly mutate `plugin.settings.*` and call `saveSettings()`. Follow the context pattern for new work.

### Persistent Storage

All persistence uses Obsidian's plugin data API:
- `plugin.loadData()` / `plugin.saveData()` → reads/writes `.obsidian/plugins/obsidian-scribe/data.json`
- `plugin.app.vault.createBinary()` — save audio files
- `plugin.app.vault.create()` — create markdown notes
- `plugin.app.vault.process()` — atomic read-modify-write for note content
- `plugin.app.fileManager.processFrontMatter()` — YAML frontmatter manipulation
- `plugin.app.fileManager.renameFile()` — rename after LLM title generation

File collision handling: appends `Math.floor(Math.random() * 1000)` suffix if path exists.

### Audio Pipeline

```
getUserMedia → MediaRecorder (webm/opus @ 32kbps) → Blob chunks → ArrayBuffer
  ├─→ vault.createBinary() (save audio file)
  └─→ Transcription service (OpenAI or AssemblyAI)
```

`AudioRecord` class wraps `MediaRecorder`. Picks MIME type via priority list (prefers `audio/webm; codecs=opus`). Supports pause/resume and device selection.

Pause/resume implementation notes:
- `startRecording()` resolves only after recorder start is confirmed.
- Pause/resume transitions are guarded (`recording` ↔ `paused`) and wait for actual recorder state change.
- Recording duration excludes paused time (`pausedAtTime` + `accumulatedPausedDurationMs`).
- “Active recording” means **recording or paused** (`isRecordingOrPaused()`).

### Transcription: OpenAI vs AssemblyAI

| Aspect | OpenAI | AssemblyAI |
|---|---|---|
| Chunking | Decodes → mono → splits into 25MB WAV chunks | None — sends raw buffer |
| Model | `whisper-1` (or custom) | `universal-3-pro`, fallback `universal-2` |
| Multi-speaker | Not supported | Supported via `speaker_labels` |
| Language | Optional `language` param | Optional `language_code` param |
| Output | Raw concatenated text | Paragraphed text (second API call) or utterances |

Selected by `settings.transcriptPlatform` in `ScribePlugin.handleTranscription()`.

### LLM Summarization

Uses LangChain `ChatOpenAI` + `.withStructuredOutput()` with a **dynamically-built Zod schema** derived from the active note template's sections. Each template section becomes a schema field where:
- Key = `convertToSafeJsonKey(sectionHeader)` (lowercase, non-alphanumeric → `_`)
- Description = `sectionInstructions` (guides LLM output)
- Optional sections use `z.string().nullable()`

Always includes a `fileTitle` field for note renaming.

### End-to-End Flow: Record → Note

1. User clicks "Complete" → `plugin.scribe(scribeOptions)`
2. `audioRecord.stopRecording()` → Blob → ArrayBuffer
3. `saveAudioRecording()` → audio file in vault
4. Create/get target note (new note or append to active file) via `resolveTargetNote`
5. Update frontmatter immediately via `updateFrontMatter` (append `audio` list + `created_by`) so audio reference is preserved even if downstream stages fail
6. Transcribe via OpenAI or AssemblyAI → transcript text
7. Replace "# Audio in progress" placeholder with transcript
8. (If not transcribe-only) Summarize via LLM → structured JSON
9. Append each template section as `## Header` to note
10. Rename note with LLM-suggested title
11. Cleanup: close modal, stop recording, null state

### Recording UX State Model

- Modal, command palette, and ribbon all treat paused recordings as in-progress sessions.
- Recording notice/timer messages are derived from recorder-aware elapsed duration (paused time not counted).
- `ScribePlugin` exposes helper methods used across entry points to avoid state drift:
  - `isRecordingActive()`
  - `getRecordingState()`
  - `getRecordingDurationMs()`

### Alternate Entry Points

- **Scribe existing file**: Command reads active audio file via `vault.readBinary()`, skips recording, enters pipeline at step 4.
- **Fix mermaid chart**: Extracts mermaid block via regex, sends to LLM for repair, replaces in-place.
- **Ribbon menu**: Context menu with start/open-controls when idle, and pause/resume/stop/cancel when recording is active.

## Key Patterns for New Development

- `ScribePlugin` is the orchestration hub. New features that involve file I/O, recording, or LLM calls should be methods on this class (or utility functions called by it).
- New settings: add to `ScribePluginSettings` interface + `DEFAULT_SETTINGS` object. Use the `SettingsFormProvider` context pattern with `register()` for UI.
- New modal options: add to `ScribeOptions` interface. Initialize from `plugin.settings` in the modal's `useState` defaults.
- New template sections: just add via the template UI — the Zod schema is built dynamically.
- Utility functions are pure — they receive everything they need as arguments. The `plugin` instance is only passed to vault/file operations.
- All user-facing messages go through `new Notice('Scribe: ...')` with emoji prefixes.


