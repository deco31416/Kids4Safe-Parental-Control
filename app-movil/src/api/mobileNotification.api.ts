import { apiClient } from "./client";
import type { ReactivateTarget } from "./session.api";
import { mobileUnitStorage } from "../utils/mobileUnitStorage";
import { mobileUnitTokenStorage } from "../utils/mobileUnitTokenStorage";

async function unitRequest() {
  const [unitId, unitToken] = await Promise.all([
    mobileUnitStorage.getOrCreate(),
    mobileUnitTokenStorage.getItem()
  ]);
  if (!unitToken) throw new Error("La unidad móvil no está registrada");
  return {
    basePath: `/mobile/units/${encodeURIComponent(unitId)}/notifications`,
    headers: { "X-Mobile-Unit-Token": unitToken }
  };
}

export const mobileNotificationApi = {
  async markSeen(notificationId: string) {
    const request = await unitRequest();
    await apiClient.patch(
      `${request.basePath}/${encodeURIComponent(notificationId)}/seen`,
      undefined,
      { headers: request.headers }
    );
  },

  async respond(
    notificationId: string,
    decision: "accepted" | "rejected",
    targets: ReactivateTarget[] = []
  ) {
    const request = await unitRequest();
    const { data } = await apiClient.post(
      `${request.basePath}/${encodeURIComponent(notificationId)}/respond`,
      { decision, targets },
      { headers: request.headers }
    );
    return data;
  }
};
