import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import StatusPage, { SERVICE_MONITORS, PAST_INCIDENTS } from '@/app/status/page';

describe('Live System Status & Uptime Telemetry (/status)', () => {
  it('is a valid React component', () => {
    assert.equal(typeof StatusPage, 'function');
    const element = React.createElement(StatusPage);
    assert.ok(React.isValidElement(element), 'StatusPage must create a valid React element');
  });

  it('monitors all key subsystems with high uptime targets', () => {
    assert.ok(SERVICE_MONITORS.length >= 6, 'Must monitor at least 6 core subsystems');

    const monitorIds = SERVICE_MONITORS.map((m) => m.id);
    assert.ok(monitorIds.includes('discord-gateway'), 'Must monitor Discord Gateway');
    assert.ok(monitorIds.includes('gemini-ai'), 'Must monitor Gemini AI');
    assert.ok(monitorIds.includes('stripe-webhooks'), 'Must monitor Stripe Webhooks');
    assert.ok(monitorIds.includes('mongodb-atlas'), 'Must monitor MongoDB Atlas');
    assert.ok(monitorIds.includes('voice-radio'), 'Must monitor Voice Radio');
    assert.ok(monitorIds.includes('polyglot-sandbox'), 'Must monitor Polyglot Sandbox');

    for (const monitor of SERVICE_MONITORS) {
      assert.equal(monitor.status, 'operational');
      assert.ok(monitor.uptime90d >= 99.9, `Service ${monitor.id} uptime should be >= 99.9%`);
      assert.ok(monitor.latency.includes('ms'), `Service ${monitor.id} must report latency in ms`);
    }
  });

  it('archives past incidents with timestamps and resolution descriptions', () => {
    assert.ok(PAST_INCIDENTS.length >= 3, 'Must archive past incidents');

    for (const incident of PAST_INCIDENTS) {
      assert.ok(incident.id, 'Incident must have id');
      assert.ok(incident.title, 'Incident must have title');
      assert.ok(incident.date, 'Incident must have date');
      assert.ok(incident.service, 'Incident must name affected service');
      assert.ok(incident.duration, 'Incident must report duration');
      assert.ok(incident.description, 'Incident must have description');
    }
  });
});
