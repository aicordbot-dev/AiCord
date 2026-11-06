/**
 * src/lib/games/slots.ts
 * 3-Reel Classic Slot Machine Engine for AiCord.
 *
 * Symbols: 🍒, 🍋, 🍇, 🔔, 💎, 7️⃣
 *
 * Payout Table:
 * - 3x 7s (7️⃣ 7️⃣ 7️⃣) = 25x
 * - 3x Diamonds (💎 💎 💎) = 15x
 * - 3x Bells (🔔 🔔 🔔) = 10x
 * - 3x Fruit (🍒 / 🍋 / 🍇) = 5x
 * - 2x Matching (Any pair) = 2x
 * - No Match = 0x
 */

import type { DiscordEmbed } from '@/lib/discord/embeds';
import { Colors } from '@/lib/discord/embeds';

export type SlotSymbol = '🍒' | '🍋' | '🍇' | '🔔' | '💎' | '7️⃣';

export interface SlotSymbolMeta {
  symbol: SlotSymbol;
  name: string;
  weight: number;
  isFruit: boolean;
}

export const SLOT_SYMBOLS: Record<SlotSymbol, SlotSymbolMeta> = {
  '🍒': { symbol: '🍒', name: 'Cherry', weight: 30, isFruit: true },
  '🍋': { symbol: '🍋', name: 'Lemon', weight: 25, isFruit: true },
  '🍇': { symbol: '🍇', name: 'Grapes', weight: 20, isFruit: true },
  '🔔': { symbol: '🔔', name: 'Bell', weight: 12, isFruit: false },
  '💎': { symbol: '💎', name: 'Diamond', weight: 8, isFruit: false },
  '7️⃣': { symbol: '7️⃣', name: 'Lucky Seven', weight: 5, isFruit: false },
};

const SYMBOL_LIST: SlotSymbolMeta[] = Object.values(SLOT_SYMBOLS);
const TOTAL_WEIGHT: number = SYMBOL_LIST.reduce((acc, curr) => acc + curr.weight, 0);

/**
 * Randomly pick a single symbol based on weighted probabilities.
 */
export function spinSingleReel(rng: () => number = Math.random): SlotSymbol {
  let roll = rng() * TOTAL_WEIGHT;

  for (const item of SYMBOL_LIST) {
    if (roll < item.weight) {
      return item.symbol;
    }
    roll -= item.weight;
  }

  return '🍒';
}

/**
 * Spin all 3 reels.
 */
export function spinReels(
  rng: () => number = Math.random,
): [SlotSymbol, SlotSymbol, SlotSymbol] {
  return [spinSingleReel(rng), spinSingleReel(rng), spinSingleReel(rng)];
}

export type SlotResultType =
  | 'jackpot_777'
  | 'triple_diamond'
  | 'triple_bell'
  | 'triple_fruit'
  | 'pair_match'
  | 'no_match';

export interface SlotsEvaluation {
  multiplier: number;
  payout: number;
  profit: number;
  resultType: SlotResultType;
  title: string;
  message: string;
}

/**
 * Calculate the payout and result type for the 3 reels.
 */
export function calculateSlotsPayout(
  reels: [SlotSymbol, SlotSymbol, SlotSymbol],
  bet = 100,
): SlotsEvaluation {
  const [r1, r2, r3] = reels;

  // 3-of-a-kind matches
  if (r1 === r2 && r2 === r3) {
    if (r1 === '7️⃣') {
      const multiplier = 25;
      const payout = bet * multiplier;
      return {
        multiplier,
        payout,
        profit: payout - bet,
        resultType: 'jackpot_777',
        title: '🚨 JACKPOT! 3x LUCKY 7s! 🚨',
        message: 'Incredible fortune! Three Lucky Sevens struck gold at **25x** payout!',
      };
    }

    if (r1 === '💎') {
      const multiplier = 15;
      const payout = bet * multiplier;
      return {
        multiplier,
        payout,
        profit: payout - bet,
        resultType: 'triple_diamond',
        title: '💎 DIAMOND RUSH! 3x DIAMONDS! 💎',
        message: 'Pure brilliance! Sparkling triple diamonds yielded a **15x** payout!',
      };
    }

    if (r1 === '🔔') {
      const multiplier = 10;
      const payout = bet * multiplier;
      return {
        multiplier,
        payout,
        profit: payout - bet,
        resultType: 'triple_bell',
        title: '🔔 RING THE BELL! 3x BELLS! 🔔',
        message: 'Golden chimes! Three bells awarded a **10x** payout!',
      };
    }

    // 3x Fruits (🍒, 🍋, or 🍇)
    const multiplier = 5;
    const payout = bet * multiplier;
    return {
      multiplier,
      payout,
      profit: payout - bet,
      resultType: 'triple_fruit',
      title: '🍒 FRUIT FRENZY! 3x MATCH! 🍇',
      message: `Fresh harvest! Three matching ${r1} awarded a **5x** payout!`,
    };
  }

  // 2-of-a-kind (Any matching pair)
  if (r1 === r2 || r2 === r3 || r1 === r3) {
    const pairSymbol = r1 === r2 ? r1 : r3;
    const multiplier = 2;
    const payout = bet * multiplier;
    return {
      multiplier,
      payout,
      profit: payout - bet,
      resultType: 'pair_match',
      title: '✨ NICE! 2x MATCH! ✨',
      message: `Two matching ${pairSymbol} saved the day with a **2x** double payout!`,
    };
  }

  // No match
  return {
    multiplier: 0,
    payout: 0,
    profit: -bet,
    resultType: 'no_match',
    title: '😢 No Match',
    message: 'Better luck on your next spin! The reels did not align.',
  };
}

/**
 * Format slot reels into a stylized retro visual cabinet box.
 */
export function formatSlotMachineVisual(reels: [SlotSymbol, SlotSymbol, SlotSymbol]): string {
  return [
    '```',
    '╔═════════════════════════════╗',
    '║        AI-CORD SLOTS        ║',
    '╠═════════════════════════════╣',
    `║     [ ${reels[0]} ] [ ${reels[1]} ] [ ${reels[2]} ]     ║ ◀ PAYLINE`,
    '╚═════════════════════════════╝',
    '```',
  ].join('\n');
}

/**
 * Build rich Discord embed for the slot machine outcome.
 */
export function buildSlotsEmbed(
  reels: [SlotSymbol, SlotSymbol, SlotSymbol],
  payout: number,
  multiplier: number,
  bet = 100,
  userTag?: string,
): DiscordEmbed {
  const evalResult = calculateSlotsPayout(reels, bet);
  const visualCabinet = formatSlotMachineVisual(reels);

  let color: number = Colors.SECONDARY;
  let title = '🎰 Slot Machine';

  if (multiplier >= 25) {
    color = 0xf1c40f; // Radiant Gold
    title = `🎰 Slots — ${evalResult.title}`;
  } else if (multiplier >= 5) {
    color = Colors.SUCCESS;
    title = `🎰 Slots — ${evalResult.title}`;
  } else if (multiplier >= 2) {
    color = 0x2ecc71; // Emerald Green
    title = `🎰 Slots — ${evalResult.title}`;
  } else {
    color = Colors.DANGER;
    title = '🎰 Slots — Better Luck Next Time!';
  }

  const profit = payout - bet;
  const profitText =
    profit > 0
      ? `+${profit.toLocaleString()}`
      : profit === 0
        ? '0'
        : `-${bet.toLocaleString()}`;

  const fields = [
    {
      name: 'Bet',
      value: `🪙 **${bet.toLocaleString()}** credits`,
      inline: true,
    },
    {
      name: 'Multiplier',
      value: `⚡ **${multiplier}x**`,
      inline: true,
    },
    {
      name: 'Total Payout',
      value: `🪙 **${payout.toLocaleString()}** credits (${profitText})`,
      inline: true,
    },
    {
      name: 'Paytable Guide',
      value: '`7️⃣ 7️⃣ 7️⃣` = **25x** | `💎 💎 💎` = **15x**\n`🔔 🔔 🔔` = **10x** | `🍒 🍒 🍒` = **5x**\n`Any 2 Match` = **2x**',
      inline: false,
    },
  ];

  if (userTag) {
    fields.unshift({
      name: 'Player',
      value: userTag,
      inline: true,
    });
  }

  return {
    title,
    description: `${visualCabinet}\n### ${evalResult.message}`,
    color,
    fields,
    footer: {
      text: 'Spin again anytime with /slots!',
    },
    timestamp: new Date().toISOString(),
  };
}
