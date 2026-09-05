/** Quiet hours use org-configured window; default India evening/night. Does not invent timezone IANA data beyond offset. */
export function hourInIndia(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 5.5 * 3600_000).getHours();
}

export function inQuietHours(hour: number, start: number, end: number) {
  if (start === end) return false;
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}
