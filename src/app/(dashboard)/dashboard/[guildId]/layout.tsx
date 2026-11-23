import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Shield,
  Bot,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { requireGuildAccess } from '@/lib/discord/require-guild-access';
import {
  UnauthenticatedError,
  ForbiddenError,
  BotNotInGuildError,
} from '@/lib/discord/errors';
import { logAudit } from '@/lib/audit';
import { getGuildDashboardData } from '@/lib/discord/server-data';
import { getBotInviteUrl } from '@/lib/discord/invite';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardTopNav } from '@/components/dashboard/DashboardTopNav';

export const instant = false;

export default async function GuildConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;

  let accessResult;
  try {
    accessResult = await requireGuildAccess(guildId);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      redirect(`/login?callbackUrl=/dashboard/${guildId}`);
    }

    if (err instanceof BotNotInGuildError) {
      const inviteUrl = getBotInviteUrl({ guildId });

      return (
        <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-[#0b111e] border border-amber-500/30 text-center space-y-6 shadow-2xl shadow-amber-500/5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono uppercase tracking-wider">
              Integration Required
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">AiCord Bot Not Installed</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              You hold administrative rights to this Discord server, but the AiCord bot engine is not present yet. Add the bot to enable real-time AI architectural builds and 24/7 automod defense.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Choose Another Server</span>
            </Link>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs font-mono shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" />
              <span>Invite AiCord Bot Now</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      );
    }

    // Forbidden or missing guild
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-[#0b111e] border border-red-500/30 text-center space-y-6 shadow-2xl shadow-red-500/5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 text-[11px] font-mono uppercase tracking-wider">
            Access Unauthorized
          </span>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Administrative Shield Active</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            {err instanceof ForbiddenError
              ? err.message
              : 'You do not have administrative or server management authorization on this Discord server.'}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Server Cluster</span>
          </Link>
        </div>
      </div>
    );
  }

  const { guild, session } = accessResult;

  // Log audit checkpoint
  await logAudit({
    guildId,
    userId: session.user.id,
    action: 'guild_console_accessed',
    metadata: { guildName: guild.name },
  });

  // Fetch normalized dashboard server data
  const dashboardData = await getGuildDashboardData(guildId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-200">
      {/* Discrofy Sidebar Navigation */}
      <DashboardSidebar guild={dashboardData.guild} />

      {/* Main Command Center Console Body */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        <DashboardTopNav guild={dashboardData.guild} />
        <main>{children}</main>
      </div>
    </div>
  );
}
