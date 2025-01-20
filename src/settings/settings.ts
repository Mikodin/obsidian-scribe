import { type App, PluginSettingTab, Setting } from "obsidian";
import type ScribePlugin from "src";
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
}

export const DEFAULT_SETTINGS: ScribePluginSettings = {
	assemblyAiApiKey: "",
	openAiApiKey: "",
	recordingDirectory: "",
	transcriptDirectory: "",
	transcriptPlatform: TRANSCRIPT_PLATFORM.openAi,
	llmModel: LLM_MODELS["gpt-4o"],
	noteFilenamePrefix: "scribe-",
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
					component.addOption(folder.path, folder.path);
				}
				component.setValue(this.plugin.settings.recordingDirectory);
				component.onChange(async (value) => {
					this.plugin.settings.recordingDirectory = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Directory for transcripts")
			.setDesc("Defaults to your new note folder")
			.addDropdown((component) => {
				component.addOption("", "Vault folder");
				for (const folder of foldersInVault) {
					component.addOption(folder.path, folder.path);
				}
				component.setValue(this.plugin.settings.transcriptDirectory);
				component.onChange(async (value) => {
					this.plugin.settings.transcriptDirectory = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl("h2", { text: "AI model options" });
		new Setting(containerEl)
			.setName("LLM model for creating the summary")
			.addDropdown((component) => {
				for (const model of Object.keys(LLM_MODELS)) {
					component.addOption(model, model);
				}
				component.setValue(this.plugin.settings.llmModel);
				component.onChange(async (value: LLM_MODELS) => {
					this.plugin.settings.llmModel = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(
				"Transcript platform:  Your recording is uploaded to this service"
			)
			.addDropdown((component) => {
				for (const platform of Object.keys(TRANSCRIPT_PLATFORM)) {
					component.addOption(platform, platform);
				}
				component.setValue(this.plugin.settings.transcriptPlatform);
				component.onChange(async (value: TRANSCRIPT_PLATFORM) => {
					this.plugin.settings.transcriptPlatform = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl("h2", { text: "File name properties" });
		new Setting(containerEl)
			.setName("Transcript filename prefix")
			.addText((text) => {
				text.setPlaceholder("scribe-");
				text.setValue(this.plugin.settings.noteFilenamePrefix);
				text.onChange((value) => {
					this.plugin.settings.noteFilenamePrefix = value;
					this.plugin.saveSettings();
				});
			});
	}
}
