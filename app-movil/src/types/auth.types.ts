export type User = {
  id: string;
  fullName?: string;
  username?: string;
  name: string;
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

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  acceptedTerms: boolean;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  resetToken: string;
  newPassword: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};
