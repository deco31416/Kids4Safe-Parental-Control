import type { MobileAudioCaptureDriver } from "./mobileAudioCapture.types";

let activeRecorder: MediaRecorder | null = null;
let activeStream: MediaStream | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let captureVersion = 0;

function releaseMedia() {
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = null;
  activeStream?.getTracks().forEach((track) => track.stop());
  activeStream = null;
  activeRecorder = null;
}

function selectMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function baseAudioMimeType(value: string) {
  const mimeType = value.split(";", 1)[0].trim().toLowerCase();
  return mimeType === "audio/mp4" ? mimeType : "audio/webm";
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el audio web"));
    reader.onload = () => {
      const result = String(reader.result);
      const separator = result.indexOf(",");
      if (separator < 0) {
        reject(new Error("El navegador devolvió un audio inválido"));
        return;
      }
      resolve(`data:${baseAudioMimeType(blob.type)};base64,${result.slice(separator + 1)}`);
    };
    reader.readAsDataURL(blob);
  });
}

export const mobileAudioCaptureDriver: MobileAudioCaptureDriver = {
  async capture(durationMs) {
    const version = ++captureVersion;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("La grabación de audio no está disponible en este navegador");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (version !== captureVersion) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }
    activeStream = stream;
    const mimeType = selectMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    activeRecorder = recorder;
    const chunks: BlobPart[] = [];

    return new Promise<string | null>((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener("error", () => {
        releaseMedia();
        reject(new Error("El navegador no pudo grabar el audio"));
      }, { once: true });
      recorder.addEventListener("stop", () => {
        const blob = chunks.length > 0
          ? new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" })
          : null;
        releaseMedia();
        if (!blob) {
          resolve(null);
          return;
        }
        void blobToDataUrl(blob).then(resolve, reject);
      }, { once: true });

      recorder.start();
      stopTimer = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, durationMs);
    });
  },

  async stop() {
    captureVersion += 1;
    const recorder = activeRecorder;
    if (!recorder || recorder.state === "inactive") {
      releaseMedia();
      return;
    }
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
  }
};
