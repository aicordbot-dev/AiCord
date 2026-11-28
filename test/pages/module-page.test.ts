import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import GenericModulePage from '@/app/(dashboard)/dashboard/[guildId]/module/[moduleId]/page';
import { ALL_FEATURES, MASTER_SERVICES, NEXT_GEN_SERVICES } from '@/config/features';

describe('Generic Dashboard Module Page (/dashboard/[guildId]/module/[moduleId])', () => {
  it('is a valid React component', () => {
    assert.equal(typeof GenericModulePage, 'function');
    const element = React.createElement(GenericModulePage);
    assert.ok(React.isValidElement(element), 'GenericModulePage must create a valid React element');
  });

  it('resolves all 28 services in ALL_FEATURES with complete attributes', () => {
    assert.equal(ALL_FEATURES.length, 28, 'ALL_FEATURES should have exactly 28 services');
    assert.equal(MASTER_SERVICES.length, 18, 'MASTER_SERVICES should have 18 core services');
    assert.equal(NEXT_GEN_SERVICES.length, 10, 'NEXT_GEN_SERVICES should have 10 next-gen services');

    for (const service of ALL_FEATURES) {
      assert.ok(service.id, 'Service must have an id');
      assert.ok(service.name, 'Service must have a name');
      assert.ok(service.commands.length > 0, `Service ${service.id} must have commands`);
      assert.ok(service.pitch, `Service ${service.id} must have a pitch`);
      assert.ok(service.description, `Service ${service.id} must have a description`);
      assert.ok(service.features.length > 0, `Service ${service.id} must have feature bullets`);
      assert.ok(service.sampleUsage, `Service ${service.id} must have sample usage`);
      assert.ok(['free', 'pro', 'ultimate', 'lifetime'].includes(service.tier));
      assert.ok(['live', 'beta', 'coming-soon'].includes(service.status));
    }
  });
});
