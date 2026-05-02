/**
 * Copied Directly from
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for this
 */

import { toFile } from 'openai';
import type { Uploadable } from 'openai/uploads';
import { AudioContext, type IAudioBuffer } from 'standardized-audio-context';

/**
 * Given an input file, converts it to mono, splits that mono audio into chunks
 * of a maximum size, and re-encodes the chunks as WAV files.
 */
export default async function audioDataToChunkedFiles(
  audioData: ArrayBuffer,
  maxSize: number,
): Promise<Uploadable[]> {
  try {
    const audioContext = new AudioContext();

    // fallback for iOS / WebKit decodeAudioData limits (> ~30s)
    let sourceBuffer: AudioBuffer | undefined;
    try {
      sourceBuffer = await audioContext.decodeAudioData(audioData);
    } catch (decodeErr) {
      console.warn(
        'decodeAudioData failed (possibly iOS/WebKit length limit?). Falling back to returning original file buffer.',
        decodeErr,
      );
      // Return the original (encoded) audio as a single file so caller can upload/process server-side
      const fallbackFile = await toFile(audioData, fileName(0, 'webm'));
      return [fallbackFile];
    }

    const monoBuffer = audioBufferToMono(audioContext, sourceBuffer);

    // Calculate chunk size in terms of samples (maxSize is in bytes)
    const chunkSamples = Math.floor(maxSize / 4); // 32-bit float = 4 bytes
    const nChunks = Math.ceil(monoBuffer.length / chunkSamples);

    const files: Uploadable[] = [];

    for (let i = 0; i < nChunks; i++) {
      const startSample = i * chunkSamples;
      const endSample = Math.min((i + 1) * chunkSamples, monoBuffer.length);

      // Create a new empty AudioBuffer for each chunk
      const chunkBuffer = audioContext.createBuffer(
        1,
        endSample - startSample,
        monoBuffer.sampleRate,
      );

      const chunkData = chunkBuffer.getChannelData(0);
      const originalData = monoBuffer.getChannelData(0);
      chunkData.set(originalData.slice(startSample, endSample));

      // Convert the chunk to a WAV ArrayBuffer
      const wavArrayBuffer = audioBufferToWav(chunkBuffer);
      const file = await toFile(wavArrayBuffer, fileName(i, 'wav'));

      files.push(file);
    }

    return files;
  } catch (error) {
    console.error('Error in audioDataToChunkedFiles:', error);
    throw error;
  }
}

/**
 * Converts a multi-channel AudioBuffer to mono by averaging all channels.
 */
function audioBufferToMono(
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  if (numberOfChannels === 1) return audioBuffer;

  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const monoBuffer = audioContext.createBuffer(1, length, sampleRate);

  const monoData = monoBuffer.getChannelData(0);
  // Average all channels
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      sum += audioBuffer.getChannelData(channel)[i];
    }
    monoData[i] = sum / numberOfChannels;
  }

  return monoBuffer;
}

// Look, I'm not gonna pretend ChatGPT didn't write this
export function audioBufferToWav(buffer: IAudioBuffer) {
  const numOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numOfChannels * 2; // 16-bit PCM data
  const wavBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(wavBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numOfChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChannels * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChannels * 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i] * 0x7fff; // Convert to 16-bit PCM
      view.setInt16(offset, sample < 0 ? sample : sample, true);
      offset += 2;
    }
  }

  return wavBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function fileName(i: number, extension: string): string {
  return `audio_${i.toString().padStart(3, '0')}.${extension}`;
}
