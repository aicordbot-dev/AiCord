/**
 * scripts/set-user-stats.ts
 * Administrative CLI tool for setting Discord user stats:
 * - Level & cumulative XP (synced with level-math so /rank is consistent)
 * - Economy wallet and bank coins (auto-expanding bankCapacity)
 * - Daily login streak
 *
 * Usage:
 *   pnpm set-stats [options]
 *   tsx scripts/set-user-stats.ts [options]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db';
import { UserLevel, type IUserLevel } from '../src/models/UserLevel';
import { EconomyUser, type IEconomyUser } from '../src/models/EconomyUser';
import {
  getTotalXpForLevel,
  getLevelFromXp,
  renderProgressBar,
  type LevelProgress,
} from '../src/lib/levels/level-math';

// Load .env.local and .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

interface CliFlags {
  user?: string;
  guild?: string;
  level?: number;
  xp?: number;
  wallet?: number;
  bank?: number;
  streak?: number;
  dryRun?: boolean;
  interactive?: boolean;
  help?: boolean;
}

function getDefaultUserId(): string | undefined {
  const adminIds = process.env.ADMIN_DISCORD_IDS;
  if (!adminIds) return undefined;
  const first = adminIds.split(/[\s,]+/)[0]?.trim();
  return first && first.length > 0 ? first : undefined;
}

function getDefaultGuildId(): string | undefined {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  return guildId && guildId.length > 0 ? guildId : undefined;
}

function parseArgs(args: string[]): CliFlags {
  const flags: CliFlags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--interactive' || arg === '-i') {
      flags.interactive = true;
    } else if (arg.startsWith('--user=')) {
      flags.user = arg.slice(7);
    } else if (arg === '--user' || arg === '-u') {
      flags.user = args[++i];
    } else if (arg.startsWith('--guild=')) {
      flags.guild = arg.slice(8);
    } else if (arg === '--guild' || arg === '-g') {
      flags.guild = args[++i];
    } else if (arg.startsWith('--level=')) {
      flags.level = Number(arg.slice(8));
    } else if (arg === '--level' || arg === '-l') {
      flags.level = Number(args[++i]);
    } else if (arg.startsWith('--xp=')) {
      flags.xp = Number(arg.slice(5));
    } else if (arg === '--xp' || arg === '-x') {
      flags.xp = Number(args[++i]);
    } else if (arg.startsWith('--wallet=')) {
      flags.wallet = Number(arg.slice(9));
    } else if (arg === '--wallet' || arg === '-w') {
      flags.wallet = Number(args[++i]);
    } else if (arg.startsWith('--bank=')) {
      flags.bank = Number(arg.slice(7));
    } else if (arg === '--bank' || arg === '-b') {
      flags.bank = Number(args[++i]);
    } else if (arg.startsWith('--streak=')) {
      flags.streak = Number(arg.slice(9));
    } else if (arg === '--streak' || arg === '-s') {
      flags.streak = Number(args[++i]);
    }
  }
  return flags;
}

function printHelp(): void {
  const defaultUser = getDefaultUserId();
  const defaultGuild = getDefaultGuildId();

  console.log(`
AiCord Administrative CLI — Set User Stats
================================================================================
Updates Discord user level, XP, economy balances, and streaks directly in MongoDB.

Usage:
  pnpm set-stats [options]
  tsx scripts/set-user-stats.ts [options]

Options:
  -u, --user <userId>       Target Discord user ID
                            (default: ${defaultUser ?? 'None set (first ID in ADMIN_DISCORD_IDS)'})
  -g, --guild <guildId>     Target Discord guild ID
                            (default: ${defaultGuild ?? 'None set (DISCORD_GUILD_ID)'})
  -l, --level <number>      Set user level (automatically recalculates cumulative XP)
  -x, --xp <number>         Set cumulative XP explicitly (recalculates level unless --level is passed)
  -w, --wallet <number>     Set wallet coins balance
  -b, --bank <number>       Set bank coins balance (automatically expands capacity if bank > capacity)
  -s, --streak <number>     Set daily login streak (days)
      --dry-run             Simulate changes without saving to MongoDB
  -i, --interactive         Launch interactive prompt mode
  -h, --help                Show this help screen

Examples:
  # Set your level to 25 (XP automatically recalculated to 38,125):
  pnpm set-stats --level 25

  # Set wallet to 50,000 and bank to 150,000 coins (auto-expands capacity):
  pnpm set-stats --wallet 50000 --bank 150000

  # Set multiple stats for a specific member:
  pnpm set-stats --user 987654321098765432 --level 10 --wallet 25000 --bank 50000 --streak 7

  # View a user's current stats without making any changes:
  pnpm set-stats --user 1271699163410599977

  # Simulate updates in dry-run mode:
  pnpm set-stats --level 50 --dry-run
`);
}

async function promptInteractive(defaults: { userId?: string; guildId?: string }): Promise<CliFlags | null> {
  const rl = readline.createInterface({ input, output });
  try {
    console.log('\n--- Interactive Stat Configuration ---');
    console.log('Press [Enter] to keep the default or skip a field.\n');

    const defaultUserText = defaults.userId ? ` [default: ${defaults.userId}]` : '';
    const userAns = (await rl.question(`Discord User ID${defaultUserText}: `)).trim();
    const userId = userAns || defaults.userId;
    if (!userId) {
      console.error('❌ User ID cannot be empty.');
      return null;
    }

    const defaultGuildText = defaults.guildId ? ` [default: ${defaults.guildId}]` : '';
    const guildAns = (await rl.question(`Discord Guild ID${defaultGuildText}: `)).trim();
    const guildId = guildAns || defaults.guildId;
    if (!guildId) {
      console.error('❌ Guild ID cannot be empty.');
      return null;
    }

    const levelAns = (await rl.question('Level (leave blank to skip): ')).trim();
    const xpAns = (await rl.question('Cumulative XP (leave blank to skip): ')).trim();
    const walletAns = (await rl.question('Wallet coins (leave blank to skip): ')).trim();
    const bankAns = (await rl.question('Bank coins (leave blank to skip): ')).trim();
    const streakAns = (await rl.question('Daily streak days (leave blank to skip): ')).trim();

    const flags: CliFlags = {
      user: userId,
      guild: guildId,
      level: levelAns !== '' ? Number(levelAns) : undefined,
      xp: xpAns !== '' ? Number(xpAns) : undefined,
      wallet: walletAns !== '' ? Number(walletAns) : undefined,
      bank: bankAns !== '' ? Number(bankAns) : undefined,
      streak: streakAns !== '' ? Number(streakAns) : undefined,
    };

    return flags;
  } finally {
    rl.close();
  }
}

function renderTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const rowMax = rows.reduce((max, row) => Math.max(max, (row[i] || '').length), 0);
    return Math.max(h.length, rowMax) + 2;
  });

  const hLine = (left: string, mid: string, right: string, sep: string) =>
    left + colWidths.map((w) => sep.repeat(w)).join(mid) + right;

  const topBorder = hLine('┌', '┬', '┐', '─');
  const headerSep = hLine('├', '┼', '┤', '─');
  const bottomBorder = hLine('└', '┴', '┘', '─');

  const formatRow = (cells: string[]) =>
    '│' +
    cells
      .map((c, i) => {
        const text = c || '';
        return ' ' + text + ' '.repeat(colWidths[i] - text.length - 1);
      })
      .join('│') +
    '│';

  const out: string[] = [];
  out.push(topBorder);
  out.push(formatRow(headers));
  out.push(headerSep);
  for (const row of rows) {
    out.push(formatRow(row));
  }
  out.push(bottomBorder);

  return out.join('\n');
}

export async function run(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  let flags = parseArgs(rawArgs);

  if (flags.help) {
    printHelp();
    return;
  }

  const defaultUser = getDefaultUserId();
  const defaultGuild = getDefaultGuildId();

  if (rawArgs.length === 0) {
    printHelp();

    if (process.stdin.isTTY) {
      const rl = readline.createInterface({ input, output });
      let answer = '';
      try {
        answer = (
          await rl.question('❓ Would you like to enter interactive mode now? (y/N): ')
        ).trim().toLowerCase();
      } finally {
        rl.close();
      }

      if (answer === 'y' || answer === 'yes') {
        const interactiveFlags = await promptInteractive({ userId: defaultUser, guildId: defaultGuild });
        if (!interactiveFlags) {
          process.exit(1);
        }
        flags = interactiveFlags;
      } else {
        process.exit(0);
      }
    } else {
      process.exit(0);
    }
  } else if (flags.interactive) {
    const interactiveFlags = await promptInteractive({ userId: defaultUser, guildId: defaultGuild });
    if (!interactiveFlags) {
      process.exit(1);
    }
    flags = { ...flags, ...interactiveFlags };
  }

  // Validate numeric flags
  if (flags.level !== undefined && (!Number.isFinite(flags.level) || flags.level < 0)) {
    console.error(`❌ Invalid --level value "${flags.level}": must be a non-negative number.`);
    process.exit(1);
  }
  if (flags.xp !== undefined && (!Number.isFinite(flags.xp) || flags.xp < 0)) {
    console.error(`❌ Invalid --xp value "${flags.xp}": must be a non-negative number.`);
    process.exit(1);
  }
  if (flags.wallet !== undefined && (!Number.isFinite(flags.wallet) || flags.wallet < 0)) {
    console.error(`❌ Invalid --wallet value "${flags.wallet}": must be a non-negative number.`);
    process.exit(1);
  }
  if (flags.bank !== undefined && (!Number.isFinite(flags.bank) || flags.bank < 0)) {
    console.error(`❌ Invalid --bank value "${flags.bank}": must be a non-negative number.`);
    process.exit(1);
  }
  if (flags.streak !== undefined && (!Number.isFinite(flags.streak) || flags.streak < 0)) {
    console.error(`❌ Invalid --streak value "${flags.streak}": must be a non-negative integer.`);
    process.exit(1);
  }

  const userId = flags.user || defaultUser;
  if (!userId) {
    console.error(
      '❌ Missing user ID.\n' +
      '   Provide --user <userId> or set ADMIN_DISCORD_IDS in your .env.local file.',
    );
    process.exit(1);
  }

  const guildId = flags.guild || defaultGuild;
  if (!guildId) {
    console.error(
      '❌ Missing guild ID.\n' +
      '   Provide --guild <guildId> or set DISCORD_GUILD_ID in your .env.local file.',
    );
    process.exit(1);
  }

  const hasStatChanges =
    flags.level !== undefined ||
    flags.xp !== undefined ||
    flags.wallet !== undefined ||
    flags.bank !== undefined ||
    flags.streak !== undefined;

  console.log('📡 Connecting to MongoDB...');
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  try {
    // Retrieve existing records or initialize defaults
    let userLevel = await UserLevel.findOne({ guildId, userId });
    const isNewUserLevel = !userLevel;
    if (!userLevel) {
      userLevel = new UserLevel({
        guildId,
        userId,
        xp: 0,
        level: 0,
        totalMessages: 0,
        voiceSeconds: 0,
      });
    }

    let economyUser = await EconomyUser.findOne({ guildId, userId });
    const isNewEconomyUser = !economyUser;
    if (!economyUser) {
      economyUser = new EconomyUser({
        guildId,
        userId,
        wallet: 0,
        bank: 0,
        bankCapacity: 5000,
        dailyStreak: 0,
        inventory: [],
      });
    }

    // Capture Before state
    const beforeLevel = userLevel.level;
    const beforeXp = userLevel.xp;
    const beforeProg = getLevelFromXp(beforeXp);

    const beforeWallet = economyUser.wallet;
    const beforeBank = economyUser.bank;
    const beforeBankCapacity = economyUser.bankCapacity;
    const beforeStreak = economyUser.dailyStreak;

    // Apply Level & XP updates
    let levelStatus = 'UNCHANGED';
    let xpStatus = 'UNCHANGED';

    if (flags.level !== undefined && flags.xp !== undefined) {
      userLevel.level = Math.floor(flags.level);
      userLevel.xp = Math.floor(flags.xp);
      levelStatus = 'UPDATED';
      xpStatus = 'OVERRIDDEN';
    } else if (flags.level !== undefined) {
      const targetLevel = Math.floor(flags.level);
      userLevel.level = targetLevel;
      userLevel.xp = getTotalXpForLevel(targetLevel);
      levelStatus = 'UPDATED';
      xpStatus = 'RECALCULATED';
    } else if (flags.xp !== undefined) {
      const targetXp = Math.floor(flags.xp);
      userLevel.xp = targetXp;
      userLevel.level = getLevelFromXp(targetXp).level;
      levelStatus = 'RECALCULATED';
      xpStatus = 'OVERRIDDEN';
    }

    // Apply Economy updates
    let walletStatus = 'UNCHANGED';
    let bankStatus = 'UNCHANGED';
    let capacityStatus = 'UNCHANGED';
    let streakStatus = 'UNCHANGED';

    if (flags.wallet !== undefined) {
      economyUser.wallet = flags.wallet;
      walletStatus = 'UPDATED';
    }

    if (flags.bank !== undefined) {
      economyUser.bank = flags.bank;
      bankStatus = 'UPDATED';
      if (economyUser.bank > economyUser.bankCapacity) {
        economyUser.bankCapacity = economyUser.bank;
        capacityStatus = 'EXPANDED';
      }
    }

    if (flags.streak !== undefined) {
      economyUser.dailyStreak = Math.floor(flags.streak);
      streakStatus = 'UPDATED';
    }

    // Capture After state
    const afterLevel = userLevel.level;
    const afterXp = userLevel.xp;
    const afterProg = getLevelFromXp(afterXp);

    const afterWallet = economyUser.wallet;
    const afterBank = economyUser.bank;
    const afterBankCapacity = economyUser.bankCapacity;
    const afterStreak = economyUser.dailyStreak;

    // Persist to MongoDB if changes occurred and not dry-run
    if (hasStatChanges) {
      if (flags.dryRun) {
        console.log('\n🔍 [DRY-RUN] Changes simulated only. Database was NOT modified.');
      } else {
        const levelModified = flags.level !== undefined || flags.xp !== undefined;
        const economyModified =
          flags.wallet !== undefined || flags.bank !== undefined || flags.streak !== undefined;

        if (levelModified || isNewUserLevel) {
          await userLevel.save();
        }
        if (economyModified || isNewEconomyUser) {
          await economyUser.save();
        }
      }
    }

    // Build comparison table rows
    const progressStatus =
      levelStatus !== 'UNCHANGED' || xpStatus !== 'UNCHANGED' ? 'SYNCED' : 'UNCHANGED';

    const tableRows = [
      ['Level', String(beforeLevel), String(afterLevel), levelStatus],
      ['Cumulative XP', beforeXp.toLocaleString(), afterXp.toLocaleString(), xpStatus],
      [
        'Level Progress',
        `${beforeProg.xpIntoLevel.toLocaleString()} / ${beforeProg.xpForNextLevel.toLocaleString()} XP (${beforeProg.progressPercent}%)`,
        `${afterProg.xpIntoLevel.toLocaleString()} / ${afterProg.xpForNextLevel.toLocaleString()} XP (${afterProg.progressPercent}%)`,
        progressStatus,
      ],
      [
        'Progress Bar',
        renderProgressBar(beforeProg.progressPercent, 12),
        renderProgressBar(afterProg.progressPercent, 12),
        progressStatus,
      ],
      ['Wallet', `${beforeWallet.toLocaleString()} coins`, `${afterWallet.toLocaleString()} coins`, walletStatus],
      ['Bank', `${beforeBank.toLocaleString()} coins`, `${afterBank.toLocaleString()} coins`, bankStatus],
      [
        'Bank Capacity',
        `${beforeBankCapacity.toLocaleString()} coins`,
        `${afterBankCapacity.toLocaleString()} coins`,
        capacityStatus,
      ],
      ['Daily Streak', `${beforeStreak} days`, `${afterStreak} days`, streakStatus],
    ];

    console.log('\n================================================================================');
    console.log(`🎯 Target User:  ${userId}`);
    console.log(`🏠 Target Guild: ${guildId}`);
    if (flags.dryRun) {
      console.log('⚠️  Mode:         SIMULATION (Dry-Run)');
    }
    console.log('================================================================================\n');

    console.log(renderTable(['Stat', 'Before', 'After', 'Status'], tableRows));

    if (!hasStatChanges) {
      console.log('\nℹ️  No stat changes were specified. Displaying current MongoDB records.');
      console.log('   Pass options like --level, --xp, --wallet, --bank, --streak to update values.\n');
    } else if (flags.dryRun) {
      console.log('\n✅ Dry-run simulation completed successfully. No data was altered.\n');
    } else {
      console.log('\n✅ User stats successfully updated and saved in MongoDB!\n');
    }
  } finally {
    await mongoose.disconnect();
  }
}

// Execute when invoked directly
if (process.argv[1] && process.argv[1].endsWith('set-user-stats.ts')) {
  run().catch((err: unknown) => {
    console.error('❌ Unhandled error:', err);
    process.exit(1);
  });
}
