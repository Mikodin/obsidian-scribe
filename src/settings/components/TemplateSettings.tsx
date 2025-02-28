import type ScribePlugin from 'src';
import { SettingsItem } from './SettingsItem';

export interface ScribeTemplate {
  name: string;
  sections: TemplateSection[];
}
export interface TemplateSection {
  sectionHeader: string;
  sectionInstructions: string;
  isSectionOptional?: boolean;
  sectionOutputPrefix?: string;
}

export const DEFAULT_TEMPLATE: ScribeTemplate = {
  name: 'Default Template',
  sections: [
    {
      sectionHeader: 'Summary',
      sectionInstructions: `A summary of the transcript in Markdown.  It will be nested under a h2 # tag, so use a tag less than that for headers
         Concise bullet points containing the primary points of the speaker`,
    },
    {
      sectionHeader: 'Insights',
      sectionInstructions: `Insights that you gained from the transcript in Markdown.
        A brief section, a paragraph or two on what insights and enhancements you think of
        Several bullet points on things you think would be an improvement, feel free to use headers
        It will be nested under an h2 tag, so use a tag less than that for headers
        `,
    },
    {
      sectionHeader: 'Mermaid Chart',
      sectionOutputPrefix: '```mermaid',
      sectionInstructions: `A valid unicode mermaid chart that shows a concept map consisting of both what insights you had along with what the speaker said for the mermaid chart, 
        Dont wrap it in anything, just output the mermaid chart.  
        Do not use any special characters that arent letters in the nodes text, particularly new lines, tabs, or special characters like apostraphes or quotes or commas`,
    },
    {
      sectionHeader: 'Answered Questions',
      isSectionOptional: true,
      sectionInstructions: `If the user says "Hey Scribe" or alludes to you, asking you to do something, answer the question or do the ask and put the answers here
        Put the text in markdown, it will be nested under an h2 tag, so use a tag less than that for headers
        Summarize the question in a short sentence as a header and format place your reply nicely below for as many questions as there are
        Answer their questions in a clear and concise manner`,
    },
  ],
};

const TemplateSection: React.FC<{ section: TemplateSection }> = ({
  section,
}) => {
  return (
    <div>
      <SettingsItem
        name="Section Header"
        description=""
        control={
          <input
            type="text"
            value={section.sectionHeader}
            onChange={(e) => {
              // setNoteFilenamePrefix(e.target.value);
              // plugin.settings.noteFilenamePrefix = e.target.value;
              // saveSettings();
            }}
          />
        }
      />

      <p>Section Instructions</p>
      <textarea
        value={section.sectionInstructions}
        onChange={(e) => {
          // setNoteFilenamePrefix(e.target.value);
          // plugin.settings.noteFilenamePrefix = e.target.value;
          // saveSettings();
        }}
      />
    </div>
  );
};

export const TemplateSettings: React.FC<{
  plugin: ScribePlugin;
  saveSettings: () => void;
}> = ({ plugin, saveSettings }) => {
  const activeTemplate = DEFAULT_TEMPLATE;
  return (
    <div>
      <h2>Templates</h2>
      {activeTemplate.sections.map((section) => (
        <TemplateSection key={section.sectionHeader} section={section} />
      ))}
    </div>
  );
};
