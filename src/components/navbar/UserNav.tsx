'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Server,
  CreditCard,
  LogOut,
  ChevronDown,
  User,
  ShieldAlert,
} from 'lucide-react';
import { isDemoMode, MOCK_USER } from '@/lib/demo-mode';

export function UserNav() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Demo mode check
  let demoActive = false;
  try {
    demoActive = isDemoMode();
  } catch {
    demoActive = false;
  }

  // Active user data (either from live session or fallback to mock user if demo mode active)
  const user = session?.user || (demoActive ? MOCK_USER : null);

  // Loading skeleton while session status is resolving
  if (status === 'loading' && !demoActive) {
    return (
      <div className="w-20 h-9 rounded-xl bg-white/5 animate-pulse border border-white/10" />
    );
  }

  // Logged-out state
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium text-gray-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-cyan-500/40 transition-all shadow-sm"
      >
        {/* Discord Icon */}
        <svg
          className="w-4 h-4 fill-current text-[#5865F2]"
          viewBox="0 0 127.14 96.36"
        >
          <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
        </svg>
        <span>Login</span>
      </Link>
    );
  }

  // Logged-in state with avatar dropdown
  const displayName = user.global_name || user.name || 'Discord User';
  const avatarUrl = user.image || 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30 transition-all text-xs font-mono text-gray-200 focus:outline-none"
        aria-expanded={isOpen}
      >
        <span className="hidden sm:inline font-semibold max-w-[120px] truncate">
          {displayName}
        </span>
        <div className="relative w-7 h-7 rounded-full overflow-hidden border border-cyan-500/40 shrink-0 bg-gray-800">
          <Image
            src={avatarUrl}
            alt={displayName}
            width={28}
            height={28}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#090d1a]/95 border border-white/10 shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User Header */}
          <div className="p-2 border-b border-white/10 mb-1">
            <p className="text-xs font-semibold text-white truncate font-mono">
              {displayName}
            </p>
            {user.isAdminOfAppOwner && (
              <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 font-mono font-medium mt-0.5">
                <ShieldAlert className="w-3 h-3" />
                App Owner Admin
              </span>
            )}
          </div>

          {/* Links */}
          <div className="space-y-1 text-xs font-mono">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Server className="w-4 h-4 text-indigo-400" />
              <span>Switch Server</span>
            </Link>

            <Link
              href="/#pricing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Billing &amp; Plans</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="pt-2 border-t border-white/10 mt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-xs font-mono text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
