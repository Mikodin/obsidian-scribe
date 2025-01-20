import { moment } from "obsidian";

export function formatFilenamePrefix(prefix: string, format: string) {
	if (prefix.includes("{{date}}")) {
		const formatted = prefix.replace("{{date}}", moment().format(format));
		console.log("includes date, formatting", prefix, format, formatted);
		return formatted;
	}
	return prefix;
}
