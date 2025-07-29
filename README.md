# Scribe for Obsidian 🎙️

Transform your voice into insights with Scribe, an Obsidian plugin that not only records your voice and transcribes it, but summarizes, and enriches the note with the power of AI. 

Dive into a seamless experience where your spoken words are effortlessly converted into a structured, easy-to-navigate knowledge base.  

Forgot a phrase or concept while recording?  Ask "Hey Scribe" followed by a question in the middle of recording and it will fill in the blanks for you
## Screenshots
![obsidian-scribe-screenshots](https://github.com/user-attachments/assets/79eb4427-799a-47ba-8024-4d1350ac47cf)

## 🌟 Key Features
- **Voice-to-Text Magic:** Begin recording and watch as your voice notes are transcribed, summarized, and turned into actionable insights.
- **Robust on Failure:** Designed with mobile users in mind, Scribe ensures that no step in the process is a single point of failure. Record, transcribe, and summarize on the go, with each step saved progressively. (WIP)
- **Seamless Integration:** Utilizes AssemblyAI or OpenAI Whisper for top-tier transcription accuracy and OpenAI for cutting-edge summarization
- **Create your custom templates:** Harness the language models and insert your own custom prompts as template!
- **Multi Language Support:** Select your language and go wild!
- **Interactive Queries:** Ask questions mid-recording, and Scribe fetches the answers, integrating them directly into your notes.
- **Mermaid Chart Creation:** Visualize your thoughts and summaries with automatically generated Mermaid charts, providing a unique perspective on your notes.
## 🕹️ Commands
### From the Ribbon button
- Either Click Start Recording or Open the Controls Modal
### From the Command Pallette type "Scribe"
- **Begin Recording with Scribe:** - Opens the controls modal for you to begin recording
- **Transcribe & Summarize Current File:** - Run this on an open audio file - it will Scribe this file.  Very useful for recording offline and later Scribing it
- **Fix Mermaid Chart:** - Sometimes the generated Mermaid Chart is invalid, this will attempt to fix it.

## ⚙️ Settings / Config
- **OpenAI API Key (Required):** Essential for transcription and summarization. Set your key in the `Settings`.

Get your key here - [Open AI Developer Console - https://platform.openai.com/settings](https://platform.openai.com/settings)

- **AssemblyAI Key (Optional):** For enhanced transcription accuracy and optionality of services. Enjoy a $50 credit from AssemblyAI to get started.

Get your key in the  [AssemblyAI Dev Console https://www.assemblyai.com/app/account](https://www.assemblyai.com/app/account)

- **Audio Input Device:** Select which microphone to use for recording. By default, the system's default audio input device will be used.

- **Audio File Format:** Choose between WebM and MP3 formats for saving audio recordings. MP3 format will be converted from WebM on the client side.

## 🚀 Getting Started

### Installation

1. In Obsidian, navigate to `Settings` > `Community Plugins`.
2. Search for `Scribe` and click `Install`.
3. Once installed, toggle `Enable` to activate Scribe.

## 📖 How to Use

1. **Start Recording:** Trigger the Scribe action or select it from the ribbon and begin recording 
2. **Interactive Queries:** Pose questions during recording to have them answered and integrated into your notes just say "Hey Scribe" followed by the question.
3. **Review and Explore:** Access the transcribed text, summary, insights, and Mermaid charts directly in your note.

## 📱 Mobile

Scribe shines in mobile scenarios, gracefully handling interruptions or connectivity issues. If any step fails, simply resume without losing any progress.
This is a WIP, you will never lose your audio, but it will regenerate the note, transcription and summary

### Known Issues
1. On iOS, the screen must be **ON** while recording otherwise it won't capture youre voice.  This is a limitation of Obsidian.

## 🛠 How to Contribute

Your insights, improvements, and feedback are what make Scribe better. Feel free to submit issues, pull requests, or suggestions to enhance the plugin further.

## 🙏 Acknowledgments

An deep bow, acknowledgement and gratitude to the innumerable nameless Humans from Colombia to the Phillipines to Kenya and beyond who used their intelligence and human hearts to help train what we are calling artificial intelligence.

https://www.noemamag.com/the-exploited-labor-behind-artificial-intelligence/
https://www.wired.com/story/millions-of-workers-are-training-ai-models-for-pennies/


A special thanks to [Drew Mcdonald of the Magic Mic Plugin](https://github.com/drewmcdonald/obsidian-magic-mic), this was super useful for learning how to access & use the audio buffers
Also a special thanks to [Mossy1022 of the Smart Memos Plugin](https://github.com/Mossy1022/Smart-Memos) including Mermaid Charts is SO useful, and I got that idea from your plugin.

## 🔒 License

Scribe is released under the MIT License. Feel free to use, modify, and distribute it as you see fit.

## 📬 Contact

Got questions, feedback, or ideas? Reach out through [GitHub Issues](#) or join our Discord channel to become part of the Scribe community.

## ❓ FAQ

**Q: Do I need both OpenAI and AssemblyAI keys?**  
A: An OpenAI key is essential, while the AssemblyAI key is optional but recommended for better transcription accuracy.

**Q: Can I use Scribe offline?**  
A: Scribe requires an internet connection for transcription and summarization services.  You can record offline and later use the Transcribe & Summarize Current File command on the Audio file to Scribe it.

---

Dive into a new era of note-taking with Scribe – Where your voice breathes life into ideas. 🌈✨
