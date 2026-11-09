/**
 * src/lib/safe-redirect.ts
 * Defends against open-redirect vulnerabilities.
 * Ensures all redirection targets are strictly relative paths on the current origin.
 */

/**
 * Validates and sanitizes a callback URL to ensure it cannot redirect users
 * to external websites, protocol-relative endpoints, or javascript: payloads.
 *
 * @param callbackUrl The candidate redirection URL provided by user or query param
 * @param defaultUrl Fallback safe route (defaults to '/dashboard')
 * @returns A safe relative path starting with '/'
 */
export function getSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  defaultUrl = '/dashboard'
): string {
  if (!callbackUrl || typeof callbackUrl !== 'string') {
    return defaultUrl;
  }

  const trimmed = callbackUrl.trim();

  // Must not be empty
  if (trimmed.length === 0) {
    return defaultUrl;
  }

  // Must start with '/'
  if (!trimmed.startsWith('/')) {
    return defaultUrl;
  }

  // Reject protocol-relative URLs (e.g. '//evil.com', '///evil.com')
  if (trimmed.startsWith('//')) {
    return defaultUrl;
  }

  // Reject backslash variations (e.g. '/\\evil.com', '/\evil.com')
  if (trimmed.startsWith('/\\') || trimmed.startsWith('/\\')) {
    return defaultUrl;
  }

  // Reject URLs that contain backslashes anywhere in the path
  if (trimmed.includes('\\')) {
    return defaultUrl;
  }

  // Reject URLs containing schemes/protocols (e.g. '/javascript:', '/http:', '/https:')
  // or URLs where an unencoded colon occurs before a query string
  const pathPart = trimmed.split('?')[0].split('#')[0];
  if (pathPart.includes(':')) {
    return defaultUrl;
  }

  // Reject control characters or newlines (header injection defense)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return defaultUrl;
  }

  // Check URL decoding to catch double-encoded protocol relative URLs (%2f%2f or %5c)
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.startsWith('//') ||
      decoded.startsWith('/\\') ||
      decoded.includes('\\')
    ) {
      return defaultUrl;
    }
  } catch {
    // Malformed URI encoding
    return defaultUrl;
  }

  return trimmed;
}
