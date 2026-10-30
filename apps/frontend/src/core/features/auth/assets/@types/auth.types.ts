export interface Principal {
  userId: string;
  displayName: string;
  email: string;
}

export interface SignInResponse {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string; // ISO date-time
  principal: Principal;
}

export interface SessionResponse {
  sessionId: string;
  expiresAt: string;
  principal: Principal;
}

export type SignInInput = {
  email: string;
  password: string;
};

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

export interface SignUpResponse {
  id: string;
  displayName: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
