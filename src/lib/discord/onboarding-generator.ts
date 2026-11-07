/**
 * src/lib/discord/onboarding-generator.ts
 * Auto-Deployed Community Guidelines & Onboarding Suite.
 *
 * Generates and automatically deploys styled community guidelines,
 * channel directory maps, and onboarding embeds matching the active server theme.
 */

import { Routes } from 'discord-api-types/v10';
import { getDiscordRest, discordApiCall } from './rest';
import { clampEmbed, type DiscordEmbed } from './embeds';
import { getTheme, formatThemedHeader, type ThemeId } from '@/lib/styles/themes';

export interface DeployOnboardingResult {
  success: boolean;
  messageIds: string[];
  error?: string;
}

/**
 * Builds styled DiscordEmbeds for onboarding, community guidelines, and channel directory.
 *
 * @param serverName Name of the Discord server
 * @param themeId Optional theme ID for colors and ornamentation (defaults to 'cyberpunk')
 */
export function buildOnboardingEmbeds(
  serverName: string,
  themeId?: string | ThemeId,
): DiscordEmbed[] {
  const theme = getTheme(themeId);
  const cleanServerName = serverName?.trim() || 'Community Server';

  const rulesEmbed = clampEmbed({
    color: theme.primaryColor,
    title: formatThemedHeader(theme, 'SERVER RULES & CONDUCT'),
    description:
      `Welcome to **${cleanServerName}**! Please review and uphold our community standards:\n\n` +
      `1️⃣ **Respect Everyone**\n` +
      `Treat all members with courtesy and respect. Harassment, hate speech, bullying, and discrimination are strictly prohibited.\n\n` +
      `2️⃣ **Topical Channels**\n` +
      `Keep discussions in their respective channels. Avoid cluttering general chat with specialized topics or bot commands.\n\n` +
      `3️⃣ **No Spam or Unsolicited Promotion**\n` +
      `No mass advertising, affiliate links, or unsolicited DM solicitations. Self-promotion belongs exclusively in designated showcase channels.\n\n` +
      `4️⃣ **Discord Terms of Service**\n` +
      `Follow the Discord Community Guidelines and Terms of Service at all times.\n\n` +
      `5️⃣ **Moderator Decisions**\n` +
      `Follow staff instructions. Our moderators are here to keep the server safe and welcoming for everyone.`,
    footer: {
      text: `${cleanServerName} • Community Standards`,
    },
  });

  const directoryEmbed = clampEmbed({
    color: theme.accentColor,
    title: formatThemedHeader(theme, 'CHANNEL DIRECTORY'),
    description: `Here is a quick navigational guide to exploring **${cleanServerName}**:`,
    fields: [
      {
        name: '📢 Information Hub',
        value:
          'Check announcement channels for important server bulletins, official events, and community updates.',
        inline: false,
      },
      {
        name: '💬 Community Lounges',
        value:
          'Hang out, introduce yourself, chat with fellow members, and share media in the main discussion channels.',
        inline: false,
      },
      {
        name: '🔊 Voice & Stage Arenas',
        value:
          'Connect with others in dedicated voice rooms, duo/trio squads, or tune into live community stages.',
        inline: false,
      },
      {
        name: '🛡️ Support & Staff Desk',
        value:
          'Reach out to our leadership team or submit a ticket if you ever need moderation assistance or have questions.',
        inline: false,
      },
    ],
    footer: {
      text: `${cleanServerName} • Channel Directory`,
    },
  });

  const guideEmbed = clampEmbed({
    color: theme.primaryColor,
    title: formatThemedHeader(theme, 'GETTING STARTED & FEATURES'),
    description: `Make the most out of your experience in **${cleanServerName}** with these built-in interactive features:`,
    fields: [
      {
        name: '🎨 Profile Customization',
        value:
          'Use `/customize profile` to personalize your rank card aesthetic, bank display, and progress bar themes.',
        inline: true,
      },
      {
        name: '🏆 XP & Progression',
        value:
          'Earn XP by chatting actively in discussions. Check your current level and standing with `/rank` and `/leaderboard`.',
        inline: true,
      },
      {
        name: '🪙 Economy & Rewards',
        value:
          'Claim daily coins with `/daily`, monitor your balance with `/balance`, and check out server shop items using `/shop`.',
        inline: true,
      },
      {
        name: '❓ Interactive Help',
        value:
          'Type `/help` anytime to view the complete catalog of commands, tools, and entertainment options.',
        inline: false,
      },
    ],
    footer: {
      text: `${cleanServerName} • Powered by AiCord Architecture`,
    },
  });

  return [rulesEmbed, directoryEmbed, guideEmbed];
}

/**
 * Automatically deploys the onboarding guidelines embeds into a designated channel.
 *
 * @param guildId Discord guild ID
 * @param targetChannelId Target text channel ID (e.g. #rules or #welcome)
 * @param themeId Optional theme ID
 * @param serverName Optional server name
 */
export async function deployOnboardingGuide(
  guildId: string,
  targetChannelId: string,
  themeId?: string | ThemeId,
  serverName?: string,
): Promise<DeployOnboardingResult> {
  const rest = getDiscordRest();
  const embeds = buildOnboardingEmbeds(serverName ?? 'AiCord Community', themeId);

  try {
    const posted = (await discordApiCall(() =>
      rest.post(Routes.channelMessages(targetChannelId), {
        body: { embeds },
      }),
    )) as { id: string };

    return {
      success: true,
      messageIds: [posted.id],
    };
  } catch (err) {
    console.error(
      `[OnboardingGenerator] Failed to deploy onboarding guide to guild ${guildId} channel ${targetChannelId}:`,
      err,
    );
    return {
      success: false,
      messageIds: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
