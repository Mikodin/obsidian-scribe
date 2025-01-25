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

  private mimeType: SupportedMimeType = pickMimeType('audio/webm; codecs=opus');
  private bitRate = 32000;

  constructor() {
    this.fileExtension = mimeTypeToFileExtension(this.mimeType);
  }

  async startRecording() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.mediaRecorder = this.setupMediaRecorder(stream);
        this.mediaRecorder.start();
      })
      .catch((err) => {
        new Notice('Scribe: Failed to access the microphone');
        console.error('Error accessing microphone:', err);
      });
  }

  async handlePauseResume() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error(
        'There is no mediaRecorder, cannot resume handlePauseResume',
      );
      throw new Error('There is no mediaRecorder, cannot handlePauseResume');
    }

    if (this.mediaRecorder.state === 'paused') {
      this.resumeRecording();
    } else if (this.mediaRecorder.state === 'recording') {
      this.pauseRecording();
    }
  }

  async resumeRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error('There is no mediaRecorder, cannot resume resumeRecording');
      throw new Error('There is no mediaRecorder, cannot resumeRecording');
    }
    this.mediaRecorder?.resume();
  }

  async pauseRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.error('There is no mediaRecorder, cannot pauseRecording');
      throw new Error('There is no mediaRecorder, cannot pauseRecording');
    }
    this.mediaRecorder?.pause();
  }

  stopRecording() {
    return new Promise<Blob>((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        console.error('There is no mediaRecorder, cannot stopRecording');
        throw new Error('There is no mediaRecorder, cannot stopRecording');
      }

      this.mediaRecorder.onstop = () => {
        this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop()); // stop the stream tracks

        const blob = new Blob(this.data, {
          type: this.mimeType,
        });

        this.data = [];
        this.mediaRecorder = null;

        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  private setupMediaRecorder(stream: MediaStream) {
    const rec = new MediaRecorder(stream, {
      mimeType: this.mimeType,
      audioBitsPerSecond: this.bitRate,
    });
    rec.ondataavailable = (e) => {
      this.data.push(e.data);
    };

    return rec;
  }
}
