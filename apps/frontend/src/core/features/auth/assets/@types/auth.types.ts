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

/** شکل خطای استاندارد بک‌اند */
export interface ApiErrorBody {
  error: {
    code: string;
    category: string;
    message: string;
    correlationId: string;
    details?: Array<{ field: string; code: string; message: string }>;
  };
}

/** خطایی که لایه‌ی auth-api پرتاب می‌کند (status=0 یعنی شبکه/نامشخص). */
export interface AuthApiError {
  status?: number;
  body?: ApiErrorBody | null;
}

export type SignInInput = {
  email: string;
  password: string;
};

export type ForgotStep1Values = { id: string }; // email or mobile
export type ForgotStep2Values = { otp: string; password: string };

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

export type SignUpFormValues = {
  displayName: string;
  email: string;
  password: string;
  password2: string;
};

export interface SignUpResponse {
  id: string;
  displayName: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}