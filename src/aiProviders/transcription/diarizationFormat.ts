export interface SpeakerSegment {
  speaker: string;
  text: string;
}

/**
 * Formats diarized segments as `**Speaker N**: text` lines, matching the
 * convention the AssemblyAI transcriber established. Consecutive segments
 * from the same speaker are merged.
 */
export function formatSpeakerSegments(segments: SpeakerSegment[]): string {
  const merged: SpeakerSegment[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) {
      continue;
    }

    const last = merged[merged.length - 1];
    if (last && last.speaker === segment.speaker) {
      last.text += ` ${text}`;
    } else {
      merged.push({ speaker: segment.speaker, text });
    }
  }

  return merged
    .map(({ speaker, text }) => `**Speaker ${speaker}**: ${text}`)
    .join('\n');
}
