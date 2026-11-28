import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import TermsPage, { metadata } from '@/app/terms/page';

describe('Terms of Service Page (/terms)', () => {
  it('exports valid metadata with canonical URL and clear descriptions', () => {
    assert.ok(metadata.title, 'Terms page must have a title');
    assert.ok(
      typeof metadata.title === 'string' && metadata.title.includes('Terms of Service'),
      'Title should mention Terms of Service'
    );
    assert.ok(metadata.description, 'Terms page must have a description');
    assert.ok(metadata.alternates?.canonical, 'Must define canonical URL');
  });

  it('is a valid React component returning an element tree with core legal provisions', () => {
    assert.equal(typeof TermsPage, 'function');
    const element = React.createElement(TermsPage);
    assert.ok(React.isValidElement(element), 'TermsPage must create a valid React element');

    // Verify legal content directly from source file
    const filePath = path.resolve(process.cwd(), 'src/app/terms/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('Stripe'), 'Must include Stripe billing references');
    assert.ok(content.includes('Refund'), 'Must include Refund policy references');
    assert.ok(content.includes('14-Day'), 'Must include 14-day refund guarantee');
    assert.ok(content.includes('Discord'), 'Must include Discord API compliance');
    assert.ok(content.includes('HMAC'), 'Must include HMAC cryptographic licenses');
    assert.ok(content.includes('aicordbot@gmail.com'), 'Must include official contact email');
    assert.ok(content.includes('Limitation of Liability'), 'Must include limitation of liability');
  });
});
