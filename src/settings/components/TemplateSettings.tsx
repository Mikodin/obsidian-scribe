import type ScribePlugin from 'src';
import { SettingsItem } from './SettingsItem';

interface Section {
  title: string;
  description: string;
  optional?: boolean;
  codeBlockPrefix?: string;
}

export const DEFAULT_SECTIONS: Section[] = [
  {
    title: 'Summary',
    description: `A summary of the transcript in Markdown.  It will be nested under a h2 # tag, so use a tag less than that for headers
         Concise bullet points containing the primary points of the speaker`,
  },
  {
    title: 'Insights',
    description: `Insights that you gained from the transcript in Markdown.
        A brief section, a paragraph or two on what insights and enhancements you think of
        Several bullet points on things you think would be an improvement, feel free to use headers
        It will be nested under an h2 tag, so use a tag less than that for headers
        `,
  },
  {
    title: 'Mermaid Chart',
    codeBlockPrefix: '```mermaid',
    description: `A valid unicode mermaid chart that shows a concept map consisting of both what insights you had along with what the speaker said for the mermaid chart, 
        Dont wrap it in anything, just output the mermaid chart.  
        Do not use any special characters that arent letters in the nodes text, particularly new lines, tabs, or special characters like apostraphes or quotes or commas`,
  },
  {
    title: 'Answered Questions',
    optional: true,
    description: `If the user says "Hey Scribe" or alludes to you, asking you to do something, answer the question or do the ask and put the answers here
        Put the text in markdown, it will be nested under an h2 tag, so use a tag less than that for headers
        Summarize the question in a short sentence as a header and format place your reply nicely below for as many questions as there are
        Answer their questions in a clear and concise manner`,
  },
  {
    title: 'Title',
    description:
      'A suggested title for the Obsidian Note. Ensure that it is in the proper format for a file on mac, windows and linux, do not include any special characters',
  },
];

const TemplateSection: React.FC<{ section: Section }> = ({ section }) => {
  return (
    <div>
      <SettingsItem
        name="Section Title"
        description=""
        control={
          <input
            type="text"
            value={section.title}
            onChange={(e) => {
              // setNoteFilenamePrefix(e.target.value);
              // plugin.settings.noteFilenamePrefix = e.target.value;
              // saveSettings();
            }}
          />
        }
      />

      <p>Section Description</p>
      <textarea
        value={section.description}
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
  const template = {
    name: 'Default Template',
    sections: DEFAULT_SECTIONS,
  };

  return (
    <div>
      <h2>Templates</h2>
      {template.sections.map((section) => (
        <TemplateSection key={section.title} section={section} />
      ))}
    </div>
  );
};
