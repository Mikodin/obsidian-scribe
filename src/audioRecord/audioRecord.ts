/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */
import { Notice } from 'obsidian';

import {
  mimeTypeToFileExtension,
  pickMimeType,
  type SupportedMimeType,
} from 'src/util/mimeType';

export class AudioRecord {
  mediaRecorder: MediaRecorder | null;
  data: BlobPart[] = [];
  fileExtension: string;
  startTime: number | null = null;
  chosenFormat: string;
  chosenMimeType: SupportedMimeType;
  pausedAtTime: number | null = null;
  accumulatedPausedDurationMs = 0;

  // We prefer WebM/Opus and fall back to another supported MIME type when needed
  private defaultMimeType: SupportedMimeType = pickMimeType(
    'audio/webm; codecs=opus',
  );
  private bitRate = 32000;

  constructor() {
    this.chosenMimeType = pickMimeType(this.defaultMimeType);
    this.chosenFormat = mimeTypeToFileExtension(this.chosenMimeType);
    this.fileExtension = this.chosenFormat;
  }

  async startRecording(deviceId?: string) {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      throw new Error('There is already an active recording session');
    }

    const audioConstraints =
      deviceId && deviceId !== '' ? { deviceId: { exact: deviceId } } : true;

    this.data = [];
    this.startTime = null;
    this.pausedAtTime = null;
    this.accumulatedPausedDurationMs = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      this.mediaRecorder = this.setupMediaRecorder(stream);

      await new Promise<void>((resolve, reject) => {
        const recorder = this.mediaRecorder as MediaRecorder;

        const handleStart = () => {
          this.startTime = Date.now();
          recorder.removeEventListener('error', handleStartError);
          resolve();
        };

        const handleStartError = () => {
          recorder.removeEventListener('start', handleStart);
          reject(new Error('Failed to start recording'));
        };

        recorder.addEventListener('start', handleStart, { once: true });
        recorder.addEventListener('error', handleStartError, { once: true });

        recorder.start();
      });
    } catch (err) {
      new Notice('Scribe: Failed to access the microphone');
      console.error('Error accessing microphone:', err);
      this.mediaRecorder = null;
      this.startTime = null;
      throw err;
    }
  }

  async handlePauseResume() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error(
        'There is no mediaRecorder, cannot resume handlePauseResume',
      );
      throw new Error('There is no mediaRecorder, cannot handlePauseResume');
    }

    if (this.mediaRecorder.state === 'paused') {
      await this.resumeRecording();
    } else if (this.mediaRecorder.state === 'recording') {
      await this.pauseRecording();
    }

    return this.getRecorderState();
  }

  async resumeRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'paused') {
      console.error('There is no mediaRecorder, cannot resume resumeRecording');
      throw new Error('There is no paused mediaRecorder, cannot resume');
    }

    this.mediaRecorder.resume();

    await this.waitForRecorderState('recording');
  }

  async pauseRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      console.error('There is no mediaRecorder, cannot pauseRecording');
      throw new Error('There is no recording mediaRecorder, cannot pause');
    }

    this.mediaRecorder.pause();

    await this.waitForRecorderState('paused');
  }

  stopRecording() {
    return new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const err = new Error(
          'There is no mediaRecorder, cannot stopRecording',
        );
        console.error(err.message);
        reject(err);
        return;
      }

      const recorder = this.mediaRecorder;

      const handleStop = async () => {
        try {
          recorder.stream.getTracks().forEach((track) => {
            track.stop();
          });

          if (this.data.length === 0) {
            throw new Error('No audio data recorded.');
          }

          const blob = new Blob(this.data, { type: this.chosenMimeType });
          console.log('Scribe: Recording stopped, audio Blob created', blob);

          this.data = [];
          this.mediaRecorder = null;
          this.startTime = null;
          this.pausedAtTime = null;
          this.accumulatedPausedDurationMs = 0;

          resolve(blob);
        } catch (err) {
          console.error('Error during recording stop:', err);
          reject(err);
        }
      };

      const handleStopError = (event: Event) => {
        console.error('Error during recording stop:', event);
        reject(new Error('Error while stopping recording'));
      };

      recorder.addEventListener('stop', handleStop, { once: true });
      recorder.addEventListener('error', handleStopError, { once: true });

      recorder.stop();
    });
  }

  getRecorderState(): RecordingState {
    return this.mediaRecorder?.state ?? 'inactive';
  }

  isRecordingOrPaused(): boolean {
    const state = this.getRecorderState();
    return state === 'recording' || state === 'paused';
  }

  getRecordingDurationMs(): number {
    if (!this.startTime) {
      return 0;
    }

    const now = this.pausedAtTime ?? Date.now();
    return Math.max(0, now - this.startTime - this.accumulatedPausedDurationMs);
  }

  private setupMediaRecorder(stream: MediaStream) {
    const rec = new MediaRecorder(stream, {
      mimeType: this.chosenMimeType,
      audioBitsPerSecond: this.bitRate,
    });

    rec.ondataavailable = (e) => {
      this.data.push(e.data);
    };

    rec.onpause = () => {
      this.pausedAtTime = Date.now();
    };

    rec.onresume = () => {
      if (this.pausedAtTime) {
        this.accumulatedPausedDurationMs += Date.now() - this.pausedAtTime;
      }
      this.pausedAtTime = null;
    };

    rec.onerror = (event) => {
      console.error('MediaRecorder error:', event);
    };

    return rec;
  }

  private waitForRecorderState(targetState: RecordingState) {
    return new Promise<void>((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('There is no mediaRecorder'));
        return;
      }

      if (this.mediaRecorder.state === targetState) {
        resolve();
        return;
      }

      const recorder = this.mediaRecorder;
      const timeoutId = window.setTimeout(() => {
        recorder.removeEventListener('pause', handleTransition);
        recorder.removeEventListener('resume', handleTransition);
        recorder.removeEventListener('error', handleError);
        reject(new Error(`Timed out waiting for ${targetState} state`));
      }, 1000);

      const handleTransition = () => {
        if (recorder.state !== targetState) {
          return;
        }

        window.clearTimeout(timeoutId);
        recorder.removeEventListener('pause', handleTransition);
        recorder.removeEventListener('resume', handleTransition);
        recorder.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        window.clearTimeout(timeoutId);
        recorder.removeEventListener('pause', handleTransition);
        recorder.removeEventListener('resume', handleTransition);
        recorder.removeEventListener('error', handleError);
        reject(new Error(`Failed to transition to ${targetState}`));
      };

      recorder.addEventListener('pause', handleTransition);
      recorder.addEventListener('resume', handleTransition);
      recorder.addEventListener('error', handleError);
    });
  }
}
