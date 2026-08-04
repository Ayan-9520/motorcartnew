export function communityLoginPath(returnTo = "/community"): string {
  return `/login?redirect=${encodeURIComponent(returnTo)}`;
}

export function communitySignupPath(returnTo = "/community"): string {
  return `/signup?redirect=${encodeURIComponent(returnTo)}`;
}

export function communityFeedPath(params?: { tab?: string; tag?: string }): string {
  const s = new URLSearchParams();
  if (params?.tab && params.tab !== "feed") s.set("tab", params.tab);
  if (params?.tag) s.set("tag", params.tag);
  const qs = s.toString();
  return qs ? `/community?${qs}` : "/community";
}
