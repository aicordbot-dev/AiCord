/**
 * test/engines/pagination.test.ts
 * Unit tests for Pagination Splitter: message splitting,
 * code block preservation across splits, embed pagination, and action rows.
 */

import '../test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitMessage,
  paginateEmbeds,
  buildPaginationRow,
  parsePaginationCustomId,
} from '@/lib/engines/pagination';
import type { EmbedField } from '@/lib/discord/embeds';

describe('Pagination Splitter Engine', () => {
  describe('splitMessage()', () => {
    it('returns a single chunk when text is within maxLength', () => {
      const text = 'Hello world, this is a short message.';
      const chunks = splitMessage(text, 2000);
      assert.equal(chunks.length, 1);
      assert.equal(chunks[0], text);
    });

    it('splits long text into multiple chunks without exceeding maxLength', () => {
      const line = 'This is a single repeated line in a long Discord message.\n';
      const text = line.repeat(50); // ~2900 chars
      const chunks = splitMessage(text, 1000);

      assert.ok(chunks.length >= 3);
      for (const chunk of chunks) {
        assert.ok(
          chunk.length <= 1000,
          `Chunk exceeded limit of 1000: length was ${chunk.length}`,
        );
      }
    });

    it('preserves code block language and closes/reopens blocks across splits', () => {
      const codeLines: string[] = [];
      for (let i = 1; i <= 30; i++) {
        codeLines.push(`console.log("Statement number ${i} executed with extra padding text");`);
      }
      const rawText = '```typescript\n' + codeLines.join('\n') + '\n```';

      const chunks = splitMessage(rawText, 500);

      assert.ok(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);

      // The first chunk should end with a closed code block (```)
      assert.ok(
        chunks[0].endsWith('```'),
        `Chunk 0 should close the code block. Ended with: ${chunks[0].slice(-10)}`,
      );

      // The second chunk should reopen with typescript code block tag (```typescript)
      assert.ok(
        chunks[1].startsWith('```typescript'),
        `Chunk 1 should reopen the code block with typescript. Started with: ${chunks[1].slice(0, 20)}`,
      );
    });

    it('handles empty string and whitespace cleanly', () => {
      assert.deepEqual(splitMessage(''), []);
    });
  });

  describe('paginateEmbeds()', () => {
    it('splits list of fields into pages of embeds', () => {
      const fields: EmbedField[] = [];
      for (let i = 1; i <= 25; i++) {
        fields.push({ name: `Field ${i}`, value: `Value ${i}`, inline: true });
      }

      const embeds = paginateEmbeds(fields, {
        title: 'Server Leaderboard',
        itemsPerPage: 10,
        color: 0x5865f2,
        footerText: 'AiCord Bot',
      });

      // 25 fields / 10 per page = 3 pages (10, 10, 5)
      assert.equal(embeds.length, 3);

      assert.equal(embeds[0].fields?.length, 10);
      assert.equal(embeds[1].fields?.length, 10);
      assert.equal(embeds[2].fields?.length, 5);

      // Footers should include page indicators
      assert.equal(embeds[0].footer?.text, 'AiCord Bot • Page 1 of 3');
      assert.equal(embeds[1].footer?.text, 'AiCord Bot • Page 2 of 3');
      assert.equal(embeds[2].footer?.text, 'AiCord Bot • Page 3 of 3');

      // Attributes preserved
      assert.equal(embeds[0].title, 'Server Leaderboard');
      assert.equal(embeds[0].color, 0x5865f2);
    });

    it('handles empty field list by returning a single page embed', () => {
      const embeds = paginateEmbeds([], {
        title: 'Empty List',
        description: 'No items currently found.',
      });

      assert.equal(embeds.length, 1);
      assert.equal(embeds[0].title, 'Empty List');
      assert.equal(embeds[0].fields?.length, 0);
    });

    it('clamps itemsPerPage to maximum allowed Discord fields per embed (25)', () => {
      const fields: EmbedField[] = [];
      for (let i = 1; i <= 60; i++) {
        fields.push({ name: `F${i}`, value: `V${i}` });
      }

      // Asking for 50 per page should be clamped to 25
      const embeds = paginateEmbeds(fields, { itemsPerPage: 50 });
      assert.equal(embeds[0].fields?.length, 25);
      assert.equal(embeds[1].fields?.length, 25);
      assert.equal(embeds[2].fields?.length, 10);
    });
  });

  describe('buildPaginationRow() & parsePaginationCustomId()', () => {
    it('creates 5 buttons with appropriate disabled states for page 1 of 5', () => {
      const row = buildPaginationRow(1, 5, 'leaderboard');
      assert.equal(row.type, 1);
      assert.equal(row.components.length, 5);

      const [firstBtn, prevBtn, pageBtn, nextBtn, lastBtn] = row.components;

      // On page 1: first and prev are disabled
      assert.equal(firstBtn.disabled, true);
      assert.equal(firstBtn.custom_id, 'leaderboard:first');

      assert.equal(prevBtn.disabled, true);
      assert.equal(prevBtn.custom_id, 'leaderboard:prev');

      // Indicator is always disabled
      assert.equal(pageBtn.disabled, true);
      assert.equal(pageBtn.label, '1 / 5');

      // Next and last are active
      assert.equal(nextBtn.disabled, false);
      assert.equal(nextBtn.custom_id, 'leaderboard:next');

      assert.equal(lastBtn.disabled, false);
      assert.equal(lastBtn.custom_id, 'leaderboard:last');
    });

    it('disables next and last on final page', () => {
      const row = buildPaginationRow(5, 5, 'leaderboard');
      const [firstBtn, prevBtn, pageBtn, nextBtn, lastBtn] = row.components;

      assert.equal(firstBtn.disabled, false);
      assert.equal(prevBtn.disabled, false);
      assert.equal(pageBtn.label, '5 / 5');
      assert.equal(nextBtn.disabled, true);
      assert.equal(lastBtn.disabled, true);
    });

    it('correctly parses custom_ids from pagination buttons', () => {
      const parsedNext = parsePaginationCustomId('ticket_list:next');
      assert.deepEqual(parsedNext, { prefix: 'ticket_list', action: 'next' });

      const parsedFirst = parsePaginationCustomId('audit_logs:sub:first');
      assert.deepEqual(parsedFirst, { prefix: 'audit_logs:sub', action: 'first' });

      assert.equal(parsePaginationCustomId('invalid'), null);
      assert.equal(parsePaginationCustomId('some:unknown_action'), null);
    });
  });
});
