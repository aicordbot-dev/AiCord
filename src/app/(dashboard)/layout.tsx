'use client';

import React from 'react';
import Link from 'next/link';
import { Bot } from 'lucide-react';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { UserNav } from '@/components/navbar/UserNav';
import { siteConfig } from '@/config/site';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Dashboard Global Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070913]/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-gray-200 hover:text-white transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight font-mono text-base">
                {siteConfig.name}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 block -mt-1 tracking-wider uppercase">
                Console // v{siteConfig.version}
              </span>
            </div>
          </Link>

          {/* Quick Controls */}
          <div className="flex items-center gap-3">
            <ThemePicker variant="navbar" />
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
