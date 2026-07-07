export function slugifyBase(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
}

export function randomSuffix(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len);
}
