/**
 * src/commands/games.ts
 * Interactive Games & Minigames Suite Slash Commands for AiCord.
 *
 * Implements:
 * - /trivia [category]: 55 questions, category autocomplete, 4-button ActionRow.
 * - /blackjack [bet]: 52-card blackjack table with Hit, Stand, and Double Down.
 * - /rps [choice]: Rock Paper Scissors with instant or interactive button play.
 * - /coinflip [guess] [bet]: Heads or Tails with streak tracking.
 * - /slots [bet]: 3-reel retro slot machine with up to 25x payout.
 *
 * Central Command Registry compliant (category: 'fun', rateLimit, RegisteredCommand).
 */

import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import crypto from 'crypto';
import type {
  RegisteredCommand,
  AutocompleteContext,
} from '@/lib/discord/command-registry';
import { editInteractionResponse, sendFollowUp } from '@/lib/discord/interaction-response';
import { warningEmbed, infoEmbed } from '@/lib/discord/embeds';
import { LRUCache } from '@/lib/engines/cache';

import {
  getTriviaQuestion,
  buildTriviaEmbed,
  buildTriviaActionRow,
  TRIVIA_CATEGORIES,
  type TriviaQuestion,
} from '@/lib/games/trivia';

import {
  createDeck,
  shuffleDeck,
  calculateHandValue,
  dealerPlay,
  evaluateBlackjackResult,
  buildBlackjackEmbed,
  buildBlackjackActionRow,
  type Card,
} from '@/lib/games/blackjack';

import {
  getRandomRpsChoice,
  evaluateRps,
  buildRpsEmbed,
  buildRpsActionRow,
  type RpsChoice,
} from '@/lib/games/rps';

import {
  spinReels,
  calculateSlotsPayout,
  buildSlotsEmbed,
} from '@/lib/games/slots';

import {
  evaluateCoinflip,
  buildCoinflipEmbed,
  type CoinSide,
} from '@/lib/games/coinflip';

// ─── Active Games State Store ─────────────────────────────────────────────

export interface ActiveTriviaGame {
  type: 'trivia';
  gameId: string;
  userId: string;
  userTag: string;
  question: TriviaQuestion;
  choices: [string, string, string, string];
  correctIndex: number;
}

export interface ActiveBlackjackGame {
  type: 'blackjack';
  gameId: string;
  userId: string;
  userTag: string;
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  bet: number;
  canDouble: boolean;
}

export interface ActiveRpsGame {
  type: 'rps';
  gameId: string;
  userId: string;
  userTag: string;
}

export type ActiveGame = ActiveTriviaGame | ActiveBlackjackGame | ActiveRpsGame;

// Store active interactive games for up to 10 minutes (600s TTL)
const activeGameStore = new LRUCache<string, ActiveGame>({
  maxSize: 5_000,
  defaultTTLSeconds: 600,
});

// Store user coinflip streaks for 24 hours (86,400s TTL)
const userStreakStore = new LRUCache<string, number>({
  maxSize: 10_000,
  defaultTTLSeconds: 86_400,
});

export function getActiveGame(gameId: string): ActiveGame | undefined {
  return activeGameStore.get(gameId);
}

export function setActiveGame(gameId: string, game: ActiveGame): void {
  activeGameStore.set(gameId, game);
}

export function deleteActiveGame(gameId: string): boolean {
  return activeGameStore.delete(gameId);
}

export function clearActiveGames(): void {
  activeGameStore.clear();
}

export function getUserCoinflipStreak(userId: string): number {
  return userStreakStore.get(userId) ?? 0;
}

export function setUserCoinflipStreak(userId: string, streak: number): void {
  userStreakStore.set(userId, streak);
}

export function clearUserCoinflipStreaks(): void {
  userStreakStore.clear();
}

// ─── Option Extraction Helpers ────────────────────────────────────────────

function getOptionValue<T = string | number | boolean>(
  interaction: APIChatInputApplicationCommandInteraction,
  name: string,
): T | undefined {
  const options = interaction.data?.options;
  if (!Array.isArray(options)) return undefined;
  const opt = options.find(
    (o) => (o as { name: string }).name === name,
  ) as { value?: unknown } | undefined;
  return opt?.value as T | undefined;
}

// ─── 1. /trivia Command ───────────────────────────────────────────────────

export async function handleTriviaCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const userTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Challenger';

  const category = getOptionValue<string>(interaction, 'category');
  const trivia = getTriviaQuestion(category);
  const gameId = crypto.randomUUID().slice(0, 8);

  const game: ActiveTriviaGame = {
    type: 'trivia',
    gameId,
    userId,
    userTag,
    question: trivia.question,
    choices: trivia.choices,
    correctIndex: trivia.correctIndex,
  };

  setActiveGame(gameId, game);

  const embed = buildTriviaEmbed({
    question: trivia.question,
    choices: trivia.choices,
    userTag,
  });

  const actionRow = buildTriviaActionRow(gameId);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [actionRow],
  });
}

export async function autocompleteTriviaCategory(
  ctx: AutocompleteContext,
): Promise<Array<{ name: string; value: string }>> {
  const query = (ctx.focusedOption.value ?? '').toLowerCase().trim();

  const matches = TRIVIA_CATEGORIES.filter((c) =>
    c.id.toLowerCase().includes(query) || c.name.toLowerCase().includes(query),
  );

  return matches.map((c) => ({
    name: `${c.emoji} ${c.name}`,
    value: c.id,
  }));
}

export const triviaCommand: RegisteredCommand = {
  name: 'trivia',
  description: 'Test your knowledge with an interactive 4-choice trivia question',
  category: 'fun',
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'category',
      description: 'Select a trivia category',
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true,
    },
  ],
  autocomplete: autocompleteTriviaCategory,
  execute: handleTriviaCommand,
};

// ─── 2. /blackjack Command ────────────────────────────────────────────────

export async function handleBlackjackCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const userTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Player';

  const bet = Math.max(10, Math.min(getOptionValue<number>(interaction, 'bet') ?? 100, 1_000_000));
  const fullDeck = shuffleDeck(createDeck());

  // Initial deal: 2 cards to player, 2 cards to dealer
  const playerHand = [fullDeck.shift()!, fullDeck.shift()!];
  const dealerHand = [fullDeck.shift()!, fullDeck.shift()!];

  const playerVal = calculateHandValue(playerHand);

  // Instant Blackjack check
  if (playerVal.isBlackjack) {
    const evalRes = evaluateBlackjackResult(playerHand, dealerHand);
    const embed = buildBlackjackEmbed(
      playerHand,
      dealerHand,
      true,
      evalRes.message,
      bet,
      userTag,
    );
    await editInteractionResponse(token, {
      embeds: [embed],
      components: [],
    });
    return;
  }

  const gameId = crypto.randomUUID().slice(0, 8);
  const game: ActiveBlackjackGame = {
    type: 'blackjack',
    gameId,
    userId,
    userTag,
    playerHand,
    dealerHand,
    deck: fullDeck,
    bet,
    canDouble: true,
  };

  setActiveGame(gameId, game);

  const embed = buildBlackjackEmbed(
    playerHand,
    dealerHand,
    false,
    undefined,
    bet,
    userTag,
  );
  const actionRow = buildBlackjackActionRow(gameId, true, false);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [actionRow],
  });
}

export const blackjackCommand: RegisteredCommand = {
  name: 'blackjack',
  description: 'Play an interactive table of 52-card Blackjack against the dealer',
  category: 'fun',
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'bet',
      description: 'Amount of credits to wager (default: 100)',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 10,
      max_value: 1_000_000,
    },
  ],
  execute: handleBlackjackCommand,
};

// ─── 3. /rps Command ──────────────────────────────────────────────────────

export async function handleRpsCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const userTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Challenger';

  const choice = getOptionValue<string>(interaction, 'choice') as RpsChoice | undefined;

  // Instant play if choice is provided in slash options
  if (choice && (choice === 'rock' || choice === 'paper' || choice === 'scissors')) {
    const botChoice = getRandomRpsChoice();
    const result = evaluateRps(choice, botChoice);
    const embed = buildRpsEmbed({
      playerChoice: choice,
      botChoice,
      result,
      userTag,
    });

    await editInteractionResponse(token, {
      embeds: [embed],
      components: [],
    });
    return;
  }

  // Interactive button mode
  const gameId = crypto.randomUUID().slice(0, 8);
  const game: ActiveRpsGame = {
    type: 'rps',
    gameId,
    userId,
    userTag,
  };

  setActiveGame(gameId, game);

  const embed = buildRpsEmbed();
  const actionRow = buildRpsActionRow(gameId);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [actionRow],
  });
}

export const rpsCommand: RegisteredCommand = {
  name: 'rps',
  description: 'Play Rock Paper Scissors against AiCord (instant or interactive)',
  category: 'fun',
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'choice',
      description: 'Your move: rock, paper, or scissors (leave empty for buttons)',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: 'Rock 🪨', value: 'rock' },
        { name: 'Paper 📄', value: 'paper' },
        { name: 'Scissors ✂️', value: 'scissors' },
      ],
    },
  ],
  execute: handleRpsCommand,
};

// ─── 4. /coinflip Command ─────────────────────────────────────────────────

export async function handleCoinflipCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const token = interaction.token;
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const userTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Flipper';

  const rawGuess = getOptionValue<string>(interaction, 'guess') ?? 'heads';
  const guess: CoinSide = rawGuess.toLowerCase() === 'tails' ? 'tails' : 'heads';
  const bet = Math.max(0, getOptionValue<number>(interaction, 'bet') ?? 0);

  const currentStreak = getUserCoinflipStreak(userId);
  const evalRes = evaluateCoinflip(guess, currentStreak, bet);

  setUserCoinflipStreak(userId, evalRes.newStreak);

  const embed = buildCoinflipEmbed(
    guess,
    evalRes.result,
    evalRes.newStreak,
    bet,
    userTag,
  );

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [],
  });
}

export const coinflipCommand: RegisteredCommand = {
  name: 'coinflip',
  description: 'Flip a coin and track your consecutive win streak',
  category: 'fun',
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'guess',
      description: 'Your call: heads or tails (default: heads)',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: 'Heads 🪙', value: 'heads' },
        { name: 'Tails 🪙', value: 'tails' },
      ],
    },
    {
      name: 'bet',
      description: 'Optional wager amount',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 10,
      max_value: 100_000,
    },
  ],
  execute: handleCoinflipCommand,
};

// ─── 5. /slots Command ────────────────────────────────────────────────────

export async function handleSlotsCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const token = interaction.token;
  const userTag =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'Spinner';

  const bet = Math.max(10, Math.min(getOptionValue<number>(interaction, 'bet') ?? 100, 100_000));
  const reels = spinReels();
  const evalRes = calculateSlotsPayout(reels, bet);

  const embed = buildSlotsEmbed(reels, evalRes.payout, evalRes.multiplier, bet, userTag);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [],
  });
}

export const slotsCommand: RegisteredCommand = {
  name: 'slots',
  description: 'Spin the 3-reel retro slot machine for up to 25x payout',
  category: 'fun',
  rateLimit: { limit: 10, windowMs: 15_000 },
  options: [
    {
      name: 'bet',
      description: 'Amount of credits to wager (default: 100)',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 10,
      max_value: 100_000,
    },
  ],
  execute: handleSlotsCommand,
};

// ─── Interactive Component Webhook Handlers ───────────────────────────────

/**
 * Handles button click on a trivia question: game_trivia:<gameId>:<choiceIndex>
 */
export async function handleTriviaInteraction(
  token: string,
  gameId: string,
  choiceIndexStr: string,
  userId: string,
): Promise<void> {
  const game = getActiveGame(gameId);

  if (!game || game.type !== 'trivia') {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('Game Expired', 'This trivia game has expired or already concluded.')],
      components: [],
    });
    return;
  }

  // Enforce unauthorized user protection with ephemeral rejection
  if (game.userId !== userId) {
    await sendFollowUp(token, {
      embeds: [
        warningEmbed(
          'Unauthorized',
          'Only the player who started this trivia game can submit an answer.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const choiceIndex = parseInt(choiceIndexStr, 10);
  deleteActiveGame(gameId);

  const embed = buildTriviaEmbed({
    question: game.question,
    choices: game.choices,
    answeredIndex: choiceIndex,
    correctIndex: game.correctIndex,
    userTag: game.userTag,
  });

  const actionRow = buildTriviaActionRow(gameId, choiceIndex, game.correctIndex);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [actionRow],
  });
}

/**
 * Handles button click on Blackjack table: game_bj:<action>:<gameId>
 * Actions: hit, stand, double
 */
export async function handleBlackjackInteraction(
  token: string,
  action: 'hit' | 'stand' | 'double',
  gameId: string,
  userId: string,
): Promise<void> {
  const game = getActiveGame(gameId);

  if (!game || game.type !== 'blackjack') {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('Table Expired', 'This blackjack game has expired or already ended.')],
      components: [],
    });
    return;
  }

  // Enforce table owner authorization
  if (game.userId !== userId) {
    await sendFollowUp(token, {
      embeds: [
        warningEmbed(
          'Unauthorized',
          'Only the player seated at this table can make a move.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (action === 'hit') {
    if (game.deck.length === 0) {
      game.deck = shuffleDeck(createDeck());
    }
    game.playerHand.push(game.deck.shift()!);
    game.canDouble = false;

    const playerVal = calculateHandValue(game.playerHand);

    // Check if player bust
    if (playerVal.isBust) {
      deleteActiveGame(gameId);
      const evalRes = evaluateBlackjackResult(game.playerHand, game.dealerHand);
      const embed = buildBlackjackEmbed(
        game.playerHand,
        game.dealerHand,
        true,
        evalRes.message,
        game.bet,
        game.userTag,
      );
      const actionRow = buildBlackjackActionRow(gameId, false, true);

      await editInteractionResponse(token, {
        embeds: [embed],
        components: [actionRow],
      });
      return;
    }

    // If exactly 21, auto-stand into dealer play
    if (playerVal.total === 21) {
      return handleBlackjackInteraction(token, 'stand', gameId, userId);
    }

    // Active game continues
    setActiveGame(gameId, game);
    const embed = buildBlackjackEmbed(
      game.playerHand,
      game.dealerHand,
      false,
      undefined,
      game.bet,
      game.userTag,
    );
    const actionRow = buildBlackjackActionRow(gameId, false, false);

    await editInteractionResponse(token, {
      embeds: [embed],
      components: [actionRow],
    });
    return;
  }

  if (action === 'stand') {
    deleteActiveGame(gameId);
    const dealerRes = dealerPlay(game.dealerHand, game.deck);
    const finalDealerHand = dealerRes.dealerCards;

    const evalRes = evaluateBlackjackResult(game.playerHand, finalDealerHand);
    const embed = buildBlackjackEmbed(
      game.playerHand,
      finalDealerHand,
      true,
      evalRes.message,
      game.bet,
      game.userTag,
    );
    const actionRow = buildBlackjackActionRow(gameId, false, true);

    await editInteractionResponse(token, {
      embeds: [embed],
      components: [actionRow],
    });
    return;
  }

  if (action === 'double') {
    deleteActiveGame(gameId);
    game.bet *= 2;

    if (game.deck.length === 0) {
      game.deck = shuffleDeck(createDeck());
    }
    // Double down gives exactly one card
    game.playerHand.push(game.deck.shift()!);
    const playerVal = calculateHandValue(game.playerHand);

    let finalDealerHand = game.dealerHand;
    if (!playerVal.isBust) {
      const dealerRes = dealerPlay(game.dealerHand, game.deck);
      finalDealerHand = dealerRes.dealerCards;
    }

    const evalRes = evaluateBlackjackResult(game.playerHand, finalDealerHand);
    const embed = buildBlackjackEmbed(
      game.playerHand,
      finalDealerHand,
      true,
      evalRes.message,
      game.bet,
      game.userTag,
    );
    const actionRow = buildBlackjackActionRow(gameId, false, true);

    await editInteractionResponse(token, {
      embeds: [embed],
      components: [actionRow],
    });
    return;
  }
}

/**
 * Handles button click on Rock Paper Scissors game: game_rps:<gameId>:<choice>
 */
export async function handleRpsInteraction(
  token: string,
  gameId: string,
  choice: string,
  userId: string,
): Promise<void> {
  const game = getActiveGame(gameId);

  if (!game || game.type !== 'rps') {
    await editInteractionResponse(token, {
      embeds: [infoEmbed('Game Expired', 'This RPS game has expired or already concluded.')],
      components: [],
    });
    return;
  }

  // Authorization check
  if (game.userId !== userId) {
    await sendFollowUp(token, {
      embeds: [
        warningEmbed(
          'Unauthorized',
          'Only the challenger who initiated this RPS game can select a move.',
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  deleteActiveGame(gameId);

  const playerChoice = choice as RpsChoice;
  const botChoice = getRandomRpsChoice();
  const result = evaluateRps(playerChoice, botChoice);

  const embed = buildRpsEmbed({
    playerChoice,
    botChoice,
    result,
    userTag: game.userTag,
  });

  const actionRow = buildRpsActionRow(gameId, true, playerChoice);

  await editInteractionResponse(token, {
    embeds: [embed],
    components: [actionRow],
  });
}
