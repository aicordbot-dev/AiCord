/**
 * test/engines/job-queue.test.ts
 * Unit tests for Job Queue Engine: backoff math, handler registry,
 * execution lifecycle, and dead-letter queue behavior.
 */

import '../test-env';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBackoffDelay,
  registerJobHandler,
  getJobHandler,
  clearJobHandlers,
  executeJob,
} from '@/lib/engines/job-queue';
import { Job, type IJob } from '@/models/Job';

describe('Job Queue Engine', () => {
  beforeEach(() => {
    clearJobHandlers();
  });

  describe('Exponential Backoff & Jitter', () => {
    it('calculates increasing backoff delays based on attempt count', () => {
      const delay1 = computeBackoffDelay(1, 1000, 60000, 100);
      assert.ok(delay1 >= 1000 && delay1 <= 1100, `delay1 was ${delay1}`);

      const delay2 = computeBackoffDelay(2, 1000, 60000, 100);
      assert.ok(delay2 >= 2000 && delay2 <= 2100, `delay2 was ${delay2}`);

      const delay3 = computeBackoffDelay(3, 1000, 60000, 100);
      assert.ok(delay3 >= 4000 && delay3 <= 4100, `delay3 was ${delay3}`);
    });

    it('caps backoff delay at maxDelayMs', () => {
      const delay10 = computeBackoffDelay(10, 1000, 5000, 100);
      assert.ok(delay10 >= 5000 && delay10 <= 5100, `delay10 was ${delay10}`);
    });
  });

  describe('Handler Registry', () => {
    it('registers and retrieves job handlers by type', () => {
      const mockHandler = async () => {};
      registerJobHandler('send_email', mockHandler);

      assert.equal(getJobHandler('send_email'), mockHandler);
      assert.equal(getJobHandler('unknown_type'), undefined);
    });

    it('clears all registered handlers', () => {
      registerJobHandler('test_job', () => {});
      clearJobHandlers();
      assert.equal(getJobHandler('test_job'), undefined);
    });
  });

  describe('Job Execution Lifecycle', () => {
    function createMockJob(overrides: Partial<IJob> = {}): IJob {
      const data = {
        _id: 'mock_job_1',
        type: 'test_action',
        payload: { target: '123' },
        attempts: 1,
        maxAttempts: 3,
        status: 'processing',
        save: async function () {
          return this;
        },
        ...overrides,
      };
      return data as unknown as IJob;
    }

    it('transitions job to completed on successful execution', async () => {
      let handledPayload: unknown = null;
      registerJobHandler('test_action', async (payload) => {
        handledPayload = payload;
      });

      const job = createMockJob({ type: 'test_action', payload: { foo: 'bar' } });
      const result = await executeJob(job);

      assert.equal(result.status, 'completed');
      assert.equal(job.status, 'completed');
      assert.equal(job.lockedUntil, undefined);
      assert.deepEqual(handledPayload, { foo: 'bar' });
    });

    it('transitions job to failed with future runAt on retryable error', async () => {
      registerJobHandler('failing_action', async () => {
        throw new Error('Transient API failure');
      });

      const beforeTime = Date.now();
      const job = createMockJob({
        type: 'failing_action',
        attempts: 1,
        maxAttempts: 3,
      });

      const result = await executeJob(job);

      assert.equal(result.status, 'failed');
      assert.equal(job.status, 'failed');
      assert.equal(job.lastError, 'Transient API failure');
      assert.ok(job.runAt.getTime() > beforeTime, 'runAt was pushed into future');
      assert.equal(job.lockedUntil, undefined);
    });

    it('transitions job to dead_letter when attempts reach maxAttempts', async () => {
      registerJobHandler('fatal_action', async () => {
        throw new Error('Persistent failure');
      });

      const job = createMockJob({
        type: 'fatal_action',
        attempts: 3,
        maxAttempts: 3, // Final attempt reached
      });

      const result = await executeJob(job);

      assert.equal(result.status, 'dead_letter');
      assert.equal(job.status, 'dead_letter');
      assert.equal(job.lastError, 'Persistent failure');
    });

    it('fails safely when no handler is registered for a job type', async () => {
      const job = createMockJob({
        type: 'unregistered_type',
        attempts: 1,
        maxAttempts: 2,
      });

      const result = await executeJob(job);

      assert.equal(result.status, 'failed');
      assert.ok(job.lastError?.includes('No handler registered'));
    });
  });

  describe('Model Schema', () => {
    it('declares expected schema paths on Job model', () => {
      assert.ok(Job.schema.path('type'));
      assert.ok(Job.schema.path('guildId'));
      assert.ok(Job.schema.path('runAt'));
      assert.ok(Job.schema.path('payload'));
      assert.ok(Job.schema.path('attempts'));
      assert.ok(Job.schema.path('maxAttempts'));
      assert.ok(Job.schema.path('lockedUntil'));
      assert.ok(Job.schema.path('status'));
      assert.ok(Job.schema.path('lastError'));
    });
  });
});
