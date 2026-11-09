'use client';

/**
 * src/components/discord-mock/SlashCommand.tsx
 * Discord Slash Command execution preview pill with parameter chips.
 */

import React from 'react';

export interface SlashCommandParam {
  name: string;
  value: string;
}

export interface SlashCommandProps {
  command?: string;
  user?: {
    name: string;
    avatarUrl?: string;
  };
  params?: SlashCommandParam[];
  className?: string;
  onClick?: () => void;
}

export function SlashCommand({
  command = '/build',
  user = {
    name: 'alex',
  },
  params = [
    {
      name: 'prompt',
      value: 'Esports tournament guild with scrim voice rooms and verified rank gates',
    },
  ],
  className = '',
  onClick,
}: SlashCommandProps) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center flex-wrap gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E1F22]/90 border border-[#2B2D31] hover:border-cyan-500/40 transition-colors text-xs font-mono shadow-sm select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* User Executed Indicator */}
      <div className="flex items-center gap-1.5 text-gray-400 font-sans">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-4 h-4 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-gray-300 text-xs">{user.name}</span>
        <span className="text-gray-500 text-[11px]">used</span>
      </div>

      {/* Command Name */}
      <span className="text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
        {command}
      </span>

      {/* Parameter Chips */}
      {params.map((param, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-gray-300 max-w-xs sm:max-w-md truncate"
        >
          <span className="text-purple-400 font-semibold">{param.name}:</span>
          <span className="text-gray-200 truncate font-sans text-xs">
            &quot;{param.value}&quot;
          </span>
        </span>
      ))}
    </div>
  );
}

export default SlashCommand;
