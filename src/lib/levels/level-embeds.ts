/**
 * src/lib/levels/level-embeds.ts
 * Visual Discord Embed builders for user rank cards, server leaderboards,
 * and automated level-up announcements with Universal Custom Screen theming.
 */

import { Colors, clampEmbed, type DiscordEmbed } from '@/lib/discord/embeds';
import { renderTemplate, type TemplateContext } from '@/lib/engines/template-engine';
import { getTheme, renderThemedProgressBar } from '@/lib/styles/themes';
import type { UserProfileStyleData } from '@/lib/styles/user-profile-style';

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
 * Resolves achievement and milestone badges for a user's rank card.
 */
export function resolveAchievementBadges(
  rankData: UserRankData,
  userBadges?: string[],
): string[] {
  const badges: string[] = [];
  if (userBadges && userBadges.length > 0) {
    badges.push(...userBadges);
  }

  // Top rank badges
  if (rankData.rank === 1) badges.unshift('🥇 Server Champion');
  else if (rankData.rank === 2) badges.unshift('🥈 Server Runner-Up');
  else if (rankData.rank === 3) badges.unshift('🥉 Podium Elite');

  // Milestone level badges
  if (rankData.level >= 50) badges.push('👑 Mythic Champion');
  else if (rankData.level >= 25) badges.push('🔥 Elite Master');
  else if (rankData.level >= 10) badges.push('⚡ Adept Veteran');
  else if (rankData.level >= 5) badges.push('⭐ Novice Explorer');

  // Milestone message badges
  if ((rankData.totalMessages ?? 0) >= 1000) badges.push('📜 Scribe');
  else if ((rankData.totalMessages ?? 0) >= 100) badges.push('💬 Conversationalist');

  return Array.from(new Set(badges));
}

/**
 * Builds a visual rank card embed showing rank #X, current level, total XP,
 * themed progress bar to next level, message count, and achievement badges.
 */
export function buildRankCardEmbed(
  user: RankUser,
  rankData: UserRankData,
  guild?: RankGuild,
  style?: Partial<UserProfileStyleData> | { theme?: string; rankTheme?: string; barStyle?: string; badges?: string[] },
): DiscordEmbed {
  const userTag = user.tag ?? user.username ?? `<@${user.id}>`;
  const rankDisplay = rankData.rank > 0 ? `#${rankData.rank}` : 'Unranked';

  const themeId = style?.rankTheme ?? (style as { theme?: string })?.theme ?? 'cyberpunk';
  const theme = getTheme(themeId);
  const barStyle = style?.barStyle ?? theme.barStyle ?? 'pipes';

  const progressBar = renderThemedProgressBar(rankData.progressPercent, barStyle, 16);

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
      value: `${progressBar}\n${rankData.xpIntoLevel.toLocaleString()} / ${rankData.xpForNextLevel.toLocaleString()} XP (${rankData.progressPercent}%)`,
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

  // Achievement Badges
  const badges = resolveAchievementBadges(rankData, style?.badges);
  if (badges.length > 0) {
    fields.push({
      name: '🎖️ Badges & Achievements',
      value: badges.join(' • '),
      inline: false,
    });
  }

  // Theme header ornamentation when style is provided
  const title = style
    ? `${theme.ornamentation.left}${userTag}'s Rank Card${theme.ornamentation.right}`
    : `${userTag}'s Rank Card`;
  const color = style ? theme.primaryColor : Colors.PRIMARY;

  const embed: DiscordEmbed = {
    title,
    color,
    thumbnail: user.avatar ? { url: user.avatar } : undefined,
    fields,
    footer: guild?.name
      ? { text: `${guild.name} Progression • ${theme.name} Edition` }
      : { text: `AiCord Progression • ${theme.name} Edition` },
    timestamp: new Date().toISOString(),
  };

  return clampEmbed(embed);
}

/**
 * Builds the top 10 leaderboard embed with podium medal styling (🥇 1st Place, 🥈 2nd Place, 🥉 3rd Place)
 * and pagination indicators with server theme support.
 */
export function buildLeaderboardEmbed(
  guild: RankGuild,
  entries: LeaderboardEntry[],
  page: number,
  totalPages: number,
  serverTheme?: string,
): DiscordEmbed {
  const guildName = guild?.name ?? 'Server';
  const safePage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);
  const theme = getTheme(serverTheme);

  let description: string;

  if (!entries || entries.length === 0) {
    description = 'No members have earned XP on this server yet!\nStart chatting in channels to climb the leaderboard.';
  } else {
    description = entries
      .map((entry) => {
        let badge: string;
        let rankPrefix = '';
        if (entry.rank === 1) {
          badge = '🥇';
          rankPrefix = ' **[1ST PLACE]**';
        } else if (entry.rank === 2) {
          badge = '🥈';
          rankPrefix = ' **[2ND PLACE]**';
        } else if (entry.rank === 3) {
          badge = '🥉';
          rankPrefix = ' **[3RD PLACE]**';
        } else {
          badge = `\`#${entry.rank}\``;
        }

        const displayName = entry.username
          ? `**${entry.username}** (<@${entry.userId}>)`
          : `<@${entry.userId}>`;

        const msgs = typeof entry.totalMessages === 'number'
          ? ` • ${entry.totalMessages.toLocaleString()} msgs`
          : '';

        return `${badge}${rankPrefix} ${displayName}\n└ Level **${entry.level}** • **${entry.xp.toLocaleString()}** XP${msgs}`;
      })
      .join('\n\n');
  }

  const embed: DiscordEmbed = {
    title: `🏆 ${guildName} — XP Leaderboard`,
    description,
    color: serverTheme ? theme.primaryColor : Colors.PRIMARY,
    footer: {
      text: `Page ${safePage} of ${safeTotalPages} • Top XP Earners${serverTheme ? ` • ${theme.name}` : ''}`,
    },
    timestamp: new Date().toISOString(),
  };

  return clampEmbed(embed);
}

/**
 * Builds a level-up announcement embed, applying custom template formatting via TemplateEngine
 * with server theme and celebration accents.
 */
export function buildLevelUpEmbed(
  user: RankUser,
  newLevel: number,
  unlockedRole?: { id: string; name: string },
  template?: string,
  themeId?: string,
): DiscordEmbed {
  const theme = getTheme(themeId);
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
    const banner = themeId ? `${theme.ornamentation.left}LEVEL UP${theme.ornamentation.right}\n\n` : '';
    description = `${banner}🎉 Congratulations <@${user.id}>! You've leveled up to **Level ${newLevel}**!`;
    if (unlockedRole) {
      description += `\n\n👑 **Role Reward Unlocked!**\nYou've earned the **${unlockedRole.name}** (<@&${unlockedRole.id}>) role!`;
    }
  }

  const embed: DiscordEmbed = {
    title: '🎉 Level Up!',
    description,
    color: themeId ? theme.primaryColor : Colors.SUCCESS,
    thumbnail: user.avatar ? { url: user.avatar } : undefined,
    timestamp: new Date().toISOString(),
  };

  return clampEmbed(embed);
}
