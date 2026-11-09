'use client';

/**
 * src/components/sections/PromptDemo.tsx
 * Pinned "Describe it. AiCord builds it." sequence (Storyboard 10–34% of scroll).
 * Features 5 blueprint selector tabs, simulated typing stream,
 * 4-Phase Progress Meter with theme ASCII bars,
 * 3 Interactive Review Tabs (Structure Tree + Rename, Security Audit, Role Hierarchy drag/swap),
 * and an instantaneous "Undo Build / Rollback" simulation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { copyConfig } from '@/config/copy';
import {
  BLUEPRINTS,
  BLUEPRINT_LIST,
  BlueprintId,
  BlueprintSpec,
  BlueprintChannel,
  BlueprintRole,
} from '@/config/blueprints';
import { useBlueprintSceneStore, ReviewTab } from '@/lib/blueprint-scene-store';
import { useThemeStore } from '@/lib/theme-store';
import {
  DiscordMessage,
  SlashCommand,
  DiscordEmbed,
  DiscordButton,
  DiscordActionRow,
  ProgressBar,
  formatAsciiProgressBar,
} from '@/components/discord-mock';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';

export function PromptDemo() {
  const activeTab = useBlueprintSceneStore((state) => state.activeTab);
  const setActiveTab = useBlueprintSceneStore((state) => state.setActiveTab);
  const activeBlueprintId = useBlueprintSceneStore((state) => state.activeBlueprintId);
  const setActiveBlueprintId = useBlueprintSceneStore(
    (state) => state.setActiveBlueprintId
  );
  const isRollbackActive = useBlueprintSceneStore((state) => state.isRollbackActive);
  const setRollbackActive = useBlueprintSceneStore((state) => state.setRollbackActive);

  const activeTheme = useThemeStore((state) => state.theme);
  const activeBarStyle = useThemeStore((state) => state.barStyle);

  // Active blueprint state with deep clone for local editing (e.g. channel renames & role reordering)
  const [currentBlueprint, setCurrentBlueprint] = useState<BlueprintSpec>(
    BLUEPRINTS[activeBlueprintId] || BLUEPRINTS['gaming-esports']
  );

  // Collapsed categories state (set of category IDs)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // In-place rename modal / input state
  const [editingChannel, setEditingChannel] = useState<{
    catId: string;
    channelId: string;
    name: string;
  } | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'danger' | 'info';
  } | null>(null);

  // Typing simulation state
  const [typedPrompt, setTypedPrompt] = useState<string>(currentBlueprint.prompt);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Deployment simulation state
  const [deployStep, setDeployStep] = useState<number>(3); // 3 = Phase 4 (Enterprise Services)
  const [deployPercent, setDeployPercent] = useState<number>(70);

  // Sync blueprint data when switching blueprints
  const handleSelectBlueprint = (id: BlueprintId) => {
    setActiveBlueprintId(id);
    const selected = BLUEPRINTS[id];
    setCurrentBlueprint(JSON.parse(JSON.stringify(selected))); // fresh editable copy
    setCollapsedCategories({});
    setEditingChannel(null);

    // Simulate natural language typing effect
    setIsTyping(true);
    setTypedPrompt('');
    let charIdx = 0;
    const fullText = selected.prompt;

    const interval = setInterval(() => {
      charIdx += 2;
      setTypedPrompt(fullText.slice(0, charIdx));
      if (charIdx >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 20);
  };

  // Toast auto-clear
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Toggle category expand / collapse
  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // In-place channel rename save
  const handleSaveRename = (catId: string, channelId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingChannel(null);
      return;
    }
    const cleanName = newName.trim().toLowerCase().replace(/\s+/g, '-');
    setCurrentBlueprint((prev) => {
      const updated = { ...prev };
      const cat = updated.structure.categories.find((c) => c.id === catId);
      if (cat) {
        const ch = cat.channels.find((c) => c.id === channelId);
        if (ch) {
          ch.name = cleanName;
        }
      }
      return updated;
    });

    setEditingChannel(null);
    setToastMessage({
      text: `Channel updated to #${cleanName}`,
      type: 'info',
    });
  };

  // Role hierarchy move up/down
  const handleMoveRole = (roleIdx: number, direction: 'up' | 'down') => {
    const roles = [...currentBlueprint.roleHierarchy.roles];
    const targetIdx = direction === 'up' ? roleIdx - 1 : roleIdx + 1;
    if (targetIdx < 0 || targetIdx >= roles.length - 1) return; // keep @everyone at bottom

    const temp = roles[roleIdx];
    roles[roleIdx] = roles[targetIdx];
    roles[targetIdx] = temp;

    // Recalculate positions descending
    const updated = roles.map((r, i) => ({
      ...r,
      position: roles.length - i,
    }));

    setCurrentBlueprint((prev) => ({
      ...prev,
      roleHierarchy: { roles: updated },
    }));

    setToastMessage({
      text: `Promoted ${temp.name} to hierarchy tier ${roles.length - targetIdx}`,
      type: 'success',
    });
  };

  // Undo Build / Rollback Action
  const handleUndoBuild = () => {
    setRollbackActive(true);
    setToastMessage({
      text: `Rollback initiated: Instantaneously reverted ${currentBlueprint.metrics.channelsCount} channels and ${currentBlueprint.metrics.rolesCount} roles.`,
      type: 'danger',
    });

    setTimeout(() => {
      setRollbackActive(false);
      setDeployPercent(0);
      setDeployStep(0);
      setToastMessage({
        text: 'Rollback complete. Server state safely restored to pre-build baseline.',
        type: 'info',
      });
    }, 1800);
  };

  // Deploy With One Click Action
  const handleDeployBlueprint = () => {
    setToastMessage({
      text: `Deploying "${currentBlueprint.name}" to Discord...`,
      type: 'info',
    });
    setDeployStep(3);
    setDeployPercent(100);

    setTimeout(() => {
      setToastMessage({
        text: `🚀 "${currentBlueprint.name}" deployed successfully! All ${currentBlueprint.metrics.channelsCount} channels, roles & automod gates are live.`,
        type: 'success',
      });
    }, 1200);
  };

  // Channel type icons helper
  const getChannelIcon = (type: string, isPrivate?: boolean) => {
    if (isPrivate) return '🔒';
    switch (type) {
      case 'voice':
        return '🔊';
      case 'announcement':
        return '📢';
      case 'forum':
        return '💬';
      case 'stage':
        return '🎙️';
      default:
        return '#';
    }
  };

  const asciiProgressBar = formatAsciiProgressBar(
    deployPercent,
    activeBarStyle,
    10
  );

  return (
    <section
      id="ai-builder"
      aria-label="Describe it AiCord builds it Sequence"
      className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-20"
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 text-xs sm:text-sm font-sans animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'danger'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
              : toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : 'bg-[#1E1F22]/95 text-gray-200 border-cyan-500/40'
          }`}
        >
          <span className="text-base">
            {toastMessage.type === 'danger'
              ? '⚠️'
              : toastMessage.type === 'success'
                ? '✅'
                : 'ℹ️'}
          </span>
          <span className="font-medium">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{copyConfig.promptDemo.badge}</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
          {copyConfig.promptDemo.title}
        </h2>

        <p className="text-sm sm:text-base text-gray-300 font-sans leading-relaxed">
          {copyConfig.promptDemo.subtitle}
        </p>
      </div>

      {/* ─── 5 Blueprint Selector Pills ────────────────────────────────────────── */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {BLUEPRINT_LIST.map((bp) => {
          const isSelected = bp.id === currentBlueprint.id;
          return (
            <button
              key={bp.id}
              onClick={() => handleSelectBlueprint(bp.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-sans font-medium whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/20 scale-[1.02]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">{bp.icon}</span>
              <span>{bp.name}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Main Discord Mock Container ───────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto">
        {/* User Command Execution Mock */}
        <div className="mb-2 pl-2">
          <SlashCommand
            command="/build"
            user={{ name: 'alex' }}
            params={[{ name: 'prompt', value: typedPrompt }]}
            className="w-full bg-[#1E1F22]/95 border-white/10"
          />
        </div>

        {/* Bot Message with Embed, Tabs, and Progress */}
        <DiscordMessage
          author={{
            name: 'AiCord',
            isBot: true,
            botBadgeText: 'APP',
            roleColor: activeTheme?.primaryHex || '#00F0FF',
          }}
          timestamp="Today at 12:45 PM"
          content={
            <span>
              Synthesized architecture for{' '}
              <strong className="text-white">{currentBlueprint.name}</strong> based on your
              prompt. Review the structure and security audit below before one-click deployment.
            </span>
          }
        >
          {/* Main Discord Embed */}
          <DiscordEmbed
            color={activeTheme?.primaryHex || '#5865F2'}
            title={`${currentBlueprint.icon} ${currentBlueprint.name}`}
            description={currentBlueprint.tagline}
            fields={[
              {
                name: 'Categories',
                value: `${currentBlueprint.metrics.categoriesCount} Categories`,
                inline: true,
              },
              {
                name: 'Channels',
                value: `${currentBlueprint.metrics.channelsCount} Channels`,
                inline: true,
              },
              {
                name: 'Security Matrix',
                value: `${currentBlueprint.securityAudit.raidPreventionScore}/100 ${currentBlueprint.securityAudit.status}`,
                inline: true,
              },
            ]}
          >
            {/* ─── 4-Phase Progress Meter ────────────────────────────────────── */}
            <div className="mt-3 p-3.5 rounded-lg bg-[#1E1F22] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-gray-200 uppercase tracking-wide">
                  Synthesis Progress Engine
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {asciiProgressBar}
                </span>
              </div>

              {/* Dual Visual Progress Bar */}
              <ProgressBar
                percent={deployPercent}
                style={activeBarStyle}
                showAscii={false}
                showVisualTrack={true}
              />

              {/* 4 Phases Status Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                {/* Phase 1: Intent Analysis */}
                <div className="p-2 rounded bg-black/30 border border-white/5 flex flex-col justify-between">
                  <span className="text-gray-400">Phase 1</span>
                  <div className="flex items-center justify-between pt-1 font-sans font-medium">
                    <span className="text-gray-200 truncate">Intent Analysis</span>
                    <span className="text-emerald-400 font-bold">✓ Done</span>
                  </div>
                </div>

                {/* Phase 2: Permission Audit */}
                <div className="p-2 rounded bg-black/30 border border-white/5 flex flex-col justify-between">
                  <span className="text-gray-400">Phase 2</span>
                  <div className="flex items-center justify-between pt-1 font-sans font-medium">
                    <span className="text-gray-200 truncate">Permission Audit</span>
                    <span className="text-emerald-400 font-bold">✓ Done</span>
                  </div>
                </div>

                {/* Phase 3: Channel Layout */}
                <div className="p-2 rounded bg-black/30 border border-white/5 flex flex-col justify-between">
                  <span className="text-gray-400">Phase 3</span>
                  <div className="flex items-center justify-between pt-1 font-sans font-medium">
                    <span className="text-gray-200 truncate">Channel Layout</span>
                    <span className="text-emerald-400 font-bold">✓ Done</span>
                  </div>
                </div>

                {/* Phase 4: Enterprise Services */}
                <div
                  className={`p-2 rounded border flex flex-col justify-between transition-colors ${
                    deployPercent >= 100
                      ? 'bg-black/30 border-white/5'
                      : 'bg-cyan-500/10 border-cyan-500/30'
                  }`}
                >
                  <span className="text-gray-400">Phase 4</span>
                  <div className="flex items-center justify-between pt-1 font-sans font-medium">
                    <span className="text-cyan-300 truncate">Enterprise Services</span>
                    <span
                      className={`font-bold ${
                        deployPercent >= 100 ? 'text-emerald-400' : 'text-cyan-400'
                      }`}
                    >
                      {deployPercent >= 100 ? '✓ Done' : `${deployPercent}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 3 Review Tabs Selector Bar ───────────────────────────────── */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('structure')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-sans font-semibold transition-all ${
                  activeTab === 'structure'
                    ? 'bg-[#5865F2] text-white shadow-sm'
                    : 'bg-[#1E1F22] text-gray-300 hover:bg-[#35373C] hover:text-white'
                }`}
              >
                📁 Structure ({currentBlueprint.metrics.channelsCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-sans font-semibold transition-all ${
                  activeTab === 'security'
                    ? 'bg-[#248046] text-white shadow-sm'
                    : 'bg-[#1E1F22] text-gray-300 hover:bg-[#35373C] hover:text-white'
                }`}
              >
                🛡️ Security Audit ({currentBlueprint.securityAudit.raidPreventionScore}/100)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hierarchy')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-sans font-semibold transition-all ${
                  activeTab === 'hierarchy'
                    ? 'bg-[#4E5058] text-white shadow-sm ring-1 ring-amber-400/50'
                    : 'bg-[#1E1F22] text-gray-300 hover:bg-[#35373C] hover:text-white'
                }`}
              >
                👑 Role Hierarchy ({currentBlueprint.metrics.rolesCount})
              </button>
            </div>

            {/* ─── Tab Content Views ────────────────────────────────────────── */}

            {/* TAB 1: STRUCTURE TREE */}
            {activeTab === 'structure' && (
              <div className="p-3 rounded-lg bg-[#1E1F22] border border-white/5 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between text-gray-400 pb-1 border-b border-white/5">
                  <span className="font-semibold text-gray-300">
                    Guild Channel Tree • Click channel to rename
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Live Editing Enabled
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {currentBlueprint.structure.categories.map((cat) => {
                    const isCollapsed = collapsedCategories[cat.id];

                    return (
                      <div
                        key={cat.id}
                        className="rounded bg-black/20 border border-white/5 overflow-hidden"
                      >
                        {/* Category Header */}
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                        >
                          <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span className="text-gray-500">{isCollapsed ? '▶' : '▼'}</span>
                            {cat.name}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono">
                            {cat.channels.length} channels
                          </span>
                        </button>

                        {/* Channels List */}
                        {!isCollapsed && (
                          <div className="p-2 space-y-1">
                            {cat.channels.map((ch) => {
                              const isEditing =
                                editingChannel?.channelId === ch.id &&
                                editingChannel?.catId === cat.id;

                              return (
                                <div
                                  key={ch.id}
                                  className="group flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-gray-400 text-sm shrink-0">
                                      {getChannelIcon(ch.type, ch.isPrivate)}
                                    </span>

                                    {isEditing ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        defaultValue={ch.name}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveRename(
                                              cat.id,
                                              ch.id,
                                              (e.target as HTMLInputElement).value
                                            );
                                          } else if (e.key === 'Escape') {
                                            setEditingChannel(null);
                                          }
                                        }}
                                        onBlur={(e) =>
                                          handleSaveRename(cat.id, ch.id, e.target.value)
                                        }
                                        className="px-2 py-0.5 rounded bg-black border border-cyan-500 text-white font-mono text-xs w-48 focus:outline-none"
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingChannel({
                                            catId: cat.id,
                                            channelId: ch.id,
                                            name: ch.name,
                                          })
                                        }
                                        className="text-gray-200 hover:text-cyan-300 font-medium text-left truncate flex items-center gap-1.5"
                                      >
                                        <span>{ch.name}</span>
                                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 font-mono">
                                          ✎
                                        </span>
                                      </button>
                                    )}

                                    {ch.topic && (
                                      <span className="hidden sm:inline text-[11px] text-gray-500 truncate max-w-xs">
                                        — {ch.topic}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-gray-400">
                                    {ch.userLimit && (
                                      <span className="px-1.5 py-0.5 rounded bg-white/5">
                                        Cap: {ch.userLimit}
                                      </span>
                                    )}
                                    <span className="px-1.5 py-0.5 rounded bg-white/5 uppercase">
                                      {ch.type}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: SECURITY AUDIT */}
            {activeTab === 'security' && (
              <div className="p-3 rounded-lg bg-[#1E1F22] border border-white/5 space-y-4 font-sans text-xs">
                {/* Score & Verification Gate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-black/30 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-gray-400 uppercase font-mono">
                        Anti-Raid Prevention Score
                      </div>
                      <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                        {currentBlueprint.securityAudit.raidPreventionScore}/100 SECURE
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg">
                      🛡️
                    </div>
                  </div>

                  <div className="p-3 rounded bg-black/30 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-gray-400 uppercase font-mono">
                        Verification Gate
                      </div>
                      <div className="text-xs font-semibold text-gray-200 mt-1">
                        {currentBlueprint.securityAudit.verificationGateLevel}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-lg">
                      🔐
                    </div>
                  </div>
                </div>

                {/* @everyone Permission Isolation Matrix */}
                <div className="space-y-2">
                  <div className="font-semibold text-gray-200 flex items-center gap-1.5">
                    <span>@everyone Permission Containment Isolation</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      LEAK FREE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded bg-black/20 border border-white/5 space-y-1">
                      <span className="text-[11px] font-mono text-emerald-400 uppercase block font-semibold">
                        ✓ Allowed Safe Permissions
                      </span>
                      {currentBlueprint.securityAudit.everyonePermissions.allowed.map((perm) => (
                        <div key={perm} className="flex items-center gap-1.5 text-gray-300">
                          <span className="text-emerald-400">•</span>
                          <span>{perm}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded bg-black/20 border border-white/5 space-y-1">
                      <span className="text-[11px] font-mono text-rose-400 uppercase block font-semibold">
                        ✕ Blocked Dangerous Overrides
                      </span>
                      {currentBlueprint.securityAudit.everyonePermissions.denied.map((perm) => (
                        <div key={perm} className="flex items-center gap-1.5 text-gray-300">
                          <span className="text-rose-400">•</span>
                          <span>{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Automod Rules Status List */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-gray-200">
                    Active Automod Protection Rules ({currentBlueprint.securityAudit.automodRules.length})
                  </div>
                  <div className="space-y-1.5">
                    {currentBlueprint.securityAudit.automodRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-2 rounded bg-black/20 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {rule.name}
                          </div>
                          <div className="text-[11px] text-gray-400 font-sans truncate">
                            Trigger: <span className="text-gray-300 font-mono">{rule.trigger}</span>{' '}
                            • Action: <span className="text-cyan-300">{rule.action}</span>
                          </div>
                        </div>
                        <Badge status="live" size="sm">
                          ENFORCED
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audited Flags */}
                <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase font-semibold block">
                    Security Flags Audited
                  </span>
                  {currentBlueprint.securityAudit.auditedFlags.map((flag, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-300 text-[11px]">
                      <span className="text-emerald-400">✓</span>
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: ROLE HIERARCHY */}
            {activeTab === 'hierarchy' && (
              <div className="p-3 rounded-lg bg-[#1E1F22] border border-white/5 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between text-gray-400 pb-1 border-b border-white/5">
                  <span className="font-semibold text-gray-300">
                    Stacked Role Priority • Use arrows to adjust order
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    Discord Sovereign Hierarchy
                  </span>
                </div>

                <div className="space-y-1.5">
                  {currentBlueprint.roleHierarchy.roles.map((role, idx) => {
                    const isTop = idx === 0;
                    const isBottom = idx === currentBlueprint.roleHierarchy.roles.length - 1;

                    return (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-2 rounded bg-black/25 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Role Color Pill */}
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: role.color }}
                          />

                          <div className="min-w-0">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {role.icon && <span>{role.icon}</span>}
                              <span style={{ color: role.color }}>{role.name}</span>
                              {role.hoist && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-gray-300 uppercase">
                                  HOISTED
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-sans truncate">
                              Permissions: {role.permissions.join(', ')}
                            </div>
                          </div>
                        </div>

                        {/* Move Up / Down Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-mono text-[11px] text-gray-500 mr-2">
                            Pos {role.position}
                          </span>
                          {!isBottom && (
                            <>
                              <button
                                type="button"
                                disabled={isTop}
                                onClick={() => handleMoveRole(idx, 'up')}
                                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none text-gray-300 flex items-center justify-center font-mono text-xs"
                                title="Move Role Up"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === currentBlueprint.roleHierarchy.roles.length - 2}
                                onClick={() => handleMoveRole(idx, 'down')}
                                className="w-6 h-6 rounded bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none text-gray-300 flex items-center justify-center font-mono text-xs"
                                title="Move Role Down"
                              >
                                ▼
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DiscordEmbed>

          {/* ─── Bottom Discord ActionRow: Deploy & Undo ─────────────────────── */}
          <DiscordActionRow>
            <DiscordButton
              variant="primary"
              onClick={handleDeployBlueprint}
              icon="🚀"
            >
              {copyConfig.promptDemo.deployButton}
            </DiscordButton>

            <DiscordButton
              variant="danger"
              pulsing={isRollbackActive}
              onClick={handleUndoBuild}
              icon="↺"
            >
              {copyConfig.promptDemo.undoButton}
            </DiscordButton>

            <DiscordButton
              variant="secondary"
              onClick={() => {
                const sampleName = `voice-pod-${Math.floor(Math.random() * 90 + 10)}`;
                handleSaveRename(
                  currentBlueprint.structure.categories[3]?.id || 'ge-cat-voice',
                  currentBlueprint.structure.categories[3]?.channels[1]?.id || 'ge-c-scrim-a',
                  sampleName
                );
              }}
              icon="⚡"
            >
              Auto-Optimize Channels
            </DiscordButton>
          </DiscordActionRow>
        </DiscordMessage>
      </div>
    </section>
  );
}

export default PromptDemo;
