'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  AlertTriangle,
  Plus,
  X,
  Save,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  getFallbackGuildData,
  calculateSecurityScore,
  type AutomodSettings,
  type AutomodRule,
} from '@/lib/discord/server-data';

export default function AutoModPage() {
  const params = useParams<{ guildId: string }>();
  const guildId = params?.guildId || '111111111111111111';

  const defaultData = getFallbackGuildData(guildId);

  const [settings, setSettings] = useState<AutomodSettings>(defaultData.automodSettings);
  const [rules, setRules] = useState<AutomodRule[]>(defaultData.automodRules);
  const [newBadWord, setNewBadWord] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentScore = calculateSecurityScore(settings);

  const handleToggle = (key: keyof Omit<AutomodSettings, 'mentionSpamThreshold' | 'badWords' | 'autoTimeoutDuration'>) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const addBadWord = () => {
    if (!newBadWord.trim()) return;
    const clean = newBadWord.trim().toLowerCase();
    if (!settings.badWords.includes(clean)) {
      setSettings((prev) => ({
        ...prev,
        badWords: [...prev.badWords, clean],
      }));
    }
    setNewBadWord('');
    setSaveSuccess(false);
  };

  const removeBadWord = (word: string) => {
    setSettings((prev) => ({
      ...prev,
      badWords: prev.badWords.filter((w) => w !== word),
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSaving(false);
    setSaveSuccess(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner & Score */}
      <div className="p-6 rounded-3xl bg-[#0b111e] border border-[#1e293b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Discrofy Sentinel Security
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            AutoMod & Content Defense
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Real-time heuristic link inspection, rapid flood mitigation, automated timeouts, and Gemini-powered sentiment filtering.
          </p>
        </div>

        {/* Live Security Meter */}
        <div className="p-4 rounded-2xl bg-[#070d16] border border-[#1e293b] flex items-center gap-4 shrink-0">
          <div className="relative flex items-center justify-center">
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-emerald-400">
                {currentScore}
              </span>
              <span className="text-xs font-mono text-slate-500">/100</span>
            </div>
            <span className="text-[11px] font-mono text-slate-300 block">
              Fortress Defense Grade
            </span>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono text-emerald-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>AutoMod security configuration persisted to server gateway.</span>
          </div>
          <button onClick={() => setSaveSuccess(false)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Protection Toggles */}
        <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Autonomous Shields
            </h3>
            <span className="text-[10px] font-mono text-slate-500">REAL-TIME</span>
          </div>

          <div className="space-y-4">
            {/* Anti-Invite */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b]">
              <div className="space-y-0.5 max-w-[80%]">
                <span className="text-xs font-bold text-white font-mono block">Anti-Invite Links</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Blocks discord.gg links from non-staff members in general channels.
                </p>
              </div>
              <button
                onClick={() => handleToggle('antiInvite')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.antiInvite ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-black transition-transform ${
                    settings.antiInvite ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Anti-Spam */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b]">
              <div className="space-y-0.5 max-w-[80%]">
                <span className="text-xs font-bold text-white font-mono block">Rapid Message Anti-Spam</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Prevents automated copy-paste floods and repetitive emojis.
                </p>
              </div>
              <button
                onClick={() => handleToggle('antiSpam')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.antiSpam ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-black transition-transform ${
                    settings.antiSpam ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* AI Sentiment Guard */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b]">
              <div className="space-y-0.5 max-w-[80%]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-mono block">AI Toxicity & Slur Shield</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono">
                    GEMINI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Natural language model identifies hate speech and targeted attacks.
                </p>
              </div>
              <button
                onClick={() => handleToggle('aiSentimentGuard')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.aiSentimentGuard ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-black transition-transform ${
                    settings.aiSentimentGuard ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Thresholds & Timeouts */}
        <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Enforcement Thresholds
            </h3>
            <Sliders className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-5">
            {/* Mention Spam Threshold Slider */}
            <div className="p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b] space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-bold">Mass Mention Limit</span>
                <span className="text-cyan-400 font-extrabold">{settings.mentionSpamThreshold} mentions</span>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                value={settings.mentionSpamThreshold}
                onChange={(e) => {
                  setSettings({ ...settings, mentionSpamThreshold: Number(e.target.value) });
                  setSaveSuccess(false);
                }}
                className="w-full accent-cyan-400 bg-slate-800"
              />
              <span className="text-[10px] text-slate-500 block">
                Messages containing more than {settings.mentionSpamThreshold} user or role mentions are instantly quarantined.
              </span>
            </div>

            {/* Auto-Timeout Duration Selector */}
            <div className="p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b] space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-bold">Punitive Timeout Duration</span>
                <span className="text-cyan-400 font-extrabold">
                  {settings.autoTimeoutDuration < 3600
                    ? `${settings.autoTimeoutDuration / 60} minutes`
                    : `${settings.autoTimeoutDuration / 3600} hours`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '60s', seconds: 60 },
                  { label: '5m', seconds: 300 },
                  { label: '10m', seconds: 600 },
                  { label: '1h', seconds: 3600 },
                ].map((t) => (
                  <button
                    key={t.seconds}
                    onClick={() => {
                      setSettings({ ...settings, autoTimeoutDuration: t.seconds });
                      setSaveSuccess(false);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-mono transition-all ${
                      settings.autoTimeoutDuration === t.seconds
                        ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-[#0b111e] text-slate-400 hover:text-white border border-[#1e293b]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bad Words & Phrases Filter */}
      <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Restricted Phrases & Heuristic Patterns
            </h3>
            <p className="text-xs text-slate-400">
              Matches wildcard substrings and phishing domain triggers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {settings.badWords.map((word) => (
            <span
              key={word}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#070d16] border border-[#1e293b] text-xs font-mono text-slate-200"
            >
              <span>{word}</span>
              <button
                onClick={() => removeBadWord(word)}
                className="text-slate-500 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 max-w-md pt-2">
          <input
            type="text"
            value={newBadWord}
            onChange={(e) => setNewBadWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addBadWord();
            }}
            placeholder="Add restricted domain or keyword..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-[#070d16] border border-[#1e293b] text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={addBadWord}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Active Rules Audit Ledger */}
      <div className="p-5 rounded-3xl bg-[#0b111e] border border-[#1e293b] space-y-3 shadow-xl">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider pb-2 border-b border-[#1e293b]">
          Active AutoMod Telemetry
        </h3>

        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-3.5 rounded-2xl bg-[#070d16] border border-[#1e293b] flex items-center justify-between gap-4 text-xs font-mono"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-white font-bold block">{rule.name}</span>
                <span className="text-slate-400 text-[11px] block">{rule.description}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                    rule.severity === 'critical'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : rule.severity === 'high'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  }`}
                >
                  {rule.severity}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {rule.triggers} caught
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Changes Floating Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs font-mono shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving AutoMod Matrix...' : 'Save AutoMod Settings'}</span>
        </button>
      </div>
    </div>
  );
}
