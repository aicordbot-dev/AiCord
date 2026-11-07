/**
 * src/commands/adventure.ts
 * Gemini AI Dynamic RPG (/adventure) Slash Command Suite & Component Routing for AiCord.
 *
 * Implements:
 * - /adventure play [class]: begins or resumes dungeon quest with interactive choice buttons
 * - /adventure profile [user]: displays hero stats, vitals, floor depth, and equipment
 * - /adventure inventory: displays equipment, weapons, potions, and relics in player satchel
 * - /adventure heal: visits the tavern to rest and restore HP to maximum
 * - /adventure leaderboard [limit]: displays top adventurers in the server ranked by level & gold
 * - Component router for adv_choice:<index> with user-ownership protection
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
} from 'discord-api-types/v10';
import type { RegisteredCommand } from '@/lib/discord/command-registry';
import { editInteractionResponse, sendFollowUp } from '@/lib/discord/interaction-response';
import { successEmbed, warningEmbed, errorEmbed, infoEmbed } from '@/lib/discord/embeds';
import {
  getOrCreatePlayer,
  getPlayer,
  healPlayer,
  startAdventure,
  processAdventureChoice,
  buildAdventureEmbed,
  buildAdventureComponents,
  getAdventureLeaderboard,
  renderHpBar,
  CLASS_ICONS,
  CLASS_NAMES,
  RPG_COLOR,
  type AdventureClass,
} from '@/lib/rpg/adventure-service';

function getOption<T = unknown>(
  options: Array<{ name: string; value: unknown }>,
  name: string,
): T | undefined {
  return options.find((o) => o.name === name)?.value as T | undefined;
}

// ─── Main Slash Command Handler ───────────────────────────────────────────────

export async function handleAdventureCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id;
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const userName =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Adventurer';

  if (!guildId) {
    await editInteractionResponse(token, {
      embeds: [errorEmbed('Error', 'The `/adventure` command can only be played in a server.')],
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
    case 'play':
      await handleAdventurePlaySubcommand(token, guildId, userId, userName, subOptions);
      break;
    case 'profile':
      await handleAdventureProfileSubcommand(token, guildId, userId, subOptions);
      break;
    case 'inventory':
      await handleAdventureInventorySubcommand(token, guildId, userId);
      break;
    case 'heal':
      await handleAdventureHealSubcommand(token, guildId, userId);
      break;
    case 'leaderboard':
      await handleAdventureLeaderboardSubcommand(token, guildId, subOptions);
      break;
    default:
      await editInteractionResponse(token, {
        embeds: [
          errorEmbed(
            'Unknown Subcommand',
            `Unknown /adventure subcommand: "${subcommand?.name ?? 'unknown'}". Use \`/adventure play\` to start.`,
          ),
        ],
        ephemeral: true,
      });
  }
}

// ─── Subcommand: /adventure play ──────────────────────────────────────────────

export async function handleAdventurePlaySubcommand(
  token: string,
  guildId: string,
  userId: string,
  userName: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const chosenClass = (getOption<string>(options, 'class') as AdventureClass) ?? 'warrior';

  // Ensure player exists or creates with selected class
  await getOrCreatePlayer(guildId, userId, chosenClass, userName);

  const quest = await startAdventure(guildId, userId);
  const embed = buildAdventureEmbed(quest.player, quest.scenario, quest.player.dungeon.lastOutcome);
  const actionRow = buildAdventureComponents(quest.choices, false, userId);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [actionRow],
  });
}

// ─── Subcommand: /adventure profile ───────────────────────────────────────────

export async function handleAdventureProfileSubcommand(
  token: string,
  guildId: string,
  callerUserId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const targetUserId = getOption<string>(options, 'user') ?? callerUserId;
  const player = await getPlayer(guildId, targetUserId);

  if (!player) {
    const msg =
      targetUserId === callerUserId
        ? 'You have not embarked on an adventure yet! Use `/adventure play` to create your hero.'
        : 'This member has not ventured into the dungeon yet.';
    await editInteractionResponse(token, {
      embeds: [infoEmbed('No Hero Profile', msg)],
      ephemeral: true,
    });
    return;
  }

  const classIcon = CLASS_ICONS[player.class] ?? '⚔️';
  const className = CLASS_NAMES[player.class] ?? player.class;
  const hpDisplay = renderHpBar(player.hp, player.maxHp);
  const weapons = player.inventory.filter((i) => i.type === 'weapon');
  const armors = player.inventory.filter((i) => i.type === 'armor');

  const weaponDesc = weapons.length > 0 ? weapons.map((w) => `${w.name} (+${w.power})`).join(', ') : 'None';
  const armorDesc = armors.length > 0 ? armors.map((a) => `${a.name} (+${a.power})`).join(', ') : 'None';

  const embed = {
    title: `🗡️ Adventurer Profile — ${player.name}`,
    color: RPG_COLOR,
    fields: [
      {
        name: 'Hero Class & Level',
        value: `${classIcon} **${className}**\n⭐ Level **${player.level}** (${player.xp}/${player.level * 100} XP)`,
        inline: true,
      },
      {
        name: 'Health & Vitality',
        value: `${hpDisplay}\n🪙 **${player.gold}** Gold`,
        inline: true,
      },
      {
        name: 'Dungeon Records',
        value: `🏰 Deepest Floor: **${player.dungeon.floor || 1}**\n💀 Monsters Vanquished: **${player.monstersDefeated}**`,
        inline: false,
      },
      {
        name: 'Equipped Gear',
        value: `⚔️ **Weapons:** ${weaponDesc}\n🛡️ **Armor:** ${armorDesc}`,
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord RPG • Use /adventure play to descend into the dungeon',
    },
  };

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

// ─── Subcommand: /adventure inventory ─────────────────────────────────────────

export async function handleAdventureInventorySubcommand(
  token: string,
  guildId: string,
  userId: string,
): Promise<void> {
  const player = await getPlayer(guildId, userId);

  if (!player) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          'No Hero Profile',
          'You have not begun an adventure yet! Use `/adventure play` to create your hero and claim starter gear.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (player.inventory.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          `🎒 ${player.name}'s Adventure Satchel`,
          'Your satchel is completely empty! Slay monsters and open dungeon chests to acquire weapons and armor.',
        ),
      ],
    });
    return;
  }

  const weapons = player.inventory.filter((i) => i.type === 'weapon');
  const armors = player.inventory.filter((i) => i.type === 'armor');
  const potions = player.inventory.filter((i) => i.type === 'potion');
  const relics = player.inventory.filter((i) => i.type === 'relic');

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (weapons.length > 0) {
    fields.push({
      name: `⚔️ Weapons (${weapons.length})`,
      value: weapons.map((w) => `• **${w.name}** (+${w.power} Power)`).join('\n'),
      inline: false,
    });
  }

  if (armors.length > 0) {
    fields.push({
      name: `🛡️ Armor & Shields (${armors.length})`,
      value: armors.map((a) => `• **${a.name}** (+${a.power} Defense)`).join('\n'),
      inline: false,
    });
  }

  if (potions.length > 0) {
    fields.push({
      name: `🧪 Potions & Consumables (${potions.length})`,
      value: potions.map((p) => `• **${p.name}** (+${p.power} HP Effect)`).join('\n'),
      inline: false,
    });
  }

  if (relics.length > 0) {
    fields.push({
      name: `✨ Artifacts & Relics (${relics.length})`,
      value: relics.map((r) => `• **${r.name}** (+${r.power} Power)`).join('\n'),
      inline: false,
    });
  }

  const embed = {
    title: `🎒 ${player.name}'s Adventure Satchel`,
    color: RPG_COLOR,
    description: `Total Items: **${player.inventory.length}** | Gold: 🪙 **${player.gold}**`,
    fields,
    footer: {
      text: 'AiCord RPG • Brave deeper dungeon floors to uncover rarer loot',
    },
  };

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

// ─── Subcommand: /adventure heal ──────────────────────────────────────────────

export async function handleAdventureHealSubcommand(
  token: string,
  guildId: string,
  userId: string,
): Promise<void> {
  const result = await healPlayer(guildId, userId);

  const embed = {
    title: '🍺 The Silver Dragon Tavern',
    color: 0x10b981, // Emerald Green
    description: result.message,
    fields: [
      {
        name: 'Vitals Restored',
        value: renderHpBar(result.player.hp, result.player.maxHp),
        inline: true,
      },
      {
        name: 'Coin Remaining',
        value: `🪙 **${result.player.gold}** Gold`,
        inline: true,
      },
    ],
    footer: {
      text: 'AiCord RPG • Fully rested and prepared for the next descent!',
    },
  };

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

// ─── Subcommand: /adventure leaderboard ───────────────────────────────────────

export async function handleAdventureLeaderboardSubcommand(
  token: string,
  guildId: string,
  options: Array<{ name: string; value: unknown }>,
): Promise<void> {
  const rawLimit = getOption<number>(options, 'limit') ?? 10;
  const limit = Math.max(1, Math.min(25, rawLimit));

  const topPlayers = await getAdventureLeaderboard(guildId, limit);

  if (topPlayers.length === 0) {
    await editInteractionResponse(token, {
      embeds: [
        infoEmbed(
          '🏆 Dungeon Adventure Leaderboard',
          'No adventurers have ventured into the dungeon yet! Be the first by typing `/adventure play`.',
        ),
      ],
    });
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = topPlayers.map((player, idx) => {
    const rankPrefix = medals[idx] ?? `**#${idx + 1}**`;
    const icon = CLASS_ICONS[player.class] ?? '⚔️';
    return `${rankPrefix} ${icon} **${player.name}** — Level **${player.level}** | Floor **${player.dungeon.floor || 1}** | 🪙 **${player.gold}** Gold | 💀 **${player.monstersDefeated}** Slain`;
  });

  const embed = {
    title: '🏆 Guild Adventure Hall of Fame',
    color: 0xf59e0b, // Amber Gold
    description: lines.join('\n\n'),
    footer: {
      text: `Showing top ${topPlayers.length} adventurers • AiCord RPG`,
    },
  };

  await editInteractionResponse(token, {
    embeds: [embed],
  });
}

// ─── Component Interaction Handler ────────────────────────────────────────────

/**
 * Handles interactive button clicks on adventure choice menus (adv_choice:<index> or adv_choice:<userId>:<index>).
 * Validates session ownership and updates dungeon scenario.
 */
export async function handleAdventureComponent(
  token: string,
  customId: string,
  userId: string,
  guildId: string,
  component: APIMessageComponentInteraction,
): Promise<void> {
  const parts = customId.split(':');
  let choiceIndex: number;
  let expectedUserId: string | undefined;

  if (parts.length >= 3) {
    // adv_choice:<userId>:<index>
    expectedUserId = parts[1];
    choiceIndex = parseInt(parts[2], 10);
  } else {
    // adv_choice:<index>
    choiceIndex = parseInt(parts[1], 10);
    expectedUserId = component.message?.interaction?.user?.id;
  }

  // Session ownership security validation
  if (expectedUserId && expectedUserId !== userId) {
    await sendFollowUp(token, {
      embeds: [
        warningEmbed(
          'Unauthorized',
          'Only the adventurer who began this quest can make decisions in this encounter.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (isNaN(choiceIndex)) {
    choiceIndex = 0;
  }

  const result = await processAdventureChoice(guildId, userId, choiceIndex);
  const embed = buildAdventureEmbed(result.player, result.nextScenario, result.outcomeText);
  const actionRow = buildAdventureComponents(result.nextChoices, false, userId);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [actionRow],
  });
}

// ─── Command Definition ───────────────────────────────────────────────────────

export const adventureCommand: RegisteredCommand = {
  name: 'adventure',
  description: 'Embark on dynamic Gemini-powered RPG dungeon quests, fight monsters, and level up',
  category: 'fun',
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'play',
      description: 'Begin or resume your dungeon adventure',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'class',
          description: 'Choose your adventurer class (warrior, mage, rogue, cleric, ranger)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🛡️ Warrior (Balanced, High Defense)', value: 'warrior' },
            { name: '🔮 Mage (High Magic Power)', value: 'mage' },
            { name: '🗡️ Rogue (Critical Strikes & Gold)', value: 'rogue' },
            { name: '✨ Cleric (Holy Armor & Healing)', value: 'cleric' },
            { name: '🏹 Ranger (Agility & Ranged Power)', value: 'ranger' },
          ],
        },
      ],
    },
    {
      name: 'profile',
      description: 'View your or another adventurer\'s stats, level, and equipment',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'Target adventurer to inspect (defaults to self)',
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: 'inventory',
      description: 'Inspect weapons, armor, potions, and relics in your satchel',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'heal',
      description: 'Visit the tavern to rest and restore HP to maximum',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'leaderboard',
      description: 'View the highest-level adventurers in this server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'limit',
          description: 'Number of top adventurers to display (default 10, max 25)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
      ],
    },
  ],
  execute: handleAdventureCommand,
};
