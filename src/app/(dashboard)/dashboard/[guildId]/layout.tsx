import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  Shield,
  Bot,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { requireGuildAccess } from '@/lib/discord/require-guild-access';
import {
  UnauthenticatedError,
  ForbiddenError,
  BotNotInGuildError,
} from '@/lib/discord/errors';
import { logAudit } from '@/lib/audit';

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
      return (
        <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">AiCord Bot Not Installed</h2>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              You have permission to manage this server, but the AiCord bot has not been invited yet.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-gray-300"
            >
              Choose Server
            </Link>
            <Link
              href={`/dashboard`}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono"
            >
              Invite Bot Now
            </Link>
          </div>
        </div>
      );
    }

    // Forbidden or missing guild
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-xs text-red-200/80 leading-relaxed">
            {err instanceof ForbiddenError
              ? err.message
              : 'You do not have administrative authorization to access this server console.'}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors"
          >
            Return to Server Cluster
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

  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : null;

  const initials = guild.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Guild Context Navigation Bar */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          {/* Guild Icon */}
          <div className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-tr from-cyan-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-xs font-bold font-mono text-cyan-300">
            {iconUrl ? (
              <Image
                src={iconUrl}
                alt={guild.name}
                width={44}
                height={44}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span>{initials || 'DC'}</span>
            )}
          </div>

          {/* Guild Details & Status Badge */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">
                {guild.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                <CheckCircle2 className="w-3 h-3" />
                Bot Active
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <span className="text-[11px] text-gray-500">ID: {guild.id}</span>
              <span>•</span>
              <span className="text-cyan-400">
                {guild.owner ? 'Owner Privileges' : 'Manager Privileges'}
              </span>
            </div>
          </div>
        </div>

        {/* Guild Switcher Dropdown Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch Server</span>
          </Link>
        </div>
      </div>

      {/* Guild Subpages Content */}
      <div>{children}</div>
    </div>
  );
}
