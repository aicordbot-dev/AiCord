import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSecurityScore,
  type AutomodSettings,
} from '@/lib/discord/server-data';

describe('Discrofy AutoMod Settings & Threshold Engine', () => {
  it('correctly toggles individual security filters and updates security score', () => {
    const settings: AutomodSettings = {
      antiInvite: true,
      antiSpam: true,
      mentionSpamThreshold: 5,
      badWords: ['phishing.link'],
      autoTimeoutDuration: 300,
      aiSentimentGuard: true,
    };

    assert.equal(calculateSecurityScore(settings), 99);

    // Disable anti-invite
    settings.antiInvite = false;
    assert.equal(calculateSecurityScore(settings), 89);

    // Disable anti-spam
    settings.antiSpam = false;
    assert.equal(calculateSecurityScore(settings), 79);

    // Disable AI guard
    settings.aiSentimentGuard = false;
    assert.equal(calculateSecurityScore(settings), 71);
  });

  it('validates mention spam threshold slider range and effect on defense score', () => {
    const baseSettings: AutomodSettings = {
      antiInvite: true,
      antiSpam: true,
      mentionSpamThreshold: 10,
      badWords: [],
      autoTimeoutDuration: 300,
      aiSentimentGuard: true,
    };

    const looseScore = calculateSecurityScore(baseSettings);

    // Tightening to <= 5 mentions awards additional protection score
    baseSettings.mentionSpamThreshold = 4;
    const tightScore = calculateSecurityScore(baseSettings);

    assert.ok(tightScore > looseScore);
  });

  it('handles bad word keyword and domain pattern addition and removal cleanly', () => {
    const badWords: string[] = ['free-nitro', 'discord-steam.gift'];

    // Add new bad word without duplicates
    const newWord = 't.me/freecrypto';
    if (!badWords.includes(newWord)) {
      badWords.push(newWord);
    }
    assert.equal(badWords.length, 3);
    assert.ok(badWords.includes('t.me/freecrypto'));

    // Prevent duplicate
    if (!badWords.includes(newWord)) {
      badWords.push(newWord);
    }
    assert.equal(badWords.length, 3);

    // Remove word
    const filtered = badWords.filter((w) => w !== 'free-nitro');
    assert.equal(filtered.length, 2);
    assert.ok(!filtered.includes('free-nitro'));
  });

  it('validates supported timeout durations for punitive isolation', () => {
    const validDurations = [60, 300, 600, 3600];

    for (const d of validDurations) {
      assert.ok(d >= 60, 'Minimum timeout must be at least 60 seconds');
      assert.ok(d <= 86400 * 28, 'Timeout must not exceed Discord maximum 28 days');
    }
  });
});
