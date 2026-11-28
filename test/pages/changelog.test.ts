import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ChangelogPage, { metadata, RELEASES } from '@/app/changelog/page';

describe('Version Release Notes & Changelog (/changelog)', () => {
  it('exports valid metadata with canonical URL', () => {
    assert.ok(metadata.title, 'Changelog must have title');
    assert.ok(
      typeof metadata.title === 'string' && metadata.title.includes('Changelog'),
      'Title should mention Changelog'
    );
    assert.ok(metadata.alternates?.canonical, 'Must define canonical URL');
  });

  it('is a valid React component and documents releases v2.4.0, v2.3.0, and v2.0.0', () => {
    assert.equal(typeof ChangelogPage, 'function');
    const element = React.createElement(ChangelogPage);
    assert.ok(React.isValidElement(element), 'ChangelogPage must create a valid React element');

    assert.ok(RELEASES.length >= 3, 'Must document at least 3 major releases');

    const versions = RELEASES.map((r) => r.version);
    assert.ok(versions.includes('v2.4.0'), 'Must document v2.4.0');
    assert.ok(versions.includes('v2.3.0'), 'Must document v2.3.0');
    assert.ok(versions.includes('v2.0.0'), 'Must document v2.0.0');

    // Check v2.4.0 flagship release highlights
    const v240 = RELEASES.find((r) => r.version === 'v2.4.0');
    assert.ok(v240, 'v2.4.0 entry must exist');
    assert.ok(v240.isLatest, 'v2.4.0 must be marked as latest');
    assert.equal(v240.codename, 'Discrofy Sovereign');
    assert.ok(v240.highlight.includes('Discrofy Web Console'));
    assert.ok(v240.highlight.includes('28-service enterprise catalog'));
    assert.ok(v240.highlight.includes('Stripe'));
  });
});
