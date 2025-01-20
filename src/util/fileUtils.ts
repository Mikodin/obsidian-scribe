import { moment, normalizePath, type TFile } from "obsidian";

import type ScribePlugin from "src";
import type { LLMSummary } from "./openAiUtils";

export async function saveAudioRecording(
	plugin: ScribePlugin,
	recordingBuffer: ArrayBuffer,
	baseFileName: string
) {
	const pathToSave = plugin.settings.recordingDirectory;
	let fullPath = normalizePath(
		`${pathToSave}/${baseFileName}.${plugin.state.audioRecord?.fileExtension}`
	);

	const fileAlreadyExists = await plugin.app.vault.adapter.exists(
		fullPath,
		true
	);
	if (fileAlreadyExists) {
		const uuid = Math.floor(Math.random() * 1000);
		fullPath = `${pathToSave}/${baseFileName}.${uuid}.${plugin.state.audioRecord?.fileExtension}`;
	}
	try {
		const savedFile = await plugin.app.vault.createBinary(
			fullPath,
			recordingBuffer
		);
		return savedFile;
	} catch (error) {
		console.error(`Failed to save file in: ${fullPath}`, error);
		throw error;
	}
}

export async function createNewNote(
	plugin: ScribePlugin,
	fileName: string
): Promise<TFile> {
	try {
		const pathToSave = plugin.settings.transcriptDirectory;
		const fullPath = `${pathToSave}/${fileName}.md`;
		let notePath = normalizePath(fullPath);

		const fileAlreadyExists = await plugin.app.vault.adapter.exists(
			notePath,
			true
		);
		if (fileAlreadyExists) {
			const uuid = Math.floor(Math.random() * 1000);
			notePath = normalizePath(`${pathToSave}/${fileName}.${uuid}.md`);
		}

		const savedFile = await plugin.app.vault.create(notePath, "");

		return savedFile;
	} catch (error) {
		console.error("Failed to save file", error);
		if (error === "Error: File already exists") {
			createNewNote(plugin, `${fileName}.${Math.random() * 100}`);
		}
		throw error;
	}
}

export async function renameFile(
	plugin: ScribePlugin,
	originalNote: TFile,
	newFileName: string
) {
	const filePath = originalNote.path.replace(originalNote.name, "");
	let preferredFullFileNameAndPath = `${filePath}/${newFileName}.md`;

	const fileAlreadyExists = await plugin.app.vault.adapter.exists(
		preferredFullFileNameAndPath,
		true
	);
	if (fileAlreadyExists) {
		const uuid = Math.floor(Math.random() * 1000);
		preferredFullFileNameAndPath = `${filePath}/${newFileName}.${uuid}.md`;
	}

	await plugin.app.fileManager.renameFile(
		originalNote,
		`${preferredFullFileNameAndPath}`
	);
}

const TRANSCRIPT_IN_PROGRESS_HEADER = "# Transcription In Progress";
export async function addAudioSourceToFrontmatter(
	plugin: ScribePlugin,
	noteFile: TFile,
	audioFile: TFile
) {
	try {
		const noteContent = `${TRANSCRIPT_IN_PROGRESS_HEADER}\n![[${audioFile.path}]]`;

		await plugin.app.vault.process(noteFile, (data) => {
			if (data.length) {
				return `${data}\n${noteContent}`;
			}
			return noteContent;
		});

		await plugin.app.fileManager.processFrontMatter(
			noteFile,
			(frontMatter) => {
				const newFrontMatter = {
					...frontMatter,
					source: [
						...(frontMatter.source || []),
						`[[${audioFile.path}]]`,
					],
					created_by: "[[Scribe]]",
				};

				Object.assign(frontMatter, newFrontMatter);
			}
		);

		return noteFile;
	} catch (error) {
		console.error("Failed to addAudioSourceToFrontmatter", error);
		throw error;
	}
}

const SUMMARY_IN_PROGRESS_HEADER = "# Summary In Progress";
const TRANSCRIPT_HEADER = "# Transcript";
export async function addTranscriptToNote(
	plugin: ScribePlugin,
	noteFile: TFile,
	transcript: string,
	isOnlyTranscribeActive?: boolean
) {
	try {
		const textToAdd = isOnlyTranscribeActive
			? `${transcript}`
			: `${transcript}
${SUMMARY_IN_PROGRESS_HEADER}`;

		await plugin.app.vault.process(noteFile, (data) => {
			const newData = data.replace(
				TRANSCRIPT_IN_PROGRESS_HEADER,
				TRANSCRIPT_HEADER
			);
			return `${newData}\n${textToAdd}`;
		});

		return noteFile;
	} catch (error) {
		console.error("Failed to addAudioSourceToFrontmatter", error);
		throw error;
	}
}

const SUMMARY_HEADER = "## Summary";
const INSIGHTS_HEADER = "## Insights";
const MERMAID_CHART_HEADER = "## Mermaid Chart";
const ANSWERED_QUESTIONS_HEADER = "## Answers from Scribe";
export async function addSummaryToNote(
	plugin: ScribePlugin,
	noteFile: TFile,
	llmSummary: LLMSummary
) {
	const { summary, insights, mermaidChart, answeredQuestions } = llmSummary;
	try {
		const textToAdd = `${SUMMARY_HEADER}
${summary}
${INSIGHTS_HEADER}
${insights}
${answeredQuestions ? `${ANSWERED_QUESTIONS_HEADER}\n${answeredQuestions}` : ""}
${MERMAID_CHART_HEADER}
\`\`\`mermaid
${mermaidChart}
\`\`\``;

		await plugin.app.vault.process(noteFile, (data) => {
			return data.replace(SUMMARY_IN_PROGRESS_HEADER, textToAdd);
		});

		return noteFile;
	} catch (error) {
		console.error("Failed to addAudioSourceToFrontmatter", error);
		throw error;
	}
}
