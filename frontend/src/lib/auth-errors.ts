import { isEmailNotConfirmedError } from "@/services/auth.service";

/** Typed auth failure codes for UI — Supabase often returns generic "Invalid login credentials" */
export type AuthErrorCode =
  | "email_not_verified"
  | "wrong_password"
  | "user_not_found"
  | "sign_in_blocked"
  | "user_already_registered"
  | "phone_already_registered"
  | "signup_database"
  | "weak_password"
  | "rate_limit"
  | "network"
  | "unknown";

export type AuthErrorUI = {
  code: AuthErrorCode;
  title: string;
  description: string;
  variant: "warning" | "destructive" | "info";
  showResendVerification?: boolean;
  showSignupLink?: boolean;
  showForgotPassword?: boolean;
  hints?: string[];
};

export function classifyAuthError(
  message: string,
  options?: { requiresEmailConfirmation?: boolean }
): AuthErrorCode {
  const m = message.toLowerCase();

  if (isEmailNotConfirmedError(message)) return "email_not_verified";

  if (
    m.includes("user not found") ||
    m.includes("no user") ||
    m.includes("user does not exist")
  ) {
    return "user_not_found";
  }

  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists") ||
    m.includes("already exists. sign in")
  ) {
    return "user_already_registered";
  }

  if (
    m.includes("mobile number is already registered") ||
    m.includes("phone number is already") ||
    m.includes("users_phone_key")
  ) {
    return "phone_already_registered";
  }

  if (m.includes("password should be") || m.includes("weak password")) {
    return "weak_password";
  }

  if (
    m.includes("database error saving new user") ||
    m.includes("unable to save user") ||
    (m.includes("duplicate key") && m.includes("phone"))
  ) {
    return "signup_database";
  }

  if (
    m.includes("request failed with status code 500") ||
    m.includes("registration failed")
  ) {
    return "signup_database";
  }

  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit")) {
    return "rate_limit";
  }

  if (
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("cannot reach api") ||
    m.includes("backend not responding") ||
    m.includes("econnrefused")
  ) {
    return "network";
  }

  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    if (options?.requiresEmailConfirmation) return "sign_in_blocked";
    return "wrong_password";
  }

  return "unknown";
}

export function getAuthErrorUI(code: AuthErrorCode, rawMessage?: string): AuthErrorUI {
  switch (code) {
    case "email_not_verified":
      return {
        code,
        title: "Email not verified",
        description:
          "Your account exists but the email address is not confirmed yet. Open the link we sent you, then sign in again.",
        variant: "warning",
        showResendVerification: true,
        showForgotPassword: false,
      };
    case "wrong_password":
      return {
        code,
        title: "Incorrect password",
        description:
          "The email or password does not match our records. Double-check your password or reset it.",
        variant: "destructive",
        showForgotPassword: true,
      };
    case "user_not_found":
      return {
        code,
        title: "No account found",
        description:
          "We could not find an account with this email. Create a free account or try a different email.",
        variant: "info",
        showSignupLink: true,
      };
    case "sign_in_blocked":
      return {
        code,
        title: "Unable to sign in",
        description:
          "Sign-in failed. This usually happens for one of the reasons below — pick the step that applies to you.",
        variant: "warning",
        showResendVerification: true,
        showSignupLink: true,
        showForgotPassword: true,
        hints: [
          "Email not verified — click the confirmation link in your inbox (check spam).",
          "Wrong password — use Forgot password to set a new one.",
          "No account yet — use Sign up to register first.",
        ],
      };
    case "user_already_registered":
      return {
        code,
        title: "Account already exists",
        description: "An account with this email already exists. Sign in or reset your password.",
        variant: "info",
        showForgotPassword: true,
      };
    case "phone_already_registered":
      return {
        code,
        title: "Mobile number already in use",
        description:
          "This mobile number is linked to another account. Sign in with that account or use a different number.",
        variant: "info",
        showForgotPassword: false,
        hints: ["Try signing in at /login with the same email and password."],
      };
    case "signup_database":
      return {
        code,
        title: "Could not create account",
        description:
          rawMessage?.trim() ||
          "The server could not complete signup. Ensure the backend is running on port 3001, then try again.",
        variant: "destructive",
        showForgotPassword: false,
        showSignupLink: false,
        hints: [
          "Start backend: cd backend && npm run dev",
          "If this email or phone was used before, try Sign in instead.",
          "Use a unique 10-digit mobile number.",
        ],
      };
    case "weak_password":
      return {
        code,
        title: "Password too weak",
        description: "Use at least 6 characters with a mix of letters and numbers.",
        variant: "destructive",
      };
    case "rate_limit":
      return {
        code,
        title: "Too many attempts",
        description: "Please wait a few minutes before trying again or requesting another email.",
        variant: "warning",
      };
    case "network":
      return {
        code,
        title: "Backend not reachable",
        description:
          rawMessage?.trim() ||
          "Could not reach the API. Start PostgreSQL and Redis (npm run db:up), then run the backend on port 3001.",
        variant: "destructive",
        hints: ["Terminal 1: cd backend && npm run dev", "Terminal 2: cd frontend && npm run dev"],
      };
    default:
      return {
        code: "unknown",
        title: "Something went wrong",
        description: rawMessage?.trim() || "Please try again in a moment.",
        variant: "destructive",
        showForgotPassword: false,
        showResendVerification: false,
      };
  }
}

/** Short toast text — inline UI carries full detail */
export function getAuthErrorToast(
  code: AuthErrorCode,
  flow: "signin" | "signup" = "signin"
): string {
  switch (code) {
    case "email_not_verified":
      return "Verify your email before signing in.";
    case "wrong_password":
      return "Incorrect email or password.";
    case "user_not_found":
      return "No account found for this email.";
    case "sign_in_blocked":
      return "Sign-in failed — see details below.";
    case "user_already_registered":
      return "This email is already registered.";
    case "phone_already_registered":
      return "This mobile number is already registered.";
    case "signup_database":
      return "Account setup failed — check migrations or use another email/phone.";
    case "rate_limit":
      return "Too many requests. Please wait and try again.";
    case "network":
      return "Network error. Check your connection.";
    default:
      return flow === "signup"
        ? "Sign-up failed. Please try again."
        : "Sign-in failed. Please try again.";
  }
}
