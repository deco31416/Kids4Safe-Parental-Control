export type MobileAudioCaptureDriver = {
  capture: (durationMs: number) => Promise<string | null>;
  stop: () => Promise<void>;
};
