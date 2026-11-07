/**
 * src/lib/build/presets.ts
 * Architecture Presets Library for Discord Architect (AiCord).
 *
 * Provides 5 production-grade server presets:
 * - gaming: Gaming & Esports Arena (LFG, Match Rooms, Clips, Voice Lobbies, Duos/Trios/Squads)
 * - developer: Software & Tech Community (TypeScript, Python, Rust, Code Review, Showcase, Tech Voice)
 * - creator: Content Creator & Streamer (Stream Alerts, VIP Lounge, Fan Content, Voice Stages)
 * - campus: Study & Academic Campus (Bulletin, STEM/Humanities, Homework Help, Pomodoro Voice)
 * - anime: Anime & Social Community (Seasonal Airing, Manga, Art & Cosplay, Watch Party Stages)
 */

import type { ServerBlueprint } from '@/lib/ai/blueprint.schema';
import { PermissionFlags } from '@/lib/discord/permissions';

export type PresetId = 'gaming' | 'developer' | 'creator' | 'campus' | 'anime';

export interface PresetChoice {
  name: string;
  value: PresetId;
  description: string;
}

const MOD_PERMS = (
  PermissionFlags.VIEW_CHANNEL |
  PermissionFlags.SEND_MESSAGES |
  PermissionFlags.MANAGE_MESSAGES |
  PermissionFlags.KICK_MEMBERS |
  PermissionFlags.MODERATE_MEMBERS |
  PermissionFlags.MUTE_MEMBERS |
  PermissionFlags.DEAFEN_MEMBERS |
  PermissionFlags.MOVE_MEMBERS
).toString();

export const PRESETS: Record<PresetId, ServerBlueprint> = {
  gaming: {
    name: 'Gaming & Esports Arena',
    description:
      'Premier competitive and casual gaming community featuring matchmaking lobbies, clip showcases, team voice channels, and tournament infrastructure.',
    roles: [
      {
        name: 'Tournament Admin',
        color: 0xe74c3c, // Vivid Red
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Esports Captain',
        color: 0xe67e22, // Orange
        hoist: true,
        mentionable: true,
        permissions: '0',
      },
      {
        name: 'Competitive Tier',
        color: 0x9b59b6, // Purple
        hoist: true,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Casual Gamer',
        color: 0x3498db, // Blue
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Community Member',
        color: 0x2ecc71, // Green
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
    ],
    categories: [
      {
        name: '📢 INFORMATION & TOURNAMENTS',
        channels: [
          {
            name: 'announcements',
            type: 'announcement',
            topic: 'Official esports news, tournament announcements, and server updates',
          },
          {
            name: 'rules-and-faq',
            type: 'text',
            topic: 'Server rules, fair play conduct, and tournament guidelines',
          },
          {
            name: 'tournament-brackets',
            type: 'text',
            topic: 'Active tournament brackets, schedules, and prize announcements',
          },
        ],
      },
      {
        name: "💬 GAMER'S LOUNGE",
        channels: [
          {
            name: 'general-chat',
            type: 'text',
            topic: 'Hang out and chat about all things gaming and esports',
          },
          {
            name: 'clips-and-highlights',
            type: 'text',
            slowmode: 5,
            topic: 'Share your best clips, clutches, aces, and funniest gaming moments',
          },
          {
            name: 'battlestations',
            type: 'text',
            slowmode: 10,
            topic: 'Show off your PC builds, console battle stations, and gear setups',
          },
          {
            name: 'gaming-memes',
            type: 'text',
            slowmode: 5,
            topic: 'Gaming humor, spicy memes, and lighthearted banter',
          },
        ],
      },
      {
        name: '🎯 LOOKING FOR GROUP (LFG)',
        channels: [
          {
            name: 'lfg-ranked',
            type: 'text',
            slowmode: 5,
            topic: 'Form squads and competitive parties for ranked queues',
          },
          {
            name: 'lfg-casual',
            type: 'text',
            slowmode: 3,
            topic: 'Casual party invites, co-op lobbies, and relaxed gaming groups',
          },
          {
            name: 'scrim-matchmaking',
            type: 'text',
            slowmode: 10,
            topic: 'Organize custom scrims, practice lobbies, and team challenges',
          },
        ],
      },
      {
        name: '🔊 TEAM VOICE LOBBIES',
        channels: [
          {
            name: 'Duos Lobby 1',
            type: 'voice',
          },
          {
            name: 'Duos Lobby 2',
            type: 'voice',
          },
          {
            name: 'Trios Room Alpha',
            type: 'voice',
          },
          {
            name: 'Squad Room Bravo',
            type: 'voice',
          },
          {
            name: 'Esports Arena Stage',
            type: 'stage',
            topic: 'Live tournament shoutcasting, finals streams, and community events',
          },
        ],
      },
      {
        name: '🛡️ STAFF OPERATIONS',
        channels: [
          {
            name: 'staff-desk',
            type: 'text',
            isPrivate: true,
            privateRoles: ['Tournament Admin'],
            topic: 'Tournament admin coordination and ticket management',
          },
        ],
      },
    ],
    welcomeMessages: [
      {
        channelRef: 'general-chat',
        content:
          '🎮 Welcome to the **Gaming & Esports Arena**! Check out #rules-and-faq for rules, find your team in #lfg-ranked, and post your best plays in #clips-and-highlights!',
      },
    ],
    rulesContent: {
      channelRef: 'rules-and-faq',
      content:
        '🏆 **Gaming & Esports Arena — Community Rules**\n1. Maintain sportsmanship: zero tolerance for toxic griefing or harassment.\n2. No cheating, unauthorized hacks, or exploitation.\n3. Keep LFG and scrim posts in their respective matchmaking channels.\n4. Follow Discord Community Guidelines and respect staff calls.',
    },
  },

  developer: {
    name: 'Software & Tech Community',
    description:
      'Collaborative engineering ecosystem with language-focused discussions, live code reviews, project showcases, and paired programming spaces.',
    roles: [
      {
        name: 'Lead Architect',
        color: 0x5865f2, // Blurple
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Staff Engineer',
        color: 0x3498db, // Cyan Blue
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Senior Contributor',
        color: 0x2ecc71, // Emerald
        hoist: true,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Developer',
        color: 0x00bcd4, // Light Blue
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Tech Enthusiast',
        color: 0x95a5a6, // Concrete Silver
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
    ],
    categories: [
      {
        name: '📌 GETTING STARTED',
        channels: [
          {
            name: 'tech-announcements',
            type: 'announcement',
            topic: 'Community announcements, tech news, and releases',
          },
          {
            name: 'welcome-and-rules',
            type: 'text',
            topic: 'Community code of conduct, channel map, and resource index',
          },
          {
            name: 'resources-and-tools',
            type: 'text',
            topic: 'Curated developer tools, roadmaps, libraries, and tutorials',
          },
        ],
      },
      {
        name: '💬 DEVELOPER LOUNGE',
        channels: [
          {
            name: 'general-tech',
            type: 'text',
            topic: 'General discussions around software development, paradigms, and tech',
          },
          {
            name: 'code-reviews',
            type: 'text',
            slowmode: 10,
            topic: 'Get feedback on pull requests, code snippets, and architectural decisions',
          },
          {
            name: 'project-showcase',
            type: 'text',
            slowmode: 15,
            topic: 'Share your open source projects, side hustles, and portfolio work',
          },
          {
            name: 'career-and-hiring',
            type: 'text',
            slowmode: 30,
            topic: 'Job openings, resume feedback, and engineering career advice',
          },
        ],
      },
      {
        name: '💻 TECH STACKS',
        channels: [
          {
            name: 'typescript-javascript',
            type: 'text',
            topic: 'TypeScript, Node.js, Next.js, React, and modern web frameworks',
          },
          {
            name: 'python-data-ai',
            type: 'text',
            topic: 'Python, FastAPI, PyTorch, LangChain, and AI engineering',
          },
          {
            name: 'rust-systems',
            type: 'text',
            topic: 'Rust, Go, C++, performance optimization, and low-level engineering',
          },
          {
            name: 'devops-infra',
            type: 'text',
            topic: 'Docker, Kubernetes, Terraform, CI/CD pipelines, and cloud platforms',
          },
        ],
      },
      {
        name: '🎙️ PAIR PROGRAMMING & VOICE',
        channels: [
          {
            name: 'Pair Desk Alpha',
            type: 'voice',
          },
          {
            name: 'Pair Desk Beta',
            type: 'voice',
          },
          {
            name: 'Tech Lounge Voice',
            type: 'voice',
          },
          {
            name: 'Tech Talk Stage',
            type: 'stage',
            topic: 'Live architecture presentations, lightning talks, and engineering AMAs',
          },
        ],
      },
      {
        name: '🛡️ CORE ARCHITECTS',
        channels: [
          {
            name: 'architect-room',
            type: 'text',
            isPrivate: true,
            privateRoles: ['Lead Architect', 'Staff Engineer'],
            topic: 'Core leadership channel for architectural roadmap and moderation',
          },
        ],
      },
    ],
    welcomeMessages: [
      {
        channelRef: 'general-tech',
        content:
          '💻 Welcome to the **Software & Tech Community**! Read #welcome-and-rules, introduce your tech stack, and share what you are building in #project-showcase!',
      },
    ],
    rulesContent: {
      channelRef: 'welcome-and-rules',
      content:
        '🛠️ **Software & Tech Community — Code of Conduct**\n1. Constructive Critique: Review code with empathy and respect.\n2. Proper Formatting: Always wrap snippets in code markdown syntax.\n3. No unsolicited promotional spam or mass DM recruitment.\n4. Foster learning across all junior to principal engineers.',
    },
  },

  creator: {
    name: 'Content Creator & Streamer',
    description:
      'Engaging content creator sanctuary featuring live stream alerts, VIP backstage lounges, creative fan art hubs, and community stages.',
    roles: [
      {
        name: 'Creator',
        color: 0xff4757, // Crimson Coral
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Mod Squad',
        color: 0x70a1ff, // Light Blue
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'VIP Member',
        color: 0xffa502, // Gold Amber
        hoist: true,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Twitch Sub / Booster',
        color: 0xff6b81, // Pink Booster
        hoist: true,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Community Member',
        color: 0x2ed573, // Neon Mint
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
    ],
    categories: [
      {
        name: '📢 BROADCAST HUB',
        channels: [
          {
            name: 'stream-alerts',
            type: 'announcement',
            topic: 'Live Twitch, YouTube, and kick broadcast notifications',
          },
          {
            name: 'welcome-and-rules',
            type: 'text',
            topic: 'Community guidelines, broadcast schedules, and social links',
          },
          {
            name: 'video-uploads',
            type: 'text',
            topic: 'New video releases, Shorts, and community highlights',
          },
        ],
      },
      {
        name: '🌟 COMMUNITY CHAT',
        channels: [
          {
            name: 'general-lounge',
            type: 'text',
            topic: 'Main community hub for fans and stream chatter',
          },
          {
            name: 'fan-art-and-edits',
            type: 'text',
            slowmode: 5,
            topic: 'Post your artwork, video edits, and creative fan creations',
          },
          {
            name: 'stream-clips',
            type: 'text',
            slowmode: 5,
            topic: 'Share funny stream clips and epic gameplay moments',
          },
          {
            name: 'q-and-a-ideas',
            type: 'text',
            slowmode: 15,
            topic: 'Submit questions and content ideas for upcoming streams',
          },
        ],
      },
      {
        name: '⭐ VIP BACKSTAGE',
        channels: [
          {
            name: 'vip-lounge',
            type: 'text',
            isPrivate: true,
            privateRoles: ['VIP Member', 'Creator', 'Mod Squad'],
            topic: 'Exclusive lounge for VIP patrons, subscribers, and server boosters',
          },
          {
            name: 'behind-the-scenes',
            type: 'text',
            isPrivate: true,
            privateRoles: ['VIP Member', 'Creator', 'Mod Squad'],
            topic: 'Sneak peeks, bloopers, and pre-production previews',
          },
        ],
      },
      {
        name: '🎙️ LIVE STAGES & VOICE',
        channels: [
          {
            name: 'Fan Community Voice',
            type: 'voice',
          },
          {
            name: 'Gaming with Fans',
            type: 'voice',
          },
          {
            name: 'Creator Green Room',
            type: 'voice',
            isPrivate: true,
            privateRoles: ['Creator', 'Mod Squad'],
          },
          {
            name: 'Creator Live Stage',
            type: 'stage',
            topic: 'Live podcast tapings, community Q&A stages, and watch parties',
          },
        ],
      },
      {
        name: '🛡️ MODERATION HQ',
        channels: [
          {
            name: 'mod-chat',
            type: 'text',
            isPrivate: true,
            privateRoles: ['Creator', 'Mod Squad'],
            topic: 'Staff discussion, raid protection, and stream moderation logs',
          },
        ],
      },
    ],
    welcomeMessages: [
      {
        channelRef: 'general-lounge',
        content:
          '🌟 Welcome to our community! Make sure to read #welcome-and-rules, turn on notifications in #stream-alerts, and jump into #general-lounge!',
      },
    ],
    rulesContent: {
      channelRef: 'welcome-and-rules',
      content:
        '✨ **Content Creator Community Guidelines**\n1. Be kind, supportive, and respectful to all members.\n2. Do not spam chat or self-promote personal channels without permission.\n3. Respect boundaries: do not pry for private creator information.\n4. Keep interactions safe and follow Discord ToS.',
    },
  },

  campus: {
    name: 'Study & Academic Campus',
    description:
      'Rigorous academic campus equipped with discipline hubs, peer homework desks, silent Pomodoro study halls, and tutoring office hours.',
    roles: [
      {
        name: 'Professor / Staff',
        color: 0x34495e, // Dark Blue/Gray
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Lead Tutor',
        color: 0x16a085, // Teal
        hoist: true,
        mentionable: true,
        permissions: '0',
      },
      {
        name: 'Campus Moderator',
        color: 0x2980b9, // Blue
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Scholar',
        color: 0x27ae60, // Green
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Student',
        color: 0xbdc3c7, // Silver
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
    ],
    categories: [
      {
        name: '🏛️ CAMPUS ENTRANCE',
        channels: [
          {
            name: 'campus-bulletin',
            type: 'announcement',
            topic: 'Official campus announcements, academic calendar, and exam notices',
          },
          {
            name: 'rules-and-conduct',
            type: 'text',
            topic: 'Honor code, academic integrity standards, and conduct guidelines',
          },
          {
            name: 'orientation-guide',
            type: 'text',
            topic: 'Getting started guide, department links, and campus directory',
          },
        ],
      },
      {
        name: '📚 GENERAL ACADEMICS',
        channels: [
          {
            name: 'campus-quad',
            type: 'text',
            topic: 'Central student union for relaxed discussions and campus life',
          },
          {
            name: 'study-resources',
            type: 'text',
            topic: 'Shared notes, reference links, cheat sheets, and textbooks',
          },
          {
            name: 'career-and-internships',
            type: 'text',
            topic: 'Internship postings, fellowship advice, and resume reviews',
          },
        ],
      },
      {
        name: '🔬 DISCIPLINES & HOMEWORK',
        channels: [
          {
            name: 'stem-sciences',
            type: 'text',
            topic: 'Mathematics, Physics, Chemistry, Biology, and Computer Science',
          },
          {
            name: 'humanities-and-arts',
            type: 'text',
            topic: 'Literature, Philosophy, History, Social Sciences, and Languages',
          },
          {
            name: 'homework-help-1',
            type: 'text',
            slowmode: 10,
            topic: 'Post homework problems and collaborate on conceptual solutions',
          },
          {
            name: 'homework-help-2',
            type: 'text',
            slowmode: 10,
            topic: 'Overflow assignment help desk and study group coordination',
          },
        ],
      },
      {
        name: '⏱️ POMODORO & STUDY ROOMS',
        channels: [
          {
            name: 'Silent Study Hall 1',
            type: 'voice',
          },
          {
            name: 'Silent Study Hall 2',
            type: 'voice',
          },
          {
            name: 'Pomodoro Focus Room',
            type: 'voice',
          },
          {
            name: 'Group Study Lab',
            type: 'voice',
          },
          {
            name: 'Lecture Hall Stage',
            type: 'stage',
            topic: 'Guest academic lectures, study workshops, and exam review sessions',
          },
        ],
      },
      {
        name: '🛡️ FACULTY LOUNGE',
        channels: [
          {
            name: 'faculty-lounge',
            type: 'text',
            isPrivate: true,
            privateRoles: ['Professor / Staff', 'Campus Moderator'],
            topic: 'Faculty department discussions and student support desk',
          },
        ],
      },
    ],
    welcomeMessages: [
      {
        channelRef: 'campus-quad',
        content:
          '🎓 Welcome to the **Study & Academic Campus**! Check out #rules-and-conduct for our academic integrity standards, and drop into a Pomodoro room to start studying!',
      },
    ],
    rulesContent: {
      channelRef: 'rules-and-conduct',
      content:
        '📖 **Academic Campus Honor Code**\n1. Academic Integrity: Help others learn concepts, but do not complete exams or assignments for them.\n2. Silent Study Voice Rooms: Keep mics muted at all times in silent study halls.\n3. Respectful Discourse: Maintain respectful scholarly discussions.\n4. Protect privacy: Never share personal university identification.',
    },
  },

  anime: {
    name: 'Anime & Social Community',
    description:
      'Vibrant anime community featuring seasonal airing watch discussions, manga lounges, cosplay galleries, and cinema stage streams.',
    roles: [
      {
        name: 'Sensei',
        color: 0xe84393, // Prune Pink
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Senpai Moderator',
        color: 0xfd79a8, // Sakura Pink
        hoist: true,
        mentionable: true,
        permissions: MOD_PERMS,
        isStaff: true,
      },
      {
        name: 'Otaku Elite',
        color: 0x6c5ce7, // Royal Purple
        hoist: true,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Anime Enthusiast',
        color: 0x00cec9, // Robins Egg
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
      {
        name: 'Community Member',
        color: 0x81ecec, // Soft Mint
        hoist: false,
        mentionable: false,
        permissions: '0',
      },
    ],
    categories: [
      {
        name: '🌸 GATEWAY',
        channels: [
          {
            name: 'anime-news',
            type: 'announcement',
            topic: 'Seasonal anime release schedules, studio announcements, and trailers',
          },
          {
            name: 'welcome-and-rules',
            type: 'text',
            topic: 'Community guidelines, spoiler etiquette, and self-assignable roles',
          },
          {
            name: 'role-selection',
            type: 'text',
            topic: 'Choose your anime genre tags and notification pings',
          },
        ],
      },
      {
        name: '💬 ANIME LOUNGE',
        channels: [
          {
            name: 'general-discussion',
            type: 'text',
            topic: 'General chatter, daily life, and casual anime talk',
          },
          {
            name: 'seasonal-airing',
            type: 'text',
            slowmode: 3,
            topic: 'Currently airing season discussions and episode reactions',
          },
          {
            name: 'manga-and-webtoons',
            type: 'text',
            topic: 'Manga chapters, manhwa, light novels, and webtoons',
          },
          {
            name: 'spoilers-talk',
            type: 'text',
            slowmode: 5,
            topic: 'Latest raw releases, spoiler discussions, and leaks',
          },
        ],
      },
      {
        name: '🎨 ART & COSPLAY',
        channels: [
          {
            name: 'fan-art-gallery',
            type: 'text',
            slowmode: 5,
            topic: 'Post original artwork, sketches, and favorite illustrations with artist credit',
          },
          {
            name: 'cosplay-showcase',
            type: 'text',
            slowmode: 10,
            topic: 'Show off your cosplay outfits, prop crafting, and con pictures',
          },
          {
            name: 'anime-music-ost',
            type: 'text',
            topic: 'Openings, endings, anime OSTs, J-Rock, and vocaloid tracks',
          },
        ],
      },
      {
        name: '🍿 WATCH PARTIES & STAGES',
        channels: [
          {
            name: 'Cinema Stage',
            type: 'stage',
            topic: 'Weekly community watch parties, movie nights, and episode marathons',
          },
          {
            name: 'Chill Voice 1',
            type: 'voice',
          },
          {
            name: 'Chill Voice 2',
            type: 'voice',
          },
        ],
      },
      {
        name: '🛡️ SHOGUNATE STAFF',
        channels: [
          {
            name: 'staff-room',
            type: 'text',
            isPrivate: true,
            privateRoles: ['Sensei', 'Senpai Moderator'],
            topic: 'Moderator discussions, spoiler enforcement, and event planning',
          },
        ],
      },
    ],
    welcomeMessages: [
      {
        channelRef: 'general-discussion',
        content:
          '🌸 Konnichiwa! Welcome to our **Anime & Social Community**! Read #welcome-and-rules for spoiler guidelines and share what anime you are watching this season in #seasonal-airing!',
      },
    ],
    rulesContent: {
      channelRef: 'welcome-and-rules',
      content:
        '⛩️ **Anime & Social Community Rules**\n1. Spoiler Policy: Always mark spoilers with `|| spoiler text ||` for recent episodes.\n2. Keep all NSFW content strictly prohibited in public channels.\n3. Respect everyone’s tastes: no elitism or aggressive waifu/husbando wars.\n4. Always credit original creators when posting non-original art.',
    },
  },
};

/**
 * Returns a cloned copy of the requested ServerBlueprint preset by ID.
 * Case-insensitive. Returns undefined if not found.
 */
export function getPreset(id?: string | null): ServerBlueprint | undefined {
  if (!id) return undefined;
  const key = id.toLowerCase().trim() as PresetId;
  const found = PRESETS[key];
  if (!found) return undefined;
  // Return deep clone to protect preset blueprint constants from mutation
  return JSON.parse(JSON.stringify(found)) as ServerBlueprint;
}

/**
 * Returns an array of all available ServerBlueprint presets.
 */
export function getAllPresets(): ServerBlueprint[] {
  return Object.values(PRESETS).map((p) => JSON.parse(JSON.stringify(p)));
}

/**
 * Returns the raw record mapping of preset ID to ServerBlueprint.
 */
export function getAllPresetMap(): Record<PresetId, ServerBlueprint> {
  return PRESETS;
}

/**
 * Returns choices formatted for Discord slash command option registration & autocomplete.
 */
export function getPresetChoices(): PresetChoice[] {
  return [
    {
      name: '🎮 Gaming & Esports Arena',
      value: 'gaming',
      description: 'LFG, Match Rooms, Clips, Voice Lobbies, Duos/Trios/Squads',
    },
    {
      name: '💻 Software & Tech Community',
      value: 'developer',
      description: 'TypeScript, Python, Rust, Code Review, Showcase, Tech Voice',
    },
    {
      name: '🌟 Content Creator & Streamer',
      value: 'creator',
      description: 'Stream Alerts, VIP Lounge, Fan Content, Voice Stages',
    },
    {
      name: '🎓 Study & Academic Campus',
      value: 'campus',
      description: 'Bulletin, STEM/Humanities, Homework Help, Pomodoro Voice',
    },
    {
      name: '🌸 Anime & Social Community',
      value: 'anime',
      description: 'Seasonal Airing, Manga, Art & Cosplay, Watch Party Stages',
    },
  ];
}
