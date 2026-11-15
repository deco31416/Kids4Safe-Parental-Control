export const SESSION_ENDED_EVENT = 'kids4safe:admin-session-ended';

export function notifyAdminSessionEnded(sessionId: string) {
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: { sessionId } }));
}
