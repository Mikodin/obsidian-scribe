import type {
  ScribeTemplate,
  SectionType,
  TemplateSection,
} from 'src/settings/components/NoteTemplateSettings';

export const TRANSCRIPT_IN_PROGRESS_PLACEHOLDER =
  '🎙️ *Transcription in progress...*';
export const LLM_SECTION_IN_PROGRESS_PLACEHOLDER =
  '🧠 *Scribe is summarizing...*';

const DEFAULT_AUDIO_SECTION: TemplateSection = {
  id: 'system-audio',
  sectionType: 'audio',
  sectionHeader: '# Audio',
  sectionInstructions: '',
};

const DEFAULT_TRANSCRIPT_SECTION: TemplateSection = {
  id: 'system-transcript',
  sectionType: 'transcript',
  sectionHeader: '',
  sectionInstructions: '',
  isCollapsedByDefault: false,
};

export function getSectionType(section: TemplateSection): SectionType {
  return section.sectionType ?? 'llm';
}

export function getLlmSections(template: ScribeTemplate): TemplateSection[] {
  return template.sections.filter(
    (section) => getSectionType(section) === 'llm',
  );
}

/**
 * Guarantees a template has exactly one audio and one transcript system section.
 * Missing sections are injected at the top (audio, then transcript) so migrated
 * templates keep today's output order; duplicates keep the first occurrence.
 */
export function ensureSystemSections(template: ScribeTemplate): {
  template: ScribeTemplate;
  didChange: boolean;
} {
  const seenSystemTypes = new Set<SectionType>();
  const sections = template.sections.filter((section) => {
    const sectionType = getSectionType(section);
    if (sectionType === 'llm') {
      return true;
    }
    if (seenSystemTypes.has(sectionType)) {
      return false;
    }
    seenSystemTypes.add(sectionType);
    return true;
  });

  let didChange = sections.length !== template.sections.length;

  if (!seenSystemTypes.has('transcript')) {
    const audioIdx = sections.findIndex(
      (section) => getSectionType(section) === 'audio',
    );
    sections.splice(audioIdx + 1, 0, { ...DEFAULT_TRANSCRIPT_SECTION });
    didChange = true;
  }

  if (!seenSystemTypes.has('audio')) {
    sections.unshift({ ...DEFAULT_AUDIO_SECTION });
    didChange = true;
  }

  return didChange
    ? { template: { ...template, sections }, didChange }
    : { template, didChange };
}

/**
 * Migrates a persisted template to the current shape. Headers are verbatim
 * markdown lines, so any non-blank header without a level gets `## ` prepended
 * (pre-v3 templates rendered LLM headers as `## ${sectionHeader}`, so this
 * also preserves their output byte-for-byte). Then system sections are
 * injected. Idempotent: an already-migrated template passes through unchanged.
 */
export function migrateTemplate(template: ScribeTemplate): {
  template: ScribeTemplate;
  didChange: boolean;
} {
  let didPrependLevel = false;
  const sections = template.sections.map((section) => {
    const header = section.sectionHeader.trim();
    if (!header || header.startsWith('#')) {
      return section;
    }
    didPrependLevel = true;
    return { ...section, sectionHeader: `## ${header}` };
  });

  const migrated = didPrependLevel ? { ...template, sections } : template;
  const result = ensureSystemSections(migrated);
  return {
    template: result.template,
    didChange: result.didChange || didPrependLevel,
  };
}

/**
 * Section headers are full raw markdown lines (e.g. `# Audio`).
 * Returns '' when the section renders nothing.
 */
export function renderAudioSection(
  section: TemplateSection,
  audioEmbedPath: string | null,
): string {
  const parts = [];
  if (section.sectionHeader.trim()) {
    parts.push(section.sectionHeader);
  }
  if (audioEmbedPath) {
    parts.push(`![[${audioEmbedPath}]]`);
  }
  return parts.join('\n');
}

export function renderTranscriptSection(
  section: TemplateSection,
  body: string,
): string {
  if (section.isCollapsedByDefault) {
    const title =
      section.sectionHeader.trim().replace(/^#+\s*/, '') || 'Transcript';
    const quotedBody = body
      .split('\n')
      .map((line) => (line.length ? `> ${line}` : '>'))
      .join('\n');
    return `> [!note]- ${title}\n${quotedBody}`;
  }

  return section.sectionHeader.trim()
    ? `${section.sectionHeader}\n${body}`
    : body;
}

export function renderLlmSection(
  section: TemplateSection,
  value: string,
): string {
  const { sectionHeader, sectionOutputPrefix, sectionOutputPostfix } = section;
  const headerLine = sectionHeader.trim() ? `${sectionHeader}\n` : '';

  if (sectionOutputPrefix || sectionOutputPostfix) {
    return `${headerLine}${sectionOutputPrefix || ''}\n${value}\n${sectionOutputPostfix || ''}`;
  }

  return `${headerLine}${value}`;
}

export interface SkeletonBlocks {
  skeleton: string;
  transcriptSection: TemplateSection | null;
  transcriptBlock: string | null;
  llmBlocks: { section: TemplateSection; block: string }[];
}

/**
 * Renders the full note skeleton in template-section order.
 * Audio renders its final content immediately (the embed path is known up front);
 * transcript and LLM sections render with in-progress placeholders, and their
 * exact block strings are returned so they can be string-replaced once real
 * content arrives — regardless of where they sit in the note.
 */
export function buildNoteSkeleton(
  template: ScribeTemplate,
  {
    audioEmbedPath,
    includeLlmSections,
  }: { audioEmbedPath: string | null; includeLlmSections: boolean },
): SkeletonBlocks {
  const blocks: string[] = [];
  let transcriptSection: TemplateSection | null = null;
  let transcriptBlock: string | null = null;
  const llmBlocks: { section: TemplateSection; block: string }[] = [];

  for (const section of template.sections) {
    const sectionType = getSectionType(section);

    if (sectionType === 'audio') {
      const block = renderAudioSection(section, audioEmbedPath);
      if (block) {
        blocks.push(block);
      }
      continue;
    }

    if (sectionType === 'transcript') {
      const block = renderTranscriptSection(
        section,
        TRANSCRIPT_IN_PROGRESS_PLACEHOLDER,
      );
      transcriptSection = section;
      transcriptBlock = block;
      blocks.push(block);
      continue;
    }

    if (includeLlmSections) {
      const block = renderLlmSection(
        section,
        LLM_SECTION_IN_PROGRESS_PLACEHOLDER,
      );
      llmBlocks.push({ section, block });
      blocks.push(block);
    }
  }

  return {
    skeleton: blocks.join('\n'),
    transcriptSection,
    transcriptBlock,
    llmBlocks,
  };
}
