import { create } from "zustand";
import { authApi } from "../api/auth.api";
import type { ForgotPasswordPayload, LoginPayload, RegisterPayload, ResetPasswordPayload, User } from "../types/auth.types";
import { onboardingStorage } from "../utils/onboardingStorage";
import { tokenStorage } from "../utils/tokenStorage";
import { mobileInstallationService } from "../services/mobileInstallation.service";
import { getHttpStatus } from "../utils/httpStatus";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  hasCompletedOnboarding: boolean;
  isBootstrapping: boolean;
  isLoading: boolean;
  error: string | null;
  sessionUnavailable: boolean;
  bootstrap: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<{ resetToken?: string }>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const persistSession = async (accessToken: string) => {
  await tokenStorage.setItem(accessToken);
};

const clearSession = async () => {
  await tokenStorage.deleteItem();
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  hasCompletedOnboarding: false,
  isBootstrapping: true,
  isLoading: false,
  error: null,
  sessionUnavailable: false,

  bootstrap: async () => {
    const [accessToken, hasCompletedOnboarding] = await Promise.all([
      tokenStorage.getItem(),
      onboardingStorage.getCompleted()
    ]);
    set({ accessToken, hasCompletedOnboarding });

    if (accessToken) {
      try {
        await get().refreshMe();
      } finally {
        set({ isBootstrapping: false });
      }
      return;
    }

    set({ isBootstrapping: false });
  },

  completeOnboarding: async () => {
    await onboardingStorage.setCompleted();
    set({ hasCompletedOnboarding: true });
  },

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authApi.login(payload);
      await persistSession(session.accessToken);
      set({ accessToken: session.accessToken, user: session.user, isLoading: false, sessionUnavailable: false });
    } catch (error) {
      set({ error: "No fue posible iniciar sesion.", isLoading: false });
      throw error;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authApi.register(payload);
      await persistSession(session.accessToken);
      set({ accessToken: session.accessToken, user: session.user, isLoading: false, sessionUnavailable: false });
    } catch (error) {
      set({ error: "No fue posible crear la cuenta.", isLoading: false });
      throw error;
    }
  },

  forgotPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.forgotPassword(payload);
      set({ isLoading: false });
      return { resetToken: result.resetToken };
    } catch (error) {
      set({ error: "No fue posible solicitar recuperación.", isLoading: false });
      throw error;
    }
  },

  resetPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.resetPassword(payload);
      set({ isLoading: false });
    } catch (error) {
      set({ error: "No fue posible cambiar la contraseña.", isLoading: false });
      throw error;
    }
  },

  refreshMe: async () => {
    if (get().isLoading) return;
    const requestedToken = get().accessToken;
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.me();
      if (get().accessToken !== requestedToken) return;
      set({ user, isLoading: false, sessionUnavailable: false });
    } catch (error) {
      if (get().accessToken !== requestedToken) return;
      if (getHttpStatus(error) === 401) {
        await clearSession();
        set({ user: null, accessToken: null, error: "La sesión expiró.", isLoading: false, sessionUnavailable: false });
      } else {
        set({ error: "No pudimos conectar. Tu sesión sigue guardada.", isLoading: false, sessionUnavailable: true });
      }
    }
  },

  logout: async () => {
    await mobileInstallationService.unregisterNotifications().catch((error) => {
      console.warn("[auth] No se pudo retirar el token PUSH durante logout", error);
    });
    await clearSession();
    set({ user: null, accessToken: null, error: null, sessionUnavailable: false, isLoading: false });
  },

  clearError: () => set({ error: null })
}));
