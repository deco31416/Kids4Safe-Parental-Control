import { apiClient } from "./client";
import { mobileInstallationService } from "../services/mobileInstallation.service";
import { mobileUnitStorage } from "../utils/mobileUnitStorage";
import { mobileUnitTokenStorage } from "../utils/mobileUnitTokenStorage";
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User
} from "../types/auth.types";

type BackendUser = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  primaryMobileUnitId?: string;
  linkedMobileUnitIds?: string[];
  termsAcceptedAt?: string;
  termsVersion?: string;
  privacyAcceptedAt?: string;
  privacyVersion?: string;
  onboardingCompletedAt?: string;
};

type BackendAuthResponse = {
  success?: boolean;
  token: string;
  user: BackendUser;
};

function toUser(user: BackendUser): User {
  return {
    id: user.id || user._id || "",
    fullName: user.fullName || user.name || "",
    name: user.fullName || user.name || user.email,
    email: user.email,
    phone: user.phone,
    primaryMobileUnitId: user.primaryMobileUnitId,
    linkedMobileUnitIds: user.linkedMobileUnitIds,
    termsAcceptedAt: user.termsAcceptedAt,
    termsVersion: user.termsVersion,
    privacyAcceptedAt: user.privacyAcceptedAt,
    privacyVersion: user.privacyVersion,
    onboardingCompletedAt: user.onboardingCompletedAt
  };
}

function toAuthResponse(response: BackendAuthResponse): AuthResponse {
  return {
    accessToken: response.token,
    user: toUser(response.user)
  };
}

async function getMobileUnitAuth() {
  await mobileInstallationService.register({ includeNotificationToken: false });
  const mobileUnitId = await mobileUnitStorage.getOrCreate();
  const unitToken = await mobileUnitTokenStorage.getItem();

  return {
    headers: unitToken ? { "X-Mobile-Unit-Token": unitToken } : undefined,
    mobileUnitId
  };
}

export const authApi = {
  async login(payload: LoginPayload) {
    const { headers, mobileUnitId } = await getMobileUnitAuth();
    const { data } = await apiClient.post<BackendAuthResponse>(
      "/mobile-auth/login",
      {
        email: payload.email,
        password: payload.password,
        mobileUnitId
      },
      { headers }
    );
    return toAuthResponse(data);
  },

  async register(payload: RegisterPayload) {
    const { headers, mobileUnitId } = await getMobileUnitAuth();
    const { data } = await apiClient.post<BackendAuthResponse>(
      "/mobile-auth/register",
      {
        acceptedTerms: payload.acceptedTerms,
        email: payload.email,
        fullName: payload.fullName,
        mobileUnitId,
        password: payload.password,
        phone: payload.phone,
        privacyVersion: "2026-06",
        termsVersion: "2026-06"
      },
      { headers }
    );
    return toAuthResponse(data);
  },

  async me() {
    const { data } = await apiClient.get<BackendUser>("/mobile-auth/me");
    return toUser(data);
  },

  async forgotPassword(payload: ForgotPasswordPayload) {
    const { data } = await apiClient.post<{ success: boolean; message: string; resetToken?: string }>(
      "/mobile-auth/forgot-password",
      payload
    );
    return data;
  },

  async resetPassword(payload: ResetPasswordPayload) {
    const { data } = await apiClient.post<{ success: boolean; message: string }>("/mobile-auth/reset-password", payload);
    return data;
  }
};
