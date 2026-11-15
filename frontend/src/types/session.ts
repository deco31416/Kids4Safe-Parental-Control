export interface SessionState {
  sessionId: string;
  status: 'active' | 'paused' | 'completed' | 'expired';
  currentStep: string;
  riskScore: number;
  lastSeen: number;
}
