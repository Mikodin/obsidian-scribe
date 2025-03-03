import type ScribePlugin from 'src';
import { SettingsItem } from './SettingsItem';
import { useEffect, useState } from 'react';

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
    <div style={{ width: '100%' }}>
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
        rows={3}
        onChange={(e) => {
          // setNoteFilenamePrefix(e.target.value);
          // plugin.settings.noteFilenamePrefix = e.target.value;
          // saveSettings();
        }}
        style={{ width: '100%', resize: 'none', overflow: 'hidden' }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
      />
      <hr />
    </div>
  );
};

const TemplateControls: React.FC<{
  noteTemplates: ScribeTemplate[];
  activeTemplate: ScribeTemplate;
  setNoteTemplates: (templates: ScribeTemplate[]) => void;
  setActiveTemplate: (template: ScribeTemplate) => void;
}> = ({
  noteTemplates,
  activeTemplate,
  setNoteTemplates,
  setActiveTemplate,
}) => {
  return (
    <>
      <SettingsItem
        name="Active Template"
        description="Select the active note template"
        control={
          <select
            value={activeTemplate.name}
            className="dropdown"
            onChange={(e) => {
              const selectedTemplate = noteTemplates.find(
                (template) => template.name === e.target.value,
              );

              if (selectedTemplate) {
                setActiveTemplate(selectedTemplate);
              }
            }}
          >
            {noteTemplates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        }
      />
      <button
        type="button"
        onClick={() => {
          const newTemplate: ScribeTemplate = {
            name: Date.now().toString(),
            sections: [],
          };
          const updatedTemplates = [...noteTemplates, newTemplate];
          setNoteTemplates(updatedTemplates);
          setActiveTemplate(newTemplate);
        }}
      >
        New Template
      </button>

      <button
        type="button"
        onClick={() => {
          const updatedTemplates = noteTemplates.filter(
            (template) => template.name !== activeTemplate.name,
          );

          setNoteTemplates(updatedTemplates);
          setActiveTemplate(updatedTemplates[0]);
        }}
      >
        Remove Active Template
      </button>

      <SettingsItem
        name="Template Name"
        description="Change the name of the active template"
        control={
          <input
            type="text"
            value={activeTemplate.name}
            onChange={(e) => {
              const updatedTemplate = {
                ...activeTemplate,
                name: e.target.value,
              };

              const activeTemplateIdx = noteTemplates.findIndex(
                (template) => template.name === activeTemplate.name,
              );

              const updatedTemplates = [...noteTemplates];
              updatedTemplates[activeTemplateIdx] = updatedTemplate;

              setActiveTemplate(updatedTemplate);
              setNoteTemplates(updatedTemplates);
            }}
          />
        }
      />

      <button
        type="button"
        onClick={() => {
          const newSection: TemplateSection = {
            sectionHeader: 'New Section',
            sectionInstructions: 'New Section Instructions',
          };

          const updatedTemplate = {
            ...activeTemplate,
            sections: [...activeTemplate.sections, newSection],
          };

          const activeTemplateIdx = noteTemplates.findIndex(
            (template) => template.name === activeTemplate.name,
          );

          const updatedTemplates = [...noteTemplates];
          updatedTemplates[activeTemplateIdx] = updatedTemplate;

          setActiveTemplate(updatedTemplate);
          setNoteTemplates(updatedTemplates);
        }}
      >
        Add New Section
      </button>
    </>
  );
};

export const NoteTemplateSettings: React.FC<{
  plugin: ScribePlugin;
  saveSettings: () => void;
}> = ({ plugin, saveSettings }) => {
  const [noteTemplates, setNoteTemplates] = useState(
    plugin.settings.noteTemplates,
  );
  const [activeTemplate, setActiveTemplate] = useState(
    plugin.settings.activeNoteTemplate,
  );

  useEffect(() => {
    plugin.settings.noteTemplates = noteTemplates;
    plugin.settings.activeNoteTemplate = activeTemplate;
    saveSettings();
  }, [noteTemplates, activeTemplate, plugin, saveSettings]);

  return (
    <div>
      <h2>Templates</h2>
      <TemplateControls
        noteTemplates={noteTemplates}
        activeTemplate={activeTemplate}
        setNoteTemplates={setNoteTemplates}
        setActiveTemplate={setActiveTemplate}
      />
      {activeTemplate.sections.map((section) => (
        <TemplateSection key={section.sectionHeader} section={section} />
      ))}
    </div>
  );
};
