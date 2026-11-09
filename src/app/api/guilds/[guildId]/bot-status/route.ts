/**
 * src/app/api/guilds/[guildId]/bot-status/route.ts
 * Endpoint for polling whether the AiCord bot has joined a target Discord guild.
 */

import { NextResponse } from 'next/server';
import { getBotGuildsProvider } from '@/lib/discord/bot-guilds';
import { isDemoMode, getDemoGuilds } from '@/lib/demo-mode';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  if (!guildId) {
    return NextResponse.json(
      { error: 'MissingGuildId', message: 'Guild ID is required' },
      { status: 400 }
    );
  }

  if (isDemoMode()) {
    const demoGuilds = getDemoGuilds();
    const g = demoGuilds.find((dg) => dg.id === guildId);
    return NextResponse.json({
      guildId,
      present: g ? g.botPresent : false,
      isDemo: true,
    });
  }

  const botProvider = getBotGuildsProvider();
  const botGuildIds = await botProvider.getBotGuildIds();
  const present = botGuildIds.has(guildId);

  return NextResponse.json({
    guildId,
    present,
    isDemo: false,
  });
}
