/**
 * scripts/register-commands.ts
 * Registers all slash commands with Discord via REST.
 *
 * Usage:
 *   # Register globally (all servers, up to 1h propagation):
 *   pnpm tsx scripts/register-commands.ts
 *
 *   # Register to a specific guild for instant testing:
 *   DISCORD_GUILD_ID=your_guild_id pnpm tsx scripts/register-commands.ts
 */

import { REST, DiscordAPIError } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { COMMANDS } from '../src/lib/discord/command-definitions';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Optional: for guild-scoped dev commands

if (!APP_ID || !BOT_TOKEN) {
  console.error(
    '❌ Missing required environment variables: DISCORD_APP_ID, DISCORD_BOT_TOKEN\n' +
    '   Make sure your .env.local file is populated.',
  );
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

async function registerCommands(): Promise<void> {
  const commands = COMMANDS;
  console.log(`📋 Registering ${commands.length} commands...`);

  if (GUILD_ID) {
    // Guild-specific registration (instant, good for development)
    console.log(`🏠 Registering to guild ${GUILD_ID} (instant)...`);
    await rest.put(Routes.applicationGuildCommands(APP_ID!, GUILD_ID), {
      body: commands,
    });
    console.log(`✅ Successfully registered ${commands.length} guild commands.`);
    console.log(`\nCommands registered for guild ${GUILD_ID}:`);
  } else {
    // Global registration (up to 1 hour to propagate)
    console.log('🌐 Registering globally (may take up to 1 hour to propagate)...');
    await rest.put(Routes.applicationCommands(APP_ID!), {
      body: commands,
    });
    console.log(`✅ Successfully registered ${commands.length} global commands.`);
    console.log('\nGlobal commands registered:');
  }

  for (const cmd of commands) {
    console.log(`  /${cmd.name} — ${cmd.description}`);
  }

  console.log('\n💡 Tip: Set DISCORD_GUILD_ID in your .env.local to register to a specific guild');
  console.log('    for instant updates during development.\n');
}

registerCommands().catch((err: unknown) => {
  const isMissingAccess =
    (err instanceof DiscordAPIError && (err.code === 50001 || Number(err.code) === 50001)) ||
    (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 50001) ||
    (err instanceof Error && err.message.includes('50001'));

  const isUnknownGuild =
    (err instanceof DiscordAPIError && (err.code === 10004 || Number(err.code) === 10004)) ||
    (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 10004);

  if (isMissingAccess) {
    console.error('\n❌ DiscordAPIError[50001]: Missing Access');
    console.error(`   The bot lacks access to register slash commands in guild ${GUILD_ID}.\n`);
    console.error('Possible causes:');
    console.error('  1. The bot has not been invited to this server yet.');
    console.error('  2. The bot was invited without the "applications.commands" scope.\n');
    console.error('👉 Fix: Invite your bot to the server using this authorization link (with Administrator & applications.commands scope):');
    console.error(`   https://discord.com/oauth2/authorize?client_id=${APP_ID}&permissions=8&scope=bot%20applications.commands\n`);
    console.error('💡 Prefer global commands?');
    console.error('   Remove or comment out DISCORD_GUILD_ID in your .env.local and run:');
    console.error('   pnpm register-commands');
    console.error('   (Note: Global command updates can take up to 1 hour to propagate across Discord.)\n');
  } else if (isUnknownGuild) {
    console.error('\n❌ DiscordAPIError[10004]: Unknown Guild');
    console.error(`   Guild ID "${GUILD_ID}" was not found. Please verify DISCORD_GUILD_ID in your .env.local file.\n`);
  } else {
    console.error('❌ Failed to register commands:', err);
  }
  process.exit(1);
});
