/**
 * src/lib/economy/economy-embeds.ts
 * Discord Embed presentation builders and pagination components for AiCord Server Economy.
 */

import type { APIEmbed } from 'discord-api-types/v10';
import type { DiscordActionRowComponent } from '@/lib/engines/pagination';
import type {
  IEconomyUser,
  IEconomyShopItem,
} from '@/models';
import type {
  ClaimDailyResult,
  EconomyLeaderboardEntry,
} from './economy-service';
import { getDailyStreakMultiplier } from './economy-service';

// ─── Visual Bar Helper ────────────────────────────────────────────────────

export function renderCapacityBar(used: number, total: number, length: number = 10): string {
  if (total <= 0) return '`[░░░░░░░░░░]` 0%';
  const ratio = Math.max(0, Math.min(1, used / total));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  const percent = Math.round(ratio * 100);
  return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` ${percent}%`;
}

// ─── Format Duration Helper ───────────────────────────────────────────────

export function formatDuration(ms: number): string {
  if (ms <= 0) return 'ready now';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '1s';
}

// ─── 1. Balance & Portfolio Embed ─────────────────────────────────────────

export function buildBalanceEmbed(
  user: { id: string; username: string; avatar?: string },
  economyData: IEconomyUser,
  guild?: { id?: string; name?: string },
): APIEmbed {
  const netWorth = (economyData.wallet || 0) + (economyData.bank || 0);
  const capacityBar = renderCapacityBar(economyData.bank || 0, economyData.bankCapacity || 5000);
  const streak = economyData.dailyStreak || 0;
  const inventoryCount = economyData.inventory?.length || 0;

  return {
    title: `💰 ${user.username}'s Financial Portfolio`,
    color: 0xf1c40f, // Gold
    thumbnail: user.avatar ? { url: user.avatar } : undefined,
    fields: [
      {
        name: '💵 Wallet',
        value: `**${(economyData.wallet || 0).toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: '🏦 Bank',
        value: `**${(economyData.bank || 0).toLocaleString()}** / ${(economyData.bankCapacity || 5000).toLocaleString()} coins\n${capacityBar}`,
        inline: true,
      },
      {
        name: '💎 Net Worth',
        value: `**${netWorth.toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: '🔥 Daily Streak',
        value: `**${streak}** Day${streak === 1 ? '' : 's'} (${getDailyStreakMultiplier(streak)}x multiplier)`,
        inline: true,
      },
      {
        name: '🎒 Inventory',
        value: `**${inventoryCount}** Item${inventoryCount === 1 ? '' : 's'}`,
        inline: true,
      },
    ],
    footer: {
      text: guild?.name ? `${guild.name} • Server Economy` : 'AiCord Server Economy',
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── 2. Daily Streak Embed ────────────────────────────────────────────────

export function buildDailyEmbed(
  user: { id: string; username: string },
  result: ClaimDailyResult,
): APIEmbed {
  if (result.alreadyClaimed) {
    const nextClaimTs = Math.floor((Date.now() + result.nextClaimInMs) / 1000);
    return {
      title: '⏰ Daily Reward Already Claimed!',
      description: `You have already collected your daily reward today!\n\n` +
        `⏳ **Next claim available:** <t:${nextClaimTs}:R> (${formatDuration(result.nextClaimInMs)})\n` +
        `🔥 **Current Streak:** **${result.streak}** Day${result.streak === 1 ? '' : 's'}\n\n` +
        `*Come back after cooldown to maintain your streak bonus!*`,
      color: 0xf39c12, // Amber
      footer: { text: 'AiCord Daily Rewards' },
      timestamp: new Date().toISOString(),
    };
  }

  const multiplier = getDailyStreakMultiplier(result.streak);
  const streakEmoji = result.streak >= 10 ? '👑' : result.streak >= 5 ? '🔥' : '✨';

  return {
    title: `${streakEmoji} Daily Reward Claimed!`,
    description: `Congratulations **${user.username}**! You collected your daily coins.\n\n` +
      `💰 **Reward Received:** **+${result.reward.toLocaleString()}** coins\n` +
      `🔥 **Daily Streak:** **${result.streak}** Day${result.streak === 1 ? '' : 's'} (${multiplier}x multiplier)\n` +
      `💳 **New Wallet Balance:** **${result.newBalance.toLocaleString()}** coins\n\n` +
      `*Claim again in 24 hours to keep your streak alive! (Expires after 48h)*`,
    color: 0x2ecc71, // Emerald Green
    footer: { text: 'AiCord Daily Rewards' },
    timestamp: new Date().toISOString(),
  };
}

// ─── 3. Work & Crime Embed ────────────────────────────────────────────────

export function buildWorkCrimeEmbed(
  user: { id: string; username: string },
  type: 'work' | 'crime',
  result: {
    onCooldown?: boolean;
    remainingMs?: number;
    success?: boolean;
    earned?: number;
    amount?: number;
    balance: number;
    narrative?: string;
  },
): APIEmbed {
  if (result.onCooldown) {
    const remainingMs = result.remainingMs || 0;
    const readyTs = Math.floor((Date.now() + remainingMs) / 1000);
    const activity = type === 'work' ? 'work another shift' : 'commit another crime';

    return {
      title: `⏳ Cooldown Active`,
      description: `You're resting up! You can ${activity} <t:${readyTs}:R> (${formatDuration(remainingMs)}).`,
      color: 0xf39c12, // Amber
      footer: { text: `AiCord Economy • /${type}` },
      timestamp: new Date().toISOString(),
    };
  }

  if (type === 'work') {
    return {
      title: '💼 Work Shift Complete!',
      description: `${result.narrative}\n\n` +
        `💰 **Earned:** **+${(result.earned || 0).toLocaleString()}** coins\n` +
        `💳 **Wallet Balance:** **${result.balance.toLocaleString()}** coins`,
      color: 0x3498db, // Discord Blue
      footer: { text: 'AiCord Economy • /work' },
      timestamp: new Date().toISOString(),
    };
  }

  // Crime
  if (result.success) {
    return {
      title: '🦹 Heist Successful!',
      description: `${result.narrative}\n\n` +
        `💰 **Loot Collected:** **+${(result.amount || 0).toLocaleString()}** coins\n` +
        `💳 **Wallet Balance:** **${result.balance.toLocaleString()}** coins`,
      color: 0x2ecc71, // Emerald
      footer: { text: 'AiCord Economy • /crime' },
      timestamp: new Date().toISOString(),
    };
  } else {
    return {
      title: '🚨 Busted by Authorities!',
      description: `${result.narrative}\n\n` +
        `💸 **Fine Deducted:** **-${(result.amount || 0).toLocaleString()}** coins\n` +
        `💳 **Wallet Balance:** **${result.balance.toLocaleString()}** coins`,
      color: 0xe74c3c, // Crimson Red
      footer: { text: 'AiCord Economy • /crime' },
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── 4. Shop Embed ────────────────────────────────────────────────────────

export function buildShopEmbed(
  guildName: string,
  items: IEconomyShopItem[],
  page: number,
  totalPages: number,
): APIEmbed {
  if (items.length === 0) {
    return {
      title: `🛒 ${guildName} — Server Shop`,
      description: 'The server shop is currently empty!\n\nServer managers can add items using `/shop-admin add`.',
      color: 0x9b59b6, // Purple
      footer: { text: `Page ${page} of ${totalPages} • AiCord Server Shop` },
      timestamp: new Date().toISOString(),
    };
  }

  const itemFields = items.map((item) => {
    const typeLabel = item.type === 'role' ? '🏷️ Role' : item.type === 'badge' ? '🎖️ Badge' : '📦 Custom';
    const stockLabel = item.stock === undefined || item.stock === -1 ? '∞ Unlimited' : `${item.stock} left`;
    const desc = item.description ? `*${item.description}*\n` : '';
    const roleMention = item.roleId ? `Grant Role: <@&${item.roleId}>\n` : '';

    return {
      name: `${item.name} — 🪙 ${item.price.toLocaleString()} coins`,
      value: `${desc}${roleMention}ID: \`${item.itemId}\` • ${typeLabel} • Stock: **${stockLabel}**\n*Buy with:* \`/buy ${item.itemId}\``,
      inline: false,
    };
  });

  return {
    title: `🛒 ${guildName} — Server Shop`,
    description: `Browse items available for purchase with your server coins.\nUse \`/buy <item_id>\` to purchase an item.`,
    color: 0x9b59b6,
    fields: itemFields,
    footer: {
      text: `Page ${page} of ${totalPages} • Use /buy <id> to purchase`,
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── 5. Wealth Leaderboard Embed ──────────────────────────────────────────

export function buildEconomyLeaderboardEmbed(
  guildName: string,
  entries: EconomyLeaderboardEntry[],
  page: number,
  totalPages: number,
): APIEmbed {
  if (entries.length === 0) {
    return {
      title: `🏆 ${guildName} — Wealth Leaderboard`,
      description: 'No economy data recorded yet for this server. Start earning with `/daily` and `/work`!',
      color: 0xf1c40f,
      footer: { text: `Page ${page} of ${totalPages} • AiCord Economy` },
      timestamp: new Date().toISOString(),
    };
  }

  const lines = entries.map((entry) => {
    let medal = `\`#${entry.rank}\``;
    if (entry.rank === 1) medal = '🥇';
    else if (entry.rank === 2) medal = '🥈';
    else if (entry.rank === 3) medal = '🥉';

    const streakText = entry.dailyStreak > 0 ? ` • 🔥 ${entry.dailyStreak}d` : '';
    return `${medal} <@${entry.userId}> — **${entry.netWorth.toLocaleString()}** coins\n` +
      `   *Wallet: ${entry.wallet.toLocaleString()} • Bank: ${entry.bank.toLocaleString()}${streakText}*`;
  });

  return {
    title: `🏆 ${guildName} — Wealth Leaderboard`,
    description: lines.join('\n\n'),
    color: 0xf1c40f,
    footer: {
      text: `Page ${page} of ${totalPages} • Server Richest Members`,
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── 6. Pagination Components ─────────────────────────────────────────────

export function buildShopPaginationRow(
  currentPage: number,
  totalPages: number,
): DiscordActionRowComponent {
  const safePage = Math.max(1, currentPage);
  const safeTotal = Math.max(1, totalPages);
  const isFirst = safePage <= 1;
  const isLast = safePage >= safeTotal;

  return {
    type: 1, // ActionRow
    components: [
      {
        type: 2, // Button
        style: 2, // Secondary
        label: '«',
        custom_id: 'econ_shop:1',
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: '‹',
        custom_id: `econ_shop:${Math.max(1, safePage - 1)}`,
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: `${safePage} / ${safeTotal}`,
        custom_id: `econ_shop:${safePage}`,
        disabled: true,
      },
      {
        type: 2,
        style: 2,
        label: '›',
        custom_id: `econ_shop:${Math.min(safeTotal, safePage + 1)}`,
        disabled: isLast,
      },
      {
        type: 2,
        style: 2,
        label: '»',
        custom_id: `econ_shop:${safeTotal}`,
        disabled: isLast,
      },
    ],
  };
}

export function buildRichPaginationRow(
  currentPage: number,
  totalPages: number,
): DiscordActionRowComponent {
  const safePage = Math.max(1, currentPage);
  const safeTotal = Math.max(1, totalPages);
  const isFirst = safePage <= 1;
  const isLast = safePage >= safeTotal;

  return {
    type: 1, // ActionRow
    components: [
      {
        type: 2, // Button
        style: 2, // Secondary
        label: '«',
        custom_id: 'econ_rich:1',
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: '‹',
        custom_id: `econ_rich:${Math.max(1, safePage - 1)}`,
        disabled: isFirst,
      },
      {
        type: 2,
        style: 2,
        label: `${safePage} / ${safeTotal}`,
        custom_id: `econ_rich:${safePage}`,
        disabled: true,
      },
      {
        type: 2,
        style: 2,
        label: '›',
        custom_id: `econ_rich:${Math.min(safeTotal, safePage + 1)}`,
        disabled: isLast,
      },
      {
        type: 2,
        style: 2,
        label: '»',
        custom_id: `econ_rich:${safeTotal}`,
        disabled: isLast,
      },
    ],
  };
}
