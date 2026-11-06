/**
 * src/lib/games/rps.ts
 * Rock Paper Scissors Game Engine for AiCord.
 *
 * Features:
 * - Deterministic outcome evaluation matrix (win, loss, tie).
 * - Choice metadata with emojis and battle descriptions.
 * - Embed builder supporting interactive pending and resolved game states.
 * - Interactive action row with Rock, Paper, Scissors buttons.
 */

import type { DiscordEmbed } from '@/lib/discord/embeds';
import { Colors } from '@/lib/discord/embeds';
import type { DiscordActionRowComponent } from './types';

export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type RpsResult = 'win' | 'loss' | 'tie';

export interface RpsChoiceInfo {
  id: RpsChoice;
  label: string;
  emoji: string;
  beats: RpsChoice;
  verb: string;
}

export const RPS_CHOICES: Record<RpsChoice, RpsChoiceInfo> = {
  rock: {
    id: 'rock',
    label: 'Rock',
    emoji: '🪨',
    beats: 'scissors',
    verb: 'crushes',
  },
  paper: {
    id: 'paper',
    label: 'Paper',
    emoji: '📄',
    beats: 'rock',
    verb: 'covers',
  },
  scissors: {
    id: 'scissors',
    label: 'Scissors',
    emoji: '✂️',
    beats: 'paper',
    verb: 'cuts',
  },
};

const CHOICES_ARRAY: RpsChoice[] = ['rock', 'paper', 'scissors'];

/**
 * Get a random RPS choice with optional RNG.
 */
export function getRandomRpsChoice(rng: () => number = Math.random): RpsChoice {
  const index = Math.floor(rng() * CHOICES_ARRAY.length);
  return CHOICES_ARRAY[index];
}

/**
 * Evaluates the outcome between the player and the bot.
 */
export function evaluateRps(player: RpsChoice, bot: RpsChoice): RpsResult {
  if (player === bot) {
    return 'tie';
  }

  if (RPS_CHOICES[player].beats === bot) {
    return 'win';
  }

  return 'loss';
}

/**
 * Get human-readable matchup narrative.
 */
export function getRpsMatchupMessage(
  player: RpsChoice,
  bot: RpsChoice,
  result: RpsResult,
): string {
  const pInfo = RPS_CHOICES[player];
  const bInfo = RPS_CHOICES[bot];

  if (result === 'tie') {
    return `Both players chose ${pInfo.emoji} **${pInfo.label}**! It's an evenly matched standoff.`;
  }

  if (result === 'win') {
    return `${pInfo.emoji} **${pInfo.label}** ${pInfo.verb} ${bInfo.emoji} **${bInfo.label}**! You emerge victorious.`;
  }

  return `${bInfo.emoji} **${bInfo.label}** ${bInfo.verb} ${pInfo.emoji} **${pInfo.label}**! The bot takes the round.`;
}

export interface BuildRpsEmbedOptions {
  playerChoice?: RpsChoice;
  botChoice?: RpsChoice;
  result?: RpsResult;
  userTag?: string;
}

/**
 * Build rich Discord embed for RPS game.
 */
export function buildRpsEmbed(options: BuildRpsEmbedOptions = {}): DiscordEmbed {
  const { playerChoice, botChoice, result, userTag } = options;
  const isResolved = playerChoice && botChoice && result;

  if (!isResolved) {
    return {
      title: '🪨📄✂️ Rock Paper Scissors',
      description: '### Choose your move below!\nWill you pick **Rock**, **Paper**, or **Scissors**?',
      color: Colors.PRIMARY,
      fields: [
        {
          name: 'Rules',
          value: '🪨 **Rock** beats ✂️ **Scissors**\n📄 **Paper** beats 🪨 **Rock**\n✂️ **Scissors** beats 📄 **Paper**',
          inline: false,
        },
      ],
      footer: {
        text: 'Select your weapon within 60 seconds! Only the challenger can click.',
      },
      timestamp: new Date().toISOString(),
    };
  }

  const pInfo = RPS_CHOICES[playerChoice];
  const bInfo = RPS_CHOICES[botChoice];
  const narrative = getRpsMatchupMessage(playerChoice, botChoice, result);

  let title = '🪨📄✂️ Rock Paper Scissors';
  let color: number = Colors.PRIMARY;

  if (result === 'win') {
    title = '🪨📄✂️ Rock Paper Scissors — You Won! 🎉';
    color = Colors.SUCCESS;
  } else if (result === 'loss') {
    title = '🪨📄✂️ Rock Paper Scissors — Bot Won! 💀';
    color = Colors.DANGER;
  } else {
    title = '🪨📄✂️ Rock Paper Scissors — Tie Game! 🤝';
    color = Colors.WARNING;
  }

  return {
    title,
    description: `### ${narrative}`,
    color,
    fields: [
      {
        name: `${userTag ? `${userTag}'s` : 'Your'} Choice`,
        value: `${pInfo.emoji} **${pInfo.label}**`,
        inline: true,
      },
      {
        name: 'AiCord Choice',
        value: `${bInfo.emoji} **${bInfo.label}**`,
        inline: true,
      },
      {
        name: 'Round Outcome',
        value:
          result === 'win'
            ? '🏆 **Victory**'
            : result === 'loss'
              ? '💀 **Defeat**'
              : '🤝 **Standoff**',
        inline: true,
      },
    ],
    footer: {
      text: 'Game ended. Challenge again with /rps',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build interactive action row with Rock, Paper, Scissors buttons.
 */
export function buildRpsActionRow(
  gameId: string,
  disabled = false,
  selectedChoice?: RpsChoice,
): DiscordActionRowComponent {
  return {
    type: 1,
    components: CHOICES_ARRAY.map((choice) => {
      const info = RPS_CHOICES[choice];
      const isSelected = selectedChoice === choice;

      return {
        type: 2 as const,
        style: isSelected ? 3 : 1, // Success (green) if chosen, Primary (blurple) otherwise
        label: info.label,
        custom_id: `game_rps:${gameId}:${choice}`,
        emoji: { name: info.emoji },
        disabled,
      };
    }),
  };
}
