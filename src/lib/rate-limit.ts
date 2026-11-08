/**
 * Fixed-window rate limit kept in memory.
 * shortcut: per server process only (resets on restart, not shared across Vercel instances);
 * upgrade to a database or KV counter if spam gets through after deploy.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
