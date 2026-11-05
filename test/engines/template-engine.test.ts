/**
 * test/engines/template-engine.test.ts
 * Unit tests for Template and Variable Engine.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTemplate,
  extractTemplateVariables,
  type TemplateContext,
} from '@/lib/engines/template-engine';

describe('Template Engine', () => {
  it('replaces user variables accurately', () => {
    const ctx: TemplateContext = {
      user: {
        id: '123456789',
        name: 'Alice',
        tag: 'Alice#0001',
        avatar: 'https://cdn.discordapp.com/avatars/123/abc.png',
        created_at: new Date('2024-01-01T00:00:00Z'),
        joined_at: new Date('2024-06-01T00:00:00Z'),
      },
    };

    const template =
      'Hi {user}! Mention: {user.mention}, Name: {user.name}, ID: {user.id}, Tag: {user.tag}, Avatar: {user.avatar}';
    const output = renderTemplate(template, ctx);

    assert.equal(
      output,
      'Hi <@123456789>! Mention: <@123456789>, Name: Alice, ID: 123456789, Tag: Alice#0001, Avatar: https://cdn.discordapp.com/avatars/123/abc.png',
    );
  });

  it('replaces server variables accurately', () => {
    const ctx: TemplateContext = {
      server: {
        id: '987654321',
        name: 'Cool Gaming Hub',
        members: 4200,
        boost_count: 14,
        boost_tier: 3,
        icon: 'https://cdn.discordapp.com/icons/987/icon.png',
      },
    };

    const template =
      'Welcome to {server} (ID: {server.id}) with {server.members} members! Tier {server.boost_tier} with {server.boost_count} boosts.';
    const output = renderTemplate(template, ctx);

    assert.equal(
      output,
      'Welcome to Cool Gaming Hub (ID: 987654321) with 4200 members! Tier 3 with 14 boosts.',
    );
  });

  it('replaces channel and stats variables', () => {
    const ctx: TemplateContext = {
      channel: {
        id: '555666777',
        name: 'general-chat',
        mention: '<#555666777>',
      },
      stats: {
        level: 25,
        xp: 15420,
        rank: 3,
        age: '6 months',
      },
    };

    const template =
      'Head over to {channel.mention} (#{channel.name})! You are Level {level} with {xp} XP (Rank #{rank}, Age: {age}).';
    const output = renderTemplate(template, ctx);

    assert.equal(
      output,
      'Head over to <#555666777> (#general-chat)! You are Level 25 with 15420 XP (Rank #3, Age: 6 months).',
    );
  });

  it('renders date, time, and Discord timestamps', () => {
    const testDate = new Date('2026-11-04T19:30:00.000Z');
    const unix = Math.floor(testDate.getTime() / 1000);

    const ctx: TemplateContext = {
      date: testDate,
      time: testDate,
      timestamp: testDate,
    };

    const template = 'Date: {date}, Time: {time}, Ts: {timestamp}, Rel: {timestamp:R}, Full: {timestamp:F}';
    const output = renderTemplate(template, ctx);

    assert.equal(
      output,
      `Date: 2026-11-04, Time: 19:30:00, Ts: <t:${unix}>, Rel: <t:${unix}:R>, Full: <t:${unix}:F>`,
    );
  });

  it('renders extras: inviter, ticket.number, reason', () => {
    const ctx: TemplateContext = {
      inviter: {
        id: '111222333',
        name: 'Bob',
        mention: '<@111222333>',
      },
      ticket: {
        number: 42,
      },
      reason: 'Violating rule #3',
    };

    const template = 'Invited by {inviter.mention} ({inviter.name}). Ticket #{ticket.number}. Reason: {reason}';
    const output = renderTemplate(template, ctx);

    assert.equal(
      output,
      'Invited by <@111222333> (Bob). Ticket #42. Reason: Violating rule #3',
    );
  });

  it('handles {random:a|b|c} choices deterministically with choiceFn', () => {
    const template = 'Gave you a {random:cookie|cake|donut}!';
    const output = renderTemplate(
      template,
      {},
      { randomChoiceFn: (choices) => choices[1] },
    );
    assert.equal(output, 'Gave you a cake!');
  });

  it('evaluates conditional rendering with operators and {else}', () => {
    const ctxHigh: TemplateContext = { level: 15 };
    const ctxLow: TemplateContext = { level: 5 };

    const template = 'Status: {if:level>=10}VIP Veteran{else}Novice Explorer{/if}';

    assert.equal(renderTemplate(template, ctxHigh), 'Status: VIP Veteran');
    assert.equal(renderTemplate(template, ctxLow), 'Status: Novice Explorer');
  });

  it('evaluates string equality and negation in conditionals', () => {
    const ctxAdmin: TemplateContext = { user: { name: 'Admin' } };
    const ctxUser: TemplateContext = { user: { name: 'Player' } };

    const tmplEquality = '{if:user.name=Admin}Access Granted{else}Access Denied{/if}';
    assert.equal(renderTemplate(tmplEquality, ctxAdmin), 'Access Granted');
    assert.equal(renderTemplate(tmplEquality, ctxUser), 'Access Denied');

    const tmplNegation = '{if:!reason}Default moderation reason{else}{reason}{/if}';
    assert.equal(renderTemplate(tmplNegation, {}), 'Default moderation reason');
    assert.equal(
      renderTemplate(tmplNegation, { reason: 'Spamming' }),
      'Spamming',
    );
  });

  it('enforces maximum output length safely without throwing', () => {
    const longString = 'A'.repeat(3000);
    const template = 'Prefix: ' + longString;
    const output = renderTemplate(template, {}, { maxLength: 2000 });

    assert.equal(output.length, 2000);
    assert.ok(output.startsWith('Prefix: AAAA'));
  });

  it('cleanly handles undefined or missing variables with fallback', () => {
    const template = 'Hello {unknown.var}! Your code is {missingCode}.';
    assert.equal(renderTemplate(template, {}), 'Hello ! Your code is .');

    const withFallback = renderTemplate(template, {}, { fallback: 'N/A' });
    assert.equal(withFallback, 'Hello N/A! Your code is N/A.');
  });

  it('extracts all template variables correctly', () => {
    const template = 'Welcome {user.name} to {server.name}! Your rank is {rank}. Timestamp: {timestamp:R}.';
    const vars = extractTemplateVariables(template);

    assert.ok(vars.includes('user.name'));
    assert.ok(vars.includes('server.name'));
    assert.ok(vars.includes('rank'));
    assert.ok(vars.includes('timestamp'));
    assert.equal(vars.length, 4);
  });
});
