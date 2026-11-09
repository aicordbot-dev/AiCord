import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSafeCallbackUrl } from '@/lib/safe-redirect';

describe('Open-Redirect Protection — getSafeCallbackUrl', () => {
  it('allows valid relative paths', () => {
    assert.equal(getSafeCallbackUrl('/dashboard'), '/dashboard');
    assert.equal(getSafeCallbackUrl('/dashboard/123456789'), '/dashboard/123456789');
    assert.equal(getSafeCallbackUrl('/settings?tab=general'), '/settings?tab=general');
    assert.equal(getSafeCallbackUrl('/profile#bio'), '/profile#bio');
  });

  it('falls back to defaultUrl for null, undefined, or empty strings', () => {
    assert.equal(getSafeCallbackUrl(null), '/dashboard');
    assert.equal(getSafeCallbackUrl(undefined), '/dashboard');
    assert.equal(getSafeCallbackUrl(''), '/dashboard');
    assert.equal(getSafeCallbackUrl('   '), '/dashboard');
    assert.equal(getSafeCallbackUrl(null, '/custom'), '/custom');
  });

  it('rejects external HTTP and HTTPS URLs', () => {
    assert.equal(getSafeCallbackUrl('https://evil.com'), '/dashboard');
    assert.equal(getSafeCallbackUrl('http://evil.com/login'), '/dashboard');
    assert.equal(getSafeCallbackUrl('//evil.com/dashboard'), '/dashboard');
    assert.equal(getSafeCallbackUrl('///evil.com'), '/dashboard');
  });

  it('rejects backslash evasion attempts', () => {
    assert.equal(getSafeCallbackUrl('/\\evil.com'), '/dashboard');
    assert.equal(getSafeCallbackUrl('/\\/evil.com'), '/dashboard');
    assert.equal(getSafeCallbackUrl('/foo\\bar'), '/dashboard');
    assert.equal(getSafeCallbackUrl('\\\\evil.com'), '/dashboard');
  });

  it('rejects javascript: and other dangerous pseudo-schemes', () => {
    assert.equal(getSafeCallbackUrl('javascript:alert(1)'), '/dashboard');
    assert.equal(getSafeCallbackUrl('data:text/html,<script>'), '/dashboard');
    assert.equal(getSafeCallbackUrl('/javascript:alert(1)'), '/dashboard');
  });

  it('rejects URL-encoded bypasses', () => {
    assert.equal(getSafeCallbackUrl('/%2fevil.com'), '/dashboard');
    assert.equal(getSafeCallbackUrl('/%5cevil.com'), '/dashboard');
  });

  it('rejects control characters and header injection attempts', () => {
    assert.equal(getSafeCallbackUrl('/dashboard\r\nSet-Cookie: evil=1'), '/dashboard');
    assert.equal(getSafeCallbackUrl('/dashboard\0evil'), '/dashboard');
  });
});
