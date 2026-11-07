/**
 * src/commands/economy.ts
 * Slash Commands and Component Handlers for Phase 28 Server Economy & Gamification.
 *
 * Implements:
 * - /balance [user]: View wallet, bank, and net worth
 * - /daily: Claim daily coins with streak bonuses
 * - /deposit <amount>: Deposit coins into bank (supports 'all')
 * - /withdraw <amount>: Withdraw coins from bank (supports 'all')
 * - /pay <user> <amount>: Send coins to another server member
 * - /work: Earn coins working a job (1h cooldown)
 * - /crime: High-risk, high-reward crime (2h cooldown)
 * - /shop [page]: Browse the server shop
 * - /buy <item_id>: Purchase an item from the server shop
 * - /shop-admin add|remove|list: Manage server shop (requires Manage Guild)
 * - /rich [page]: Wealth leaderboard with pagination
 *
 * All commands registered under category: 'economy'.
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { successEmbed, errorEmbed, infoEmbed } from '@/lib/discord/embeds';
import { PermissionFlags } from '@/lib/discord/permissions';
import {
  getEconomyUser,
  claimDaily,
  deposit,
  withdraw,
  transfer,
  work,
  crime,
  getEconomyLeaderboard,
  listShopItems,
  addShopItem,
  removeShopItem,
  buyShopItem,
} from '@/lib/economy/economy-service';
import {
  buildBalanceEmbed,
  buildDailyEmbed,
  buildWorkCrimeEmbed,
  buildShopEmbed,
  buildEconomyLeaderboardEmbed,
  buildShopPaginationRow,
  buildRichPaginationRow,
} from '@/lib/economy/economy-embeds';
import { getUserProfileStyle, getServerTheme } from '@/lib/styles/user-profile-style';

export { buildShopPaginationRow, buildRichPaginationRow } from '@/lib/economy/economy-embeds';

// ─── Option Helpers ───────────────────────────────────────────────────────

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }> | undefined,
  name: string,
): T | undefined {
  if (!options) return undefined;
  const match = options.find((o) => o.name === name);
  return match ? (match.value as T) : undefined;
}

// ─── Discord Role Grant Helper ────────────────────────────────────────────

async function grantDiscordRole(
  guildId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  try {
    const { getDiscordRest, discordApiCall } = await import('@/lib/discord/rest');
    const { Routes } = await import('discord-api-types/v10');
    const rest = getDiscordRest();
    await discordApiCall(() => rest.put(Routes.guildMemberRole(guildId, userId, roleId)));
  } catch (err) {
    console.warn(`[Economy] Failed to grant role ${roleId} to user ${userId} in guild ${guildId}:`, err);
  }
}

// ─── Component Interaction Handlers ───────────────────────────────────────

export async function handleShopInteraction(
  token: string,
  guildId: string,
  targetPage: number,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const existingTitle = component.message?.embeds?.[0]?.title;
  let guildName = 'Server';
  if (existingTitle && existingTitle.includes(' — Server Shop')) {
    guildName = existingTitle.replace('🛒 ', '').replace(' — Server Shop', '').trim();
  }

  const allItems = await listShopItems(guildId);
  const pageSize = 5;
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(targetPage, totalPages));
  const paginatedItems = allItems.slice((page - 1) * pageSize, page * pageSize);

  const serverTheme = await getServerTheme(guildId);
  const embed = buildShopEmbed(guildName, paginatedItems, page, totalPages, serverTheme);
  const components = totalPages > 1 ? [buildShopPaginationRow(page, totalPages)] : [];

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

export async function handleRichInteraction(
  token: string,
  guildId: string,
  targetPage: number,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const existingTitle = component.message?.embeds?.[0]?.title;
  let guildName = 'Server';
  if (existingTitle && existingTitle.includes(' — Wealth Leaderboard')) {
    guildName = existingTitle.replace('🏆 ', '').replace(' — Wealth Leaderboard', '').trim();
  }

  const { entries, page, totalPages } = await getEconomyLeaderboard(guildId, targetPage, 10);
  const serverTheme = await getServerTheme(guildId);
  const embed = buildEconomyLeaderboardEmbed(guildName, entries, page, totalPages, serverTheme);
  const components = totalPages > 1 ? [buildRichPaginationRow(page, totalPages)] : [];

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

// ─── 1. /balance Command ──────────────────────────────────────────────────

export async function handleBalanceCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;

  const targetUserId =
    getOption<string>(options, 'user') ||
    interaction.member?.user?.id ||
    interaction.user?.id ||
    '';

  const resolved = interaction.data.resolved as {
    users?: Record<string, { id: string; username: string; avatar?: string }>;
  } | undefined;

  const resolvedUser = resolved?.users?.[targetUserId];
  const fallbackUser = interaction.member?.user ?? interaction.user;

  const username =
    resolvedUser?.username ||
    (targetUserId === fallbackUser?.id ? fallbackUser?.username : 'Member') ||
    'Member';

  const avatar = resolvedUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${targetUserId}/${resolvedUser.avatar}.png`
    : undefined;

  const economyData = await getEconomyUser(guildId, targetUserId);
  const userProfileStyle = await getUserProfileStyle(guildId, targetUserId);
  const embed = buildBalanceEmbed(
    { id: targetUserId, username, avatar },
    economyData,
    { id: guildId, name: 'Server' },
    userProfileStyle,
  );

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

export const balanceCommand: RegisteredCommand = {
  name: 'balance',
  description: 'View wallet, bank balance, and net worth',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'user',
      description: 'Member whose balance you want to check (default: you)',
      required: false,
    },
  ],
  execute: handleBalanceCommand,
};

// ─── 2. /daily Command ────────────────────────────────────────────────────

export async function handleDailyCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const username = interaction.member?.user?.username || interaction.user?.username || 'Member';

  const result = await claimDaily(guildId, userId);
  const userProfileStyle = await getUserProfileStyle(guildId, userId);
  const embed = buildDailyEmbed({ id: userId, username }, result, userProfileStyle.balanceTheme);

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

export const dailyCommand: RegisteredCommand = {
  name: 'daily',
  description: 'Claim your daily coins allowance and increase your daily streak',
  category: 'economy',
  rateLimit: { limit: 3, windowMs: 10_000 },
  options: [],
  execute: handleDailyCommand,
};

// ─── 3. /deposit Command ──────────────────────────────────────────────────

export async function handleDepositCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;
  const rawAmount = getOption<string>(options, 'amount') ?? '';

  let depositAmount: number | 'all';
  if (rawAmount.toLowerCase().trim() === 'all') {
    depositAmount = 'all';
  } else {
    depositAmount = parseInt(rawAmount.trim(), 10);
  }

  const result = await deposit(guildId, userId, depositAmount);

  if (!result.success) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Deposit Failed', result.message || 'Could not complete deposit.')],
    });
    return;
  }

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        '🏦 Coins Deposited',
        `Successfully deposited **${result.deposited?.toLocaleString()} coins** into your bank!\n\n` +
          `💵 **Wallet:** ${result.wallet?.toLocaleString()} coins\n` +
          `🏦 **Bank:** ${result.bank?.toLocaleString()} / ${result.bankCapacity?.toLocaleString()} coins`,
      ),
    ],
  });
}

export const depositCommand: RegisteredCommand = {
  name: 'deposit',
  description: 'Deposit coins from your wallet into your bank',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'amount',
      description: 'Amount of coins to deposit, or "all"',
      required: true,
    },
  ],
  execute: handleDepositCommand,
};

// ─── 4. /withdraw Command ─────────────────────────────────────────────────

export async function handleWithdrawCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;
  const rawAmount = getOption<string>(options, 'amount') ?? '';

  let withdrawAmount: number | 'all';
  if (rawAmount.toLowerCase().trim() === 'all') {
    withdrawAmount = 'all';
  } else {
    withdrawAmount = parseInt(rawAmount.trim(), 10);
  }

  const result = await withdraw(guildId, userId, withdrawAmount);

  if (!result.success) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Withdrawal Failed', result.message || 'Could not complete withdrawal.')],
    });
    return;
  }

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        '💵 Coins Withdrawn',
        `Successfully withdrew **${result.withdrawn?.toLocaleString()} coins** from your bank!\n\n` +
          `💵 **Wallet:** ${result.wallet?.toLocaleString()} coins\n` +
          `🏦 **Bank:** ${result.bank?.toLocaleString()} coins`,
      ),
    ],
  });
}

export const withdrawCommand: RegisteredCommand = {
  name: 'withdraw',
  description: 'Withdraw coins from your bank into your wallet',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'amount',
      description: 'Amount of coins to withdraw, or "all"',
      required: true,
    },
  ],
  execute: handleWithdrawCommand,
};

// ─── 5. /pay Command ──────────────────────────────────────────────────────

export async function handlePayCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const senderId = interaction.member?.user?.id || interaction.user?.id || '';
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;

  const recipientId = getOption<string>(options, 'user');
  const amount = getOption<number>(options, 'amount');

  if (!recipientId || amount === undefined) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Invalid Parameters', 'Please specify both a recipient member and a valid amount.')],
    });
    return;
  }

  const result = await transfer(guildId, senderId, recipientId, amount);

  if (!result.success) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Payment Failed', result.message || 'Could not complete payment.')],
    });
    return;
  }

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        '💸 Payment Sent',
        `You successfully sent **${result.amount?.toLocaleString()} coins** to <@${recipientId}>!\n\n` +
          `💳 **Your Wallet:** ${result.senderWallet?.toLocaleString()} coins`,
      ),
    ],
  });
}

export const payCommand: RegisteredCommand = {
  name: 'pay',
  description: 'Send coins from your wallet to another member',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'user',
      description: 'Member to receive the coins',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'amount',
      description: 'Amount of coins to send',
      required: true,
      min_value: 1,
    },
  ],
  execute: handlePayCommand,
};

// ─── 6. /work Command ─────────────────────────────────────────────────────

export async function handleWorkCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const username = interaction.member?.user?.username || interaction.user?.username || 'Member';

  const result = await work(guildId, userId);
  const embed = buildWorkCrimeEmbed({ id: userId, username }, 'work', result);

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

export const workCommand: RegisteredCommand = {
  name: 'work',
  description: 'Work a shift to earn coins (1 hour cooldown)',
  category: 'economy',
  rateLimit: { limit: 3, windowMs: 10_000 },
  options: [],
  execute: handleWorkCommand,
};

// ─── 7. /crime Command ────────────────────────────────────────────────────

export async function handleCrimeCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const username = interaction.member?.user?.username || interaction.user?.username || 'Member';

  const result = await crime(guildId, userId);
  const embed = buildWorkCrimeEmbed({ id: userId, username }, 'crime', result);

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

export const crimeCommand: RegisteredCommand = {
  name: 'crime',
  description: 'Commit a high-risk crime for big coin rewards or fines (2 hour cooldown)',
  category: 'economy',
  rateLimit: { limit: 3, windowMs: 10_000 },
  options: [],
  execute: handleCrimeCommand,
};

// ─── 8. /shop Command ─────────────────────────────────────────────────────

export async function handleShopCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;
  const targetPage = getOption<number>(options, 'page') || 1;

  const allItems = await listShopItems(guildId);
  const pageSize = 5;
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(targetPage, totalPages));
  const paginatedItems = allItems.slice((page - 1) * pageSize, page * pageSize);

  const serverTheme = await getServerTheme(guildId);
  const embed = buildShopEmbed('Server', paginatedItems, page, totalPages, serverTheme);
  const components = totalPages > 1 ? [buildShopPaginationRow(page, totalPages)] : [];

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

export const shopCommand: RegisteredCommand = {
  name: 'shop',
  description: 'Browse the server shop catalog',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'page',
      description: 'Page of shop items to display',
      required: false,
      min_value: 1,
    },
  ],
  execute: handleShopCommand,
};

// ─── 9. /buy Command ──────────────────────────────────────────────────────

export async function handleBuyCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const userId = interaction.member?.user?.id || interaction.user?.id || '';
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;
  const itemId = getOption<string>(options, 'item_id');

  if (!itemId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Item', 'Please specify an item ID to purchase.')],
    });
    return;
  }

  const result = await buyShopItem(guildId, userId, itemId, grantDiscordRole);

  if (!result.success || !result.item) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Purchase Failed', result.message || 'Could not complete purchase.')],
    });
    return;
  }

  const roleText =
    result.item.type === 'role' && result.item.roleId
      ? `\n🎖️ **Role Granted:** <@&${result.item.roleId}>`
      : '';

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        '🛍️ Purchase Successful!',
        `You purchased **${result.item.name}** for **${result.item.price.toLocaleString()} coins**!${roleText}\n\n` +
          `💳 **Remaining Wallet Balance:** ${result.userWallet?.toLocaleString()} coins\n` +
          `*Item has been added to your inventory!*`,
      ),
    ],
  });
}

export const buyCommand: RegisteredCommand = {
  name: 'buy',
  description: 'Purchase an item from the server shop',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'item_id',
      description: 'ID of the shop item to buy',
      required: true,
      autocomplete: true,
    },
  ],
  autocomplete: async (ctx) => {
    const query = ctx.focusedOption.value.toLowerCase().trim();
    const guildId = ctx.guildId ?? '';
    const items = await listShopItems(guildId);
    const filtered = query
      ? items.filter(
          (i) =>
            i.itemId.toLowerCase().includes(query) ||
            i.name.toLowerCase().includes(query),
        )
      : items;

    return filtered.slice(0, 25).map((i) => ({
      name: `${i.name} (🪙 ${i.price})`,
      value: i.itemId,
    }));
  },
  execute: handleBuyCommand,
};

// ─── 10. /shop-admin Command ──────────────────────────────────────────────

export async function handleShopAdminCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{
    name: string;
    options?: Array<{ name: string; value?: unknown }>;
  }> | undefined;

  const subcommand = options?.[0];
  const subOptions = subcommand?.options;

  switch (subcommand?.name) {
    case 'add': {
      const id = getOption<string>(subOptions, 'id');
      const name = getOption<string>(subOptions, 'name');
      const price = getOption<number>(subOptions, 'price');
      const description = getOption<string>(subOptions, 'description');
      const roleId = getOption<string>(subOptions, 'role');
      const stock = getOption<number>(subOptions, 'stock');

      if (!id || !name || price === undefined) {
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Invalid Arguments', 'Please specify id, name, and price.')],
        });
        return;
      }

      const itemType = roleId ? 'role' : 'custom';
      const created = await addShopItem(guildId, {
        itemId: id,
        name,
        description,
        price,
        type: itemType,
        roleId,
        stock: stock !== undefined ? stock : -1,
      });

      const roleMsg = roleId ? `\n🏷️ **Grants Role:** <@&${roleId}>` : '';
      const stockMsg = created.stock === -1 ? 'Unlimited' : `${created.stock} units`;

      await editInteractionResponse(token, {
        embeds: [
          successEmbed(
            '🛒 Shop Item Saved',
            `Item **${created.name}** (\`${created.itemId}\`) is now available in the server shop!\n\n` +
              `🪙 **Price:** ${created.price.toLocaleString()} coins\n` +
              `📦 **Stock:** ${stockMsg}${roleMsg}`,
          ),
        ],
      });
      break;
    }

    case 'remove': {
      const id = getOption<string>(subOptions, 'id');
      if (!id) {
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Invalid Arguments', 'Please specify an item id to remove.')],
        });
        return;
      }

      const removed = await removeShopItem(guildId, id);
      if (!removed) {
        await editInteractionResponse(token, {
          embeds: [errorEmbed('Not Found', `Item with ID \`${id}\` was not found in the shop.`)],
        });
        return;
      }

      await editInteractionResponse(token, {
        embeds: [successEmbed('Shop Item Removed', `Item \`${id}\` was deleted from the shop.`)],
      });
      break;
    }

    case 'list': {
      const items = await listShopItems(guildId);
      if (items.length === 0) {
        await editInteractionResponse(token, {
          embeds: [infoEmbed('Shop Empty', 'There are no items configured in the server shop yet.')],
        });
        return;
      }

      const listText = items
        .map(
          (i) =>
            `• **${i.name}** (\`${i.itemId}\`) — 🪙 **${i.price}** coins | Type: \`${i.type}\` | Stock: ${
              i.stock === -1 ? '∞' : i.stock
            }${i.roleId ? ` | Role: <@&${i.roleId}>` : ''}`,
        )
        .join('\n');

      await editInteractionResponse(token, {
        embeds: [infoEmbed('🏪 Configured Shop Items', listText)],
      });
      break;
    }

    default: {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Unknown Subcommand', 'Use `/shop-admin add`, `/shop-admin remove`, or `/shop-admin list`.')],
      });
    }
  }
}

export const shopAdminCommand: RegisteredCommand = {
  name: 'shop-admin',
  description: 'Manage server shop items (requires Manage Server permission)',
  category: 'economy',
  default_member_permissions: PermissionFlags.MANAGE_GUILD.toString(),
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'add',
      description: 'Add or update a server shop item',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'id',
          description: 'Unique item identifier (e.g. vip-pass)',
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: 'Display name of the item',
          required: true,
        },
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'price',
          description: 'Price in coins',
          required: true,
          min_value: 1,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'description',
          description: 'Description of the item',
          required: false,
        },
        {
          type: ApplicationCommandOptionType.Role,
          name: 'role',
          description: 'Role to award when purchased',
          required: false,
        },
        {
          type: ApplicationCommandOptionType.Integer,
          name: 'stock',
          description: 'Stock count (-1 for unlimited)',
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'remove',
      description: 'Remove an item from the server shop',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'id',
          description: 'ID of the item to remove',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'list',
      description: 'List all items configured in the server shop',
      options: [],
    },
  ],
  execute: handleShopAdminCommand,
};

// ─── 11. /rich Command ────────────────────────────────────────────────────

export async function handleRichCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const token = interaction.token;
  const options = interaction.data.options as Array<{ name: string; value?: unknown }> | undefined;
  const targetPage = getOption<number>(options, 'page') || 1;

  const { entries, page, totalPages } = await getEconomyLeaderboard(guildId, targetPage, 10);
  const serverTheme = await getServerTheme(guildId);
  const embed = buildEconomyLeaderboardEmbed('Server', entries, page, totalPages, serverTheme);
  const components = totalPages > 1 ? [buildRichPaginationRow(page, totalPages)] : [];

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

export const richCommand: RegisteredCommand = {
  name: 'rich',
  description: 'View the server wealth leaderboard ranked by total net worth',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'page',
      description: 'Page of wealth leaderboard to view',
      required: false,
      min_value: 1,
    },
  ],
  execute: handleRichCommand,
};
