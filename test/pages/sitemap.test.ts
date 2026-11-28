import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '@/app/sitemap';
import { siteConfig } from '@/config/site';

describe('Dynamic XML Sitemap Generator (/sitemap.xml)', () => {
  it('generates an array of sitemap entries with canonical URLs', () => {
    const map = sitemap();
    assert.ok(Array.isArray(map), 'Sitemap should return an array');
    assert.ok(map.length >= 7, `Expected at least 7 routes, got ${map.length}`);

    const urls = map.map((entry) => entry.url);
    const baseUrl = siteConfig.url.replace(/\/+$/, '');

    const expectedRoutes = [
      `${baseUrl}/`,
      `${baseUrl}/docs`,
      `${baseUrl}/status`,
      `${baseUrl}/changelog`,
      `${baseUrl}/terms`,
      `${baseUrl}/privacy`,
      `${baseUrl}/login`,
    ];

    for (const route of expectedRoutes) {
      assert.ok(urls.includes(route), `Expected route ${route} to be present in sitemap`);
    }
  });

  it('assigns correct priority, changeFrequency, and lastModified to each route', () => {
    const map = sitemap();
    const baseUrl = siteConfig.url.replace(/\/+$/, '');

    const home = map.find((e) => e.url === `${baseUrl}/`);
    assert.ok(home, 'Home route should exist');
    assert.equal(home.priority, 1.0);
    assert.equal(home.changeFrequency, 'daily');
    assert.ok(home.lastModified instanceof Date);

    const docs = map.find((e) => e.url === `${baseUrl}/docs`);
    assert.ok(docs, 'Docs route should exist');
    assert.equal(docs.priority, 0.9);
    assert.equal(docs.changeFrequency, 'weekly');

    const status = map.find((e) => e.url === `${baseUrl}/status`);
    assert.ok(status, 'Status route should exist');
    assert.equal(status.priority, 0.8);
    assert.equal(status.changeFrequency, 'always');

    const changelog = map.find((e) => e.url === `${baseUrl}/changelog`);
    assert.ok(changelog, 'Changelog route should exist');
    assert.equal(changelog.priority, 0.8);
    assert.equal(changelog.changeFrequency, 'weekly');

    const terms = map.find((e) => e.url === `${baseUrl}/terms`);
    assert.ok(terms, 'Terms route should exist');
    assert.equal(terms.priority, 0.5);
    assert.equal(terms.changeFrequency, 'monthly');

    const privacy = map.find((e) => e.url === `${baseUrl}/privacy`);
    assert.ok(privacy, 'Privacy route should exist');
    assert.equal(privacy.priority, 0.5);
    assert.equal(privacy.changeFrequency, 'monthly');
  });
});
