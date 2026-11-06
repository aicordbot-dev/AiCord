/**
 * src/lib/games/blackjack.ts
 * Standard 52-Card Blackjack Engine for AiCord.
 *
 * Rules:
 * - 52-card standard deck (A, 2-10, J, Q, K across 4 suits).
 * - Ace counts as 11 or 1 dynamically (soft vs hard hands).
 * - Blackjack on initial deal pays 3:2.
 * - Dealer hits on soft 17 and stands on hard 17+.
 * - Visual Unicode cards (🂡, 🂱, 🃁, 🃑, etc.) with clean ASCII labels.
 * - Interactive action row with Hit, Stand, Double Down.
 */

import type { DiscordEmbed } from '@/lib/discord/embeds';
import { Colors } from '@/lib/discord/embeds';
import type { DiscordActionRowComponent } from './types';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  visual: string;
  name: string;
}

export interface HandValue {
  total: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export type BlackjackOutcome =
  | 'blackjack'
  | 'win'
  | 'dealer_bust'
  | 'bust'
  | 'loss'
  | 'push';

// ─── Unicode Playing Cards Mapping ──────────────────────────────────────────

const UNICODE_CARDS: Record<Suit, Record<Rank, string>> = {
  spades: {
    A: '🂡',
    '2': '🂢',
    '3': '🂣',
    '4': '🂤',
    '5': '🂥',
    '6': '🂦',
    '7': '🂧',
    '8': '🂨',
    '9': '🂩',
    '10': '🂪',
    J: '🂫',
    Q: '🂭',
    K: '🂮',
  },
  hearts: {
    A: '🂱',
    '2': '🂲',
    '3': '🂳',
    '4': '🂴',
    '5': '🂵',
    '6': '🂶',
    '7': '🂷',
    '8': '🂸',
    '9': '🂹',
    '10': '🂺',
    J: '🂻',
    Q: '🂽',
    K: '🂾',
  },
  diamonds: {
    A: '🃁',
    '2': '🃂',
    '3': '🃃',
    '4': '🃄',
    '5': '🃅',
    '6': '🃆',
    '7': '🃇',
    '8': '🃈',
    '9': '🃉',
    '10': '🃊',
    J: '🃋',
    Q: '🃍',
    K: '🃎',
  },
  clubs: {
    A: '🃑',
    '2': '🃒',
    '3': '🃓',
    '4': '🃔',
    '5': '🃕',
    '6': '🃖',
    '7': '🃗',
    '8': '🃘',
    '9': '🃙',
    '10': '🃚',
    J: '🃛',
    Q: '🃝',
    K: '🃞',
  },
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

/**
 * Creates a fresh, standard 52-card deck.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = 10;
      if (rank === 'A') {
        value = 11;
      } else if (
        rank === '2' ||
        rank === '3' ||
        rank === '4' ||
        rank === '5' ||
        rank === '6' ||
        rank === '7' ||
        rank === '8' ||
        rank === '9' ||
        rank === '10'
      ) {
        value = parseInt(rank, 10);
      }

      deck.push({
        suit,
        rank,
        value,
        visual: UNICODE_CARDS[suit][rank],
        name: `[${rank}${SUIT_SYMBOLS[suit]}]`,
      });
    }
  }

  return deck;
}

/**
 * Shuffle an array of cards using Fisher-Yates with optional RNG.
 */
export function shuffleDeck(
  deck: Card[],
  rng: () => number = Math.random,
): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate the hand score, handling Aces dynamically (11 vs 1).
 */
export function calculateHandValue(cards: Card[]): HandValue {
  let total = 0;
  let aceCount = 0;

  for (const card of cards) {
    total += card.value;
    if (card.rank === 'A') {
      aceCount++;
    }
  }

  // Reduce Aces from 11 to 1 as long as total > 21
  let softAces = aceCount;
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces--;
  }

  const isBust = total > 21;
  const isSoft = softAces > 0 && !isBust;
  const isBlackjack = cards.length === 2 && total === 21;

  return {
    total,
    isSoft,
    isBust,
    isBlackjack,
  };
}

/**
 * Simulates dealer play according to casino rules:
 * Dealer hits on soft 17 (total = 17 with an Ace counted as 11)
 * Dealer stands on hard 17 and any total of 18 through 21.
 * Dealer stops if bust (total > 21).
 */
export function dealerPlay(
  dealerCards: Card[],
  deck: Card[],
): { dealerCards: Card[]; remainingDeck: Card[] } {
  const currentHand = [...dealerCards];
  const remainingDeck = [...deck];

  while (true) {
    const value = calculateHandValue(currentHand);

    // Stop if bust
    if (value.isBust) {
      break;
    }

    // Hit if under 17
    if (value.total < 17) {
      if (remainingDeck.length === 0) break;
      currentHand.push(remainingDeck.shift()!);
      continue;
    }

    // Soft 17 rule: hit on soft 17
    if (value.total === 17 && value.isSoft) {
      if (remainingDeck.length === 0) break;
      currentHand.push(remainingDeck.shift()!);
      continue;
    }

    // Stand on hard 17 or any 18+
    break;
  }

  return {
    dealerCards: currentHand,
    remainingDeck,
  };
}

/**
 * Evaluate the game outcome comparing player and dealer hands.
 */
export function evaluateBlackjackResult(
  playerHand: Card[],
  dealerHand: Card[],
): { outcome: BlackjackOutcome; message: string; multiplier: number } {
  const player = calculateHandValue(playerHand);
  const dealer = calculateHandValue(dealerHand);

  // Player bust
  if (player.isBust) {
    return {
      outcome: 'bust',
      message: '💥 **Bust!** Your hand exceeded 21.',
      multiplier: 0,
    };
  }

  // Natural Blackjack check
  if (player.isBlackjack) {
    if (dealer.isBlackjack) {
      return {
        outcome: 'push',
        message: '🤝 **Push!** Both you and the dealer got Blackjack.',
        multiplier: 1,
      };
    }
    return {
      outcome: 'blackjack',
      message: '🎉 **Blackjack!** Natural 21 dealt! (3:2 Payout)',
      multiplier: 2.5, // Return original bet + 1.5x bet
    };
  }

  // Dealer has blackjack when player doesn't
  if (dealer.isBlackjack) {
    return {
      outcome: 'loss',
      message: '💀 **Dealer Blackjack!** Dealer reveals natural 21.',
      multiplier: 0,
    };
  }

  // Dealer busts
  if (dealer.isBust) {
    return {
      outcome: 'dealer_bust',
      message: '🏆 **Dealer Busts!** Dealer went over 21. You win!',
      multiplier: 2, // Return bet + 1x win
    };
  }

  // Numerical comparison
  if (player.total > dealer.total) {
    return {
      outcome: 'win',
      message: `🏆 **You Win!** Your ${player.total} beats dealer's ${dealer.total}.`,
      multiplier: 2,
    };
  }

  if (player.total < dealer.total) {
    return {
      outcome: 'loss',
      message: `💀 **Dealer Wins.** Dealer's ${dealer.total} beats your ${player.total}.`,
      multiplier: 0,
    };
  }

  return {
    outcome: 'push',
    message: `🤝 **Push!** Both hands tied at ${player.total}. Bet returned.`,
    multiplier: 1,
  };
}

/**
 * Formats a hand for Discord embed display.
 */
export function formatHand(cards: Card[], hideHoleCard = false): string {
  if (cards.length === 0) return '*(empty)*';

  if (hideHoleCard) {
    const first = cards[0];
    return `${first.visual} \`${first.name}\`  🂠 \`[ ? ]\``;
  }

  return cards.map((c) => `${c.visual} \`${c.name}\``).join('  ');
}

/**
 * Build rich Discord embed for the current Blackjack game state.
 */
export function buildBlackjackEmbed(
  playerHand: Card[],
  dealerHand: Card[],
  gameOver: boolean,
  resultMessage?: string,
  bet = 100,
  userTag?: string,
): DiscordEmbed {
  const playerVal = calculateHandValue(playerHand);
  const dealerVal = calculateHandValue(dealerHand);

  let title = '🃏 Blackjack Table';
  let color: number = Colors.PRIMARY;

  if (gameOver) {
    const evalRes = evaluateBlackjackResult(playerHand, dealerHand);
    resultMessage = resultMessage ?? evalRes.message;

    switch (evalRes.outcome) {
      case 'blackjack':
      case 'win':
      case 'dealer_bust':
        title = '🃏 Blackjack — You Won! 🏆';
        color = Colors.SUCCESS;
        break;
      case 'bust':
      case 'loss':
        title = '🃏 Blackjack — Dealer Won 💀';
        color = Colors.DANGER;
        break;
      case 'push':
        title = '🃏 Blackjack — Standoff / Push 🤝';
        color = Colors.WARNING;
        break;
    }
  }

  const dealerScoreText = gameOver
    ? `${dealerVal.total}${dealerVal.isSoft ? ' (Soft)' : ''}${dealerVal.isBust ? ' — BUST' : ''}`
    : `${dealerHand[0]?.value ?? 0} + ?`;

  const playerScoreText = `${playerVal.total}${playerVal.isSoft ? ' (Soft)' : ''}${playerVal.isBust ? ' — BUST' : ''}`;

  const fields = [
    {
      name: `Dealer's Hand (${dealerScoreText})`,
      value: formatHand(dealerHand, !gameOver),
      inline: false,
    },
    {
      name: `${userTag ? `${userTag}'s` : 'Your'} Hand (${playerScoreText})`,
      value: formatHand(playerHand, false),
      inline: false,
    },
    {
      name: 'Bet',
      value: `🪙 **${bet.toLocaleString()}** credits`,
      inline: true,
    },
  ];

  if (gameOver) {
    const evalRes = evaluateBlackjackResult(playerHand, dealerHand);
    const winAmount = Math.floor(bet * evalRes.multiplier);
    const profit = winAmount - bet;
    const profitText =
      profit > 0
        ? `+${profit.toLocaleString()}`
        : profit === 0
          ? '0'
          : `-${bet.toLocaleString()}`;

    fields.push({
      name: 'Payout',
      value: `🪙 **${winAmount.toLocaleString()}** credits (${profitText})`,
      inline: true,
    });
  }

  const description = resultMessage
    ? `### ${resultMessage}`
    : '### Choose your move: Hit, Stand, or Double Down.';

  return {
    title,
    description,
    color,
    fields,
    footer: {
      text: gameOver
        ? 'Game over. Play again with /blackjack'
        : 'Dealer stands on 17+, hits on soft 17. Only the table owner can click.',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build interactive action row with Hit, Stand, and Double Down buttons.
 */
export function buildBlackjackActionRow(
  gameId: string,
  canDouble = true,
  disabled = false,
): DiscordActionRowComponent {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: 1, // Primary (blurple)
        label: 'Hit',
        custom_id: `game_bj:hit:${gameId}`,
        emoji: { name: '🃏' },
        disabled,
      },
      {
        type: 2,
        style: 2, // Secondary (gray)
        label: 'Stand',
        custom_id: `game_bj:stand:${gameId}`,
        emoji: { name: '🛑' },
        disabled,
      },
      {
        type: 2,
        style: 3, // Success (green)
        label: 'Double Down',
        custom_id: `game_bj:double:${gameId}`,
        emoji: { name: '⚡' },
        disabled: disabled || !canDouble,
      },
    ],
  };
}
