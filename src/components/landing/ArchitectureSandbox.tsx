'use client';

import React, { useState } from 'react';

type PresetId = 'gaming' | 'developer' | 'creator' | 'academic';

interface ChannelItem {
  name: string;
  type: 'text' | 'voice' | 'announcement' | 'locked';
  topic?: string;
  unread?: boolean;
}

interface CategoryGroup {
  name: string;
  channels: ChannelItem[];
}

interface BlueprintPreset {
  id: PresetId;
  name: string;
  icon: string;
  tagline: string;
  prompt: string;
  stats: { channels: number; roles: number; categories: number; deployTime: string };
  categories: CategoryGroup[];
  rules: string[];
}

const PRESETS: Record<PresetId, BlueprintPreset> = {
  gaming: {
    id: 'gaming',
    name: 'Gaming & Esports Hub',
    icon: '🎮',
    tagline: 'High-octane tournament community with automated scrims and clips',
    prompt: '/build prompt: "High-octane competitive gaming hub with scrim rooms, gaming clip contest, 24/7 lofi radio, and boss raid arena"',
    stats: { channels: 18, roles: 12, categories: 4, deployTime: '3.4s' },
    rules: [
      '1. Respect team captains and tournament organizers.',
      '2. No toxicity or harassment in voice channels or scrims.',
      '3. Submit high-definition gameplay clips only in #clip-contest.',
      '4. Matchmaking queues are strictly regulated by AiCord bots.',
    ],
    categories: [
      {
        name: 'WELCOME & INTEL',
        channels: [
          { name: 'announcements', type: 'announcement', topic: 'Official tournament notices' },
          { name: 'rules-and-roles', type: 'text', topic: 'Select your team & game tags' },
          { name: 'server-roadmap', type: 'text', topic: 'Season prize pool announcements' },
        ],
      },
      {
        name: 'TEXT ARENAS',
        channels: [
          { name: 'general-chat', type: 'text', topic: 'Main lobby for banter and memes', unread: true },
          { name: 'lfg-matchmaking', type: 'text', topic: 'Assemble your ranked 5-stack' },
          { name: 'clip-contest', type: 'text', topic: 'Vote on community highlights with /clip' },
          { name: 'bot-commands', type: 'text', topic: 'Run economy, rpg, and minigames' },
        ],
      },
      {
        name: 'COMPETITIVE SQUADS (VOICE)',
        channels: [
          { name: 'Squad Alpha (5-Man)', type: 'voice' },
          { name: 'Squad Bravo (5-Man)', type: 'voice' },
          { name: 'Scrim Scrimmage Stage', type: 'voice' },
          { name: '24/7 Lofi Lounge', type: 'voice' },
        ],
      },
      {
        name: 'OFFICERS ONLY',
        channels: [
          { name: 'admin-briefing', type: 'locked', topic: 'Restricted to Server Officers' },
          { name: 'modmail-inbox', type: 'locked', topic: 'Active ticket escalation feed' },
        ],
      },
    ],
  },
  developer: {
    id: 'developer',
    name: 'Developer Community',
    icon: '💻',
    tagline: 'Engineering powerhouse with CI/CD webhooks and code runtimes',
    prompt: '/build prompt: "Open-source developer collective with GitHub commit feeds, live code execution sandbox, bug bounty board, and world clock"',
    stats: { channels: 22, roles: 14, categories: 5, deployTime: '4.1s' },
    rules: [
      '1. Format code blocks using markdown syntax highlighting (```ts).',
      '2. Run small snippets in #code-sandbox with /run <lang>.',
      '3. Keep pull request discussions productive and constructive.',
      '4. Never commit credentials or secrets to public repositories.',
    ],
    categories: [
      {
        name: 'SYSTEM HUB',
        channels: [
          { name: 'changelog', type: 'announcement', topic: 'Automated release releases from Git' },
          { name: 'welcome-devs', type: 'text', topic: 'Stack role assignment & intros' },
        ],
      },
      {
        name: 'DEV LOUNGE',
        channels: [
          { name: 'general-dev', type: 'text', topic: 'Architecture and framework debates', unread: true },
          { name: 'code-sandbox', type: 'text', topic: 'Run Python, JS, Rust, Go with /run' },
          { name: 'showcase', type: 'text', topic: 'Present open source projects and demos' },
          { name: 'bounties', type: 'text', topic: 'Claim active algorithm and feature bounties' },
        ],
      },
      {
        name: 'GIT FEEDS & CI/CD',
        channels: [
          { name: 'git-commits', type: 'text', topic: 'Live GitHub/GitLab webhook streaming' },
          { name: 'pr-reviews', type: 'text', topic: 'Automated Gemini AI PR explanations' },
          { name: 'ci-alerts', type: 'text', topic: 'Pipeline failures and deploy notices' },
        ],
      },
      {
        name: 'TEAM VOICE ROOMS',
        channels: [
          { name: 'Pair Programming VC 1', type: 'voice' },
          { name: 'Standup Room (Auto-Temp)', type: 'voice' },
          { name: 'Late-Night Hackathon', type: 'voice' },
        ],
      },
    ],
  },
  creator: {
    id: 'creator',
    name: 'Content Creator Nexus',
    icon: '🎥',
    tagline: 'Engaging fan clubhouse with stream alerts, VIP tiers, and giveaways',
    prompt: '/build prompt: "Streamer and creator community with automated YouTube/Twitch notifications, VIP subscriber lounge, fan-art, and confessions"',
    stats: { channels: 16, roles: 10, categories: 4, deployTime: '2.9s' },
    rules: [
      '1. Be wholesome, respectful, and family-friendly to all community members.',
      '2. No self-promotion outside the designated #creator-showcase.',
      '3. Confidential confessions can be submitted anonymously with /confess.',
      '4. Respect stream schedule and streamer boundaries.',
    ],
    categories: [
      {
        name: 'BROADCAST CENTER',
        channels: [
          { name: 'stream-live-alerts', type: 'announcement', topic: 'Twitch and YouTube automated alerts' },
          { name: 'creator-vlog-feed', type: 'text', topic: 'Behind the scenes content drops' },
        ],
      },
      {
        name: 'COMMUNITY FLOOR',
        channels: [
          { name: 'general-chat', type: 'text', topic: 'Chat while stream is offline' },
          { name: 'fan-art-and-edits', type: 'text', topic: 'Community art submissions', unread: true },
          { name: 'anon-confessions', type: 'text', topic: 'Submissions via /confess' },
          { name: 'giveaways-hub', type: 'text', topic: 'Weekly nitro & merch giveaways' },
        ],
      },
      {
        name: 'VIP PATRONS',
        channels: [
          { name: 'patron-lounge', type: 'locked', topic: 'Exclusive lounge for Tier 3 supporters' },
          { name: 'vip-voice-hangout', type: 'locked', topic: 'Weekly Q&A voice stream' },
        ],
      },
      {
        name: 'VOICE CHANNELS',
        channels: [
          { name: 'Community Hangout 1', type: 'voice' },
          { name: 'Gaming with Subs', type: 'voice' },
        ],
      },
    ],
  },
  academic: {
    id: 'academic',
    name: 'Academic & University Campus',
    icon: '🎓',
    tagline: 'Structured learning environment with study pods and global timezones',
    prompt: '/build prompt: "Structured academic university campus with study pods, course channels, timezone overlap finder, and trivia quiz competitions"',
    stats: { channels: 24, roles: 16, categories: 5, deployTime: '4.5s' },
    rules: [
      '1. Academic honesty is mandatory: no exam plagiarism or unauthorized sharing.',
      '2. Keep subject discussions organized in relevant course channels.',
      '3. Maintain quiet focus in study pod voice channels.',
      '4. Use /worldclock meet to schedule international study group calls.',
    ],
    categories: [
      {
        name: 'CAMPUS DIRECTORY',
        channels: [
          { name: 'announcements', type: 'announcement', topic: 'Campus bulletins and deadlines' },
          { name: 'study-guidelines', type: 'text', topic: 'Academic resources and schedule' },
          { name: 'role-enrollment', type: 'text', topic: 'Pick your major & graduation year' },
        ],
      },
      {
        name: 'COURSE DISCUSSIONS',
        channels: [
          { name: 'cs-algorithms', type: 'text', topic: 'Data structures & problem sets' },
          { name: 'data-science-ai', type: 'text', topic: 'PyTorch, math, and papers', unread: true },
          { name: 'math-calculus', type: 'text', topic: 'Linear algebra and calculus proofs' },
        ],
      },
      {
        name: 'QUIZ & ENTERTAINMENT',
        channels: [
          { name: 'kahoot-quiz-show', type: 'text', topic: 'Real-time multi-player trivia with /quiz' },
          { name: 'study-break-chat', type: 'text', topic: 'Casual coffee chats' },
        ],
      },
      {
        name: 'FOCUSED STUDY PODS',
        channels: [
          { name: 'Silent Study Pod A 🔇', type: 'voice' },
          { name: 'Group Discussion Pod B 🗣️', type: 'voice' },
          { name: 'Tutor Office Hours 👨‍🏫', type: 'voice' },
        ],
      },
    ],
  },
};

export default function ArchitectureSandbox() {
  const [activePreset, setActivePreset] = useState<PresetId>('gaming');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployStep, setDeployStep] = useState<number>(0);
  const [showToast, setShowToast] = useState<boolean>(false);

  const preset = PRESETS[activePreset];

  const handleSimulateDeploy = () => {
    if (isDeploying) return;
    setIsDeploying(true);
    setDeployStep(1);
    setShowToast(false);

    setTimeout(() => setDeployStep(2), 700);
    setTimeout(() => setDeployStep(3), 1500);
    setTimeout(() => setDeployStep(4), 2200);
    setTimeout(() => {
      setIsDeploying(false);
      setDeployStep(5);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }, 3000);
  };

  const getChannelIcon = (type: ChannelItem['type']) => {
    switch (type) {
      case 'voice':
        return '🔊';
      case 'announcement':
        return '📢';
      case 'locked':
        return '🔒';
      default:
        return '#';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto rounded-3xl bg-[#0c101c] border border-white/10 shadow-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden backdrop-blur-xl">
      {/* Background illumination */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            AI ARCHITECTURE SANDBOX
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            One-Prompt Discord Server Synthesis
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mt-2 max-w-xl">
            Give Google Gemini an intent prompt. AiCord creates the complete category layout,
            permission overrides, voice rooms, reaction panels, and automod rules in seconds.
          </p>
        </div>

        {/* Deploy Simulation Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateDeploy}
            disabled={isDeploying}
            className={`px-5 py-3 rounded-xl font-bold font-mono text-sm transition-all duration-300 flex items-center gap-2 shadow-lg ${
              isDeploying
                ? 'bg-purple-600/50 text-purple-200 cursor-wait'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02]'
            }`}
          >
            {isDeploying ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Synthesizing... Step {deployStep}/4</span>
              </>
            ) : (
              <>
                <span>⚡ Simulate Deploy</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-black/20 text-black">
                  {preset.stats.deployTime}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 relative z-10">
        {(Object.keys(PRESETS) as PresetId[]).map((key) => {
          const p = PRESETS[key];
          const isSelected = activePreset === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActivePreset(key);
                setDeployStep(0);
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden ${
                isSelected
                  ? 'border-cyan-400/80 bg-cyan-950/30 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                  : 'border-white/5 bg-black/40 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />
              )}
              <div className="text-2xl mb-2">{p.icon}</div>
              <div className="text-sm font-bold text-white line-clamp-1">{p.name}</div>
              <div className="text-[11px] text-gray-400 font-mono mt-1">
                {p.stats.channels} CH • {p.stats.roles} ROLES
              </div>
            </button>
          );
        })}
      </div>

      {/* Blueprint Console & Simulated Discord Client */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left: Discord Client Navigation Pane */}
        <div className="lg:col-span-5 rounded-2xl bg-[#1e1f29] border border-white/10 overflow-hidden flex flex-col h-[520px] shadow-2xl">
          {/* Discord Server Title Bar */}
          <div className="p-3.5 bg-[#2b2d31] border-b border-black/30 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{preset.icon}</span>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">{preset.name}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>AiCord Sentinel Active</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <span className="p-1 rounded hover:bg-white/10 cursor-pointer">⚙️</span>
              <span className="p-1 rounded hover:bg-white/10 cursor-pointer">🔔</span>
            </div>
          </div>

          {/* Channel Hierarchy Scrollable Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-4 custom-scrollbar text-xs font-sans">
            {preset.categories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                {/* Category Header */}
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-gray-400 hover:text-gray-200 uppercase tracking-wider font-mono cursor-pointer select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px]">▼</span>
                    <span>{cat.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">{cat.channels.length}</span>
                </div>

                {/* Channel List */}
                <div className="space-y-0.5">
                  {cat.channels.map((ch, chIdx) => (
                    <div
                      key={chIdx}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer group ${
                        chIdx === 0 && idx === 1
                          ? 'bg-[#35373c] text-white font-medium'
                          : 'text-gray-400 hover:bg-[#35373c]/50 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-gray-400 text-xs font-mono font-bold">
                          {getChannelIcon(ch.type)}
                        </span>
                        <span className="truncate">{ch.name}</span>
                      </div>
                      {ch.unread && (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* User Voice / Discord Profile Footer */}
          <div className="p-2.5 bg-[#232428] border-t border-black/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-600/40 border border-cyan-400 flex items-center justify-center text-sm font-bold text-cyan-200">
                AI
              </div>
              <div>
                <div className="font-bold text-white text-xs">AiCord Architect</div>
                <div className="text-[10px] text-gray-400 font-mono">Ready to deploy</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Right: AI Synthesis Cockpit & Live Rule Deployer */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          {/* AI Generator Prompt Box */}
          <div className="rounded-2xl bg-black/40 border border-white/10 p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-white/10">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-white font-bold">Google Gemini 2.5 Flash Engine</span>
              </span>
              <span className="text-cyan-400 text-[11px]">LATENCY: ~850ms</span>
            </div>

            <div className="text-xs text-gray-400 uppercase tracking-wider">Slash Command Input:</div>
            <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 text-xs sm:text-sm text-cyan-300 font-mono select-all break-all">
              {preset.prompt}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                <div className="text-[10px] text-gray-400 uppercase">Channels</div>
                <div className="text-lg font-bold text-white mt-0.5">{preset.stats.channels}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                <div className="text-[10px] text-gray-400 uppercase">Roles</div>
                <div className="text-lg font-bold text-white mt-0.5">{preset.stats.roles}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                <div className="text-[10px] text-gray-400 uppercase">Categories</div>
                <div className="text-lg font-bold text-white mt-0.5">{preset.stats.categories}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                <div className="text-[10px] text-gray-400 uppercase">Speed</div>
                <div className="text-lg font-bold text-cyan-400 mt-0.5">{preset.stats.deployTime}</div>
              </div>
            </div>
          </div>

          {/* AI Provisioning Status & Deploy Checklist */}
          <div className="rounded-2xl bg-black/40 border border-white/10 p-5 space-y-3 font-mono text-xs">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Automated Provisioning Checklist</span>
              <span className="text-[11px] text-gray-400">REST API Bitfield Checked</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 text-gray-300">
                <span className="text-emerald-400">✓</span>
                <span>Category hierarchy & sync permissions mapped</span>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 text-gray-300">
                <span className="text-emerald-400">✓</span>
                <span>Admin sentinel overrides & moderator audit logging set</span>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 text-gray-300">
                <span className="text-emerald-400">✓</span>
                <span>Automod keyword filters & anti-spam rate limits enabled</span>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 text-gray-300">
                <span className="text-emerald-400">✓</span>
                <span>Embed color theme calibrated to server branding</span>
              </div>
            </div>
          </div>

          {/* Live Server Rules Deployer Preview */}
          <div className="rounded-2xl bg-[#1e1f29] border border-white/10 p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>📜 Synthesized Server Rules</span>
              </span>
              <span className="text-gray-400 text-[10px]">Auto-posted to #rules-and-roles</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs text-gray-300 font-sans">
              {preset.rules.map((rule, rIdx) => (
                <div key={rIdx} className="leading-relaxed">
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Completion Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-white font-mono text-sm shadow-[0_0_30px_rgba(16,185,129,0.4)] backdrop-blur-md animate-bounce">
          <span className="text-xl">🚀</span>
          <div>
            <div className="font-bold text-emerald-300">Server Blueprint Deployed!</div>
            <div className="text-xs text-gray-300">
              {preset.stats.channels} channels and {preset.stats.roles} roles created in {preset.stats.deployTime}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
