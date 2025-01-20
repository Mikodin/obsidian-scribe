import { type App, Notice, PluginSettingTab, Setting, moment } from "obsidian";
import type ScribePlugin from "src";
import { formatFilenamePrefix } from "src/util/filenameUtils";
import { LLM_MODELS } from "src/util/openAiUtils";

export enum TRANSCRIPT_PLATFORM {
	assemblyAi = "assemblyAi",
	openAi = "openAi",
}
export interface ScribePluginSettings {
	assemblyAiApiKey: string;
	openAiApiKey: string;
	recordingDirectory: string;
	transcriptDirectory: string;
	transcriptPlatform: TRANSCRIPT_PLATFORM;
	llmModel: LLM_MODELS;
	noteFilenamePrefix: string;
	dateFilenameFormat: string;
}

export const DEFAULT_SETTINGS: ScribePluginSettings = {
	assemblyAiApiKey: "",
	openAiApiKey: "",
	recordingDirectory: "",
	transcriptDirectory: "",
	transcriptPlatform: TRANSCRIPT_PLATFORM.openAi,
	llmModel: LLM_MODELS["gpt-4o"],
	noteFilenamePrefix: "scribe-",
	dateFilenameFormat: "YYYY-MM-DD",
};

export async function handleSettingsTab(plugin: ScribePlugin) {
	plugin.addSettingTab(new ScribeSettingsTab(plugin.app, plugin));
}

export class ScribeSettingsTab extends PluginSettingTab {
	plugin: ScribePlugin;

	constructor(app: App, plugin: ScribePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.plugin.loadSettings();
		console.log(this.plugin.settings);

		new Setting(containerEl)
			.setName("Open AI API key")
			.setDesc(
				"You can find this in your OpenAI dev console - https://platform.openai.com/settings"
			)
			.addText((text) =>
				text
					.setPlaceholder("sk-....")
					.setValue(this.plugin.settings.openAiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAiApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("AssemblyAI API key")
			.setDesc(
				"You can find this in your AssemblyAI dev console - https://www.assemblyai.com/app/account"
			)
			.addText((text) =>
				text
					.setPlaceholder("c3p0....")
					.setValue(this.plugin.settings.assemblyAiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.assemblyAiApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		const foldersInVault = this.plugin.app.vault.getAllFolders();

		new Setting(containerEl)
			.setName("Directory for recordings")
			.setDesc("Defaults to your resources folder")
			.addDropdown((component) => {
				component.addOption("", "Vault folder");
				for (const folder of foldersInVault) {
					const folderName = folder.path
						? folder.path
						: "Vault Folder";
					component.addOption(folder.path, folderName);
				}
				component.onChange(async (value) => {
					this.plugin.settings.recordingDirectory = value;
					await this.plugin.saveSettings();
				});

				component.setValue(this.plugin.settings.recordingDirectory);
			});

		new Setting(containerEl)
			.setName("Directory for transcripts")
			.setDesc("Defaults to your new note folder")
			.addDropdown((component) => {
				component.addOption("", "Vault folder");
				for (const folder of foldersInVault) {
					const folderName =
						folder.path === "" ? "Vault Folder" : folder.path;
					component.addOption(folder.path, folderName);
				}
				component.onChange(async (value) => {
					this.plugin.settings.transcriptDirectory = value;
					await this.plugin.saveSettings();
				});

				component.setValue(this.plugin.settings.transcriptDirectory);
			});

		containerEl.createEl("h2", { text: "AI model options" });
		new Setting(containerEl)
			.setName("LLM model for creating the summary")
			.addDropdown((component) => {
				for (const model of Object.keys(LLM_MODELS)) {
					component.addOption(model, model);
				}
				component.onChange(async (value: LLM_MODELS) => {
					this.plugin.settings.llmModel = value;
					await this.plugin.saveSettings();
				});

				component.setValue(this.plugin.settings.llmModel);
			});

		new Setting(containerEl)
			.setName(
				"Transcript platform:  Your recording is uploaded to this service"
			)
			.addDropdown((component) => {
				for (const platform of Object.keys(TRANSCRIPT_PLATFORM)) {
					component.addOption(platform, platform);
				}
				component.onChange(async (value: TRANSCRIPT_PLATFORM) => {
					this.plugin.settings.transcriptPlatform = value;
					await this.plugin.saveSettings();
				});

				component.setValue(this.plugin.settings.transcriptPlatform);
			});

		containerEl.createEl("h2", { text: "File name properties" });

		let isDateInPrefix: boolean =
			this.plugin.settings.noteFilenamePrefix.includes("{{date}}");

		new Setting(containerEl)
			.setName("Transcript filename prefix")
			.setDesc(
				"This will be the prefix of the note filename, use {{date}} to include the date"
			)
			.addText((text) => {
				text.setPlaceholder("scribe-");
				text.onChange((value) => {
					this.plugin.settings.noteFilenamePrefix = value;
					this.plugin.saveSettings();
					isDateInPrefix = value.includes("{{date}}");
					dateInput.setDisabled(!isDateInPrefix);
				});

				text.setValue(this.plugin.settings.noteFilenamePrefix);
			});

		const dateInput = new Setting(containerEl)
			.setName("Date format")
			.setDesc(
				"This will only be used if {{date}} is in the prefix above."
			)
			.addText((text) => {
				text.setDisabled(!isDateInPrefix);
				text.setPlaceholder("YYYY-MM-DD");
				text.onChange((value) => {
					this.plugin.settings.dateFilenameFormat = value;
					try {
						new Notice(
							`📆 Format: ${formatFilenamePrefix(
								this.plugin.settings.noteFilenamePrefix,
								this.plugin.settings.dateFilenameFormat
							)}`
						);
						this.plugin.saveSettings();
					} catch (error) {
						console.error("Invalid date format", error);
						new Notice(`Invalid date format: ${value}`);
					}
				});

				text.setValue(this.plugin.settings.dateFilenameFormat);
			});
	}
}
