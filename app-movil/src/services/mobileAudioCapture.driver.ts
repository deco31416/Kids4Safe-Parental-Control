import { AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import type { AudioRecorder, RecordingOptions } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import type { MobileAudioCaptureDriver } from "./mobileAudioCapture.types";

let activeRecording: AudioRecorder | null = null;
let captureVersion = 0;

function getNativeOptions(): Partial<RecordingOptions> {
  const preset = RecordingPresets.HIGH_QUALITY;
  const platformOptions = Platform.OS === "ios" ? preset.ios : preset.android;

  return {
    extension: preset.extension,
    sampleRate: preset.sampleRate,
    numberOfChannels: preset.numberOfChannels,
    bitRate: preset.bitRate,
    isMeteringEnabled: preset.isMeteringEnabled,
    ...platformOptions
  };
}

function getMimeType(uri: string) {
  const normalized = uri.split("?")[0].toLowerCase();
  if (normalized.endsWith(".mp4")) return "audio/mp4";
  if (normalized.endsWith(".mp3")) return "audio/mp3";
  if (normalized.endsWith(".wav")) return "audio/wav";
  if (normalized.endsWith(".ogg")) return "audio/ogg";
  return "audio/m4a";
}

export const mobileAudioCaptureDriver: MobileAudioCaptureDriver = {
  async capture(durationMs) {
    const version = ++captureVersion;
    await setAudioModeAsync({
      allowsRecording: true,
      allowsBackgroundRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true
    });
    if (version !== captureVersion) return null;

    const recording = new AudioModule.AudioRecorder(getNativeOptions());
    activeRecording = recording;
    await recording.prepareToRecordAsync();
    recording.record();
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    if (recording.isRecording) await recording.stop();

    const uri = recording.uri;
    activeRecording = null;
    if (!uri) return null;

    try {
      if (version !== captureVersion) return null;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      return `data:${getMimeType(uri)};base64,${base64}`;
    } finally {
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  },

  async stop() {
    captureVersion += 1;
    const recording = activeRecording;
    activeRecording = null;
    if (recording) await recording.stop().catch(() => {});
  }
};
