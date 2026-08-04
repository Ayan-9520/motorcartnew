/** Empty = same-origin when served behind nginx on the main domain. */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const WEB_SITE_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
