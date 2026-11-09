/**
 * src/lib/quiz/quiz-service.ts
 * Live Multiplayer Kahoot-Style Quiz Show Service Engine for AiCord.
 *
 * Responsibilities:
 * - Curated question catalog across 6 categories (tech, gaming, anime, science, history, general)
 * - Session lifecycle: create, advance rounds, speed-based scoring, podium & coin rewards
 * - Persistent leaderboard updates and ranking
 * - In-memory zero-network test store for unit testing
 * - Interactive Discord embeds & ActionRow button component builders
 */

import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
import { connectDB } from '@/lib/db';
import {
  QuizSession,
  QuizLeaderboard,
  EconomyUser,
  type IQuizSession,
  type IQuizLeaderboard,
  type IQuizQuestion,
  type IQuizScore,
  type IQuizRoundAnswer,
  type QuizStatus,
} from '@/models';
import type { DiscordEmbed } from '@/lib/discord/embeds';
import {
  buildActionRow,
  buildButton,
  type ActionRow,
} from '@/lib/discord/interaction-response';

export type {
  IQuizSession,
  IQuizLeaderboard,
  IQuizQuestion,
  IQuizScore,
  IQuizRoundAnswer,
  QuizStatus,
};

// ─── Curated Question Catalog ─────────────────────────────────────────────────

export const QUIZ_QUESTION_CATALOG: IQuizQuestion[] = [
  // TECH (7 questions)
  {
    question: 'What does CPU stand for?',
    options: [
      'Central Processing Unit',
      'Computer Personal Unit',
      'Central Processor Universal',
      'Core Processing Utility',
    ],
    correctIndex: 0,
    category: 'tech',
  },
  {
    question: 'Which language is primarily used for styling web pages?',
    options: ['HTML', 'Python', 'CSS', 'C++'],
    correctIndex: 2,
    category: 'tech',
  },
  {
    question: 'What does HTTP stand for?',
    options: [
      'HyperText Transfer Protocol',
      'HighText Transmission Program',
      'Hyperlink Text Trade Path',
      'Host Transfer Tech Protocol',
    ],
    correctIndex: 0,
    category: 'tech',
  },
  {
    question: 'In Git, which command creates a new branch and switches to it immediately?',
    options: ['git branch -new', 'git checkout -b', 'git switch --make', 'git init -b'],
    correctIndex: 1,
    category: 'tech',
  },
  {
    question: 'Which data structure operates on a First-In, First-Out (FIFO) basis?',
    options: ['Stack', 'Queue', 'Binary Tree', 'Hash Map'],
    correctIndex: 1,
    category: 'tech',
  },
  {
    question: 'Who is credited with creating the Linux operating system kernel?',
    options: ['Steve Jobs', 'Bill Gates', 'Linus Torvalds', 'Richard Stallman'],
    correctIndex: 2,
    category: 'tech',
  },
  {
    question: 'What port does standard HTTPS traffic use?',
    options: ['80', '22', '8080', '443'],
    correctIndex: 3,
    category: 'tech',
  },

  // GAMING (7 questions)
  {
    question: 'In Minecraft, which item is required to brew potions?',
    options: ['Nether Wart', 'Blaze Powder', 'Brewing Stand', 'Ghast Tear'],
    correctIndex: 2,
    category: 'gaming',
  },
  {
    question: "What is the name of the main protagonist in 'The Legend of Zelda' series?",
    options: ['Zelda', 'Link', 'Ganon', 'Epona'],
    correctIndex: 1,
    category: 'gaming',
  },
  {
    question: "Which company developed the battle royale game 'Apex Legends'?",
    options: ['Respawn Entertainment', 'Epic Games', 'Infinity Ward', 'Riot Games'],
    correctIndex: 0,
    category: 'gaming',
  },
  {
    question: "In 'Dark Souls', what phrase appears on screen upon death?",
    options: ['GAME OVER', 'WASTED', 'YOU DIED', 'FATAL FLAW'],
    correctIndex: 2,
    category: 'gaming',
  },
  {
    question: "What is the highest competitive rank in 'Valorant'?",
    options: ['Immortal', 'Radiant', 'Master', 'Grandmaster'],
    correctIndex: 1,
    category: 'gaming',
  },
  {
    question: 'Which iconic mascot was created by SEGA in 1991 to rival Mario?',
    options: ['Crash Bandicoot', 'Spyro', 'Sonic the Hedgehog', 'Mega Man'],
    correctIndex: 2,
    category: 'gaming',
  },
  {
    question: "In 'Among Us', what color space suit is the default on game icons?",
    options: ['Blue', 'Yellow', 'Red', 'Cyan'],
    correctIndex: 2,
    category: 'gaming',
  },

  // ANIME (7 questions)
  {
    question: "In 'Dragon Ball Z', what is Goku's Saiyan birth name?",
    options: ['Kakarot', 'Vegeta', 'Bardock', 'Raditz'],
    correctIndex: 0,
    category: 'anime',
  },
  {
    question: "In 'Death Note', what favorite food does the Shinigami Ryuk love to eat?",
    options: ['Chocolate', 'Apples', 'Strawberries', 'Ramen'],
    correctIndex: 1,
    category: 'anime',
  },
  {
    question: "What is the name of Luffy's straw hat crew's first ship in 'One Piece'?",
    options: ['Thousand Sunny', 'Red Force', 'Going Merry', 'Moby Dick'],
    correctIndex: 2,
    category: 'anime',
  },
  {
    question: "In 'Attack on Titan', which wall was breached first in Episode 1?",
    options: ['Wall Rose', 'Wall Sina', 'Wall Maria', 'Wall Titan'],
    correctIndex: 2,
    category: 'anime',
  },
  {
    question: "Who is known as the 'Fullmetal Alchemist'?",
    options: ['Alphonse Elric', 'Roy Mustang', 'Edward Elric', 'Van Hohenheim'],
    correctIndex: 2,
    category: 'anime',
  },
  {
    question: "In 'Naruto', what signature lightning technique does Kakashi Hatake invent?",
    options: ['Rasengan', 'Chidori', 'Amaterasu', 'Shadow Clone'],
    correctIndex: 1,
    category: 'anime',
  },
  {
    question: "In 'Demon Slayer', what breathing style does Tanjiro Kamado originally practice?",
    options: ['Water Breathing', 'Sun Breathing', 'Thunder Breathing', 'Flame Breathing'],
    correctIndex: 0,
    category: 'anime',
  },

  // SCIENCE (7 questions)
  {
    question: 'What is the chemical symbol for Gold?',
    options: ['Ag', 'Au', 'Fe', 'Gd'],
    correctIndex: 1,
    category: 'science',
  },
  {
    question: "Which planet in our solar system is known as the 'Red Planet'?",
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correctIndex: 1,
    category: 'science',
  },
  {
    question: 'What is the powerhouse organelle of eukaryotic cells?',
    options: ['Ribosome', 'Nucleus', 'Mitochondria', 'Endoplasmic Reticulum'],
    correctIndex: 2,
    category: 'science',
  },
  {
    question: 'What is the speed of light in a vacuum approximately?',
    options: ['300,000 km/s', '150,000 km/s', '1,000,000 km/s', '30,000 km/s'],
    correctIndex: 0,
    category: 'science',
  },
  {
    question: "Which gas makes up approximately 78% of Earth's atmosphere?",
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
    correctIndex: 2,
    category: 'science',
  },
  {
    question: 'What is the hardest known natural mineral on Earth?',
    options: ['Quartz', 'Topaz', 'Diamond', 'Corundum'],
    correctIndex: 2,
    category: 'science',
  },
  {
    question: 'Who formulated the general theory of relativity?',
    options: ['Isaac Newton', 'Albert Einstein', 'Niels Bohr', 'Max Planck'],
    correctIndex: 1,
    category: 'science',
  },

  // HISTORY (7 questions)
  {
    question: 'In what year did the Titanic sink?',
    options: ['1905', '1912', '1918', '1923'],
    correctIndex: 1,
    category: 'history',
  },
  {
    question: 'Who was the first President of the United States?',
    options: ['Thomas Jefferson', 'Alexander Hamilton', 'George Washington', 'John Adams'],
    correctIndex: 2,
    category: 'history',
  },
  {
    question: 'Which ancient civilization constructed the Pyramids of Giza?',
    options: ['Ancient Romans', 'Ancient Egyptians', 'Mesopotamians', 'Mayans'],
    correctIndex: 1,
    category: 'history',
  },
  {
    question: 'What year marked the fall of the Berlin Wall?',
    options: ['1985', '1989', '1991', '1979'],
    correctIndex: 1,
    category: 'history',
  },
  {
    question: 'Who was the legendary queen of Egypt associated with Julius Caesar and Mark Antony?',
    options: ['Nefertiti', 'Cleopatra VII', 'Hatshepsut', 'Arsinoe'],
    correctIndex: 1,
    category: 'history',
  },
  {
    question: 'The Renaissance period primarily began in which European country?',
    options: ['France', 'England', 'Italy', 'Spain'],
    correctIndex: 2,
    category: 'history',
  },
  {
    question: 'What global conflict concluded in 1945?',
    options: ['World War I', 'World War II', 'Cold War', 'Korean War'],
    correctIndex: 1,
    category: 'history',
  },

  // GENERAL (7 questions)
  {
    question: 'How many continents are there on Earth?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    category: 'general',
  },
  {
    question: 'Which ocean is the largest on Earth by surface area?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correctIndex: 3,
    category: 'general',
  },
  {
    question: 'What is the capital city of Japan?',
    options: ['Kyoto', 'Osaka', 'Tokyo', 'Nagoya'],
    correctIndex: 2,
    category: 'general',
  },
  {
    question: 'How many keys does a standard full-size acoustic piano have?',
    options: ['76', '88', '92', '64'],
    correctIndex: 1,
    category: 'general',
  },
  {
    question: 'What is the official currency of the United Kingdom?',
    options: ['Euro', 'Pound Sterling', 'Dollar', 'Franc'],
    correctIndex: 1,
    category: 'general',
  },
  {
    question: 'Which is the tallest mountain in the world above sea level?',
    options: ['K2', 'Mount Kilimanjaro', 'Mount Everest', 'Denali'],
    correctIndex: 2,
    category: 'general',
  },
  {
    question: 'What color is a ruby gemstone typically known for?',
    options: ['Green', 'Blue', 'Red', 'Purple'],
    correctIndex: 2,
    category: 'general',
  },
];

export const QUIZ_CATEGORIES = [
  'tech',
  'gaming',
  'anime',
  'science',
  'history',
  'general',
] as const;

export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];

/**
 * Shuffles an array and returns a subset of length `count`.
 */
export function pickRandomQuestions(
  category: string = 'general',
  count: number = 5,
): IQuizQuestion[] {
  const normCategory = category.toLowerCase().trim();

  if (normCategory !== 'general' && normCategory !== 'all') {
    const categoryQuestions = QUIZ_QUESTION_CATALOG.filter(
      (q) => q.category === normCategory,
    );
    const shuffledCat = [...categoryQuestions].sort(() => 0.5 - Math.random());
    if (shuffledCat.length >= count) {
      return shuffledCat.slice(0, count);
    }
    // Take all category questions and fill remaining slots from other categories
    const pool = [...shuffledCat];
    const remaining = QUIZ_QUESTION_CATALOG.filter(
      (q) => q.category !== normCategory,
    );
    const shuffledRemaining = [...remaining].sort(() => 0.5 - Math.random());
    return pool.concat(shuffledRemaining.slice(0, count - pool.length));
  }

  const shuffled = [...QUIZ_QUESTION_CATALOG].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ─── In-Memory Test Store ─────────────────────────────────────────────────────

let testMode = false;
const testSessions = new Map<string, IQuizSession>();
const testLeaderboards = new Map<string, IQuizLeaderboard>();
const testBalances = new Map<string, number>();

export function enableTestMode(enabled: boolean = true): void {
  testMode = enabled;
}

export function clearTestStore(): void {
  testSessions.clear();
  testLeaderboards.clear();
  testBalances.clear();
}

export function isTestMode(): boolean {
  return testMode;
}

export function setTestSession(
  session: Partial<IQuizSession> & { sessionId: string },
): void {
  const current = testSessions.get(session.sessionId);
  const updated = {
    guildId: session.guildId ?? current?.guildId ?? 'guild_default',
    sessionId: session.sessionId,
    channelId: session.channelId ?? current?.channelId ?? 'chan_default',
    hostId: session.hostId ?? current?.hostId ?? 'host_default',
    category: session.category ?? current?.category ?? 'general',
    rounds: session.rounds ?? current?.rounds ?? 5,
    currentRound: session.currentRound ?? current?.currentRound ?? 0,
    status: session.status ?? current?.status ?? 'waiting',
    questions: session.questions ?? current?.questions ?? [],
    scores: session.scores ?? current?.scores ?? [],
    roundAnswers: session.roundAnswers ?? current?.roundAnswers ?? [],
    roundStartedAt: session.roundStartedAt ?? current?.roundStartedAt,
    createdAt: current?.createdAt ?? new Date(),
    updatedAt: new Date(),
    save: async function (this: any) {
      this.updatedAt = new Date();
      testSessions.set(this.sessionId, this as unknown as IQuizSession);
      return this;
    },
  } as unknown as IQuizSession;
  testSessions.set(session.sessionId, updated);
}

export function getTestSession(sessionId: string): IQuizSession | undefined {
  return testSessions.get(sessionId);
}

export function getAllTestSessions(guildId?: string): IQuizSession[] {
  const all = Array.from(testSessions.values());
  return guildId ? all.filter((s) => s.guildId === guildId) : all;
}

export function setTestLeaderboard(
  entry: Partial<IQuizLeaderboard> & { guildId: string; userId: string },
): void {
  const key = `${entry.guildId}:${entry.userId}`;
  const current = testLeaderboards.get(key);
  const updated = {
    guildId: entry.guildId,
    userId: entry.userId,
    userTag: entry.userTag ?? current?.userTag ?? 'Player',
    gamesPlayed: entry.gamesPlayed ?? current?.gamesPlayed ?? 0,
    gamesWon: entry.gamesWon ?? current?.gamesWon ?? 0,
    totalScore: entry.totalScore ?? current?.totalScore ?? 0,
    createdAt: current?.createdAt ?? new Date(),
    updatedAt: new Date(),
  } as unknown as IQuizLeaderboard;
  testLeaderboards.set(key, updated);
}

export function getTestLeaderboard(
  guildId: string,
  userId: string,
): IQuizLeaderboard | undefined {
  return testLeaderboards.get(`${guildId}:${userId}`);
}

export function getAllTestLeaderboards(guildId?: string): IQuizLeaderboard[] {
  const all = Array.from(testLeaderboards.values());
  return guildId ? all.filter((l) => l.guildId === guildId) : all;
}

export function setTestBalance(guildId: string, userId: string, amount: number): void {
  testBalances.set(`${guildId}:${userId}`, Math.max(0, amount));
}

export function getTestBalance(guildId: string, userId: string): number {
  return testBalances.get(`${guildId}:${userId}`) ?? 0;
}

// ─── Economy Integration ──────────────────────────────────────────────────────

async function awardQuizCoins(
  guildId: string,
  userId: string,
  amount: number,
): Promise<void> {
  if (testMode) {
    const current = getTestBalance(guildId, userId);
    setTestBalance(guildId, userId, current + amount);
    return;
  }

  await connectDB();
  let ecoUser = await EconomyUser.findOne({ guildId, userId });
  if (!ecoUser) {
    ecoUser = await EconomyUser.create({
      guildId,
      userId,
      wallet: amount,
      bank: 0,
      bankCapacity: 5000,
      dailyStreak: 0,
      inventory: [],
    });
  } else {
    ecoUser.wallet += amount;
    await ecoUser.save();
  }
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Creates a new Quiz Session in a channel.
 * Rejects if the channel already has an active session.
 */
export async function createQuizSession(
  guildId: string,
  channelId: string,
  hostId: string,
  category: string = 'general',
  rounds: number = 5,
): Promise<IQuizSession> {
  const clampedRounds = Math.max(3, Math.min(10, Math.floor(rounds || 5)));

  // Check for active session in channel
  if (testMode) {
    const existing = Array.from(testSessions.values()).find(
      (s) => s.guildId === guildId && s.channelId === channelId && s.status !== 'ended',
    );
    if (existing) {
      throw new Error('Channel already has an active quiz session');
    }
  } else {
    await connectDB();
    const existing = await QuizSession.findOne({
      guildId,
      channelId,
      status: { $ne: 'ended' },
    });
    if (existing) {
      throw new Error('Channel already has an active quiz session');
    }
  }

  const selectedQuestions = pickRandomQuestions(category, clampedRounds);
  const sessionId = `quiz-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const sessionData = {
    guildId,
    sessionId,
    channelId,
    hostId,
    category: category.toLowerCase().trim() || 'general',
    rounds: clampedRounds,
    currentRound: 0,
    status: 'waiting' as QuizStatus,
    questions: selectedQuestions,
    scores: [] as IQuizScore[],
    roundAnswers: [] as IQuizRoundAnswer[],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (testMode) {
    const sessionDoc = {
      ...sessionData,
      save: async function (this: any) {
        this.updatedAt = new Date();
        testSessions.set(sessionId, this as unknown as IQuizSession);
        return this;
      },
    } as unknown as IQuizSession;
    testSessions.set(sessionId, sessionDoc);
    return sessionDoc;
  }

  await connectDB();
  return await QuizSession.create(sessionData);
}

/**
 * Gets an active session in a channel (status != 'ended').
 */
export async function getActiveQuizSession(
  guildId: string,
  channelId: string,
): Promise<IQuizSession | null> {
  if (testMode) {
    const active = Array.from(testSessions.values()).find(
      (s) => s.guildId === guildId && s.channelId === channelId && s.status !== 'ended',
    );
    return active ?? null;
  }

  await connectDB();
  return await QuizSession.findOne({
    guildId,
    channelId,
    status: { $ne: 'ended' },
  });
}

/**
 * Gets a quiz session by sessionId.
 */
export async function getQuizSessionById(
  guildId: string,
  sessionId: string,
): Promise<IQuizSession | null> {
  if (testMode) {
    const session = testSessions.get(sessionId);
    if (session && (!guildId || session.guildId === guildId)) {
      return session;
    }
    return null;
  }

  await connectDB();
  return await QuizSession.findOne({
    sessionId,
    ...(guildId ? { guildId } : {}),
  });
}

/**
 * Advances the quiz session to the next round.
 * Sets currentRound, roundStartedAt, and status to 'in_progress'.
 * Returns the current question.
 */
export async function startNextRound(
  guildId: string,
  sessionId: string,
): Promise<IQuizQuestion> {
  const session = await getQuizSessionById(guildId, sessionId);
  if (!session) {
    throw new Error('Quiz session not found');
  }

  if (session.status === 'ended') {
    throw new Error('Quiz session has already ended');
  }

  if (session.currentRound >= session.rounds) {
    throw new Error('Quiz session has completed all rounds');
  }

  session.currentRound += 1;
  session.status = 'in_progress';
  session.roundStartedAt = new Date();

  if (testMode) {
    await (session as any).save?.();
  } else {
    await session.save();
  }

  return session.questions[session.currentRound - 1];
}

/**
 * Submits an answer from a participant for the current round.
 * Calculates speed score: points = max(200, 1000 - floor(elapsedSeconds * 50)) if correct, else 0.
 * Rejects if user already answered this round.
 */
export async function submitAnswer(
  guildId: string,
  sessionId: string,
  userId: string,
  userTag: string,
  choiceIndex: number,
): Promise<{
  isCorrect: boolean;
  points: number;
  correctIndex: number;
  totalScore: number;
}> {
  const session = await getQuizSessionById(guildId, sessionId);
  if (!session) {
    throw new Error('Quiz session not found');
  }

  if (session.status !== 'in_progress') {
    throw new Error('Quiz round is not in progress');
  }

  const alreadyAnswered = session.roundAnswers.some(
    (a) => a.round === session.currentRound && a.userId === userId,
  );
  if (alreadyAnswered) {
    throw new Error('already_answered');
  }

  const currentQuestion = session.questions[session.currentRound - 1];
  if (!currentQuestion) {
    throw new Error('No question available for current round');
  }

  const isCorrect = choiceIndex === currentQuestion.correctIndex;

  // Speed-based scoring
  const start = session.roundStartedAt
    ? new Date(session.roundStartedAt).getTime()
    : Date.now();
  const elapsedMs = Math.max(0, Date.now() - start);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const points = isCorrect
    ? Math.max(200, 1000 - Math.floor(elapsedSeconds * 50))
    : 0;

  // Record round answer
  session.roundAnswers.push({
    round: session.currentRound,
    userId,
    userTag,
    choice: choiceIndex,
    isCorrect,
    points,
    answeredAt: new Date(),
  });

  // Update or insert score
  let scoreEntry = session.scores.find((s) => s.userId === userId);
  if (scoreEntry) {
    scoreEntry.score += points;
    scoreEntry.userTag = userTag;
  } else {
    scoreEntry = {
      userId,
      userTag,
      score: points,
    };
    session.scores.push(scoreEntry);
  }

  const totalScore = scoreEntry.score;

  if (testMode) {
    await (session as any).save?.();
  } else {
    session.markModified?.('roundAnswers');
    session.markModified?.('scores');
    await session.save();
  }

  return {
    isCorrect,
    points,
    correctIndex: currentQuestion.correctIndex,
    totalScore,
  };
}

/**
 * Ends the quiz session, calculates final podium, awards winner coins,
 * and updates QuizLeaderboard records.
 */
export async function endQuizSession(
  guildId: string,
  sessionId: string,
): Promise<{
  finalScores: IQuizScore[];
  podium: IQuizScore[];
  coinAwards: Array<{
    userId: string;
    userTag: string;
    place: number;
    coins: number;
  }>;
}> {
  const session = await getQuizSessionById(guildId, sessionId);
  if (!session) {
    throw new Error('Quiz session not found');
  }

  session.status = 'ended';

  // Sort descending by score
  const finalScores = [...session.scores].sort((a, b) => b.score - a.score);
  const podium = finalScores.slice(0, 3);

  const coinAwards: Array<{
    userId: string;
    userTag: string;
    place: number;
    coins: number;
  }> = [];

  const prizeTiers = [500, 250, 100]; // 1st, 2nd, 3rd

  for (let i = 0; i < podium.length; i++) {
    const winner = podium[i];
    const coins = prizeTiers[i];
    if (winner && winner.score > 0 && coins) {
      await awardQuizCoins(guildId, winner.userId, coins);
      coinAwards.push({
        userId: winner.userId,
        userTag: winner.userTag,
        place: i + 1,
        coins,
      });
    }
  }

  // Update server QuizLeaderboard for each participant
  const winnerUserId = podium[0] && podium[0].score > 0 ? podium[0].userId : null;

  for (const participant of finalScores) {
    const isWinner = winnerUserId === participant.userId;

    if (testMode) {
      const key = `${guildId}:${participant.userId}`;
      const existing = testLeaderboards.get(key);
      const updated = {
        guildId,
        userId: participant.userId,
        userTag: participant.userTag,
        gamesPlayed: (existing?.gamesPlayed ?? 0) + 1,
        gamesWon: (existing?.gamesWon ?? 0) + (isWinner ? 1 : 0),
        totalScore: (existing?.totalScore ?? 0) + participant.score,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      } as unknown as IQuizLeaderboard;
      testLeaderboards.set(key, updated);
    } else {
      await connectDB();
      await QuizLeaderboard.findOneAndUpdate(
        { guildId, userId: participant.userId },
        {
          $setOnInsert: { guildId, userId: participant.userId },
          $set: { userTag: participant.userTag },
          $inc: {
            gamesPlayed: 1,
            totalScore: participant.score,
            gamesWon: isWinner ? 1 : 0,
          },
        },
        { upsert: true, new: true },
      );
    }
  }

  if (testMode) {
    await (session as any).save?.();
  } else {
    await session.save();
  }

  return {
    finalScores,
    podium,
    coinAwards,
  };
}

/**
 * Retrieves server trivia leaderboard rankings.
 */
export async function getQuizLeaderboard(
  guildId: string,
  limit: number = 10,
): Promise<IQuizLeaderboard[]> {
  const clampedLimit = Math.max(1, Math.min(50, Math.floor(limit || 10)));

  if (testMode) {
    const guildEntries = Array.from(testLeaderboards.values()).filter(
      (l) => l.guildId === guildId,
    );
    guildEntries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.gamesWon - a.gamesWon;
    });
    return guildEntries.slice(0, clampedLimit);
  }

  await connectDB();
  return await QuizLeaderboard.find({ guildId })
    .sort({ totalScore: -1, gamesWon: -1 })
    .limit(clampedLimit)
    .lean();
}

// ─── Embed & Component Builders ───────────────────────────────────────────────

const OPTION_PREFIXES = ['🔴 A', '🔵 B', '🟡 C', '🟢 D'] as const;

/**
 * Builds the current question embed with round number, category badge, and 4 colored options.
 */
export function buildQuestionEmbed(
  session: IQuizSession,
  currentQuestion: IQuizQuestion,
): DiscordEmbed {
  const optionsText = currentQuestion.options
    .map((opt, idx) => `${OPTION_PREFIXES[idx]}: **${opt}**`)
    .join('\n\n');

  return {
    title: `⚡ Question ${session.currentRound}/${session.rounds}`,
    description: [
      `🏷️ **Category:** \`${currentQuestion.category.toUpperCase()}\` • Host: <@${session.hostId}>`,
      '',
      `### ${currentQuestion.question}`,
      '',
      optionsText,
    ].join('\n'),
    color: 0x5865f2, // Blurple
    footer: {
      text: '⚡ Answer quickly for maximum points! (1,000 max, -50/sec, 200 min)',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds the interactive 4-button ActionRow for answering a question:
 * quiz_ans:<sessionId>:0..3
 */
export function buildQuestionComponents(sessionId: string): ActionRow[] {
  return [
    buildActionRow(
      buildButton({
        style: 1, // Primary (Blurple)
        label: '🔴 A',
        customId: `quiz_ans:${sessionId}:0`,
      }),
      buildButton({
        style: 1,
        label: '🔵 B',
        customId: `quiz_ans:${sessionId}:1`,
      }),
      buildButton({
        style: 1,
        label: '🟡 C',
        customId: `quiz_ans:${sessionId}:2`,
      }),
      buildButton({
        style: 1,
        label: '🟢 D',
        customId: `quiz_ans:${sessionId}:3`,
      }),
    ),
  ];
}

/**
 * Builds round results embed displaying correct answer, accuracy stats, and top 5 standings.
 */
export function buildRoundResultsEmbed(
  session: IQuizSession,
  question: IQuizQuestion,
  roundAnswers: IQuizRoundAnswer[],
): DiscordEmbed {
  const roundAnswersForRound = roundAnswers.filter(
    (a) => a.round === session.currentRound,
  );
  const correctCount = roundAnswersForRound.filter((a) => a.isCorrect).length;
  const incorrectCount = roundAnswersForRound.length - correctCount;

  const correctLetter = ['A', 'B', 'C', 'D'][question.correctIndex] ?? 'A';
  const correctText = question.options[question.correctIndex];

  // Top 5 sorted by overall score
  const topStandings = [...session.scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s, idx) => {
      const medal =
        idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      return `${medal} **${s.userTag}** — ${s.score.toLocaleString()} pts`;
    })
    .join('\n');

  return {
    title: `📊 Round ${session.currentRound}/${session.rounds} Concluded!`,
    description: [
      `✅ **Correct Answer:** **${OPTION_PREFIXES[question.correctIndex]}: ${correctText}**`,
      '',
      `**Round Statistics:**`,
      `• Correct: **${correctCount}** | Incorrect: **${incorrectCount}** | Total Answered: **${roundAnswersForRound.length}**`,
      '',
      '**Top Standings:**',
      topStandings || '_No scores recorded yet._',
    ].join('\n'),
    color: 0x2ecc71, // Green
    footer: {
      text:
        session.currentRound < session.rounds
          ? `Host can run /quiz next to start Round ${session.currentRound + 1}!`
          : 'All rounds completed! Host can run /quiz next or /quiz end to view final podium!',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds the celebratory victory podium embed with ASCII graphics, final rankings, and coin awards.
 */
export function buildPodiumEmbed(
  session: IQuizSession,
  finalResults: {
    finalScores: IQuizScore[];
    podium: IQuizScore[];
    coinAwards: Array<{
      userId: string;
      userTag: string;
      place: number;
      coins: number;
    }>;
  },
): DiscordEmbed {
  const p1 = finalResults.podium[0];
  const p2 = finalResults.podium[1];
  const p3 = finalResults.podium[2];

  const p1Name = p1 ? p1.userTag.slice(0, 14) : 'Nobody';
  const p1Score = p1 ? `${p1.score.toLocaleString()} pts` : '-';
  const p2Name = p2 ? p2.userTag.slice(0, 12) : 'Nobody';
  const p2Score = p2 ? `${p2.score.toLocaleString()} pts` : '-';
  const p3Name = p3 ? p3.userTag.slice(0, 12) : 'Nobody';
  const p3Score = p3 ? `${p3.score.toLocaleString()} pts` : '-';

  const asciiPodium = [
    '```',
    `              [ 🥇 1st Place ]`,
    `             ${p1Name} (${p1Score})`,
    `                 +500 🪙`,
    `               |=========|`,
    `               |    1    |    [ 🥈 2nd Place ]`,
    `               |         |   ${p2Name} (${p2Score})`,
    `        |======|         |       +250 🪙`,
    `        |   2            |    |=========|`,
    `        |                |    |    3    |  [ 🥉 3rd Place ]`,
    `        |                |    |         | ${p3Name} (${p3Score})`,
    `        |                |    |         |     +100 🪙`,
    '```',
  ].join('\n');

  const fullStandings =
    finalResults.finalScores.length > 0
      ? finalResults.finalScores
          .slice(0, 10)
          .map((s, idx) => {
            const icon =
              idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**${idx + 1}.**`;
            const award = finalResults.coinAwards.find((a) => a.userId === s.userId);
            const coinText = award ? ` (+${award.coins} 🪙)` : '';
            return `${icon} **${s.userTag}** — ${s.score.toLocaleString()} pts${coinText}`;
          })
          .join('\n')
      : '_No participants submitted answers._';

  return {
    title: '🏆 Live Quiz Show — Final Podium & Awards!',
    description: [
      `Congratulations to all contestants in this session! (${session.rounds} Rounds • \`${session.category.toUpperCase()}\`)`,
      '',
      asciiPodium,
      '',
      '### 📜 Final Standings',
      fullStandings,
    ].join('\n'),
    color: 0xf1c40f, // Gold
    footer: {
      text: 'AiCord Quiz Show Engine • Use /quiz host to play again!',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Builds the server trivia leaderboard embed.
 */
export function buildLeaderboardEmbed(
  guildId: string,
  leaderboard: IQuizLeaderboard[],
): DiscordEmbed {
  if (leaderboard.length === 0) {
    return {
      title: '🏆 Server Quiz Trivia Leaderboard',
      description:
        'No quiz games recorded in this server yet!\nHost one now with `/quiz host`!',
      color: 0x5865f2,
      footer: { text: 'AiCord Quiz Show' },
    };
  }

  const list = leaderboard
    .map((entry, idx) => {
      const medal =
        idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `**#${idx + 1}**`;
      return `${medal} **${entry.userTag}** — **${entry.totalScore.toLocaleString()}** pts • 🏆 ${entry.gamesWon} wins / 🎮 ${entry.gamesPlayed} games`;
    })
    .join('\n');

  return {
    title: '🏆 Server Quiz Trivia Leaderboard',
    description: [
      'Top server trivia champions ranked by total points and victories:',
      '',
      list,
    ].join('\n'),
    color: 0xf1c40f,
    footer: {
      text: `Top ${leaderboard.length} server trivia masters • AiCord Quiz Show`,
    },
    timestamp: new Date().toISOString(),
  };
}
