/**
 * Detect CAPTCHA / bot-challenge / login walls on GaadiBazaar HTML (Phase 5F).
 * Does not attempt bypass — callers must STOP.
 */
export function detectGaadiBazaarScrapeProtection(html: string): {
  code: "CAPTCHA" | "CLOUDFLARE" | "LOGIN_REQUIRED" | "ACCESS_DENIED";
  message: string;
} | null {
  const sample = html.slice(0, 80_000);
  if (/cf-browser-verification|cdn-cgi\/challenge|just a moment|attention required/i.test(sample)) {
    return {
      code: "CLOUDFLARE",
      message: "Cloudflare / bot challenge detected. Automated access blocked.",
    };
  }
  if (/g-recaptcha|h-captcha|hcaptcha|captcha-box|id=["']captcha/i.test(sample)) {
    return {
      code: "CAPTCHA",
      message: "CAPTCHA challenge detected. Manual / permitted access required.",
    };
  }
  if (/please\s+log\s*in|sign\s*in\s+to\s+continue|login\s+required/i.test(sample)) {
    return {
      code: "LOGIN_REQUIRED",
      message: "Login wall detected. Authorized session / permission required.",
    };
  }
  if (/access\s+denied|403\s+forbidden|request\s+blocked/i.test(sample)) {
    return {
      code: "ACCESS_DENIED",
      message: "Access denied by remote host.",
    };
  }
  return null;
}
