import { apiClient } from "./client";
import { mobileInstallationService } from "../services/mobileInstallation.service";
import { mobileUnitTokenStorage } from "../utils/mobileUnitTokenStorage";

export type MobileProfile = {
  defaultAvatar?: "perfil01" | "perfil02";
  avatarUri?: string;
  avatarThumbnailUrl?: string;
  bloodType?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  fullName?: string;
  mobileUserId?: string;
  mobileUnitId: string;
  phone?: string;
  securityId: string;
};

export type MobileProfilePayload = {
  avatarDataUrl?: string;
  avatarUri?: string;
  bloodType?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  fullName?: string;
  phone?: string;
};

function isNotFound(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 404
  );
}

async function getLegacyUnitRequest() {
  const installation = await mobileInstallationService.register();
  const unitToken = installation.unitToken || await mobileUnitTokenStorage.getItem();

  return {
    headers: unitToken ? { "X-Mobile-Unit-Token": unitToken } : undefined,
    mobileUnitId: installation.unitId
  };
}

export const mobileProfileApi = {
  async getProfile() {
    try {
      const { data } = await apiClient.get<{ success: boolean; profile: MobileProfile }>(
        "/mobile/profile/me"
      );
      return data.profile;
    } catch (error) {
      if (!isNotFound(error)) throw error;

      const { headers, mobileUnitId } = await getLegacyUnitRequest();
      const { data } = await apiClient.get<{ success: boolean; profile: MobileProfile }>(
        `/mobile/units/${encodeURIComponent(mobileUnitId)}/profile`,
        { headers }
      );
      return data.profile;
    }
  },

  async updateProfile(payload: MobileProfilePayload) {
    try {
      const { data } = await apiClient.patch<{ success: boolean; profile: MobileProfile }>(
        "/mobile/profile/me",
        payload
      );
      return data.profile;
    } catch (error) {
      if (!isNotFound(error)) throw error;

      const { headers, mobileUnitId } = await getLegacyUnitRequest();
      const { data } = await apiClient.patch<{ success: boolean; profile: MobileProfile }>(
        `/mobile/units/${encodeURIComponent(mobileUnitId)}/profile`,
        payload,
        { headers }
      );
      return data.profile;
    }
  }
};
