export interface Principal {
  userId: string;
  displayName: string;
  email: string;
}

export interface SessionResponse {
  sessionId: string;
  expiresAt: string;
  principal: Principal;
}
