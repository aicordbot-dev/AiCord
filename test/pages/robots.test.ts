import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import robots from '@/app/robots';
import { siteConfig } from '@/config/site';

describe('Modern robots.txt Configuration (/robots.txt)', () => {
  it('generates compliant crawler directives protecting sensitive paths', () => {
    const config = robots();
    assert.ok(config, 'Robots config should be returned');
    assert.ok(config.rules, 'Rules should be defined');

    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    const defaultRule = rules.find((r) => r.userAgent === '*');
    assert.ok(defaultRule, 'Default rule for user-agent * must exist');

    // Verify allowed public marketing and legal routes
    const allowed = Array.isArray(defaultRule.allow) ? defaultRule.allow : [defaultRule.allow];
    assert.ok(allowed.includes('/'), 'Should allow root /');
    assert.ok(allowed.includes('/docs'), 'Should allow /docs');
    assert.ok(allowed.includes('/status'), 'Should allow /status');
    assert.ok(allowed.includes('/changelog'), 'Should allow /changelog');
    assert.ok(allowed.includes('/terms'), 'Should allow /terms');
    assert.ok(allowed.includes('/privacy'), 'Should allow /privacy');

    // Verify disallowed private API and dashboard routes
    const disallowed = Array.isArray(defaultRule.disallow) ? defaultRule.disallow : [defaultRule.disallow];
    assert.ok(disallowed.includes('/api/'), 'Should disallow /api/');
    assert.ok(disallowed.includes('/dashboard/'), 'Should disallow /dashboard/');
    assert.ok(disallowed.includes('/checkout/'), 'Should disallow /checkout/');
  });

  it('points search engines to the canonical XML sitemap location', () => {
    const config = robots();
    const baseUrl = siteConfig.url.replace(/\/+$/, '');
    assert.equal(config.sitemap, `${baseUrl}/sitemap.xml`);
  });
});
