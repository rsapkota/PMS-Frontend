import { apiClient } from "./client";
import type { components } from "./schema.d.ts";

export type UserRegisterRequest = components["schemas"]["UserRegisterRequest"];
export type UserLoginRequest = components["schemas"]["UserLoginRequest"];
export type ForgotPasswordRequest = components["schemas"]["ForgotPasswordRequest"];
export type ResetPasswordRequest = components["schemas"]["ResetPasswordRequest"];

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function loginApi(data: UserLoginRequest): Promise<LoginResponse> {
  const { data: body, error, response } = await apiClient.POST("/api/auth/login", {
    body: data,
    parseAs: "json",
  });

  if (error || !response.ok) {
    const msg = (error as { message?: string } | undefined)?.message
      ?? "Invalid email or password.";
    throw new Error(msg);
  }

  return body as unknown as LoginResponse;
}

export async function registerApi(data: UserRegisterRequest): Promise<void> {
  const { error, response } = await apiClient.POST("/api/auth/register", {
    body: data,
  });

  if (error || !response.ok) {
    const msg = (error as { message?: string } | undefined)?.message
      ?? "Registration failed. Please try again.";
    throw new Error(msg);
  }
}

export async function getMeApi(): Promise<AuthUser> {
  const { data: body, error, response } = await apiClient.GET("/api/auth/me", {
    parseAs: "json",
  });

  if (error || !response.ok) {
    throw new Error("Session expired. Please sign in again.");
  }

  return body as unknown as AuthUser;
}

export async function forgotPasswordApi(data: ForgotPasswordRequest): Promise<void> {
  const { error, response } = await apiClient.POST("/api/auth/forgot-password", {
    body: data,
  });

  if (error || !response.ok) {
    const msg = (error as { message?: string } | undefined)?.message
      ?? "Could not send reset email. Please try again.";
    throw new Error(msg);
  }
}

export async function resetPasswordApi(data: ResetPasswordRequest): Promise<void> {
  const { error, response } = await apiClient.POST("/api/auth/reset-password", {
    body: data,
  });

  if (error || !response.ok) {
    const msg = (error as { message?: string } | undefined)?.message
      ?? "Password reset failed. The link may have expired.";
    throw new Error(msg);
  }
}
