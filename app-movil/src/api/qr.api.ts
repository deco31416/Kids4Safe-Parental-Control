import { apiClient } from "./client";
import type { CreateQRPayload, QRCodeItem, ScanQRPayload, ScanQRResponse } from "../types/qr.types";

type BackendQR = {
  id: string;
  name: string;
  destinationUrl?: string;
  config?: {
    redirect_url?: string;
  };
  status?: QRCodeItem["status"];
  totalScans?: number;
  createdAt?: number;
  updatedAt?: number;
};

type BackendQRResponse = {
  success: boolean;
  qr: BackendQR;
};

type BackendQRListResponse = {
  success: boolean;
  qrs: BackendQR[];
};

function toQRCodeItem(qr: BackendQR): QRCodeItem {
  const value = qr.destinationUrl || qr.config?.redirect_url || qr.id;

  return {
    id: qr.id,
    title: qr.name,
    value,
    status: qr.status,
    scans: qr.totalScans ?? 0,
    createdAt: qr.createdAt ? new Date(qr.createdAt).toISOString() : undefined,
    updatedAt: qr.updatedAt ? new Date(qr.updatedAt).toISOString() : undefined
  };
}

function extractQRId(value: string) {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) || trimmed;
  } catch {
    return trimmed;
  }
}

export const qrApi = {
  async create(payload: CreateQRPayload) {
    const { data } = await apiClient.post<BackendQRResponse>("/qr/create", {
      name: payload.title,
      config: {
        redirect_url: payload.value
      }
    });

    return toQRCodeItem(data.qr);
  },

  async history() {
    const { data } = await apiClient.get<BackendQRListResponse>("/qr/all");
    return data.qrs.map(toQRCodeItem);
  },

  async getById(id: string) {
    const { data } = await apiClient.get<BackendQRResponse>(`/qr/${id}`);
    return toQRCodeItem(data.qr);
  },

  async registerScan(payload: ScanQRPayload) {
    const qrId = extractQRId(payload.value);
    const { data } = await apiClient.post<{ success: boolean; sessionId?: string; qrName?: string }>(
      `/session/qr/${qrId}/join`
    );

    const response: ScanQRResponse = {
      id: data.sessionId,
      accepted: data.success,
      message: data.qrName
    };

    return response;
  },

  async remove(id: string) {
    await apiClient.delete(`/qr/${id}`);
  }
};
