export type SessionRecording = {
  _id: string;
  cloudinaryUrl?: string;
  duration?: number;
  format?: string;
  mimeType?: string;
  metadata?: { tracks?: string[] };
  secureUrl?: string;
  sizeBytes?: number;
  storageProvider?: 'filesystem' | 'cloudinary';
  uploadedAt: string;
};

export const recordingUrl = (recording: SessionRecording) =>
  recording.secureUrl || recording.cloudinaryUrl || '';
