/**
 * src/lib/games/coinflip.ts
 * Coin Flip Game Engine with Streak Tracking for AiCord.
 *
 * Features:
 * - Heads or Tails flipping with deterministic or randomized outcomes.
 * - Win streak counter with dynamic flame indicators.
 * - Optional bet doubling payout calculation.
 * - Rich Discord embed builder.
 */

import type { DiscordEmbed } from '@/lib/discord/embeds';
import { Colors } from '@/lib/discord/embeds';

export type CoinSide = 'heads' | 'tails';

export interface CoinflipResult {
  result: CoinSide;
  guess: CoinSide;
  won: boolean;
  newStreak: number;
  bet: number;
  payout: number;
  profit: number;
}

/**
 * Flip the coin to heads or tails.
 */
export function flipCoin(rng: () => number = Math.random): CoinSide {
  return rng() < 0.5 ? 'heads' : 'tails';
}

/**
 * Evaluates the coin flip guess against the flip result and calculates streak & payout.
 */
export function evaluateCoinflip(
  guess: string,
  currentStreak = 0,
  bet = 0,
  rng: () => number = Math.random,
): CoinflipResult {
  const normalizedGuess: CoinSide =
    guess.trim().toLowerCase() === 'tails' ? 'tails' : 'heads';
  const result = flipCoin(rng);
  const won = normalizedGuess === result;

  const newStreak = won ? currentStreak + 1 : 0;
  const payout = won ? bet * 2 : 0;
  const profit = won ? bet : -bet;

  return {
    result,
    guess: normalizedGuess,
    won,
    newStreak,
    bet,
    payout,
    profit,
  };
}

/**
 * Format streak display with dynamic flame emojis.
 */
export function formatStreakText(streak: number, won: boolean): string {
  if (!won) {
    return '0 *(streak ended)*';
  }

  if (streak >= 10) {
    return `🔥🔥🔥 **${streak} In A Row!** *(UNSTOPPABLE)*`;
  }
  if (streak >= 5) {
    return `🔥🔥 **${streak} In A Row!** *(ON FIRE)*`;
  }
  if (streak >= 2) {
    return `🔥 **${streak} In A Row!**`;
  }
  return `**1** *(started)*`;
}

/**
 * Build rich Discord embed for coin flip outcome.
 */
export function buildCoinflipEmbed(
  guess: CoinSide,
  result: CoinSide,
  streak: number,
  bet = 0,
  userTag?: string,
): DiscordEmbed {
  const won = guess === result;
  const guessName = guess === 'heads' ? '🪙 Heads' : '🪙 Tails';
  const resultName = result === 'heads' ? '🪙 Heads' : '🪙 Tails';
  const streakText = formatStreakText(streak, won);

  let title: string;
  let color: number;
  let description: string;

  if (won) {
    title = '🪙 Coinflip — You Won! 🎉';
    color = Colors.SUCCESS;
    description = `The coin landed on **${result.toUpperCase()}**! Your guess of **${guess.toUpperCase()}** was right on the money.`;
  } else {
    title = '🪙 Coinflip — Better Luck Next Time! 💀';
    color = Colors.DANGER;
    description = `The coin landed on **${result.toUpperCase()}**! Your guess was **${guess.toUpperCase()}**.`;
  }

  const fields = [
    {
      name: 'Your Call',
      value: guessName,
      inline: true,
    },
    {
      name: 'Coin Landed On',
      value: resultName,
      inline: true,
    },
    {
      name: 'Win Streak',
      value: streakText,
      inline: true,
    },
  ];

  if (bet > 0) {
    const payout = won ? bet * 2 : 0;
    const profit = won ? bet : -bet;
    const profitText = won ? `+${profit.toLocaleString()}` : `-${bet.toLocaleString()}`;

    fields.push(
      {
        name: 'Wager',
        value: `🪙 **${bet.toLocaleString()}** credits`,
        inline: true,
      },
      {
        name: 'Payout',
        value: `🪙 **${payout.toLocaleString()}** credits (${profitText})`,
        inline: true,
      },
    );
  }

  if (userTag) {
    fields.unshift({
      name: 'Flipper',
      value: userTag,
      inline: true,
    });
  }

  return {
    title,
    description: `### ${description}`,
    color,
    fields,
    footer: {
      text: 'Flip again anytime with /coinflip [guess] [bet]!',
    },
    timestamp: new Date().toISOString(),
  };
}
