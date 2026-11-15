export type MobileInstallationStatus = {
  lastError?: string;
  lastRegisteredAt?: number;
  notificationConfigured: boolean;
  registered: boolean;
};

let status: MobileInstallationStatus = {
  notificationConfigured: false,
  registered: false
};

export const mobileInstallationStatus = {
  get() {
    return { ...status };
  },
  set(next: Partial<MobileInstallationStatus>) {
    status = { ...status, ...next };
  }
};
