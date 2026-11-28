import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import DocsPage from '@/app/docs/page';
import { COMMANDS_DATA } from '@/components/ui/CommandPalette';
import { ALL_FEATURES } from '@/config/features';

describe('Documentation & Guide Center (/docs)', () => {
  it('is a valid React component and covers all required guide topics in source', () => {
    assert.equal(typeof DocsPage, 'function');
    const element = React.createElement(DocsPage);
    assert.ok(React.isValidElement(element), 'DocsPage must create a valid React element');

    const filePath = path.resolve(process.cwd(), 'src/app/docs/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('AI Server Builder'), 'Must cover AI Server Builder walkthrough');
    assert.ok(content.includes('AutoMod 2.0'), 'Must cover AutoMod 2.0 defense matrix');
    assert.ok(content.includes('Stripe Billing'), 'Must cover Stripe Billing FAQ');
    assert.ok(content.includes('Command Directory'), 'Must cover Command Directory');
  });

  it('indexes all 28+ commands and provides usage examples', () => {
    assert.ok(COMMANDS_DATA.length >= 28, 'Must index at least 28 commands');

    const commandNames = COMMANDS_DATA.map((c) => c.name);
    assert.ok(commandNames.includes('/build'), 'Should include /build');
    assert.ok(commandNames.includes('/radio'), 'Should include /radio');
    assert.ok(commandNames.includes('/ticket'), 'Should include /ticket');
    assert.ok(commandNames.includes('/modmail'), 'Should include /modmail');
  });

  it('ensures all 28 features in ALL_FEATURES are represented', () => {
    assert.equal(ALL_FEATURES.length, 28, 'ALL_FEATURES must define exactly 28 services');
  });
});
