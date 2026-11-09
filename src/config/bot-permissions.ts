/**
 * src/config/bot-permissions.ts
 * Discord OAuth2 Bot Permissions, bitwise calculations, and least-privilege list.
 */

export interface PermissionItem {
  id: string;
  name: string;
  description: string;
  bit: bigint;
  category: 'general' | 'text' | 'voice' | 'moderation';
  recommended: boolean;
  requiredFor: string[];
}

export const ADMIN_PERMISSIONS_INTEGER = '8';
export const RECOMMENDED_PERMISSIONS_INTEGER = '534723950656';

export const BOT_PERMISSIONS_CATALOG: PermissionItem[] = [
  // ─── Moderation & Administration ──────────────────────────────────────────
  {
    id: 'ADMINISTRATOR',
    name: 'Administrator',
    description: 'Bypasses all channel permission overrides. Recommended for automated /build server creation.',
    bit: 8n,
    category: 'moderation',
    recommended: true,
    requiredFor: ['Full /build blueprint application', 'Instant channel sync'],
  },
  {
    id: 'MANAGE_GUILD',
    name: 'Manage Server',
    description: 'Inspect guild vanity, feature settings, and automod configuration.',
    bit: 32n,
    category: 'moderation',
    recommended: true,
    requiredFor: ['Server configuration audits', 'Vanity insights'],
  },
  {
    id: 'MANAGE_ROLES',
    name: 'Manage Roles',
    description: 'Create, modify, and assign member roles below the bot highest role.',
    bit: 268435456n,
    category: 'moderation',
    recommended: true,
    requiredFor: ['/role command', 'Reaction roles', 'Shop role purchases', 'Level rewards'],
  },
  {
    id: 'MANAGE_CHANNELS',
    name: 'Manage Channels',
    description: 'Create, edit, lock, slowmode, and delete categories and channels.',
    bit: 16n,
    category: 'moderation',
    recommended: true,
    requiredFor: ['/channel command', '/category command', 'Dynamic temporary voice rooms', 'Ticket channels'],
  },
  {
    id: 'KICK_MEMBERS',
    name: 'Kick Members',
    description: 'Eject unruly community members with hierarchy verification.',
    bit: 2n,
    category: 'moderation',
    recommended: true,
    requiredFor: ['/kick command', 'Automated infraction escalation'],
  },
  {
    id: 'BAN_MEMBERS',
    name: 'Ban Members',
    description: 'Permanently ban malicious raid accounts and spam bots.',
    bit: 4n,
    category: 'moderation',
    recommended: true,
    requiredFor: ['/ban command', 'Raid prevention ladder'],
  },
  {
    id: 'MODERATE_MEMBERS',
    name: 'Timeout Members',
    description: 'Temporarily mute and isolate members in text and voice channels.',
    bit: 1099511627776n,
    category: 'moderation',
    recommended: true,
    requiredFor: ['/timeout command', 'Warning penalty ladder'],
  },

  // ─── Text Permissions ─────────────────────────────────────────────────────
  {
    id: 'VIEW_CHANNEL',
    name: 'View Channels',
    description: 'Read message traffic in designated server channels.',
    bit: 1024n,
    category: 'text',
    recommended: true,
    requiredFor: ['All slash commands', 'Starboard listening', 'Confessions'],
  },
  {
    id: 'SEND_MESSAGES',
    name: 'Send Messages',
    description: 'Deliver bot responses and interactive cards to channels.',
    bit: 2048n,
    category: 'text',
    recommended: true,
    requiredFor: ['All command responses', 'Daily streak embeds', 'Ticket responses'],
  },
  {
    id: 'MANAGE_MESSAGES',
    name: 'Manage Messages',
    description: 'Purge messages, delete inappropriate content, and pin notices.',
    bit: 8192n,
    category: 'text',
    recommended: true,
    requiredFor: ['/purge command', 'Starboard pin updates'],
  },
  {
    id: 'EMBED_LINKS',
    name: 'Embed Links',
    description: 'Render rich interactive visual embeds and styled theme cards.',
    bit: 16384n,
    category: 'text',
    recommended: true,
    requiredFor: ['All styled UI cards', 'Rank embeds', 'Treasury cards'],
  },
  {
    id: 'ATTACH_FILES',
    name: 'Attach Files',
    description: 'Upload transcript text files, logs, and generated preview images.',
    bit: 32768n,
    category: 'text',
    recommended: true,
    requiredFor: ['HTML ticket transcripts', 'Audit exports'],
  },
  {
    id: 'READ_MESSAGE_HISTORY',
    name: 'Read Message History',
    description: 'Required for /purge, starboard score detection, and confessions.',
    bit: 65536n,
    category: 'text',
    recommended: true,
    requiredFor: ['/purge command', 'Starboard scanning'],
  },
  {
    id: 'ADD_REACTIONS',
    name: 'Add Reactions',
    description: 'Add reaction emojis to confessions and starboard posts.',
    bit: 64n,
    category: 'text',
    recommended: true,
    requiredFor: ['Confessions reaction voting', 'Giveaway entries'],
  },
  {
    id: 'USE_EXTERNAL_EMOJIS',
    name: 'Use External Emojis',
    description: 'Render high-resolution custom icons for themes and progress bars.',
    bit: 262144n,
    category: 'text',
    recommended: true,
    requiredFor: ['Custom themes', 'ASCII bar decor'],
  },

  // ─── Voice Permissions ────────────────────────────────────────────────────
  {
    id: 'CONNECT',
    name: 'Connect Voice',
    description: 'Join voice channels for audio streaming and temporary room handling.',
    bit: 1048576n,
    category: 'voice',
    recommended: true,
    requiredFor: ['24/7 Voice Radio streamer', 'Temp-VC room creation'],
  },
  {
    id: 'SPEAK',
    name: 'Speak in Voice',
    description: 'Transmit high-bitrate audio streams in voice channels.',
    bit: 2097152n,
    category: 'voice',
    recommended: true,
    requiredFor: ['24/7 Voice Radio playback'],
  },
  {
    id: 'MOVE_MEMBERS',
    name: 'Move Members',
    description: 'Move members into temporary voice lounges automatically.',
    bit: 16777216n,
    category: 'voice',
    recommended: true,
    requiredFor: ['Join-to-create temporary voice channels'],
  },
];

export function buildDiscordOAuthUrl(clientId: string, permissions: string = '8'): string {
  const scopes = encodeURIComponent('bot applications.commands');
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=${scopes}&permissions=${permissions}`;
}
