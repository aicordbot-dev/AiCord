/**
 * src/lib/token-store.ts
 * Secure server-only in-memory storage for Discord OAuth access tokens.
 * This guarantees tokens NEVER leak to client-side session payloads,
 * error boundaries, or network logs.
 */

export interface ServerTokenEntry {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

const tokenStore = new Map<string, ServerTokenEntry>();

/**
 * Stores Discord OAuth tokens server-side for the given user ID.
 */
export function setServerToken(userId: string, entry: ServerTokenEntry): void {
  if (!userId) return;
  tokenStore.set(userId, { ...entry });
}

/**
 * Retrieves the stored server-side token entry for a user ID.
 */
export function getServerToken(userId: string): ServerTokenEntry | null {
  if (!userId) return null;
  const entry = tokenStore.get(userId);
  if (!entry) return null;

  return { ...entry };
}

/**
 * Removes stored token entry for a user ID.
 */
export function deleteServerToken(userId: string): void {
  tokenStore.delete(userId);
}

/**
 * Clears all server token entries (useful for testing and reset).
 */
export function clearServerTokens(): void {
  tokenStore.clear();
}
