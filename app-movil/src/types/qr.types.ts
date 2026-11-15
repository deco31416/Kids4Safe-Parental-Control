export type QRStatus = "active" | "paused" | "expired" | "disabled" | "deleted";

export type QRCodeItem = {
  id: string;
  title: string;
  value: string;
  status?: QRStatus;
  scans?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateQRPayload = {
  title: string;
  value: string;
};

export type ScanQRPayload = {
  value: string;
  scannedAt?: string;
};

export type ScanQRResponse = {
  id?: string;
  accepted: boolean;
  message?: string;
};
