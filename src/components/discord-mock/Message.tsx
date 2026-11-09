'use client';

/**
 * src/components/discord-mock/Message.tsx
 * Authentic Discord chat message container with user/bot avatar, APP/BOT badge,
 * timestamp, and message body.
 */

import React from 'react';
import { AiCordMark } from '@/components/brand/AiCordMark';

export interface DiscordMessageAuthor {
  name: string;
  avatarUrl?: string;
  isBot?: boolean;
  botBadgeText?: 'APP' | 'BOT';
  roleColor?: string;
}

export interface DiscordMessageProps {
  author?: DiscordMessageAuthor;
  timestamp?: string;
  commandExecution?: {
    user: string;
    command: string;
    avatarUrl?: string;
  };
  content?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function DiscordMessage({
  author = {
    name: 'AiCord',
    isBot: true,
    botBadgeText: 'APP',
    roleColor: '#00F0FF',
  },
  timestamp = 'Today at 12:45 PM',
  commandExecution,
  content,
  children,
  className = '',
}: DiscordMessageProps) {
  return (
    <div
      className={`group relative flex flex-col gap-1.5 p-3 sm:p-4 rounded-xl bg-[#313338]/90 hover:bg-[#313338] transition-colors border border-white/5 font-sans text-xs sm:text-sm text-[#DBDEE1] shadow-xl ${className}`}
    >
      {/* Optional Command Execution Header (e.g., user used /build) */}
      {commandExecution && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 pl-1 mb-1 font-sans">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[9px] text-cyan-300 font-bold shrink-0">
            {commandExecution.user.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-gray-300">{commandExecution.user}</span>
          <span className="text-gray-500">used</span>
          <span className="font-mono text-cyan-400 font-semibold px-1 py-0.2 rounded bg-cyan-500/10 text-[11px]">
            {commandExecution.command}
          </span>
        </div>
      )}

      {/* Main Message Row */}
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {author.isBot ? (
            <div className="w-10 h-10 rounded-full bg-[#1E1F22] p-1.5 border border-cyan-500/30 shadow-md flex items-center justify-center">
              <AiCordMark size={28} variant="tile" />
            </div>
          ) : author.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt={author.name}
              className="w-10 h-10 rounded-full object-cover shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md">
              {author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header Row: Username + APP Badge + Timestamp */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold font-sans hover:underline cursor-pointer text-sm"
              style={{ color: author.roleColor || '#FFFFFF' }}
            >
              {author.name}
            </span>

            {author.isBot && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-sans bg-[#5865F2] text-white tracking-wide uppercase leading-none">
                <svg
                  className="w-2.5 h-2.5 fill-current"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M13.5 2h-11C1.67 2 1 2.67 1 3.5v9C1 13.33 1.67 14 2.5 14h11c.83 0 1.5-.67 1.5-1.5v-9c0-.83-.67-1.5-1.5-1.5zm-6.8 9.3L3.8 8.4l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1-5.5 5.5z" />
                </svg>
                {author.botBadgeText || 'APP'}
              </span>
            )}

            <span className="text-[11px] text-gray-400 font-sans">{timestamp}</span>
          </div>

          {/* Text Content */}
          {content && (
            <div className="text-gray-200 leading-relaxed break-words font-sans text-xs sm:text-sm">
              {content}
            </div>
          )}

          {/* Embeds and interactive components */}
          {children && <div className="space-y-2 pt-1">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export default DiscordMessage;
