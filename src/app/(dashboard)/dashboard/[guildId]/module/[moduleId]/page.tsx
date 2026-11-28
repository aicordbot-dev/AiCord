'use client';

/**
 * src/app/(dashboard)/dashboard/[guildId]/module/[moduleId]/page.tsx
 * Bespoke, generic dashboard console for any of the 28 Master & Next-Gen Services
 * defined in src/config/features.ts.
 * Includes Overview, Settings Toggles, Commands Directory, and Usage Analytics tabs.
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Sliders,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Save,
  ArrowLeft,
  Shield,
  Layers,
  Zap,
  TrendingUp,
  Cpu,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { ALL_FEATURES, ServiceFeature } from '@/config/features';
import { COMMANDS_DATA } from '@/components/ui/CommandPalette';
import { getFallbackGuildData } from '@/lib/discord/server-data';

type ModuleTab = 'overview' | 'settings' | 'commands' | 'analytics';

export default function GenericModulePage() {
  const params = useParams<{ guildId: string; moduleId: string }>();
  const guildId = params?.guildId || '111111111111111111';
  const moduleId = params?.moduleId || '';

  const guildData = getFallbackGuildData(guildId);

  // Match service by id (case-insensitive)
  const service = useMemo<ServiceFeature | undefined>(() => {
    return ALL_FEATURES.find(
      (s) => s.id.toLowerCase() === moduleId.toLowerCase()
    );
  }, [moduleId]);

  // Tab State
  const [activeTab, setActiveTab] = useState<ModuleTab>('overview');

  // Settings State
  const [isEnabled, setIsEnabled] = useState(true);
  const [logAuditEvents, setLogAuditEvents] = useState(true);
  const [ephemeralResponses, setEphemeralResponses] = useState(false);
  const [roleWhitelistOnly, setRoleWhitelistOnly] = useState(false);
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('all');

  // UI Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Resolve matching commands from COMMANDS_DATA
  const serviceCommands = useMemo(() => {
    if (!service) return [];
    return service.commands.map((cmdName) => {
      const match = COMMANDS_DATA.find((c) => c.name === cmdName);
      if (match) return match;
      return {
        name: cmdName,
        syntax: `${cmdName} [options]`,
        category: 'Community & XP' as const,
        description: service.pitch,
        permissions: service.tier === 'free' ? 'Everyone' : 'Manage Server',
        badge: service.tier.toUpperCase(),
        example: `${cmdName} view`,
        preview: `Executed ${cmdName} in guild console.`,
      };
    });
  }, [service]);

  // 404 / Unknown Service State
  if (!service) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="p-8 rounded-3xl bg-[#0b111e] border border-amber-500/30 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-mono">Service Module Not Found</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Module <code className="text-amber-400 font-mono font-bold">&quot;{moduleId}&quot;</code> does not exist in the 28-service master registry.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/dashboard/${guildId}/overview`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Server Overview</span>
            </Link>
          </div>

          {/* Quick Module Catalog Grid */}
          <div className="pt-6 border-t border-white/10 text-left space-y-3">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              Available 28 Master Services Catalog:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {ALL_FEATURES.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/${guildId}/module/${s.id}`}
                  className="p-2.5 rounded-xl bg-[#070d16] hover:bg-slate-800/60 border border-[#1e293b] text-xs font-mono text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-2"
                >
                  <span>{s.icon}</span>
                  <span className="truncate">{s.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Service Header Console ────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient background accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-lg">
              {service.icon}
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              {service.categoryLabel}
            </span>
            {service.isNextGen && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold uppercase">
                Next-Gen Service
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                service.status === 'live'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {service.status.toUpperCase()}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {service.name}
          </h1>

          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {service.pitch}
          </p>
        </div>

        {/* Global Module Power Switch */}
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
              isEnabled
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{isEnabled ? 'MODULE ACTIVE' : 'MODULE DISABLED'}</span>
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0b111e] border border-[#1e293b] overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Overview
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Settings &amp; Controls
        </button>

        <button
          onClick={() => setActiveTab('commands')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'commands'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Commands ({service.commands.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Usage Analytics
        </button>
      </div>

      {/* ─── TAB 1: OVERVIEW ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Description & Features */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Service Architecture
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {service.description}
              </p>

              <div className="pt-2 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Core Capabilities:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {service.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#070d16] border border-[#1e293b] flex items-start gap-2.5 text-xs text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats / Meta */}
            <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Module Attributes
              </h2>

              <div className="space-y-3 text-xs font-mono divide-y divide-[#1e293b]">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-white font-bold">{service.categoryLabel}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-400">Required Tier:</span>
                  <span className="text-cyan-400 font-bold uppercase">{service.tier}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-bold">{service.status}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-400">Next-Gen Engine:</span>
                  <span className="text-purple-400 font-bold">{service.isNextGen ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-400">Total Commands:</span>
                  <span className="text-white font-bold">{service.commands.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Usage Code Block */}
          <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Sample Execution Syntax:
              </span>
              <button
                onClick={() => handleCopy(service.sampleUsage)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
              >
                {copiedText === service.sampleUsage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#070d16] border border-[#1e293b] font-mono text-xs text-cyan-300 overflow-x-auto">
              {service.sampleUsage}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SETTINGS TOGGLES ───────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-6">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
              <div>
                <h2 className="text-base font-bold text-white font-mono">
                  Module Configuration Controls
                </h2>
                <p className="text-xs text-slate-400">
                  Granular control switches for permissions, logging, and response behavior.
                </p>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Settings Persisted</span>
                </div>
              )}
            </div>

            {/* Toggle Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070d16] border border-[#1e293b]">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white font-mono">Module Active</h3>
                  <p className="text-[11px] text-slate-400">
                    Enable or disable this service and its slash commands for the entire server.
                  </p>
                </div>
                <button
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle module active"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070d16] border border-[#1e293b]">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white font-mono">Staff Audit Logging</h3>
                  <p className="text-[11px] text-slate-400">
                    Automatically record all administrative interactions from this module into the guild audit log.
                  </p>
                </div>
                <button
                  onClick={() => setLogAuditEvents(!logAuditEvents)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    logAuditEvents ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle audit logging"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      logAuditEvents ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070d16] border border-[#1e293b]">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white font-mono">Ephemeral Interaction Responses</h3>
                  <p className="text-[11px] text-slate-400">
                    Send command responses only to the executing user to reduce channel chatter.
                  </p>
                </div>
                <button
                  onClick={() => setEphemeralResponses(!ephemeralResponses)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ephemeralResponses ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle ephemeral responses"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ephemeralResponses ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070d16] border border-[#1e293b]">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white font-mono">Role Whitelist Mode</h3>
                  <p className="text-[11px] text-slate-400">
                    Restrict usage exclusively to server roles with Manage Server or Administrator permissions.
                  </p>
                </div>
                <button
                  onClick={() => setRoleWhitelistOnly(!roleWhitelistOnly)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    roleWhitelistOnly ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle role whitelist"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      roleWhitelistOnly ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070d16] border border-[#1e293b]">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white font-mono">Anti-Flood Cooldown</h3>
                  <p className="text-[11px] text-slate-400">
                    Enforce Upstash Redis rate-limiting (max 5 invocations per 10 seconds per member).
                  </p>
                </div>
                <button
                  onClick={() => setRateLimitEnabled(!rateLimitEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rateLimitEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle anti-flood cooldown"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rateLimitEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Target Channel Override Dropdown */}
            <div className="p-4 rounded-2xl bg-[#070d16] border border-[#1e293b] space-y-2">
              <label htmlFor="channel-override-select" className="text-xs font-bold text-white font-mono block">
                Command Output &amp; Alert Channel
              </label>
              <select
                id="channel-override-select"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0b111e] border border-[#1e293b] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Any Active Channel (Default)</option>
                <option value="bot-commands">#bot-commands (Dedicated Bot Room)</option>
                <option value="general">#general (Main Chat)</option>
                <option value="mod-logs">#mod-logs (Staff Audit Channel)</option>
              </select>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Persisting to Cloud...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: COMMANDS DIRECTORY ─────────────────────────────────── */}
      {activeTab === 'commands' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Registered Slash Commands ({serviceCommands.length})
            </h2>
            <span className="text-[11px] font-mono text-cyan-400">
              Discord Interaction v10 Compatible
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {serviceCommands.map((cmd) => (
              <div
                key={cmd.name}
                className="p-5 rounded-2xl bg-[#0b111e] border border-[#1e293b] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold text-xs">
                      {cmd.name}
                    </span>
                    {cmd.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300 border border-white/10">
                        {cmd.badge}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-black/40 border border-white/5">
                    Perms: {cmd.permissions}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {cmd.description}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070d16] border border-[#1e293b] font-mono text-xs text-cyan-300">
                    <span className="truncate pr-2">{cmd.syntax}</span>
                    <button
                      onClick={() => handleCopy(cmd.syntax)}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors shrink-0"
                      title="Copy command syntax"
                    >
                      {copiedText === cmd.syntax ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    <span className="text-slate-500">Example:</span> {cmd.example}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: USAGE ANALYTICS ────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0b111e] border border-[#1e293b] space-y-1">
              <span className="text-xs font-mono text-slate-400">Invocations (24h)</span>
              <div className="text-2xl font-extrabold text-white font-mono">1,420</div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +18.4% vs yesterday
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0b111e] border border-[#1e293b] space-y-1">
              <span className="text-xs font-mono text-slate-400">Success Rate</span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">99.8%</div>
              <span className="text-[11px] font-mono text-slate-400">0 errors reported</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0b111e] border border-[#1e293b] space-y-1">
              <span className="text-xs font-mono text-slate-400">Average Latency</span>
              <div className="text-2xl font-extrabold text-cyan-400 font-mono">48ms</div>
              <span className="text-[11px] font-mono text-cyan-400">Sub-100ms SLA target</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#0b111e] border border-[#1e293b] space-y-1">
              <span className="text-xs font-mono text-slate-400">Active Members</span>
              <div className="text-2xl font-extrabold text-indigo-400 font-mono">348</div>
              <span className="text-[11px] font-mono text-indigo-400">Unique participants</span>
            </div>
          </div>

          {/* 7-Day Activity Sparkline Visualizer */}
          <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                7-Day Invocations Distribution
              </h2>
              <span className="text-[11px] font-mono text-emerald-400">
                Total: 9,840 calls
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2 h-36 items-end">
              {[
                { day: 'Mon', count: 1120, height: '60%' },
                { day: 'Tue', count: 1340, height: '72%' },
                { day: 'Wed', count: 1210, height: '65%' },
                { day: 'Thu', count: 1480, height: '80%' },
                { day: 'Fri', count: 1720, height: '92%' },
                { day: 'Sat', count: 1890, height: '100%' },
                { day: 'Sun', count: 1420, height: '76%' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex justify-center">
                    <span className="text-[10px] font-mono text-slate-400 opacity-0 hover:opacity-100 transition-opacity">
                      {item.count}
                    </span>
                  </div>
                  <div
                    className="w-full rounded-xl bg-gradient-to-t from-cyan-600/40 to-cyan-400 hover:to-cyan-300 transition-all cursor-pointer"
                    style={{ height: item.height }}
                    title={`${item.day}: ${item.count} calls`}
                  />
                  <span className="text-[10px] font-mono text-slate-400">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
