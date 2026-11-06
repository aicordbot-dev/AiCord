/**
 * src/lib/levels/level-embeds.ts
 * Visual Discord Embed builders for user rank cards, server leaderboards,
 * and automated level-up announcements.
 */

import { Colors, clampEmbed, type DiscordEmbed } from '@/lib/discord/embeds';
import { renderProgressBar } from './level-math';
import { renderTemplate, type TemplateContext } from '@/lib/engines/template-engine';

export interface RankUser {
  id: string;
  username?: string;
  tag?: string;
  avatar?: string;
}

export interface UserRankData {
  rank: number;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  totalMessages?: number;
  voiceSeconds?: number;
}

export interface RankGuild {
  id?: string;
  name?: string;
  icon?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username?: string;
  tag?: string;
  level: number;
  xp: number;
  totalMessages?: number;
}

/**
 * Builds a visual rank card embed showing rank #X, current level, total XP,
 * progress bar to next level, and message count.
 */
export function buildRankCardEmbed(
  user: RankUser,
  rankData: UserRankData,
  guild?: RankGuild,
): DiscordEmbed {
  const userTag = user.tag ?? user.username ?? `<@${user.id}>`;
  const rankDisplay = rankData.rank > 0 ? `#${rankData.rank}` : 'Unranked';

  const fields = [
    {
      name: '🏆 Rank',
      value: rankDisplay,
      inline: true,
    },
    {
      name: '⭐ Level',
      value: `${rankData.level}`,
      inline: true,
    },
    {
      name: '✨ Total XP',
      value: `${rankData.xp.toLocaleString()} XP`,
      inline: true,
    },
    {
      name: '📊 Progress to Level ' + (rankData.level + 1),
      value: `${renderProgressBar(rankData.progressPercent, 16)}\n${rankData.xpIntoLevel.toLocaleString()} / ${rankData.xpForNextLevel.toLocaleString()} XP (${rankData.progressPercent}%)`,
      inline: false,
    },
    {
      name: '💬 Total Messages',
      value: `${(rankData.totalMessages ?? 0).toLocaleString()}`,
      inline: true,
    },
  ];

  if (rankData.voiceSeconds && rankData.voiceSeconds > 0) {
    const mins = Math.floor(rankData.voiceSeconds / 60);
    fields.push({
      name: '🎙️ Voice Activity',
      value: `${mins} min${mins === 1 ? '' : 's'}`,
      inline: true,
    });
  }

  const embed: DiscordEmbed = {
    title: `${userTag}'s Rank Card`,
    color: Colors.PRIMARY,
    thumbnail: user.avatar ? { url: user.avatar } : undefined,
    fields,
    footer: guild?.name ? { text: `${guild.name} Progression` } : undefined,
    timestamp: new Date().toISOString(),
  };

  return clampEmbed(embed);
}

/**
 * Builds the top 10 leaderboard embed with medal emojis (🥇, 🥈, 🥉) and pagination indicators.
 */
export function buildLeaderboardEmbed(
  guild: RankGuild,
  entries: LeaderboardEntry[],
  page: number,
  totalPages: number,
): DiscordEmbed {
  const guildName = guild?.name ?? 'Server';
  const safePage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);

  let description: string;

  if (!entries || entries.length === 0) {
    description = 'No members have earned XP on this server yet!\nStart chatting in channels to climb the leaderboard.';
  } else {
    description = entries
      .map((entry) => {
        let badge: string;
        if (entry.rank === 1) badge = '🥇';
        else if (entry.rank === 2) badge = '🥈';
        else if (entry.rank === 3) badge = '🥉';
        else badge = `\`#${entry.rank}\``;

        const displayName = entry.username
          ? `**${entry.username}** (<@${entry.userId}>)`
          : `<@${entry.userId}>`;

        const msgs = typeof entry.totalMessages === 'number'
          ? ` • ${entry.totalMessages.toLocaleString()} msgs`
          : '';

        return `${badge} ${displayName}\n└ Level **${entry.level}** • **${entry.xp.toLocaleString()}** XP${msgs}`;
      })
      .join('\n\n');
  }

  const embed: DiscordEmbed = {
    title: `🏆 ${guildName} — XP Leaderboard`,
    description,
    color: Colors.PRIMARY,
    footer: {
      text: `Page ${safePage} of ${safeTotalPages} • Top XP Earners`,
    },
    timestamp: new Date().toISOString(),
  };

  return clampEmbed(embed);
}

/**
 * Builds a level-up announcement embed, applying custom template formatting via TemplateEngine.
 */
export function buildLevelUpEmbed(
  user: RankUser,
  newLevel: number,
  unlockedRole?: { id: string; name: string },
  template?: string,
): DiscordEmbed {
  let description: string;

  if (template && template.trim().length > 0) {
    const ctx: TemplateContext = {
      user: {
        id: user.id,
        name: user.username,
        username: user.username,
        tag: user.tag ?? user.username,
        mention: `<@${user.id}>`,
        avatar: user.avatar,
      },
      level: newLevel,
      stats: {
        level: newLevel,
      },
      role: unlockedRole ? `<@&${unlockedRole.id}>` : undefined,
      role_name: unlockedRole?.name,
    };
    description = renderTemplate(template, ctx);
  } else {
    description = `🎉 Congratulations <@${user.id}>! You've leveled up to **Level ${newLevel}**!`;
    if (unlockedRole) {
      description += `\n\n👑 **Role Reward Unlocked!**\nYou've earned the **${unlockedRole.name}** (<@&${unlockedRole.id}>) role!`;
    }
  }

  const embed: DiscordEmbed = {
    title: '🎉 Level Up!',
    description,
    color: Colors.SUCCESS,
    thumbnail: user.avatar ? { url: user.avatar } : undefined,
    timestamp: new Date().toISOString(),
  };

  return clampEmbed(embed);
}
