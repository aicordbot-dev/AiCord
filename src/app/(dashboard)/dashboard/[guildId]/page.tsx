import React from 'react';
import { requireGuildAccess } from '@/lib/discord/require-guild-access';
import { getGuildDashboardData } from '@/lib/discord/server-data';
import { AiBuilderConsole } from '@/components/dashboard/AiBuilderConsole';

export const instant = false;

export default async function GuildConsolePage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);

  // Fetch real/fallback normalized server topology
  const dashboardData = await getGuildDashboardData(guildId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AiBuilderConsole initialData={dashboardData} guildId={guildId} />
    </div>
  );
}
