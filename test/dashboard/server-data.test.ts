import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGuildDashboardData,
  getFallbackGuildData,
  organizeChannelsIntoCategories,
  resolveChannelTypeName,
  decimalToHexColor,
  hasAdminPermission,
  calculateSecurityScore,
  setMockDashboardData,
  clearMockDashboardData,
  type DashboardChannel,
  type AutomodSettings,
} from '@/lib/discord/server-data';

describe('Discrofy Dashboard Server Data Engine', () => {
  beforeEach(() => {
    clearMockDashboardData();
  });

  afterEach(() => {
    clearMockDashboardData();
  });

  describe('resolveChannelTypeName', () => {
    it('maps Discord ChannelType integers to friendly dashboard types', () => {
      assert.equal(resolveChannelTypeName(0), 'text');
      assert.equal(resolveChannelTypeName(2), 'voice');
      assert.equal(resolveChannelTypeName(4), 'category');
      assert.equal(resolveChannelTypeName(5), 'announcement');
      assert.equal(resolveChannelTypeName(13), 'stage');
      assert.equal(resolveChannelTypeName(15), 'forum');
      assert.equal(resolveChannelTypeName(999), 'text');
    });
  });

  describe('decimalToHexColor', () => {
    it('converts Discord RGB integer colors to 6-digit hex format', () => {
      assert.equal(decimalToHexColor(0x22d3ee), '#22d3ee');
      assert.equal(decimalToHexColor(0x5865f2), '#5865f2');
      assert.equal(decimalToHexColor(0), '#94a3b8');
      assert.equal(decimalToHexColor(-1), '#94a3b8');
    });
  });

  describe('hasAdminPermission', () => {
    it('correctly evaluates bit 3 (0x8) administrator flag', () => {
      assert.equal(hasAdminPermission('8'), true);
      assert.equal(hasAdminPermission('2147483647'), true);
      assert.equal(hasAdminPermission('0'), false);
      assert.equal(hasAdminPermission('104324161'), false);
      assert.equal(hasAdminPermission('invalid-bitmask'), false);
    });
  });

  describe('organizeChannelsIntoCategories', () => {
    it('organizes flat channels array into categorized tree', () => {
      const channels: DashboardChannel[] = [
        { id: 'cat-1', name: 'INFO', type: 4, typeName: 'category', position: 0 },
        { id: 'cat-2', name: 'VOICE', type: 4, typeName: 'category', position: 1 },
        { id: 'ch-rules', name: 'rules', type: 0, typeName: 'text', parentId: 'cat-1', position: 0 },
        { id: 'ch-announcements', name: 'news', type: 5, typeName: 'announcement', parentId: 'cat-1', position: 1 },
        { id: 'ch-general-vc', name: 'Lobby', type: 2, typeName: 'voice', parentId: 'cat-2', position: 0 },
        { id: 'ch-orphan', name: 'orphan-channel', type: 0, typeName: 'text', position: 99 },
      ];

      const { categories, uncategorizedChannels } = organizeChannelsIntoCategories(channels);

      assert.equal(categories.length, 2);
      assert.equal(categories[0].name, 'INFO');
      assert.equal(categories[0].channels.length, 2);
      assert.equal(categories[0].channels[0].name, 'rules');
      assert.equal(categories[0].channels[1].name, 'news');

      assert.equal(categories[1].name, 'VOICE');
      assert.equal(categories[1].channels.length, 1);
      assert.equal(categories[1].channels[0].name, 'Lobby');

      assert.equal(uncategorizedChannels.length, 1);
      assert.equal(uncategorizedChannels[0].name, 'orphan-channel');
    });
  });

  describe('calculateSecurityScore', () => {
    it('computes expected security score based on active protections', () => {
      const baseSettings: AutomodSettings = {
        antiInvite: false,
        antiSpam: false,
        mentionSpamThreshold: 10,
        badWords: [],
        autoTimeoutDuration: 300,
        aiSentimentGuard: false,
      };

      const baseScore = calculateSecurityScore(baseSettings);
      assert.equal(baseScore, 65);

      const fortifiedSettings: AutomodSettings = {
        antiInvite: true,
        antiSpam: true,
        mentionSpamThreshold: 4,
        badWords: ['scam.link', 'phishing.site'],
        autoTimeoutDuration: 300,
        aiSentimentGuard: true,
      };

      const fortifiedScore = calculateSecurityScore(fortifiedSettings);
      assert.equal(fortifiedScore, 99);
    });
  });

  describe('getFallbackGuildData & getGuildDashboardData', () => {
    it('returns rich, complete server topology on fallback', async () => {
      const data = getFallbackGuildData('111111111111111111');

      assert.equal(data.guild.id, '111111111111111111');
      assert.equal(data.guild.name, 'Apex Legends Syndicate');
      assert.ok(data.channels.length > 5);
      assert.ok(data.categories.length > 0);
      assert.ok(data.roles.length > 0);
      assert.equal(data.stats.totalMembers, 1420);
      assert.equal(data.stats.uptimePercentage, 99.98);
      assert.equal(data.securityScore, 99);
    });

    it('honors mock override data when registered', async () => {
      const mockData = getFallbackGuildData('custom-guild-id');
      mockData.guild.name = 'Mocked Custom Community';
      setMockDashboardData('custom-guild-id', mockData);

      const resolved = await getGuildDashboardData('custom-guild-id');
      assert.equal(resolved.guild.name, 'Mocked Custom Community');
    });
  });
});
