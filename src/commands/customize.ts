/**
 * src/commands/customize.ts
 * Slash Command & Interactive Component Handlers for AiCord Customization Suite.
 *
 * Implements:
 * - /customize profile [rank_theme] [balance_theme] [bar_style]
 * - /customize preview [theme] (live interactive showcase with button cycling)
 * - /customize server-theme [theme] (requires MANAGE_GUILD)
 * - Autocomplete for themes and bar styles
 * - Component interaction handler `handleCustomizeInteraction`
 */

import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ComponentType,
  type APIChatInputApplicationCommandInteraction,
  type APIEmbed,
} from 'discord-api-types/v10';
import type { RegisteredCommand, AutocompleteContext } from '@/lib/discord/command-registry';
import { editInteractionResponse } from '@/lib/discord/interaction-response';
import { errorEmbed } from '@/lib/discord/embeds';
import { PermissionFlags, hasPermission } from '@/lib/discord/permissions';
import {
  getTheme,
  isValidTheme,
  isValidBarStyle,
  renderThemedProgressBar,
  formatThemedHeader,
  THEME_CHOICES,
  BAR_STYLE_CHOICES,
  type ThemeId,
  type ThemeConfig,
} from '@/lib/styles/themes';
import {
  getUserProfileStyle,
  updateUserProfileStyle,
  setServerTheme,
  type UserProfileStyleData,
} from '@/lib/styles/user-profile-style';
import type { DiscordActionRowComponent } from '@/lib/engines/pagination';

export const THEME_ORDER: ThemeId[] = [
  'cyberpunk',
  'midnight',
  'emerald',
  'gold',
  'retro',
  'frost',
];

// ─── Option Retrieval Helper ──────────────────────────────────────────────────

function getOption<T = unknown>(
  options: Array<{ name: string; value?: unknown; options?: unknown[] }> | undefined,
  name: string,
): T | undefined {
  if (!options) return undefined;
  const match = options.find((o) => o.name === name);
  return match ? (match.value as T) : undefined;
}

// ─── Embed & Button Builders ──────────────────────────────────────────────────

export function buildThemePreviewEmbed(theme: ThemeConfig): APIEmbed {
  const hexPrimary = `#${theme.primaryColor.toString(16).padStart(6, '0').toUpperCase()}`;
  const hexAccent = `#${theme.accentColor.toString(16).padStart(6, '0').toUpperCase()}`;

  return {
    title: `${theme.icon} Theme Showcase — ${theme.name}`,
    description:
      `**${theme.description}**\n\n` +
      `**Header Ornamentation:**\n\`${theme.header}\`\n\n` +
      `**Custom Title Sample:**\n${formatThemedHeader(theme, 'SYSTEM STATUS OK')}`,
    color: theme.primaryColor,
    fields: [
      {
        name: '🎨 Primary Color',
        value: `\`${hexPrimary}\``,
        inline: true,
      },
      {
        name: '✨ Accent Color',
        value: `\`${hexAccent}\``,
        inline: true,
      },
      {
        name: '📊 Bar Style',
        value: `\`${theme.barStyle}\``,
        inline: true,
      },
      {
        name: '📈 Progress at 35%',
        value: renderThemedProgressBar(35, theme.barStyle, 12),
        inline: false,
      },
      {
        name: '🚀 Progress at 80%',
        value: renderThemedProgressBar(80, theme.barStyle, 12),
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord Universal Custom Screens • Use the buttons below to cycle themes or apply to profile',
    },
  };
}

export function buildThemePreviewActionRows(currentThemeId: ThemeId): DiscordActionRowComponent[] {
  const currentIndex = THEME_ORDER.indexOf(currentThemeId);
  const safeIdx = currentIndex >= 0 ? currentIndex : 0;
  const prevTheme = THEME_ORDER[(safeIdx - 1 + THEME_ORDER.length) % THEME_ORDER.length];
  const nextTheme = THEME_ORDER[(safeIdx + 1) % THEME_ORDER.length];

  // Row 1: Navigation and Apply
  const navRow: DiscordActionRowComponent = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        custom_id: `customize:preview:${prevTheme}`,
        label: '◀ Previous',
        style: ButtonStyle.Secondary,
      },
      {
        type: ComponentType.Button,
        custom_id: `customize:preview:${nextTheme}`,
        label: 'Next ▶',
        style: ButtonStyle.Secondary,
      },
      {
        type: ComponentType.Button,
        custom_id: `customize:set_rank:${currentThemeId}`,
        label: '🎨 Apply to Rank',
        style: ButtonStyle.Success,
      },
      {
        type: ComponentType.Button,
        custom_id: `customize:set_bal:${currentThemeId}`,
        label: '🪙 Apply to Balance',
        style: ButtonStyle.Success,
      },
    ],
  };

  // Row 2: Direct Jump Theme Buttons (Cyberpunk, Midnight, Emerald)
  const themeRow1: DiscordActionRowComponent = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        custom_id: 'customize:preview:cyberpunk',
        label: '⚡ Cyberpunk',
        style: currentThemeId === 'cyberpunk' ? ButtonStyle.Primary : ButtonStyle.Secondary,
      },
      {
        type: ComponentType.Button,
        custom_id: 'customize:preview:midnight',
        label: '🌙 Midnight',
        style: currentThemeId === 'midnight' ? ButtonStyle.Primary : ButtonStyle.Secondary,
      },
      {
        type: ComponentType.Button,
        custom_id: 'customize:preview:emerald',
        label: '🌿 Emerald',
        style: currentThemeId === 'emerald' ? ButtonStyle.Primary : ButtonStyle.Secondary,
      },
    ],
  };

  // Row 3: Direct Jump Theme Buttons (Gold, Retro, Frost)
  const themeRow2: DiscordActionRowComponent = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        custom_id: 'customize:preview:gold',
        label: '🪙 Gold',
        style: currentThemeId === 'gold' ? ButtonStyle.Primary : ButtonStyle.Secondary,
      },
      {
        type: ComponentType.Button,
        custom_id: 'customize:preview:retro',
        label: '🕹️ Retro',
        style: currentThemeId === 'retro' ? ButtonStyle.Primary : ButtonStyle.Secondary,
      },
      {
        type: ComponentType.Button,
        custom_id: 'customize:preview:frost',
        label: '❄️ Frost',
        style: currentThemeId === 'frost' ? ButtonStyle.Primary : ButtonStyle.Secondary,
      },
    ],
  };

  return [navRow, themeRow1, themeRow2];
}

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

export async function handleCustomizeProfileSubcommand(
  token: string,
  guildId: string,
  userId: string,
  subOptions?: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const rankThemeOpt = getOption<string>(subOptions, 'rank_theme');
  const balanceThemeOpt = getOption<string>(subOptions, 'balance_theme');
  const barStyleOpt = getOption<string>(subOptions, 'bar_style');

  const hasUpdates =
    rankThemeOpt !== undefined || balanceThemeOpt !== undefined || barStyleOpt !== undefined;

  // View current profile style
  if (!hasUpdates) {
    const style = await getUserProfileStyle(guildId, userId);
    const rankThemeConfig = getTheme(style.rankTheme);
    const balanceThemeConfig = getTheme(style.balanceTheme);

    const embed: APIEmbed = {
      title: '🎨 Personal Profile Style',
      description: 'Your current visual customization preferences for screens across this server.',
      color: rankThemeConfig.primaryColor,
      fields: [
        {
          name: '🏆 Rank Card Theme',
          value:
            `**${rankThemeConfig.name}** (\`${style.rankTheme}\`)\n` +
            `${formatThemedHeader(rankThemeConfig, 'RANK CARD')}`,
          inline: false,
        },
        {
          name: '🪙 Balance & Economy Theme',
          value:
            `**${balanceThemeConfig.name}** (\`${style.balanceTheme}\`)\n` +
            `${formatThemedHeader(balanceThemeConfig, 'WALLET')}`,
          inline: false,
        },
        {
          name: '📊 Progress Bar Style',
          value: `\`${style.barStyle}\`\n${renderThemedProgressBar(60, style.barStyle, 12)}`,
          inline: false,
        },
        {
          name: '🎖️ Badges',
          value:
            style.badges && style.badges.length > 0
              ? style.badges.map((b) => `\`${b}\``).join(' ')
              : '*None equipped*',
          inline: false,
        },
      ],
      footer: {
        text: 'Customize anytime with /customize profile [rank_theme] [balance_theme] [bar_style]',
      },
    };

    await editInteractionResponse(token, { embeds: [embed] });
    return;
  }

  // Validate inputs
  if (rankThemeOpt && !isValidTheme(rankThemeOpt)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Theme',
          `Unknown rank theme "${rankThemeOpt}". Choose from: cyberpunk, midnight, emerald, gold, retro, frost.`,
        ),
      ],
    });
    return;
  }

  if (balanceThemeOpt && !isValidTheme(balanceThemeOpt)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Theme',
          `Unknown balance theme "${balanceThemeOpt}". Choose from: cyberpunk, midnight, emerald, gold, retro, frost.`,
        ),
      ],
    });
    return;
  }

  if (barStyleOpt && !isValidBarStyle(barStyleOpt)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Bar Style',
          `Unknown bar style "${barStyleOpt}". Choose from: pipes, blocks, squares, retro.`,
        ),
      ],
    });
    return;
  }

  const updates: Partial<UserProfileStyleData> = {};
  if (rankThemeOpt) updates.rankTheme = rankThemeOpt.toLowerCase().trim();
  if (balanceThemeOpt) updates.balanceTheme = balanceThemeOpt.toLowerCase().trim();
  if (barStyleOpt) updates.barStyle = barStyleOpt.toLowerCase().trim();

  const updated = await updateUserProfileStyle(guildId, userId, updates);
  const rankThemeConfig = getTheme(updated.rankTheme);
  const balanceThemeConfig = getTheme(updated.balanceTheme);

  const embed: APIEmbed = {
    title: '✨ Profile Style Updated',
    description: 'Your profile visual preferences have been successfully updated!',
    color: rankThemeConfig.primaryColor,
    fields: [
      {
        name: '🏆 Rank Card Theme',
        value: `**${rankThemeConfig.name}** (\`${updated.rankTheme}\`)`,
        inline: true,
      },
      {
        name: '🪙 Balance Theme',
        value: `**${balanceThemeConfig.name}** (\`${updated.balanceTheme}\`)`,
        inline: true,
      },
      {
        name: '📊 Bar Style',
        value: `\`${updated.barStyle}\``,
        inline: true,
      },
      {
        name: '👁️ Live Progress Preview',
        value: renderThemedProgressBar(75, updated.barStyle, 14),
        inline: false,
      },
    ],
    footer: {
      text: 'AiCord Universal Custom Screens Suite',
    },
  };

  await editInteractionResponse(token, { embeds: [embed] });
}

export async function handleCustomizePreviewSubcommand(
  token: string,
  subOptions?: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const themeOpt = getOption<string>(subOptions, 'theme');
  const themeId = (themeOpt && isValidTheme(themeOpt) ? themeOpt.toLowerCase().trim() : 'cyberpunk') as ThemeId;
  const config = getTheme(themeId);

  const embed = buildThemePreviewEmbed(config);
  const components = buildThemePreviewActionRows(themeId);

  await editInteractionResponse(token, {
    embeds: [embed],
    components,
  });
}

export async function handleCustomizeServerThemeSubcommand(
  token: string,
  guildId: string,
  interaction: APIChatInputApplicationCommandInteraction,
  subOptions?: Array<{ name: string; value?: unknown }>,
): Promise<void> {
  const memberPerms = interaction.member?.permissions ?? '0';
  if (!hasPermission(memberPerms, PermissionFlags.MANAGE_GUILD)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Permission Denied',
          'You need the **Manage Server** (`MANAGE_GUILD`) permission to configure the server theme.',
        ),
      ],
    });
    return;
  }

  const themeOpt = getOption<string>(subOptions, 'theme');
  if (!themeOpt || !isValidTheme(themeOpt)) {
    await editInteractionResponse(token, {
      embeds: [
        errorEmbed(
          'Invalid Theme',
          'Please specify a valid server theme: cyberpunk, midnight, emerald, gold, retro, frost.',
        ),
      ],
    });
    return;
  }

  const themeKey = themeOpt.toLowerCase().trim();
  await setServerTheme(guildId, themeKey);
  const themeConfig = getTheme(themeKey);

  const embed: APIEmbed = {
    title: '🏛️ Server Default Theme Updated',
    description:
      `The default visual theme for this server has been set to **${themeConfig.name}**!\n\n` +
      `**Preview Header:**\n${formatThemedHeader(themeConfig, 'SERVER NOTICE')}\n\n` +
      `**Sample Progress:**\n${renderThemedProgressBar(100, themeConfig.barStyle, 12)}`,
    color: themeConfig.primaryColor,
    footer: {
      text: 'AiCord Universal Custom Screens Suite',
    },
  };

  await editInteractionResponse(token, { embeds: [embed] });
}

// ─── Main Slash Command Execution ─────────────────────────────────────────────

export async function executeCustomizeCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const guildId = interaction.guild_id ?? '';
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const token = interaction.token;

  const options = interaction.data.options as Array<{
    name: string;
    options?: Array<{ name: string; value?: unknown }>;
  }> | undefined;

  const subcommand = options?.[0];
  const subOptions = subcommand?.options;

  switch (subcommand?.name) {
    case 'profile':
      await handleCustomizeProfileSubcommand(token, guildId, userId, subOptions);
      break;
    case 'preview':
      await handleCustomizePreviewSubcommand(token, subOptions);
      break;
    case 'server-theme':
      await handleCustomizeServerThemeSubcommand(token, guildId, interaction, subOptions);
      break;
    default:
      await handleCustomizePreviewSubcommand(token, subOptions);
      break;
  }
}

// ─── Component Interaction Handler ────────────────────────────────────────────

export async function handleCustomizeInteraction(
  token: string,
  rest: string[],
  userId: string,
  component?: unknown,
): Promise<void> {
  const guildId =
    (component as { guild_id?: string } | undefined)?.guild_id ?? '';

  const action = rest[0];

  if (action === 'preview') {
    let targetTheme = rest[1] as ThemeId;
    if (rest[1] === 'prev' || rest[1] === 'next') {
      const current = (rest[2] as ThemeId) ?? 'cyberpunk';
      const curIdx = THEME_ORDER.indexOf(current);
      const safeIdx = curIdx >= 0 ? curIdx : 0;
      targetTheme =
        rest[1] === 'prev'
          ? THEME_ORDER[(safeIdx - 1 + THEME_ORDER.length) % THEME_ORDER.length]
          : THEME_ORDER[(safeIdx + 1) % THEME_ORDER.length];
    }

    const config = getTheme(targetTheme);
    const embed = buildThemePreviewEmbed(config);
    const components = buildThemePreviewActionRows(config.id);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
    return;
  }

  if (action === 'set_rank') {
    const targetTheme = (rest[1] as ThemeId) ?? 'cyberpunk';
    await updateUserProfileStyle(guildId, userId, { rankTheme: targetTheme });
    const config = getTheme(targetTheme);

    const embed = buildThemePreviewEmbed(config);
    embed.fields = [
      ...(embed.fields ?? []),
      {
        name: '✅ Rank Card Updated',
        value: `Your rank card theme has been set to **${config.name}**!`,
        inline: false,
      },
    ];
    const components = buildThemePreviewActionRows(config.id);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
    return;
  }

  if (action === 'set_bal') {
    const targetTheme = (rest[1] as ThemeId) ?? 'gold';
    await updateUserProfileStyle(guildId, userId, { balanceTheme: targetTheme });
    const config = getTheme(targetTheme);

    const embed = buildThemePreviewEmbed(config);
    embed.fields = [
      ...(embed.fields ?? []),
      {
        name: '✅ Balance Theme Updated',
        value: `Your balance display theme has been set to **${config.name}**!`,
        inline: false,
      },
    ];
    const components = buildThemePreviewActionRows(config.id);

    await editInteractionResponse(token, {
      embeds: [embed],
      components,
    });
    return;
  }

  // Fallback to previewing default theme
  const config = getTheme('cyberpunk');
  await editInteractionResponse(token, {
    embeds: [buildThemePreviewEmbed(config)],
    components: buildThemePreviewActionRows('cyberpunk'),
  });
}

// ─── Autocomplete Handler ─────────────────────────────────────────────────────

export async function handleCustomizeAutocomplete(
  ctx: AutocompleteContext,
): Promise<Array<{ name: string; value: string | number }>> {
  const optionName = ctx.focusedOption.name;
  const query = (ctx.focusedOption.value ?? '').toLowerCase().trim();

  if (optionName === 'theme' || optionName === 'rank_theme' || optionName === 'balance_theme') {
    if (!query) {
      return THEME_CHOICES;
    }
    return THEME_CHOICES.filter(
      (c) => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query),
    );
  }

  if (optionName === 'bar_style') {
    if (!query) {
      return BAR_STYLE_CHOICES;
    }
    return BAR_STYLE_CHOICES.filter(
      (c) => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query),
    );
  }

  return [];
}

// ─── Registered Command Definition ────────────────────────────────────────────

export const customizeCommand: RegisteredCommand = {
  name: 'customize',
  description: 'Customize visual themes, progress bar styles, and profile screen aesthetics',
  category: 'utility',
  options: [
    {
      name: 'profile',
      description: 'View or customize your personal profile styling and progress bar aesthetics',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'rank_theme',
          description: 'Theme for your rank card and level displays',
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true,
        },
        {
          name: 'balance_theme',
          description: 'Theme for your economy and balance displays',
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true,
        },
        {
          name: 'bar_style',
          description: 'Character set style for visual progress bars',
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      name: 'preview',
      description: 'Live interactive showcase with buttons to cycle and preview all themes',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'theme',
          description: 'Theme to preview',
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      name: 'server-theme',
      description: 'Set default theme for the entire server (Requires Manage Server)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'theme',
          description: 'Theme to set as server default',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],
  execute: executeCustomizeCommand,
  autocomplete: handleCustomizeAutocomplete,
  rateLimit: { limit: 5, windowMs: 10_000 },
};
