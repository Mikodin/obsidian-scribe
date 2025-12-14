/**
 * This was heavily inspired by
 * https://github.com/drewmcdonald/obsidian-magic-mic
 * Thank you for traversing this in such a clean way
 */

import { Notice } from 'obsidian';
import { fixWebmDuration } from '@fix-webm-duration/fix';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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
  desiredFormat: 'webm' | 'mp3';

  private mimeType: SupportedMimeType = pickMimeType('audio/webm; codecs=opus');
  private bitRate = 32000;

  constructor(desiredFormat: 'webm' | 'mp3' = 'webm') {
    this.desiredFormat = desiredFormat;
    // We always record in WebM format because it's widely supported
    // If MP3 is desired, we'll convert it later
    this.fileExtension = desiredFormat;
  }

  async startRecording(deviceId?: string) {
    const audioConstraints =
      deviceId && deviceId !== '' ? { deviceId: { exact: deviceId } } : true;

    navigator.mediaDevices
      .getUserMedia({ audio: audioConstraints })
      .then((stream) => {
        this.mediaRecorder = this.setupMediaRecorder(stream);
        this.mediaRecorder.start();
        this.startTime = Date.now();
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
    return new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const err = new Error(
          'There is no mediaRecorder, cannot stopRecording',
        );
        console.error(err.message);
        reject(err);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          this.mediaRecorder?.stream.getTracks().forEach((track) => {
            track.stop();
          });

          if (this.data.length === 0) {
            throw new Error('No audio data recorded.');
          }

          const blob = new Blob(this.data, { type: this.mimeType });
          const duration = (this.startTime && Date.now() - this.startTime) || 0;
          const fixedBlob = await fixWebmDuration(blob, duration, {});

          this.mediaRecorder = null;
          this.startTime = null;

          resolve(fixedBlob);
        } catch (err) {
          console.log('Error during recording stop:', err);
          reject(err);
        }
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
