/**
 * test/engines/audit-logger.test.ts
 * Unit tests for Config Audit Logger: deep changeset diff calculation,
 * nested property tracking, and schema validation.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDiff } from '@/lib/engines/audit-logger';
import { AuditLog } from '@/models/AuditLog';

describe('Config Audit Logger Engine', () => {
  describe('computeDiff()', () => {
    it('detects no changes when before and after are identical', () => {
      const obj = { prefix: '!', timeout: 300, nested: { enabled: true } };
      const diff = computeDiff(obj, { prefix: '!', timeout: 300, nested: { enabled: true } });

      assert.equal(diff.changed, false);
      assert.equal(Object.keys(diff.changes).length, 0);
      assert.equal(diff.addedKeys.length, 0);
      assert.equal(diff.removedKeys.length, 0);
      assert.equal(diff.modifiedKeys.length, 0);
    });

    it('detects added, removed, and modified primitive keys', () => {
      const before = { prefix: '!', oldOption: 123, count: 5 };
      const after = { prefix: '?', newOption: 'hello', count: 5 };

      const diff = computeDiff(before, after);

      assert.equal(diff.changed, true);
      assert.ok(diff.modifiedKeys.includes('prefix'));
      assert.ok(diff.removedKeys.includes('oldOption'));
      assert.ok(diff.addedKeys.includes('newOption'));
      assert.ok(!diff.modifiedKeys.includes('count')); // Unchanged

      assert.deepEqual(diff.changes.prefix, { before: '!', after: '?' });
      assert.deepEqual(diff.changes.oldOption, { before: 123, after: undefined });
      assert.deepEqual(diff.changes.newOption, { before: undefined, after: 'hello' });
    });

    it('computes deep diff for nested objects with dot-notation keys', () => {
      const before = {
        modules: {
          automod: { enabled: true, maxMentions: 5 },
          leveling: { rate: 1.0 },
        },
      };

      const after = {
        modules: {
          automod: { enabled: true, maxMentions: 10 },
          leveling: { rate: 1.5, prestige: true },
        },
      };

      const diff = computeDiff(before, after);

      assert.equal(diff.changed, true);
      assert.ok(diff.modifiedKeys.includes('modules.automod.maxMentions'));
      assert.ok(diff.modifiedKeys.includes('modules.leveling.rate'));
      assert.ok(diff.addedKeys.includes('modules.leveling.prestige'));

      assert.deepEqual(diff.changes['modules.automod.maxMentions'], {
        before: 5,
        after: 10,
      });
      assert.deepEqual(diff.changes['modules.leveling.prestige'], {
        before: undefined,
        after: true,
      });
    });

    it('handles Date objects and Arrays cleanly', () => {
      const d1 = new Date('2026-11-04T12:00:00Z');
      const d2 = new Date('2026-11-04T12:00:00Z');
      const d3 = new Date('2026-11-05T12:00:00Z');

      // Equal dates do not trigger change
      const diffSame = computeDiff({ date: d1 }, { date: d2 });
      assert.equal(diffSame.changed, false);

      // Different dates trigger change
      const diffDiff = computeDiff({ date: d1 }, { date: d3 });
      assert.equal(diffDiff.changed, true);
      assert.ok(diffDiff.modifiedKeys.includes('date'));

      // Array changes
      const diffArr = computeDiff({ roles: ['1', '2'] }, { roles: ['1', '2', '3'] });
      assert.equal(diffArr.changed, true);
      assert.ok(diffArr.modifiedKeys.includes('roles'));
    });

    it('handles null or undefined inputs safely', () => {
      const diff1 = computeDiff(null, { a: 1 });
      assert.equal(diff1.changed, true);
      assert.ok(diff1.addedKeys.includes('a'));

      const diff2 = computeDiff({ b: 2 }, undefined);
      assert.equal(diff2.changed, true);
      assert.ok(diff2.removedKeys.includes('b'));
    });
  });

  describe('AuditLog Model', () => {
    it('declares expected schema paths on AuditLog', () => {
      assert.ok(AuditLog.schema.path('guildId'));
      assert.ok(AuditLog.schema.path('type'));
      assert.ok(AuditLog.schema.path('userId'));
      assert.ok(AuditLog.schema.path('metadata'));
    });
  });
});
