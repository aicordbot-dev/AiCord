/**
 * src/commands/skins.ts
 * Collector Skins & Mystery Cosmetics Lootbox Slash Command Suite (/skins, /unbox) & Component Handler for AiCord.
 *
 * Implements:
 * - /skins catalog: Lists all 10 collectible cosmetics grouped by rarity with drop rates & prices
 * - /skins wardrobe [user:@user]: Displays user's skin collection with completion meter [████████░░] 8/10 (80%)
 * - /skins equip skin:<skinId>: Equips an unlocked cosmetic skin as active profile frame
 * - /skins buy skin:<skinId>: Direct skin purchase with economy coins
 * - /unbox: Mystery Lootbox unboxer for 250 coins with glowing celebration embed & [🎁 Unbox Again] button
 * - handleSkinsComponent: interactive component router for skin_equip, skin_select, unbox_again, and skin_wardrobe
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import {
  editInteractionResponse,
  buildActionRow,
  buildButton,
} from '@/lib/discord/interaction-response';
import { errorEmbed, successEmbed } from '@/lib/discord/embeds';
import {
  getSkin,
  getUserSkins,
  equipSkin,
  buySkin,
  openLootbox,
  getUserBalance,
  buildSkinsEmbed,
  buildUnboxEmbed,
  buildCatalogEmbed,
  buildSkinsComponents,
  buildUnboxComponents,
  SKIN_CATALOG,
} from '@/lib/skins/skin-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

const SKIN_CHOICES = SKIN_CATALOG.map((s) => ({
  name: `${s.badgeEmoji} ${s.name} (${s.rarity.toUpperCase()} - ${s.price}🪙)`,
  value: s.skinId,
}));

// ─── /skins Slash Command Handler ─────────────────────────────────────────────

export async function handleSkinsCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'The `/skins` command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  const options =
    (
      interaction.data as {
        options?: Array<{
          name: string;
          options?: Array<{ name: string; value: unknown }>;
        }>;
      }
    )?.options ?? [];
  const subcommand = options[0];
  const subOptions = subcommand?.options ?? [];

  switch (subcommand?.name) {
    case 'catalog':
      await handleSkinsCatalogSubcommand(token, guildId, userId);
      break;
    case 'wardrobe':
      await handleSkinsWardrobeSubcommand(token, guildId, userId, subOptions);
      break;
    case 'equip':
      await handleSkinsEquipSubcommand(token, guildId, userId, subOptions);
      break;
    case 'buy':
      await handleSkinsBuySubcommand(token, guildId, userId, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /skins subcommand: "${subcommand?.name ?? 'unknown'}". Use \`/skins catalog\`, \`/skins wardrobe\`, \`/skins equip\`, or \`/skins buy\`.`,
          ),
        ],
      });
      break;
  }
}

// ─── /skins Subcommand Implementations ────────────────────────────────────────

async function handleSkinsCatalogSubcommand(
  token: string,
  guildId: string,
  userId: string,
): Promise<void> {
  const userSkins = await getUserSkins(guildId, userId);
  const embed = buildCatalogEmbed(userSkins);
  const components = buildSkinsComponents(userSkins);

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleSkinsWardrobeSubcommand(
  token: string,
  guildId: string,
  invokingUserId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(subOptions, 'user') ?? invokingUserId;
  const isSelf = targetUserId === invokingUserId;

  const userSkins = await getUserSkins(guildId, targetUserId);
  const embed = buildSkinsEmbed(userSkins, isSelf ? undefined : `<@${targetUserId}>`);
  const components = isSelf ? buildSkinsComponents(userSkins) : [];

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

async function handleSkinsEquipSubcommand(
  token: string,
  guildId: string,
  userId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const rawSkinId = getOption<string>(subOptions, 'skin');
  if (!rawSkinId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please select a valid skin to equip.')],
    });
    return;
  }

  const skinId = rawSkinId.toLowerCase().trim();
  const result = await equipSkin(guildId, userId, skinId);

  if (!result.success) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Cannot Equip Skin', result.message ?? 'An error occurred.')],
    });
    return;
  }

  const embed = buildSkinsEmbed(result.userSkins);
  const components = buildSkinsComponents(result.userSkins);

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        'Cosmetic Skin Equipped!',
        `Successfully set ${result.skin?.badgeEmoji} **${result.skin?.name}** as your active cosmetic profile frame!`,
      ),
      embed,
    ],
    components,
  });
}

async function handleSkinsBuySubcommand(
  token: string,
  guildId: string,
  userId: string,
  subOptions: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const rawSkinId = getOption<string>(subOptions, 'skin');
  if (!rawSkinId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Missing Parameter', 'Please specify which skin you want to purchase.')],
    });
    return;
  }

  const skinId = rawSkinId.toLowerCase().trim();
  const result = await buySkin(guildId, userId, skinId);

  if (!result.success) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Purchase Failed', result.message ?? 'Unable to complete skin purchase.')],
    });
    return;
  }

  const updatedSkins = result.userSkins;
  const embed = buildSkinsEmbed(updatedSkins);
  const components = buildSkinsComponents(updatedSkins);

  await editInteractionResponse(token, {
    embeds: [
      successEmbed(
        'Skin Purchased!',
        `You purchased ${result.skin?.badgeEmoji} **${result.skin?.name}** for **${result.cost} coins**!\nRemaining balance: **${result.newBalance.toLocaleString()} coins**.\nEquip it anytime with \`/skins equip skin:${skinId}\`.`,
      ),
      embed,
    ],
    components,
  });
}

// ─── /unbox Slash Command Handler ─────────────────────────────────────────────

export async function handleUnboxCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'The `/unbox` command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  const cost = 250;
  const balance = await getUserBalance(guildId, userId);

  if (balance < cost) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Insufficient Coins',
          `You need **${cost} coins** to open a Mystery Cosmetics Lootbox!\nYour current balance is **${balance.toLocaleString()} coins**.\nEarn coins with \`/daily\`, \`/work\`, or \`/crime\`!`,
        ),
      ],
      components: [],
    });
    return;
  }

  const result = await openLootbox(guildId, userId, cost);
  const newBalance = await getUserBalance(guildId, userId);

  await editInteractionResponse(token, {
    embeds: [buildUnboxEmbed(result, newBalance)],
    components: buildUnboxComponents(),
  });
}

// ─── Interactive Component Router ────────────────────────────────────────────

export async function handleSkinsComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'Cosmetics components can only be used in a server.')],
    });
    return;
  }

  // 1. Quick equip button: skin_equip:<skinId>
  if (customId.startsWith('skin_equip:') || customId === 'skin_equip') {
    const skinId = customId.split(':')[1];
    if (!skinId) return;

    const result = await equipSkin(guildId, userId, skinId);
    if (!result.success) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Cannot Equip Skin', result.message ?? 'An error occurred.')],
      });
      return;
    }

    await editInteractionResponse(token, {
      embeds: [buildSkinsEmbed(result.userSkins)],
      components: buildSkinsComponents(result.userSkins),
    });
    return;
  }

  // 2. Select menu dropdown: skin_select
  if (customId === 'skin_select' || customId.startsWith('skin_select:')) {
    const values = (component.data as unknown as { values?: string[] })?.values;
    const selectedSkinId = values?.[0];
    if (!selectedSkinId) return;

    const result = await equipSkin(guildId, userId, selectedSkinId);
    if (!result.success) {
      await editInteractionResponse(token, {
        embeds: [errorEmbed('Cannot Equip Skin', result.message ?? 'An error occurred.')],
      });
      return;
    }

    await editInteractionResponse(token, {
      embeds: [buildSkinsEmbed(result.userSkins)],
      components: buildSkinsComponents(result.userSkins),
    });
    return;
  }

  // 3. Lootbox unbox again button: unbox_again
  if (customId === 'unbox_again' || customId.startsWith('unbox_again:')) {
    const cost = 250;
    const balance = await getUserBalance(guildId, userId);

    if (balance < cost) {
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Insufficient Coins',
            `You need **${cost} coins** to open a Mystery Cosmetics Lootbox!\nYour current balance is **${balance.toLocaleString()} coins**.\nEarn coins with \`/daily\`, \`/work\`, or \`/crime\`!`,
          ),
        ],
        components: [
          buildActionRow(
            buildButton({
              style: 2,
              label: 'View Wardrobe',
              customId: 'skin_wardrobe',
              emoji: '🎨',
            }),
          ),
        ],
      });
      return;
    }

    const result = await openLootbox(guildId, userId, cost);
    const newBalance = await getUserBalance(guildId, userId);

    await editInteractionResponse(token, {
      embeds: [buildUnboxEmbed(result, newBalance)],
      components: buildUnboxComponents(),
    });
    return;
  }

  // 4. View wardrobe button: skin_wardrobe
  if (customId === 'skin_wardrobe' || customId.startsWith('skin_wardrobe:')) {
    const userSkins = await getUserSkins(guildId, userId);
    await editInteractionResponse(token, {
      embeds: [buildSkinsEmbed(userSkins)],
      components: buildSkinsComponents(userSkins),
    });
    return;
  }

  // 5. View catalog button: skin_catalog
  if (customId === 'skin_catalog' || customId.startsWith('skin_catalog:')) {
    const userSkins = await getUserSkins(guildId, userId);
    await editInteractionResponse(token, {
      embeds: [buildCatalogEmbed(userSkins)],
      components: buildSkinsComponents(userSkins),
    });
    return;
  }
}

// ─── Command Definitions ──────────────────────────────────────────────────────

export const skinsCommand: RegisteredCommand = {
  name: 'skins',
  description: 'Collector skins & cosmetics wardrobe management',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  options: [
    {
      name: 'catalog',
      description: 'Browse all collectible cosmetic frames, drop rates, and prices',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'wardrobe',
      description: "View your unlocked cosmetics wardrobe and equipped frame",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: "Target member whose wardrobe to inspect",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: 'equip',
      description: 'Equip an unlocked cosmetic frame as your active profile border',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'skin',
          description: 'Cosmetic frame to equip',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: SKIN_CHOICES,
        },
      ],
    },
    {
      name: 'buy',
      description: 'Directly purchase a collector skin from the catalog with coins',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'skin',
          description: 'Cosmetic frame to purchase',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: SKIN_CHOICES,
        },
      ],
    },
  ],
  execute: handleSkinsCommand,
};

export const unboxCommand: RegisteredCommand = {
  name: 'unbox',
  description: 'Open a Mystery Cosmetics Lootbox for 250 coins with celebratory animations',
  category: 'economy',
  rateLimit: { limit: 5, windowMs: 10_000 },
  execute: handleUnboxCommand,
};
