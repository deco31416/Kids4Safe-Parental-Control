import { sessionApi } from "../api/session.api";
import { mobileAudioCaptureDriver } from "./mobileAudioCapture.driver";

const AUDIO_CLIP_MS = 8000;
const AUDIO_INTERVAL_MS = 12000;

let audioTimer: ReturnType<typeof setInterval> | null = null;
let isCapturingAudio = false;
let captureGeneration = 0;

async function captureAudioClip(sessionId: string, generation: number, mobileSessionToken?: string) {
  if (isCapturingAudio) return;

  isCapturingAudio = true;
  try {
    const audioDataUrl = await mobileAudioCaptureDriver.capture(AUDIO_CLIP_MS);
    if (!audioDataUrl || generation !== captureGeneration) return;
    await sessionApi.mobileAudioCapture(sessionId, audioDataUrl, mobileSessionToken);
  } catch (error) {
    console.warn("[mobileAudioService] Error capturando audio", error);
  } finally {
    isCapturingAudio = false;
  }
}

export const mobileAudioService = {
  start(sessionId: string, mobileSessionToken?: string) {
    if (audioTimer) clearInterval(audioTimer);
    captureGeneration += 1;
    const generation = captureGeneration;

    void captureAudioClip(sessionId, generation, mobileSessionToken);
    audioTimer = setInterval(() => {
      void captureAudioClip(sessionId, generation, mobileSessionToken);
    }, AUDIO_INTERVAL_MS);
  },

  async stop() {
    if (audioTimer) {
      clearInterval(audioTimer);
      audioTimer = null;
    }
    captureGeneration += 1;
    await mobileAudioCaptureDriver.stop();
    isCapturingAudio = false;
  }
};
