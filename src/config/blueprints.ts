/**
 * src/config/blueprints.ts
 * 5 Canonical Server Architecture Blueprints for AiCord AI Guild Synthesizer.
 * Section 6 (Service 1) of the Master Specification.
 */

export type ChannelType = 'text' | 'voice' | 'announcement' | 'forum' | 'stage';

export interface BlueprintChannel {
  id: string;
  name: string;
  type: ChannelType;
  topic: string;
  isPrivate?: boolean;
  userLimit?: number;
}

export interface BlueprintCategory {
  id: string;
  name: string;
  channels: BlueprintChannel[];
}

export interface AutomodRuleSpec {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface SecurityAuditSpec {
  everyonePermissions: {
    allowed: string[];
    denied: string[];
  };
  automodRules: AutomodRuleSpec[];
  verificationGateLevel: string;
  raidPreventionScore: number;
  status: 'SECURE' | 'OPTIMAL';
  auditedFlags: string[];
}

export interface BlueprintRole {
  id: string;
  name: string;
  color: string;
  hoist: boolean;
  position: number;
  permissions: string[];
  icon?: string;
}

export interface BlueprintSpec {
  id: 'gaming-esports' | 'developer-community' | 'creator-nexus' | 'academic-campus' | 'anime-social';
  name: string;
  icon: string;
  tagline: string;
  description: string;
  prompt: string;
  metrics: {
    categoriesCount: number;
    channelsCount: number;
    rolesCount: number;
    automodRulesCount: number;
    estimatedDeploySeconds: number;
  };
  structure: {
    categories: BlueprintCategory[];
  };
  securityAudit: SecurityAuditSpec;
  roleHierarchy: {
    roles: BlueprintRole[];
  };
}

export type BlueprintId = BlueprintSpec['id'];

export const BLUEPRINTS: Record<BlueprintId, BlueprintSpec> = {
  'gaming-esports': {
    id: 'gaming-esports',
    name: 'Gaming and Esports Hub',
    icon: '⚔️',
    tagline: 'Competitive Esports Arena & Automated Scrim Management',
    description:
      'Engineered for competitive teams, organizers, and scrim leagues. Includes automated rank gates, match scheduling, bracket alerts, and dedicated 5v5 voice pods.',
    prompt:
      'Esports tournament guild with scrim voice rooms, automated bracket pings, rank verification gates, and match scheduling.',
    metrics: {
      categoriesCount: 4,
      channelsCount: 16,
      rolesCount: 7,
      automodRulesCount: 4,
      estimatedDeploySeconds: 12,
    },
    structure: {
      categories: [
        {
          id: 'ge-cat-info',
          name: '📌 INFORMATION & RULES',
          channels: [
            {
              id: 'ge-c-welcome',
              name: 'welcome-and-rules',
              type: 'text',
              topic: 'Server rules, code of conduct, and auto-verification instructions.',
            },
            {
              id: 'ge-c-announcements',
              name: 'announcements',
              type: 'announcement',
              topic: 'Official esports league announcements and tournament registrations.',
            },
            {
              id: 'ge-c-live-streams',
              name: 'live-stream-pings',
              type: 'text',
              topic: 'Automated Twitch/YouTube notifications for affiliated streamer squad.',
            },
          ],
        },
        {
          id: 'ge-cat-tournaments',
          name: '⚔️ TOURNAMENTS & SCRIMS',
          channels: [
            {
              id: 'ge-c-bracket',
              name: 'tournament-brackets',
              type: 'text',
              topic: 'Real-time Challonge & Battlefy tournament bracket updates.',
            },
            {
              id: 'ge-c-scrims',
              name: 'scrim-matchmaking',
              type: 'text',
              topic: 'LFG queue and automated scrim matchmaking dispatcher.',
            },
            {
              id: 'ge-c-schedule',
              name: 'match-scheduling',
              type: 'text',
              topic: 'Upcoming team schedule and match dispute coordination.',
            },
            {
              id: 'ge-c-scores',
              name: 'score-submission',
              type: 'text',
              topic: 'Post-match screenshot proof and ELO calculation submission.',
            },
          ],
        },
        {
          id: 'ge-cat-lounge',
          name: '💬 SQUAD LOUNGE',
          channels: [
            {
              id: 'ge-c-general',
              name: 'general-chat',
              type: 'text',
              topic: 'Community gaming discussion, banter, and patch note debates.',
            },
            {
              id: 'ge-c-clips',
              name: 'clips-and-highlights',
              type: 'text',
              topic: 'Show off your clutch plays and vote on clip of the week.',
            },
            {
              id: 'ge-c-setups',
              name: 'battlestation-setups',
              type: 'text',
              topic: 'Gaming gear, peripheral reviews, and PC build showcases.',
            },
            {
              id: 'ge-c-bot',
              name: 'bot-commands',
              type: 'text',
              topic: 'Run /rank, /scrim, /leaderboard, and audio commands.',
            },
          ],
        },
        {
          id: 'ge-cat-voice',
          name: '🔊 COMPETITIVE VOICE',
          channels: [
            {
              id: 'ge-c-stage',
              name: 'Grand Finals Stage',
              type: 'stage',
              topic: 'Live shoutcasted tournament finals with audience listening.',
            },
            {
              id: 'ge-c-scrim-a',
              name: 'Scrim Room Alpha',
              type: 'voice',
              topic: '5v5 tactical voice comms (Team A).',
              userLimit: 5,
            },
            {
              id: 'ge-c-scrim-b',
              name: 'Scrim Room Bravo',
              type: 'voice',
              topic: '5v5 tactical voice comms (Team B).',
              userLimit: 5,
            },
            {
              id: 'ge-c-duo-1',
              name: 'Duo Queue 1',
              type: 'voice',
              topic: 'Ranked duo comms.',
              userLimit: 2,
            },
            {
              id: 'ge-c-duo-2',
              name: 'Duo Queue 2',
              type: 'voice',
              topic: 'Ranked duo comms.',
              userLimit: 2,
            },
          ],
        },
      ],
    },
    securityAudit: {
      everyonePermissions: {
        allowed: ['View Channels', 'Read Message History', 'Send Messages in Public Hub'],
        denied: [
          'Mention @everyone & @here',
          'Manage Channels',
          'Manage Roles',
          'Attach Files in Announcements',
          'Move Members in Competitive VC',
        ],
      },
      automodRules: [
        {
          id: 'ge-am-anti-invite',
          name: 'Discord Invite Shield',
          trigger: 'discord.gg/* or invite links',
          action: 'Block message & trigger raid warning',
          enabled: true,
        },
        {
          id: 'ge-am-toxic',
          name: 'Esports Fair Play Word Filter',
          trigger: 'Toxicity, hate speech, and harassment lexicon',
          action: 'Block message & notify referee staff',
          enabled: true,
        },
        {
          id: 'ge-am-mention-burst',
          name: 'Mass Mention Burst Limiter',
          trigger: '> 4 user mentions per message',
          action: 'Timeout member for 1 hour',
          enabled: true,
        },
        {
          id: 'ge-am-anti-raid',
          name: 'Rapid Join Raid Protection',
          trigger: '> 10 joins in 10 seconds',
          action: 'Quarantine guild & enable verification lock',
          enabled: true,
        },
      ],
      verificationGateLevel: 'HIGH (Verified Phone & Member > 10m)',
      raidPreventionScore: 99,
      status: 'SECURE',
      auditedFlags: [
        '@everyone isolated from administrative overrides',
        'Staff dispute rooms completely enclosed with zero leaks',
        'Scrim voice channels capped with strict user limits',
        'Anti-raid quarantine engine active with Ed25519 webhook checks',
      ],
    },
    roleHierarchy: {
      roles: [
        {
          id: 'ge-r-director',
          name: 'Tournament Director',
          color: '#FFD700',
          hoist: true,
          position: 7,
          permissions: ['Administrator', 'Manage Server', 'Manage Tournaments'],
          icon: '👑',
        },
        {
          id: 'ge-r-head-admin',
          name: 'Head Scrim Admin',
          color: '#FF0055',
          hoist: true,
          position: 6,
          permissions: ['Manage Channels', 'Kick Members', 'Ban Members', 'Manage Messages'],
          icon: '🛡️',
        },
        {
          id: 'ge-r-referee',
          name: 'Match Referee',
          color: '#00E5FF',
          hoist: true,
          position: 5,
          permissions: ['Mute Members', 'Deafen Members', 'Move Members', 'Manage Disputes'],
          icon: '⚖️',
        },
        {
          id: 'ge-r-pro-player',
          name: 'Pro Scrim Athlete',
          color: '#9D00FF',
          hoist: true,
          position: 4,
          permissions: ['Priority Speaker', 'Embed Links', 'Attach Files', 'Create Threads'],
          icon: '⭐',
        },
        {
          id: 'ge-r-streamer',
          name: 'Official Streamer',
          color: '#00FF88',
          hoist: true,
          position: 3,
          permissions: ['Live Stream Alerts', 'Use External Emojis', 'Mention Roles'],
          icon: '🎥',
        },
        {
          id: 'ge-r-verified',
          name: 'Verified Competitor',
          color: '#5865F2',
          hoist: false,
          position: 2,
          permissions: ['Send Messages', 'Connect Voice', 'Speak', 'Add Reactions'],
          icon: '🎮',
        },
        {
          id: 'ge-r-everyone',
          name: '@everyone',
          color: '#99AAB5',
          hoist: false,
          position: 1,
          permissions: ['View Public Channels', 'Read Message History'],
          icon: '🌐',
        },
      ],
    },
  },

  'developer-community': {
    id: 'developer-community',
    name: 'Developer Community',
    icon: '💻',
    tagline: 'Polyglot Compiler Sandbox & Collaborative Code Space',
    description:
      'Built for programmers and open source collectives. Powered by polyglot sandbox compiler channels, GitHub webhook telemetry, and StackOverflow-style help forums.',
    prompt:
      'Developer community with polyglot code compiler channel, GitHub webhooks, bug reports, showcase lounge, and stackoverflow help forum.',
    metrics: {
      categoriesCount: 4,
      channelsCount: 16,
      rolesCount: 7,
      automodRulesCount: 4,
      estimatedDeploySeconds: 14,
    },
    structure: {
      categories: [
        {
          id: 'dc-cat-protocols',
          name: '📌 WELCOME & PROTOCOLS',
          channels: [
            {
              id: 'dc-c-welcome',
              name: 'welcome-and-guidelines',
              type: 'text',
              topic: 'Contribution guidelines, code formatting etiquette, and bot usage.',
            },
            {
              id: 'dc-c-announcements',
              name: 'dev-announcements',
              type: 'announcement',
              topic: 'Major open source milestones, hackathons, and release updates.',
            },
            {
              id: 'dc-c-releases',
              name: 'github-releases',
              type: 'text',
              topic: 'Automated GitHub & GitLab releases webhook broadcast feed.',
            },
          ],
        },
        {
          id: 'dc-cat-compiler',
          name: '💻 CODE & COMPILER',
          channels: [
            {
              id: 'dc-c-run',
              name: 'run-code',
              type: 'text',
              topic: 'Execute Python, JS, TS, Rust, C++, and Go instantly with /run.',
            },
            {
              id: 'dc-c-sandbox',
              name: 'polyglot-sandbox',
              type: 'text',
              topic: 'Interactive sandbox playground for experimental algorithms.',
            },
            {
              id: 'dc-c-review',
              name: 'code-review',
              type: 'text',
              topic: 'Peer review for pull requests, architecture diffs, and snippets.',
            },
            {
              id: 'dc-c-rfc',
              name: 'architecture-rfc',
              type: 'text',
              topic: 'Technical Request For Comments and systems design proposals.',
            },
          ],
        },
        {
          id: 'dc-cat-projects',
          name: '🛠️ PROJECTS & SHOWCASE',
          channels: [
            {
              id: 'dc-c-showcase',
              name: 'project-showcase',
              type: 'text',
              topic: 'Show off what you built: apps, libraries, tools, and side-projects.',
            },
            {
              id: 'dc-c-prs',
              name: 'open-source-prs',
              type: 'text',
              topic: 'Find "good first issue" PRs and collaborate with fellow builders.',
            },
            {
              id: 'dc-c-forum',
              name: 'stackoverflow-help',
              type: 'forum',
              topic: 'Threaded debugging forum: post snippets, error stack traces, and solutions.',
            },
            {
              id: 'dc-c-bugs',
              name: 'bug-reports',
              type: 'text',
              topic: 'Platform and bot bug reports with auto-generated issue cards.',
            },
          ],
        },
        {
          id: 'dc-cat-voice',
          name: '🔊 HACKATHON & PAIRING',
          channels: [
            {
              id: 'dc-c-talks',
              name: 'Tech Talks Stage',
              type: 'stage',
              topic: 'Engineering keynote presentations and guest speaker Q&A.',
            },
            {
              id: 'dc-c-pair1',
              name: 'Pair Programming 1',
              type: 'voice',
              topic: 'Screen share debugging and tandem live coding.',
              userLimit: 3,
            },
            {
              id: 'dc-c-pair2',
              name: 'Pair Programming 2',
              type: 'voice',
              topic: 'Screen share debugging and tandem live coding.',
              userLimit: 3,
            },
            {
              id: 'dc-c-focus',
              name: 'Silent Focus VC',
              type: 'voice',
              topic: 'Deep work coding pod with muted mics.',
            },
            {
              id: 'dc-c-lounge-vc',
              name: 'Developer Hangout',
              type: 'voice',
              topic: 'Casual voice lounge for dev chatter and music.',
            },
          ],
        },
      ],
    },
    securityAudit: {
      everyonePermissions: {
        allowed: ['View Channels', 'Read Message History', 'Send Messages', 'Use Slash Commands'],
        denied: [
          'Mention @everyone & @here',
          'Manage Webhooks',
          'Embed Links in General Chat',
          'Execute Untrusted Webhooks',
        ],
      },
      automodRules: [
        {
          id: 'dc-am-token-leak',
          name: 'API Key & Token Leak Blocker',
          trigger: 'Discord/GitHub/OpenAI/AWS token regex match',
          action: 'Immediately redact message & alert user privately',
          enabled: true,
        },
        {
          id: 'dc-am-sandbox-guard',
          name: 'Polyglot Sandbox Memory Guard',
          trigger: 'Executions exceeding 64MB or 3000ms CPU time',
          action: 'Terminate isolate & log security notice',
          enabled: true,
        },
        {
          id: 'dc-am-spam-links',
          name: 'Suspicious Domain Filter',
          trigger: 'Unverified shorteners and crypto phishing patterns',
          action: 'Block message & increment penalty score',
          enabled: true,
        },
        {
          id: 'dc-am-mention-cap',
          name: 'Mention Burst Limiter',
          trigger: '> 5 mentions per minute',
          action: 'Temporary 15-minute slowmode lock',
          enabled: true,
        },
      ],
      verificationGateLevel: 'MEDIUM (Verified Email & Registered > 5m)',
      raidPreventionScore: 98,
      status: 'SECURE',
      auditedFlags: [
        'API Token regex sanitizer active across all text channels',
        'Polyglot compiler isolated to sandboxed V8 execution runtime',
        'Webhooks write-locked exclusively to official Git bot identity',
        'Forum channels configured with auto-moderated tags',
      ],
    },
    roleHierarchy: {
      roles: [
        {
          id: 'dc-r-maintainer',
          name: 'Core Maintainer',
          color: '#00F0FF',
          hoist: true,
          position: 7,
          permissions: ['Administrator', 'Manage Webhooks', 'Manage Threads'],
          icon: '⚡',
        },
        {
          id: 'dc-r-auditor',
          name: 'Security Auditor',
          color: '#FF3366',
          hoist: true,
          position: 6,
          permissions: ['Manage Roles', 'Audit Logs', 'Manage Messages'],
          icon: '🛡️',
        },
        {
          id: 'dc-r-architect',
          name: 'Lead Architect',
          color: '#A855F7',
          hoist: true,
          position: 5,
          permissions: ['Manage Channels', 'Pin Messages', 'Create Forums'],
          icon: '📐',
        },
        {
          id: 'dc-r-contributor',
          name: 'Open Source Contributor',
          color: '#10B981',
          hoist: true,
          position: 4,
          permissions: ['Embed Links', 'Attach Files', 'Use Application Commands'],
          icon: '🌿',
        },
        {
          id: 'dc-r-craftsman',
          name: 'Code Craftsman',
          color: '#3B82F6',
          hoist: true,
          position: 3,
          permissions: ['Execute Code', 'Create Threads', 'Use External Stickers'],
          icon: '🛠️',
        },
        {
          id: 'dc-r-developer',
          name: 'Verified Developer',
          color: '#64748B',
          hoist: false,
          position: 2,
          permissions: ['Send Messages', 'Connect Voice', 'Speak'],
          icon: '💻',
        },
        {
          id: 'dc-r-everyone',
          name: '@everyone',
          color: '#99AAB5',
          hoist: false,
          position: 1,
          permissions: ['View Channels', 'Read Message History'],
          icon: '🌐',
        },
      ],
    },
  },

  'creator-nexus': {
    id: 'creator-nexus',
    name: 'Content Creator Nexus',
    icon: '🎙️',
    tagline: 'VIP Lounges, Live Broadcast Alerts & Fan Engagement',
    description:
      'Designed for YouTubers, Twitch streamers, and digital creators. Features tiered VIP lounges, sponsor secrets, automated live stream pings, and interactive fan art galleries.',
    prompt:
      'Content creator nexus with VIP tier lounges, live upload alerts, sponsor secret room, fan art gallery, and voice watch parties.',
    metrics: {
      categoriesCount: 4,
      channelsCount: 15,
      rolesCount: 7,
      automodRulesCount: 4,
      estimatedDeploySeconds: 11,
    },
    structure: {
      categories: [
        {
          id: 'cn-cat-broadcast',
          name: '📢 BROADCAST & ALERTS',
          channels: [
            {
              id: 'cn-c-announcements',
              name: 'creator-announcements',
              type: 'announcement',
              topic: 'Major announcements, merchandise drops, and community schedules.',
            },
            {
              id: 'cn-c-uploads',
              name: 'upload-alerts',
              type: 'text',
              topic: 'Instant alerts whenever new YouTube videos or shorts go live.',
            },
            {
              id: 'cn-c-live',
              name: 'stream-live',
              type: 'text',
              topic: 'Live Twitch broadcast notifications with chat highlight pings.',
            },
            {
              id: 'cn-c-giveaways',
              name: 'vip-giveaways',
              type: 'text',
              topic: 'Verified member and subscriber exclusive giveaways.',
            },
          ],
        },
        {
          id: 'cn-cat-vip',
          name: '⭐ VIP SUITE (PATREON/SUB)',
          channels: [
            {
              id: 'cn-c-vip-lounge',
              name: 'vip-lounge',
              type: 'text',
              topic: 'Exclusive private conversation lounge for patrons and subs.',
              isPrivate: true,
            },
            {
              id: 'cn-c-sponsor',
              name: 'sponsor-secret-room',
              type: 'text',
              topic: 'Top tier patron and brand sponsor direct strategy channel.',
              isPrivate: true,
            },
            {
              id: 'cn-c-sneakpeeks',
              name: 'sneak-peeks',
              type: 'text',
              topic: 'Unreleased video drafts, thumbnail previews, and early access.',
              isPrivate: true,
            },
          ],
        },
        {
          id: 'cn-cat-fan',
          name: '🎨 COMMUNITY LOUNGE',
          channels: [
            {
              id: 'cn-c-general',
              name: 'general-vibes',
              type: 'text',
              topic: 'Hang out, discuss the latest videos, and chat with fellow fans.',
            },
            {
              id: 'cn-c-art',
              name: 'fan-art-gallery',
              type: 'text',
              topic: 'Share community art, thumbnails, and creative edits.',
            },
            {
              id: 'cn-c-memes',
              name: 'meme-forge',
              type: 'text',
              topic: 'Community memes and video reaction highlights.',
            },
            {
              id: 'cn-c-qna',
              name: 'creator-qna',
              type: 'text',
              topic: 'Submit questions for upcoming monthly creator Q&A videos.',
            },
          ],
        },
        {
          id: 'cn-cat-voice',
          name: '🎙️ LIVE STAGE & WATCH PARTY',
          channels: [
            {
              id: 'cn-c-stage',
              name: 'Creator Live Stage',
              type: 'stage',
              topic: 'Live community podcasts, subscriber milestones, and live Q&A.',
            },
            {
              id: 'cn-c-watch',
              name: 'Watch Party Theater',
              type: 'voice',
              topic: 'Synchronized video premiere and anime watch party room.',
            },
            {
              id: 'cn-c-vip-vc',
              name: 'VIP Green Room',
              type: 'voice',
              topic: 'Subscriber exclusive post-stream voice hangout.',
              isPrivate: true,
            },
            {
              id: 'cn-c-cozy-vc',
              name: 'Cozy Fan Chat',
              type: 'voice',
              topic: 'Open voice room for community members.',
            },
          ],
        },
      ],
    },
    securityAudit: {
      everyonePermissions: {
        allowed: ['View Public Channels', 'Read Message History', 'Add Reactions'],
        denied: [
          'Mention @everyone & @here',
          'Attach Files outside Fan Art',
          'View VIP Suite Channels',
          'Speak on Creator Stage without invite',
        ],
      },
      automodRules: [
        {
          id: 'cn-am-phishing',
          name: 'Impersonator & Phishing Shield',
          trigger: 'Creator name lookalikes or fake nitro scams',
          action: 'Instantly ban account and purge messages',
          enabled: true,
        },
        {
          id: 'cn-am-stream-sniping',
          name: 'Stream Sniping Link Blocker',
          trigger: 'Lobby IDs or IP links in chat during live streams',
          action: 'Delete message and apply 10m timeout',
          enabled: true,
        },
        {
          id: 'cn-am-self-promo',
          name: 'Self-Promotion Filter',
          trigger: 'Unapproved Twitch/YouTube/TikTok links',
          action: 'Block message & direct to #showcase',
          enabled: true,
        },
        {
          id: 'cn-am-nsfw',
          name: 'AI Fan Art NSFW Scanner',
          trigger: 'Explicit or inappropriate media uploads',
          action: 'Block upload and notify community wardens',
          enabled: true,
        },
      ],
      verificationGateLevel: 'HIGH (Account Sync / Verified Phone)',
      raidPreventionScore: 99,
      status: 'SECURE',
      auditedFlags: [
        'VIP Suite completely shielded from unauthorized public discovery',
        'Impersonation detector protects creator nickname and profile avatar',
        'Fan art channel configured with mandatory media attachment checks',
        'Stage channel configured with automated hand-raise moderator queue',
      ],
    },
    roleHierarchy: {
      roles: [
        {
          id: 'cn-r-creator',
          name: 'Creator Sovereign',
          color: '#FF007F',
          hoist: true,
          position: 7,
          permissions: ['Administrator', 'Priority Speaker', 'Manage Server'],
          icon: '👑',
        },
        {
          id: 'cn-r-prod-mgr',
          name: 'Production Manager',
          color: '#FF8800',
          hoist: true,
          position: 6,
          permissions: ['Manage Channels', 'Manage Messages', 'Manage Events'],
          icon: '🎬',
        },
        {
          id: 'cn-r-warden',
          name: 'Community Warden',
          color: '#00F0FF',
          hoist: true,
          position: 5,
          permissions: ['Mute Members', 'Kick Members', 'Timeout Members'],
          icon: '🛡️',
        },
        {
          id: 'cn-r-diamond',
          name: 'Diamond Sponsor',
          color: '#00E5FF',
          hoist: true,
          position: 4,
          permissions: ['Access VIP Suite', 'Priority Voice', 'Custom Embeds'],
          icon: '💎',
        },
        {
          id: 'cn-r-gold-sub',
          name: 'Gold VIP Supporter',
          color: '#FFD700',
          hoist: true,
          position: 3,
          permissions: ['Access VIP Lounge', 'Use External Emojis', 'Attach Files'],
          icon: '⭐',
        },
        {
          id: 'cn-r-member',
          name: 'Community Member',
          color: '#5865F2',
          hoist: false,
          position: 2,
          permissions: ['Send Messages', 'Connect Voice', 'Speak'],
          icon: '🎉',
        },
        {
          id: 'cn-r-everyone',
          name: '@everyone',
          color: '#99AAB5',
          hoist: false,
          position: 1,
          permissions: ['View Public Channels', 'Read Message History'],
          icon: '🌐',
        },
      ],
    },
  },

  'academic-campus': {
    id: 'academic-campus',
    name: 'Academic Campus',
    icon: '🎓',
    tagline: 'Collegiate Study Commons, Subject Halls & Tutoring',
    description:
      'Structured for university departments, coding bootcamps, and student study groups. Features dedicated STEM subject faculties, homework help forums, and quiet study halls.',
    prompt:
      'Academic campus with study halls, subject categories for Math, CS and Science, homework help threads, and quiet study VC.',
    metrics: {
      categoriesCount: 4,
      channelsCount: 16,
      rolesCount: 7,
      automodRulesCount: 4,
      estimatedDeploySeconds: 13,
    },
    structure: {
      categories: [
        {
          id: 'ac-cat-campus',
          name: '🏛️ CAMPUS INFORMATION',
          channels: [
            {
              id: 'ac-c-syllabus',
              name: 'syllabus-and-code-of-ethics',
              type: 'text',
              topic: 'Academic integrity policy, plagiarism rules, and honor code.',
            },
            {
              id: 'ac-c-news',
              name: 'campus-news',
              type: 'announcement',
              topic: 'Important deadlines, midterm schedules, and faculty bulletins.',
            },
            {
              id: 'ac-c-resources',
              name: 'resource-library',
              type: 'text',
              topic: 'Textbooks, curated lecture notes, and cheat sheets.',
            },
          ],
        },
        {
          id: 'ac-cat-subjects',
          name: '📚 SUBJECT FACULTIES',
          channels: [
            {
              id: 'ac-c-math',
              name: 'mathematics-faculty',
              type: 'text',
              topic: 'Calculus, linear algebra, discrete math, and LaTeX formulas.',
            },
            {
              id: 'ac-c-cs',
              name: 'computer-science',
              type: 'text',
              topic: 'Data structures, algorithms, systems programming, and AI.',
            },
            {
              id: 'ac-c-science',
              name: 'natural-sciences',
              type: 'text',
              topic: 'Physics, chemistry, biology, and scientific computing.',
            },
            {
              id: 'ac-c-hw-help',
              name: 'homework-help',
              type: 'forum',
              topic: 'Threaded homework assistance: post problem sets and get peer help.',
            },
          ],
        },
        {
          id: 'ac-cat-commons',
          name: '☕ STUDENT COMMONS',
          channels: [
            {
              id: 'ac-c-lounge',
              name: 'campus-lounge',
              type: 'text',
              topic: 'General campus chat, dorm chatter, and weekend plans.',
            },
            {
              id: 'ac-c-career',
              name: 'career-and-internships',
              type: 'text',
              topic: 'Resume reviews, job postings, and technical interview prep.',
            },
            {
              id: 'ac-c-groups',
              name: 'study-groups-finder',
              type: 'text',
              topic: 'Form study circles and coordinate exam prep schedules.',
            },
            {
              id: 'ac-c-bot',
              name: 'study-bot-hub',
              type: 'text',
              topic: 'Pomodoro timer commands, flashcards, and calculator queries.',
            },
          ],
        },
        {
          id: 'ac-cat-voice',
          name: '🎧 QUIET STUDY HALLS',
          channels: [
            {
              id: 'ac-c-pomodoro',
              name: 'Pomodoro Study Hall (Muted)',
              type: 'voice',
              topic: '25m focus / 5m break automated study room with muted mics.',
            },
            {
              id: 'ac-c-study-1',
              name: 'Quiet Study Room Alpha',
              type: 'voice',
              topic: 'Strictly quiet study room.',
              userLimit: 6,
            },
            {
              id: 'ac-c-collab',
              name: 'Math Collab Whiteboard',
              type: 'voice',
              topic: 'Interactive group problem solving with screen sharing.',
              userLimit: 8,
            },
            {
              id: 'ac-c-office',
              name: 'TA Office Hours Room',
              type: 'voice',
              topic: 'Teaching assistant 1-on-1 consultations.',
              userLimit: 3,
            },
            {
              id: 'ac-c-cafeteria',
              name: 'Virtual Cafeteria',
              type: 'voice',
              topic: 'Casual voice lounge for study breaks.',
            },
          ],
        },
      ],
    },
    securityAudit: {
      everyonePermissions: {
        allowed: ['View Channels', 'Read Message History', 'Send Messages in Student Commons'],
        denied: [
          'Mention @everyone & @here',
          'Attach Executable Files',
          'Manage Roles',
          'Unmute in Pomodoro Study Hall',
        ],
      },
      automodRules: [
        {
          id: 'ac-am-plagiarism',
          name: 'Academic Integrity Exam Shield',
          trigger: 'Active test keywords or exam paper leak dumps',
          action: 'Quarantine post and flag for faculty review',
          enabled: true,
        },
        {
          id: 'ac-am-harassment',
          name: 'Anti-Bullying & Civility Filter',
          trigger: 'Harassment and hostile academic language',
          action: 'Block message and apply 30m timeout',
          enabled: true,
        },
        {
          id: 'ac-am-spam',
          name: 'Essay-Mill Commercial Spam Blocker',
          trigger: 'Essay-writing services, paid homework solvers',
          action: 'Instantly ban account and delete message',
          enabled: true,
        },
        {
          id: 'ac-am-file-safety',
          name: 'Malware & Macro Document Blocker',
          trigger: 'Files containing .exe, .scr, or macro-enabled docs',
          action: 'Reject attachment and log security notice',
          enabled: true,
        },
      ],
      verificationGateLevel: 'MEDIUM (.edu Email or Student ID Verification)',
      raidPreventionScore: 97,
      status: 'SECURE',
      auditedFlags: [
        'TA Office Hours channel configured with private queue gate',
        'Academic integrity automod active across all subject faculties',
        'Pomodoro voice rooms locked to server-muted microphones',
        'Thread auto-archival enabled for homework help forum',
      ],
    },
    roleHierarchy: {
      roles: [
        {
          id: 'ac-r-dean',
          name: 'Faculty Dean / Professor',
          color: '#8B5CF6',
          hoist: true,
          position: 7,
          permissions: ['Administrator', 'Manage Server', 'Manage Channels'],
          icon: '🎓',
        },
        {
          id: 'ac-r-ta',
          name: 'Teaching Assistant (TA)',
          color: '#3B82F6',
          hoist: true,
          position: 6,
          permissions: ['Manage Messages', 'Mute Members', 'Move Members', 'Manage Threads'],
          icon: '📝',
        },
        {
          id: 'ac-r-tutor',
          name: 'Subject Tutor',
          color: '#10B981',
          hoist: true,
          position: 5,
          permissions: ['Priority Speaker', 'Embed Links', 'Attach Files'],
          icon: '🔬',
        },
        {
          id: 'ac-r-lead',
          name: 'Study Group Lead',
          color: '#F59E0B',
          hoist: true,
          position: 4,
          permissions: ['Create Threads', 'Use External Emojis', 'Mention Roles'],
          icon: '📖',
        },
        {
          id: 'ac-r-student',
          name: 'Enrolled Student',
          color: '#06B6D4',
          hoist: false,
          position: 3,
          permissions: ['Send Messages', 'Connect Voice', 'Speak', 'Add Reactions'],
          icon: '🎒',
        },
        {
          id: 'ac-r-alumni',
          name: 'Alumni / Guest',
          color: '#64748B',
          hoist: false,
          position: 2,
          permissions: ['View Channels', 'Send Messages in Commons'],
          icon: '☕',
        },
        {
          id: 'ac-r-everyone',
          name: '@everyone',
          color: '#99AAB5',
          hoist: false,
          position: 1,
          permissions: ['View Public Campus Announcements'],
          icon: '🌐',
        },
      ],
    },
  },

  'anime-social': {
    id: 'anime-social',
    name: 'Anime and Social Lounge',
    icon: '🌸',
    tagline: 'Manga Discussions, Cosplay Media & Cozy Voice Hangouts',
    description:
      'Tailored for anime clubs, artists, and lifestyle communities. Equipped with automated spoiler tags, media galleries, 24/7 lo-fi radio shrines, and bot minigames.',
    prompt:
      'Anime and social lounge with manga discussions, media gallery, voice hangout pods, and bot command hub.',
    metrics: {
      categoriesCount: 4,
      channelsCount: 16,
      rolesCount: 7,
      automodRulesCount: 4,
      estimatedDeploySeconds: 12,
    },
    structure: {
      categories: [
        {
          id: 'as-cat-gates',
          name: '⛩️ GATES & DIRECTIVES',
          channels: [
            {
              id: 'as-c-welcome',
              name: 'welcome-shrine',
              type: 'text',
              topic: 'Step through the Torii gate, select your roles, and read the shrine rules.',
            },
            {
              id: 'as-c-bulletin',
              name: 'event-bulletin',
              type: 'announcement',
              topic: 'Anime watch parties, seasonal rankings, and server community events.',
            },
            {
              id: 'as-c-roles',
              name: 'role-assign-shrine',
              type: 'text',
              topic: 'Self-assign anime genres, gaming roles, and notification pings.',
            },
          ],
        },
        {
          id: 'as-cat-anime',
          name: '🌸 ANIME & MANGA SANCTUARY',
          channels: [
            {
              id: 'as-c-airing',
              name: 'airing-anime-discussion',
              type: 'text',
              topic: 'Weekly episode discussions for currently broadcasting anime series.',
            },
            {
              id: 'as-c-spoilers',
              name: 'manga-spoilers-marked',
              type: 'text',
              topic: 'Manga chapter leaks and raw scans. All text must use spoiler tags ||like this||.',
            },
            {
              id: 'as-c-recommendations',
              name: 'anime-recommendations',
              type: 'text',
              topic: 'Hidden gems, seasonal tier lists, and watchlist recommendations.',
            },
            {
              id: 'as-c-cosplay',
              name: 'cosplay-and-figures',
              type: 'text',
              topic: 'Show off your convention outfits, scale figures, and merch collections.',
            },
          ],
        },
        {
          id: 'as-cat-social',
          name: '🍵 SOCIAL PODS & MEDIA',
          channels: [
            {
              id: 'as-c-lounge',
              name: 'tea-house-lounge',
              type: 'text',
              topic: 'Casual everyday banter, food photos, and relaxed conversations.',
            },
            {
              id: 'as-c-gallery',
              name: 'photography-and-art',
              type: 'text',
              topic: 'Share your photography, digital illustrations, and artistic sketches.',
            },
            {
              id: 'as-c-music',
              name: 'j-pop-and-lofi-music',
              type: 'text',
              topic: 'Share anime OSTs, J-Rock, Vocaloid tracks, and playlist links.',
            },
            {
              id: 'as-c-games',
              name: 'gacha-and-gaming',
              type: 'text',
              topic: 'Genshin, Honkai, Fate, and console gaming flex channel.',
            },
            {
              id: 'as-c-bot',
              name: 'bot-shrine-games',
              type: 'text',
              topic: 'Play /blackjack, /pet, /adventure, and /coinflip.',
            },
          ],
        },
        {
          id: 'as-cat-voice',
          name: '🔊 HANGOUT PODS',
          channels: [
            {
              id: 'as-c-tatami',
              name: 'Tatami Room Lounge',
              type: 'voice',
              topic: 'Main social voice room for open community chatter.',
            },
            {
              id: 'as-c-pod1',
              name: 'Cozy Pod Sakura',
              type: 'voice',
              topic: 'Small quiet voice pod for close friends.',
              userLimit: 4,
            },
            {
              id: 'as-c-pod2',
              name: 'Cozy Pod Matcha',
              type: 'voice',
              topic: 'Small quiet voice pod for close friends.',
              userLimit: 4,
            },
            {
              id: 'as-c-lofi',
              name: 'Lo-Fi Radio Shrine 24/7',
              type: 'voice',
              topic: '24/7 continuous chill lo-fi beats stream.',
            },
          ],
        },
      ],
    },
    securityAudit: {
      everyonePermissions: {
        allowed: ['View Channels', 'Read Message History', 'Send Messages', 'Add Reactions'],
        denied: [
          'Mention @everyone & @here',
          'Post Raw Links in Media Galleries',
          'Manage Roles',
          'Unspoiled Content in Discussion',
        ],
      },
      automodRules: [
        {
          id: 'as-am-nsfw',
          name: 'Anime NSFW Scanner',
          trigger: 'Explicit anime or ecchi imagery uploads',
          action: 'Block image and warn user',
          enabled: true,
        },
        {
          id: 'as-am-spoilers',
          name: 'Unmarked Spoiler Auto-Redaction',
          trigger: 'Known spoiler keyword matches without spoiler brackets',
          action: 'Auto-spoiler message & notify sender',
          enabled: true,
        },
        {
          id: 'as-am-raid',
          name: 'Social Raid Quarantine',
          trigger: '> 15 rapid joins in 15 seconds',
          action: 'Activate server verification shield',
          enabled: true,
        },
        {
          id: 'as-am-repetitive',
          name: 'Copypasta Spam Limiter',
          trigger: 'Identical messages sent across multiple channels',
          action: 'Purge messages and apply 15m timeout',
          enabled: true,
        },
      ],
      verificationGateLevel: 'LOW-MEDIUM (Reaction Gate & Captcha)',
      raidPreventionScore: 98,
      status: 'SECURE',
      auditedFlags: [
        'Spoiler discussion isolated with automated redaction filters',
        'Reaction roles secured against unauthorized privilege escalation',
        'Lo-Fi radio voice room locked to bot audio transmitter',
        'Media channels protected by NSFW image neural filters',
      ],
    },
    roleHierarchy: {
      roles: [
        {
          id: 'as-r-master',
          name: 'Shrine Master',
          color: '#EC4899',
          hoist: true,
          position: 7,
          permissions: ['Administrator', 'Manage Server', 'Manage Channels'],
          icon: '⛩️',
        },
        {
          id: 'as-r-ronin',
          name: 'Ronin Moderator',
          color: '#F43F5E',
          hoist: true,
          position: 6,
          permissions: ['Kick Members', 'Ban Members', 'Manage Messages', 'Mute Members'],
          icon: '🗡️',
        },
        {
          id: 'as-r-event',
          name: 'Event Organizer',
          color: '#A855F7',
          hoist: true,
          position: 5,
          permissions: ['Manage Events', 'Mention Roles', 'Priority Speaker'],
          icon: '🎉',
        },
        {
          id: 'as-r-vip',
          name: 'Otaku VIP',
          color: '#F59E0B',
          hoist: true,
          position: 4,
          permissions: ['Use External Emojis', 'Use External Stickers', 'Embed Links'],
          icon: '⭐',
        },
        {
          id: 'as-r-senpai',
          name: 'Senpai Contributor',
          color: '#06B6D4',
          hoist: true,
          position: 3,
          permissions: ['Attach Files', 'Create Threads', 'Priority Voice'],
          icon: '🌸',
        },
        {
          id: 'as-r-regular',
          name: 'Regular Villager',
          color: '#6366F1',
          hoist: false,
          position: 2,
          permissions: ['Send Messages', 'Connect Voice', 'Speak'],
          icon: '🍵',
        },
        {
          id: 'as-r-everyone',
          name: '@everyone',
          color: '#99AAB5',
          hoist: false,
          position: 1,
          permissions: ['View Welcome Shrine', 'Read Message History'],
          icon: '🌐',
        },
      ],
    },
  },
};

export const BLUEPRINT_LIST = Object.values(BLUEPRINTS);

export function getBlueprintById(id: string): BlueprintSpec {
  return BLUEPRINTS[id as BlueprintId] || BLUEPRINTS['gaming-esports'];
}
